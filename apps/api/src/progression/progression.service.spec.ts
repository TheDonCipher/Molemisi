import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProgressionService, BOTHO_LADDER } from './progression.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { WaterService } from '../water/water.service';
import { CraftingService } from '../crafting/crafting.service';
import {
  SCENES,
  BOTHO_DAILY_CAP,
  BOTHO_THRESHOLDS,
  DAILY_TOP_UP_CAP_BWP,
  chapterForDate,
  findsForScene,
} from '@molemisi/game-config';

/**
 * P5 — Kgotla and the Three Pillars (05 §P5; 06 P5 checklist).
 *
 * The done-criteria this file exists to prove:
 *  - `GET /progression` carries no level and no XP anywhere (D5/C12).
 *  - The Elder's line CHANGES when tank / weather / season change — it is read
 *    from real state, not a dialogue tree (03 §7).
 *  - Deep Bushveld reports `coming_soon` at Botho >= 300 rather than a 403.
 */
describe('ProgressionService — P5', () => {
  let service: ProgressionService;

  const mockSupabaseService = { getAdminClient: jest.fn() };

  const mockWalletService = {
    getWallet: jest.fn().mockResolvedValue({ pula_balance: 1250, botho_points: 120 }),
    getBotho: jest.fn().mockResolvedValue(120),
    topUpTotalToday: jest.fn().mockResolvedValue(0),
    bothoEarnedToday: jest.fn().mockResolvedValue(0),
    contributedToday: jest.fn().mockResolvedValue(0),
  };

  const mockWaterService = {
    getTankStatus: jest
      .fn()
      .mockResolvedValue({ hasTank: true, waterLevel: 45, capacity: 60, state: 'ACTIVE' }),
  };

  const mockCraftingService = {
    listJobs: jest.fn().mockResolvedValue([]),
  };

  /** Rows returned per table. Everything the service reads is a plain list. */
  function adminFor(rows: Record<string, Array<Record<string, unknown>> | null>) {
    return {
      from: jest.fn((table: string) => {
        const result = rows[table] ?? [];
        // `farms` is the only single-row read; everything else is a list.
        if (table === 'farms') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: result[0] ?? null, error: null }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: result, error: null }),
          }),
        };
      }),
    };
  }

  const FARM = { id: 'farm-1', user_id: 'user-1', weather_state: 'clear' };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseService.getAdminClient.mockReturnValue(adminFor({ farms: [FARM] }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressionService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: WaterService, useValue: mockWaterService },
        { provide: CraftingService, useValue: mockCraftingService },
      ],
    }).compile();

    service = module.get<ProgressionService>(ProgressionService);
  });

  // ==================================================================
  // GET /progression
  // ==================================================================
  describe('getProgression', () => {
    it('returns pula, botho and journal — and no level or XP anywhere (D5/C12)', async () => {
      const view = await service.getProgression('user-1');

      expect(Object.keys(view).sort()).toEqual(['botho', 'journal', 'pula']);

      // XP and levels are retired (D5). If either ever reappears in a response,
      // a client will start rendering a progression system that no longer exists.
      const serialised = JSON.stringify(view).toLowerCase();
      expect(serialised).not.toContain('"level"');
      expect(serialised).not.toContain('"xp"');
      expect(serialised).not.toContain('experience');
      expect(serialised).not.toContain('level');
    });

    it('reports the Pula balance and the daily top-up allowance (R4)', async () => {
      mockWalletService.topUpTotalToday.mockResolvedValueOnce(120);

      const { pula } = await service.getProgression('user-1');

      expect(pula.balance).toBe(1250);
      expect(pula.topUpUsedToday).toBe(120);
      expect(pula.topUpCap).toBe(DAILY_TOP_UP_CAP_BWP);
      expect(pula.topUpRemaining).toBe(DAILY_TOP_UP_CAP_BWP - 120);
    });

    it('never reports a negative top-up allowance', async () => {
      mockWalletService.topUpTotalToday.mockResolvedValueOnce(DAILY_TOP_UP_CAP_BWP + 500);
      const { pula } = await service.getProgression('user-1');
      expect(pula.topUpRemaining).toBe(0);
    });

    it('names the next rung of the Botho ladder and how far away it is', async () => {
      mockWalletService.getWallet.mockResolvedValueOnce({
        pula_balance: 0,
        botho_points: 120,
      });

      const { botho } = await service.getProgression('user-1');

      expect(botho.current).toBe(120);
      // 120 is past Bupi (100) but short of Deep Bushveld (300).
      expect(botho.next).toEqual({
        key: 'DEEP_BUSHVELD',
        value: BOTHO_THRESHOLDS.DEEP_BUSHVELD,
        remaining: 180,
      });
      expect(botho.thresholds).toEqual({ ...BOTHO_THRESHOLDS });
    });

    it('has no next rung once the ladder is climbed', async () => {
      mockWalletService.getWallet.mockResolvedValueOnce({
        pula_balance: 0,
        botho_points: BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY,
      });

      const { botho } = await service.getProgression('user-1');
      expect(botho.next).toBeNull();
    });

    it('surfaces the Botho daily cap that gates the prize (I4)', async () => {
      mockWalletService.bothoEarnedToday.mockResolvedValueOnce(20);

      const { botho } = await service.getProgression('user-1');

      expect(botho.earnedToday).toBe(20);
      expect(botho.dailyCap).toBe(BOTHO_DAILY_CAP);
      expect(botho.remainingToday).toBe(BOTHO_DAILY_CAP - 20);
    });

    it('orders the ladder the way a player meets it', () => {
      const values = BOTHO_LADDER.map((r) => r.value);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    });
  });

  // ==================================================================
  // Journal
  // ==================================================================
  describe('journalProgress', () => {
    it('counts only scenes that actually have something to find', async () => {
      const { totalPages } = await service.journalProgress('user-1');

      // Deep Bushveld ships with zero hotspots (04 §11), so it is not a page —
      // otherwise every player would read "1 of 4 complete" before doing anything.
      const withFinds = SCENES.filter((s) => findsForScene(s.slug).length > 0);
      expect(totalPages).toBe(withFinds.length);
      expect(totalPages).toBeLessThan(SCENES.length);
    });

    it('completes a page only when every distinct find in it is discovered', async () => {
      const scene = SCENES.filter((s) => findsForScene(s.slug).length > 0)[0]!;
      const finds = findsForScene(scene.slug);
      const allButOne = finds
        .slice(0, -1)
        .map((f) => ({ scene_id: scene.slug, discovery_slug: f.discovery }));

      mockSupabaseService.getAdminClient.mockReturnValue(
        adminFor({ field_journal_entries: allButOne }),
      );
      await expect(service.journalProgress('user-1')).resolves.toMatchObject({
        pagesComplete: 0,
      });

      mockSupabaseService.getAdminClient.mockReturnValue(
        adminFor({
          field_journal_entries: finds.map((f) => ({
            scene_id: scene.slug,
            discovery_slug: f.discovery,
          })),
        }),
      );
      await expect(service.journalProgress('user-1')).resolves.toMatchObject({
        pagesComplete: 1,
      });
    });

    it('starts at zero for a player who has discovered nothing', async () => {
      await expect(service.journalProgress('user-1')).resolves.toEqual({
        pagesComplete: 0,
        totalPages: expect.any(Number),
      });
    });
  });

  // ==================================================================
  // The Elder — 03 §7
  // ==================================================================
  describe("getElderGuidance — reads real state, not a dialogue tree", () => {
    /** A calm farm: tank comfortably full, nothing waiting. */
    function calm(overrides: Partial<Record<string, unknown>> = {}) {
      mockWaterService.getTankStatus.mockResolvedValue({
        hasTank: true,
        waterLevel: 45,
        capacity: 60,
        state: 'ACTIVE',
        ...(overrides.tank as object | undefined),
      });
      mockSupabaseService.getAdminClient.mockReturnValue(
        adminFor({
          farms: [{ ...FARM, ...(overrides.farm as object | undefined) }],
          farm_plots: (overrides.plots as Array<Record<string, unknown>>) ?? [],
          crop_instances: (overrides.crops as Array<Record<string, unknown>>) ?? [],
        }),
      );
      mockCraftingService.listJobs.mockResolvedValue(
        (overrides.jobs as Array<Record<string, unknown>>) ?? [],
      );
      mockWalletService.contributedToday.mockResolvedValue(
        (overrides.contributedToday as number) ?? 0,
      );
    }

    // The done-criterion: change one input, get a different line.
    it('changes its line when the tank empties', async () => {
      calm();
      const watered = await service.getElderGuidance('farm-1');

      calm({ tank: { waterLevel: 0 } });
      const dry = await service.getElderGuidance('farm-1');

      expect(dry.id).toBe('tank_empty');
      expect(dry.id).not.toBe(watered.id);
    });

    it('changes its line when the tank runs low but is not empty', async () => {
      calm({ tank: { waterLevel: 6 } }); // 10% — below the 25% rule
      await expect(service.getElderGuidance('farm-1')).resolves.toMatchObject({
        id: 'tank_low',
      });
    });

    it('changes its line when the weather turns to rain', async () => {
      calm();
      const clear = await service.getElderGuidance('farm-1');

      calm({ farm: { weather_state: 'rain' } });
      const raining = await service.getElderGuidance('farm-1');

      expect(raining.id).toBe('rain');
      expect(raining.id).not.toBe(clear.id);
    });

    it('speaks of the dry season in the dry season', async () => {
      // May–July is moriti (04 §9.1). The season comes off the real calendar,
      // not a per-farm clock, which is what makes this line reachable.
      const drySeason = new Date('2026-06-15T10:00:00Z');
      expect(chapterForDate(drySeason).slug).toBe('moriti');

      calm();
      await expect(service.getElderGuidance('farm-1', drySeason)).resolves.toMatchObject({
        id: 'drought',
      });
    });

    it('speaks of thirsty crops before a merely low tank', async () => {
      // A dry crop is the more urgent truth, so it outranks tank_low.
      calm({
        tank: { waterLevel: 30, capacity: 60 },
        crops: [{ crop_type: 'sorghum', growth_progress_hours: 2, hydration: 0 }],
      });

      await expect(service.getElderGuidance('farm-1')).resolves.toMatchObject({
        id: 'crops_thirsty',
      });
    });

    it('sends the player to collect finished work', async () => {
      calm({
        jobs: [
          {
            id: 'job-1',
            collected: false,
            readyAt: new Date(Date.now() - 60_000).toISOString(),
          },
        ],
      });

      await expect(service.getElderGuidance('farm-1')).resolves.toMatchObject({
        id: 'crafts_ready',
      });
    });

    it('mentions a harvest that is standing in the field', async () => {
      calm({ plots: [{ state: 'READY' }] });
      await expect(service.getElderGuidance('farm-1')).resolves.toMatchObject({
        id: 'harvest_ready',
      });
    });

    it('remembers a day the player gave to the Kgotla', async () => {
      calm({ contributedToday: 50 });
      await expect(service.getElderGuidance('farm-1')).resolves.toMatchObject({
        id: 'community',
      });
    });

    it('falls back to the plain line on a calm, ordinary day', async () => {
      const wetSeason = new Date('2026-01-15T10:00:00Z'); // pula, not moriti
      calm();
      await expect(service.getElderGuidance('farm-1', wetSeason)).resolves.toMatchObject({
        id: 'default',
      });
    });

    it('returns the snapshot it reasoned from, so the client can show its work', async () => {
      calm({ tank: { waterLevel: 30, capacity: 60 } });
      const guidance = await service.getElderGuidance('farm-1');
      expect(guidance.snapshot).toMatchObject({ tankPct: 50, weather: 'clear' });
    });

    it('throws NotFoundException for a farm that does not exist', async () => {
      mockSupabaseService.getAdminClient.mockReturnValue(adminFor({ farms: [] }));
      await expect(service.getElderGuidance('farm-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  // ==================================================================
  // Scene access
  // ==================================================================
  describe('getSceneAccess', () => {
    const deepBushveld = () =>
      service.getSceneAccess('user-1').then((rows) => {
        const row = rows.find((s) => s.slug === 'deep_bushveld');
        if (!row) throw new Error('deep_bushveld missing from SCENES');
        return row;
      });

    it('locks Deep Bushveld below 300 Botho', async () => {
      mockWalletService.getBotho.mockResolvedValueOnce(BOTHO_THRESHOLDS.DEEP_BUSHVELD - 1);

      await expect(deepBushveld()).resolves.toMatchObject({
        unlocked: false,
        comingSoon: false,
        bothoRequired: BOTHO_THRESHOLDS.DEEP_BUSHVELD,
      });
    });

    it('unlocks at 300 Botho and says coming_soon rather than 403 (05 §P5)', async () => {
      mockWalletService.getBotho.mockResolvedValueOnce(BOTHO_THRESHOLDS.DEEP_BUSHVELD);

      // It is unlocked, but ships with no hotspots — so the client is told to
      // show "coming soon". A 403 would tell the player nothing.
      await expect(deepBushveld()).resolves.toMatchObject({
        unlocked: true,
        comingSoon: true,
        hasContent: false,
      });
    });

    it('never reports coming_soon for a scene that is still locked', async () => {
      mockWalletService.getBotho.mockResolvedValueOnce(0);

      const rows = await service.getSceneAccess('user-1');
      for (const row of rows) {
        if (!row.unlocked) expect(row.comingSoon).toBe(false);
      }
    });

    it('lists every scene with the standing it costs', async () => {
      mockWalletService.getBotho.mockResolvedValueOnce(0);

      const rows = await service.getSceneAccess('user-1');
      expect(rows).toHaveLength(SCENES.length);
      for (const row of rows) {
        expect(typeof row.bothoRequired).toBe('number');
        expect(row.name.length).toBeGreaterThan(0);
      }
    });
  });
});
