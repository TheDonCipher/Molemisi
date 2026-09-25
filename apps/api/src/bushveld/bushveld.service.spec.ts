import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BushveldService, BushveldConflict } from './bushveld.service';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { WalletService } from '../wallet/wallet.service';
import { HOTSPOTS, TSHOLOFELO_DIALOGUE, findsForScene, getCropConfig } from '@molemisi/game-config';

/**
 * P6 — The Bushveld (05 §P6; 04 §4.2, §7.2, §8, §9.3).
 *
 * These tests prove the done-criteria by exercising the real service against a
 * stateful in-memory mock of the Supabase admin client, so writes (Kagiso
 * mutation, Daily Sparkle idempotency, journal de-duplication) are observable
 * rather than assumed.
 *
 *   - collecting below the Kagiso cost returns 409 `scene_not_settled`
 *   - a second tap on the same hotspot within 60 min returns 409 `hotspot_resting`
 *   - the two 409s are DISTINCT, and rest is checked BEFORE cost
 *   - exactly one hotspot system-wide carries the Sparkle per day
 *   - `Setlhare sa Phane` swaps its loot table only in real April / December
 *   - completing a scene's Field Journal page swaps its background asset
 *   - Kagiso is COMPUTED ON READ from kagiso_updated_at, never stored as truth
 *   - Deep Bushveld unlocks at Botho >= 300 (and only then)
 */

// ---- stateful mock of the Supabase admin client --------------------------------
interface Seed {
  scenes?: Record<string, { kagiso: number; updatedAt?: string }>;
  hotspots?: Record<string, { lastCollectedAt?: string | null }>;
  /** "playerId:discoverySlug" rows already in field_journal_entries */
  discoveries?: string[];
  /** date -> hotspotId already in daily_sparkle */
  sparkles?: Record<string, string>;
  /** crop_instances rows for the farm under test (Tsholofelo stall check) */
  crops?: Array<{ crop_type: string; growth_progress_hours: number; hydration: number }>;
  /** "playerId:kind:slug" rows already in lore_entries */
  lore?: string[];
}

interface Metrics {
  insertRows: any[];
  upsertRows: any[];
}

function makeStatefulAdmin(seed: Seed, metrics: Metrics) {
  const scenes = { ...(seed.scenes ?? {}) };
  const hotspots = { ...(seed.hotspots ?? {}) };
  const disc = new Set(seed.discoveries ?? []);
  const sparks = { ...(seed.sparkles ?? {}) };
  const crops = [...(seed.crops ?? [])];
  const lore = new Set(seed.lore ?? []);

  const client: any = {
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((col: string, val: unknown) => {
          filters.push([col, val]);
          return builder;
        }),
        single: jest.fn(async () => {
          if (table === 'player_scene_state') {
            const sid = filters.find((f) => f[0] === 'scene_id')?.[1];
            const pid = filters.find((f) => f[0] === 'player_id')?.[1];
            const row = scenes[`${pid}:${sid}`];
            return {
              data: row
                ? { kagiso: row.kagiso, kagiso_updated_at: row.updatedAt ?? new Date().toISOString() }
                : null,
              error: null,
            };
          }
          if (table === 'player_hotspot_state') {
            const hid = filters.find((f) => f[0] === 'hotspot_id')?.[1];
            const pid = filters.find((f) => f[0] === 'player_id')?.[1];
            const row = hotspots[`${pid}:${hid}`];
            return {
              data: row ? { last_collected_at: row.lastCollectedAt ?? null } : null,
              error: null,
            };
          }
          if (table === 'daily_sparkle') {
            const date = filters.find((f) => f[0] === 'sparkle_date')?.[1] as string;
            const hid = sparks[date];
            return { data: hid ? { hotspot_id: hid } : null, error: null };
          }
          if (table === 'field_journal_entries') {
            const slug = filters.find((f) => f[0] === 'discovery_slug')?.[1];
            const pid = filters.find((f) => f[0] === 'player_id')?.[1];
            return {
              data: disc.has(`${pid}:${slug}`) ? { discovery_slug: slug } : null,
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        maybeSingle: jest.fn(async () => {
          if (table === 'lore_entries') {
            const pid = filters.find((f) => f[0] === 'player_id')?.[1];
            const kind = filters.find((f) => f[0] === 'kind')?.[1];
            const slug = filters.find((f) => f[0] === 'slug')?.[1];
            return {
              data: lore.has(`${pid}:${kind}:${slug}`) ? { id: 'lore-1' } : null,
              error: null,
            };
          }
          return { data: null, error: null };
        }),
        // list read (the chain is awaited directly, with no .single()).
        // NOTE: Promise adoption calls `then(resolve, reject)` and WE must call
        // resolve — returning a promise from `then` is ignored by the adoption
        // procedure, which would leave `await builder` hanging forever.
        then: (resolve: (v: any) => void, _reject: (e: any) => void) => {
          let data: any = [];
          if (table === 'crop_instances') {
            data = crops.map((c) => ({ ...c }));
          }
          if (table === 'field_journal_entries') {
            const pid = filters.find((f) => f[0] === 'player_id')?.[1] as string;
            data = [...disc]
              .filter((d) => d.startsWith(`${pid}:`))
              .map((d) => ({ discovery_slug: d.slice(`${pid}:`.length) }));
          }
          resolve({ data, error: null });
        },
        upsert: jest.fn(async (row: any) => {
          if (table === 'player_scene_state') {
            scenes[`${row.player_id}:${row.scene_id}`] = {
              kagiso: row.kagiso,
              updatedAt: row.kagiso_updated_at,
            };
          } else if (table === 'player_hotspot_state') {
            hotspots[`${row.player_id}:${row.hotspot_id}`] = {
              lastCollectedAt: row.last_collected_at,
            };
          }
          metrics.upsertRows.push(row);
          return { data: null, error: null };
        }),
        insert: jest.fn(async (row: any) => {
          if (table === 'daily_sparkle') {
            sparks[row.sparkle_date] = row.hotspot_id;
          } else if (table === 'field_journal_entries') {
            disc.add(`${row.player_id}:${row.discovery_slug}`);
          } else if (table === 'lore_entries') {
            lore.add(`${row.player_id}:${row.kind}:${row.slug}`);
          }
          metrics.insertRows.push(row);
          return { data: null, error: null };
        }),
      };
      return builder;
    },
  };
  return { client, state: { scenes, hotspots, disc, sparks } };
}

const OPEN_BUSH_DISCOVERIES = findsForScene('open_bush').map((f) => f.discovery);
const OPEN_BUSH_TOTAL = OPEN_BUSH_DISCOVERIES.length; // 8

describe('BushveldService — P6', () => {
  let service: BushveldService;
  let metrics: Metrics;
  let admin: ReturnType<typeof makeStatefulAdmin>;
  const mockSupabase = { getAdminClient: jest.fn() };
  const mockInventory = {
    addItem: jest.fn().mockImplementation(async (_p: string, _f: string, _i: string, qty: number) => ({
      added: qty,
      overflow: 0,
    })),
  };
  const mockWallet = {
    getBotho: jest.fn().mockResolvedValue(600),
    creditBothoCapped: jest.fn().mockResolvedValue(5),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0); // deterministic: always pick first bucket / min qty
    metrics = { insertRows: [], upsertRows: [] };
    admin = makeStatefulAdmin({}, metrics);
    mockSupabase.getAdminClient.mockReturnValue(admin.client);
    mockWallet.getBotho.mockResolvedValue(600);
    mockWallet.creditBothoCapped.mockResolvedValue(5);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BushveldService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: InventoryService, useValue: mockInventory },
        { provide: WalletService, useValue: mockWallet },
      ],
    }).compile();
    service = module.get<BushveldService>(BushveldService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Helper that uses a fresh admin seeded with `seed` for a single call. */
  function withSeed(seed: Seed) {
    metrics = { insertRows: [], upsertRows: [] };
    admin = makeStatefulAdmin(seed, metrics);
    mockSupabase.getAdminClient.mockReturnValue(admin.client);
    return admin;
  }

  describe('listScenes — scenes, unlock, Kagiso-on-read', () => {
    it('returns all 4 scenes and unlocks Deep Bushveld at Botho >= 300', async () => {
      const scenes = await service.listScenes('user-1');
      expect(scenes.map((s) => s.slug)).toEqual([
        'open_bush',
        'riverbank',
        'rocky_outcrop',
        'deep_bushveld',
      ]);
      const deep = scenes.find((s) => s.slug === 'deep_bushveld')!;
      expect(deep.unlocked).toBe(true); // botho 600 >= 300
    });

    it('locks Deep Bushveld when Botho < 300', async () => {
      mockWallet.getBotho.mockResolvedValue(120);
      const scenes = await service.listScenes('user-1');
      const deep = scenes.find((s) => s.slug === 'deep_bushveld')!;
      expect(deep.unlocked).toBe(false);
    });

    it('computes Kagiso on read: 8h of regen adds 2 pips (3 -> 5)', async () => {
      const now = new Date();
      const updatedAt = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 3, updatedAt: updatedAt.toISOString() } } });

      const scenes = await service.listScenes('user-1');
      const open = scenes.find((s) => s.slug === 'open_bush')!;
      expect(open.kagiso).toBe(5);
      expect(open.kagisoMax).toBe(6);
      expect(open.secondsToNextPip).toBeGreaterThan(0);
    });

    it('starts a fresh scene settled (kagiso = 6) when never visited', async () => {
      const scenes = await service.listScenes('user-1');
      const open = scenes.find((s) => s.slug === 'open_bush')!;
      expect(open.kagiso).toBe(6);
      expect(open.secondsToNextPip).toBe(0);
    });
  });

  describe('collect — the two distinct 409s (05 §P6 #3)', () => {
    it('throws 409 scene_not_settled when Kagiso is below the hotspot cost', async () => {
      const now = new Date();
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 1, updatedAt: now.toISOString() } } });
      // ob_tracks_heavy costs 2; kagiso 1 < 2, and no prior tap so not resting.

      let err: unknown;
      try {
        await service.collect('user-1', 'farm-1', 'ob_tracks_heavy', now);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(BushveldConflict);
      expect((err as BushveldConflict).getResponse()).toEqual({
        reason: 'scene_not_settled',
        etaSeconds: null,
      });
    });

    it('throws 409 hotspot_resting for a second tap within 60 min', async () => {
      const now = new Date();
      withSeed({
        scenes: { 'user-1:open_bush': { kagiso: 6 } },
        hotspots: { 'user-1:ob_deadfall': { lastCollectedAt: now.toISOString() } },
      });

      let err: unknown;
      try {
        await service.collect('user-1', 'farm-1', 'ob_deadfall', now);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(BushveldConflict);
      const res = (err as BushveldConflict).getResponse() as { reason: string; etaSeconds: number };
      expect(res.reason).toBe('hotspot_resting');
      expect(res.etaSeconds).toBe(3600);
    });

    it('rest is checked BEFORE cost: both conditions true -> hotspot_resting wins', async () => {
      const now = new Date();
      withSeed({
        scenes: { 'user-1:open_bush': { kagiso: 0 } }, // also below cost
        hotspots: { 'user-1:ob_deadfall': { lastCollectedAt: now.toISOString() } }, // AND resting
      });

      let err: unknown;
      try {
        await service.collect('user-1', 'farm-1', 'ob_deadfall', now);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(BushveldConflict);
      expect((err as BushveldConflict).getResponse()).toEqual({
        reason: 'hotspot_resting',
        etaSeconds: 3600,
      });
    });

    it('rejects an unknown hotspot with NotFound (not a 409)', async () => {
      await expect(service.collect('user-1', 'farm-1', 'nope', new Date())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('a successful collect banks the item, spends Kagiso, records the find, and rests the hotspot', async () => {
      const now = new Date();
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 6 } } });

      const res = await service.collect('user-1', 'farm-1', 'ob_deadfall', now);

      expect(res.isNewDiscovery).toBe(true);
      expect(res.kagisoRemaining).toBe(5); // 6 - cost 1
      expect(res.reward.item).toBe('wood');
      expect(res.reward.qty).toBe(2); // min of {2,4} with Math.random = 0
      expect(mockInventory.addItem).toHaveBeenCalledWith('user-1', 'farm-1', 'wood', 2);
      // first find in a scene of 8 -> stage 0, no swap yet
      expect(res.restorationStage).toBe(0);
      expect(res.restorationStageChanged).toBe(false);
      // journal: discovery row written once
      expect(metrics.insertRows.some((r) => r.discovery_slug === 'dikgong')).toBe(true);
      // hotspot: rest timestamp persisted
      expect(
        metrics.upsertRows.some((r) => r.hotspot_id === 'ob_deadfall' && r.last_collected_at),
      ).toBe(true);
    });
  });

  describe('Daily Sparkle — exactly one per day (04 §8)', () => {
    it('lazily creates one sparkle per date and never re-inserts it', async () => {
      const now = new Date('2026-04-15T10:00:00Z');
      const id1 = await (service as any).todaySparkle(now);
      const id2 = await (service as any).todaySparkle(now);

      expect(id1).toBe(id2);
      expect(HOTSPOTS.map((h) => h.id)).toContain(id1);
      // only the first call inserted a daily_sparkle row for that date
      const sparkleInserts = metrics.insertRows.filter((r) => 'sparkle_date' in r);
      expect(sparkleInserts).toHaveLength(1);
      expect(sparkleInserts[0].sparkle_date).toBe('2026-04-15');
    });
  });

  describe('Seasonal gate — Setlhare sa Phane only in real April / December (04 §9.3)', () => {
    it(' April (month 4) swaps the loot table to phane', async () => {
      const now = new Date(Date.UTC(2026, 3, 15)); // getUTCMonth() = 3 -> +1 = 4
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 6 } } });

      const res = await service.collect('user-1', 'farm-1', 'ob_setlhare_sa_phane', now);
      expect(res.reward.discovery).toBe('phane');
      expect(res.reward.item).toBe('phane');
    });

    it('December (month 12) also swaps to phane', async () => {
      const now = new Date(Date.UTC(2026, 11, 15)); // 11 + 1 = 12
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 6 } } });

      const res = await service.collect('user-1', 'farm-1', 'ob_setlhare_sa_phane', now);
      expect(res.reward.discovery).toBe('phane');
    });

    it('an off-month (July, month 7) keeps the ordinary wood loot', async () => {
      const now = new Date(Date.UTC(2026, 6, 15)); // 6 + 1 = 7
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 6 } } });

      const res = await service.collect('user-1', 'farm-1', 'ob_setlhare_sa_phane', now);
      expect(res.reward.discovery).toBe('dikgong');
      expect(res.reward.item).toBe('wood');
    });

    it('is decoupled from the chapter clock: a real-April date always seasons regardless of season', async () => {
      // The Mophane window is a plain real-month check; pass any year/month 4 date.
      const now = new Date(Date.UTC(2031, 3, 1));
      withSeed({ scenes: { 'user-1:open_bush': { kagiso: 6 } } });
      const res = await service.collect('user-1', 'farm-1', 'ob_setlhare_sa_phane', now);
      expect(res.reward.discovery).toBe('phane');
    });
  });

  describe('Restoration — completing a Field Journal page swaps the background (04 §7.2)', () => {
    it('crossing the 100% threshold flips the stage and returns the final asset key', async () => {
      const now = new Date();
      // Seed every open_bush find except the last, then collect the missing one.
      const seeded = OPEN_BUSH_DISCOVERIES.filter((d) => d !== 'manong').map((d) => `user-1:${d}`);
      withSeed({
        scenes: { 'user-1:open_bush': { kagiso: 6 } },
        discoveries: seeded,
      });

      expect(seeded.length).toBe(OPEN_BUSH_TOTAL - 1);

      const res = await service.collect('user-1', 'farm-1', 'ob_feather_dark', now);
      expect(res.isNewDiscovery).toBe(true);
      expect(res.restorationStage).toBe(3); // 8/8 -> full
      expect(res.restorationStageChanged).toBe(true);
      expect(res.restorationAssetKey).toBe('backgrounds/open_bush_stage_3.png');
    });

    it('does not flip the stage until the threshold is actually crossed', async () => {
      const now = new Date();
      // Seed 3 of 8 finds -> 0.375 (< 0.4) => stage 0. Collect a 4th -> 0.5 => stage 1.
      const seeded = OPEN_BUSH_DISCOVERIES.slice(0, 3).map((d) => `user-1:${d}`);
      withSeed({
        scenes: { 'user-1:open_bush': { kagiso: 6 } },
        discoveries: seeded,
      });

      // ob_tracks_heavy yields 'kolobe', which is index 4 and not yet seeded.
      const res = await service.collect('user-1', 'farm-1', 'ob_tracks_heavy', now);
      expect(res.isNewDiscovery).toBe(true);
      expect(res.restorationStage).toBe(1); // 4/8 = 0.5 -> >= 0.4 -> stage 1
      expect(res.restorationStageChanged).toBe(true);
      expect(res.restorationAssetKey).toBe('backgrounds/open_bush_stage_1.png');
    });
  });

  describe('BushveldConflict wire format (the client tells the two 409s apart)', () => {
    it('serializes reason + etaSeconds so the client can branch', () => {
      const settled = new BushveldConflict('scene_not_settled');
      expect(settled.getStatus()).toBe(409);
      expect(settled.getResponse()).toEqual({ reason: 'scene_not_settled', etaSeconds: null });

      const resting = new BushveldConflict('hotspot_resting', 3600);
      expect(resting.getStatus()).toBe(409);
      expect(resting.getResponse()).toEqual({ reason: 'hotspot_resting', etaSeconds: 3600 });
    });
  });

  describe('Tsholofelo — Doc 11 §2 (perch gate + the daily gift)', () => {
    const NOW = new Date('2026-09-23T10:00:00.000Z'); // 12:00 CAT, day key 2026-09-23

    it('perches when an unlocked scene is settled (kagiso >= 5) and no crop is stalled', async () => {
      // No seeds: every scene is fresh, which means kagiso 6 (04 §4.2).
      const status = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(status.perched).toBe(true);
      expect(status.kagiso).toBe(6);
      expect(status.giftAvailable).toBe(true);
      expect(TSHOLOFELO_DIALOGUE.idle.slice(0, 4)).toContain(status.line);
    });

    it('stays away when every unlocked scene is below 5', async () => {
      withSeed({
        scenes: {
          'user-1:open_bush': { kagiso: 2, updatedAt: NOW.toISOString() },
          'user-1:riverbank': { kagiso: 4, updatedAt: NOW.toISOString() },
          'user-1:rocky_outcrop': { kagiso: 1, updatedAt: NOW.toISOString() },
          'user-1:deep_bushveld': { kagiso: 3, updatedAt: NOW.toISOString() },
        },
      });
      const status = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(status.perched).toBe(false);
      expect(status.kagiso).toBe(4); // the max across unlocked scenes is still reported
      expect(status.line).toBeNull();
      expect(status.giftAvailable).toBe(false);
    });

    it('ignores locked scenes — a settled Deep Bushveld does not count before Botho 300', async () => {
      mockWallet.getBotho.mockResolvedValue(0);
      withSeed({
        scenes: {
          'user-1:open_bush': { kagiso: 0, updatedAt: NOW.toISOString() },
          'user-1:riverbank': { kagiso: 0, updatedAt: NOW.toISOString() },
          'user-1:rocky_outcrop': { kagiso: 0, updatedAt: NOW.toISOString() },
          'user-1:deep_bushveld': { kagiso: 6, updatedAt: NOW.toISOString() },
        },
      });
      const status = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(status.perched).toBe(false);
      expect(status.kagiso).toBe(0);
    });

    it('stays away while any crop is stalled (hydration 0 before maturity), even at kagiso 6', async () => {
      withSeed({
        crops: [{ crop_type: 'watermelon', growth_progress_hours: 0, hydration: 0 }],
      });
      const status = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(status.perched).toBe(false);
    });

    it('a finished crop is not a stall — the perch stays', async () => {
      const cfg = getCropConfig('watermelon')!;
      withSeed({
        crops: [{ crop_type: 'watermelon', growth_progress_hours: cfg.growthHours, hydration: 0 }],
      });
      const status = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(status.perched).toBe(true);
    });

    it('the speech line is deterministic per Botswana day', async () => {
      const a = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      const b = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(a.line).not.toBeNull();
      expect(b.line).toBe(a.line);
    });

    it('claims once per Botswana day: +5 Botho via the capped path, then a no-op', async () => {
      const first = await service.claimTsholofeloBlessing('farm-1', 'user-1', NOW);
      expect(first.claimed).toBe(true);
      expect(first.bothoAwarded).toBe(5);
      expect(mockWallet.creditBothoCapped).toHaveBeenCalledWith(
        'user-1',
        5,
        'tsholofelo_gift',
        undefined,
        NOW,
      );
      const loreInsert = metrics.insertRows.find((r) => r.kind === 'tsholofelo_gift');
      expect(loreInsert.slug).toBe('tsholofelo_gift_2026-09-23');

      // The perch now reports the gift as taken...
      const after = await service.getTsholofeloStatus('farm-1', 'user-1', NOW);
      expect(after.giftAvailable).toBe(false);

      // ...and a second claim the same day is a quiet no-op, never an error.
      const again = await service.claimTsholofeloBlessing('farm-1', 'user-1', NOW);
      expect(again).toEqual({ claimed: false, bothoAwarded: 0, line: first.line });
      expect(mockWallet.creditBothoCapped).toHaveBeenCalledTimes(1);
    });

    it('a new Botswana day opens a new gift', async () => {
      await service.claimTsholofeloBlessing('farm-1', 'user-1', NOW);
      const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
      const again = await service.claimTsholofeloBlessing('farm-1', 'user-1', tomorrow);
      expect(again.claimed).toBe(true);
      expect(mockWallet.creditBothoCapped).toHaveBeenCalledTimes(2);
    });

    it('the day boundary is Botswana time (UTC+2), not UTC', async () => {
      // 22:30 UTC on the 23rd is already 00:30 CAT on the 24th.
      const res = await service.claimTsholofeloBlessing(
        'farm-1',
        'user-1',
        new Date('2026-09-23T22:30:00.000Z'),
      );
      expect(res.claimed).toBe(true);
      const loreInsert = metrics.insertRows.find((r) => r.kind === 'tsholofelo_gift');
      expect(loreInsert.slug).toBe('tsholofelo_gift_2026-09-24');
    });

    it('refuses the gift while Tsholofelo is away, without touching the wallet', async () => {
      withSeed({
        crops: [{ crop_type: 'watermelon', growth_progress_hours: 0, hydration: 0 }],
      });
      const res = await service.claimTsholofeloBlessing('farm-1', 'user-1', NOW);
      expect(res).toEqual({ claimed: false, bothoAwarded: 0, line: 'Tsholofelo is away.' });
      expect(mockWallet.creditBothoCapped).not.toHaveBeenCalled();
    });

    it('a capped-out player still gets the line, just 0 Botho (I4)', async () => {
      mockWallet.creditBothoCapped.mockResolvedValue(0);
      const res = await service.claimTsholofeloBlessing('farm-1', 'user-1', NOW);
      expect(res.claimed).toBe(true);
      expect(res.bothoAwarded).toBe(0);
    });
  });
});
