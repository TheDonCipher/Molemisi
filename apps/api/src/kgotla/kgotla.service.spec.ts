import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KgotlaService } from './kgotla.service';
import { SupabaseService } from '../database/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import { ChapterService } from '../chapters/chapter.service';
import { makeDb, clientFor, type MockDb } from '../test/supabase-mock';
import {
  KGOTLA_DAILY_CONTRIBUTION_CAP,
  KGOTLA_DAILY_CHARGE_POOL,
  REGARD_DECAY,
  CROP_IDS,
  getItemDef,
  sourcesForItem,
} from '@molemisi/game-config';

/**
 * Kgotla — docs/Screens/Kgotla/SPEC.md.
 *
 * The previous spec PINNED the exploit: it asserted `completeQuest` credited 50
 * Pula per call. That test is gone because the method is gone. What replaces it
 * are the acceptance criteria that make the screen honest:
 *
 *   AC-01 no sequence of taps inside the Kgotla increases Pula
 *   AC-02 at most 3 charges per farm per day, and one per elder
 *   AC-03 turn-in requires an objective satisfied outside the Kgotla
 *   AC-04 no project reward promises an effect on other farmers
 *   AC-15 regard decays −2 per idle 7-day period, once, floored at 0
 *
 * The REAL WalletService runs against the shared mock DB, so Pula and Botho are
 * proven to move (or not) rather than asserted on a spy.
 */
describe('KgotlaService — charges, pool and decay (SPEC §4.1, §5, §6)', () => {
  let service: KgotlaService;
  let db: any;

  /** Fixed instant: 12:00 CAT on 2026-09-23. The Botswana day is 2026-09-23. */
  const NOW = new Date('2026-09-23T10:00:00.000Z');
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

  const inventory = {
    countOwned: jest.fn().mockResolvedValue(0),
    removeItem: jest.fn().mockResolvedValue(undefined),
    addItem: jest.fn(),
  };
  const chapters = { addTokens: jest.fn().mockResolvedValue(5) };

  const walletRow = () =>
    (db.player_wallets as any[]).find((r) => r.player_id === 'user-1');
  const pula = () => Number(walletRow()?.pula_balance ?? 0);
  const botho = () => Number(walletRow()?.botho_points ?? 0);

  beforeEach(async () => {
    jest.clearAllMocks();
    inventory.countOwned.mockResolvedValue(0);
    inventory.removeItem.mockResolvedValue(undefined);
    chapters.addTokens.mockResolvedValue(5);

    db = makeDb({ farms: [{ id: 'farm-1', user_id: 'user-1' }] });
    db.npc_reputation = [];
    db.kgotla_quests = [];
    db.kgotla_projects = [];

    const client = clientFor(db as MockDb);
    const supabase = { getAdminClient: () => client, getClient: () => client };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KgotlaService,
        { provide: SupabaseService, useValue: supabase },
        WalletService,
        { provide: InventoryService, useValue: inventory },
        { provide: ChapterService, useValue: chapters },
      ],
    }).compile();

    service = module.get<KgotlaService>(KgotlaService);
  });

  // ------------------------------------------------------------------
  // SPEC §5.2 caveat — "do not invent slugs". Asserted at build time so a
  // typo in the charge table fails CI instead of failing at turn-in.
  // ------------------------------------------------------------------
  describe('charge definitions', () => {
    it('every errand slug is a real item in the catalogue', () => {
      const errands = KgotlaService.allCharges().filter((c) => c.kind === 'errand');
      expect(errands.length).toBeGreaterThan(0);
      for (const c of errands) {
        if (c.itemSlug) {
          expect(getItemDef(c.itemSlug)).toBeDefined();
        }
        for (const slug of c.rotate ?? []) {
          expect(getItemDef(slug)).toBeDefined();
        }
      }
    });

    it('offers one charge per elder, and only for known elders', () => {
      for (const npcId of [
        'elder_neo',
        'mama_naledi',
        'oupa_kabelo',
        'refilwe',
        'thabo',
      ]) {
        expect(service.chargeDef(npcId)).toBeDefined();
      }
      expect(service.chargeDef('no-such-elder')).toBeUndefined();
    });

    // --------------------------------------------------------------
    // Reconciliation with the inventory / crafting / market catalogue:
    // an elder may only ask for something that EXISTS, can be OBTAINED,
    // and can be HELD in the quantity asked. Asserted at build time so
    // catalogue drift fails CI instead of failing a player at turn-in.
    // --------------------------------------------------------------
    it('every errand ask fits inside one inventory stack', () => {
      for (const c of KgotlaService.allCharges().filter(
        (c) => c.kind === 'errand',
      )) {
        const slugs = [c.itemSlug, ...(c.rotate ?? [])].filter(
          (s): s is string => Boolean(s),
        );
        for (const slug of slugs) {
          expect(c.targetQty).toBeLessThanOrEqual(getItemDef(slug)!.maxStack);
        }
      }
    });

    it('every errand item is obtainable in the world (grow / gather / craft)', () => {
      // sourcesForItem walks crops, bushveld hotspots, crafting recipes and
      // buildings — an empty list means the elder asks for the ungettable.
      for (const c of KgotlaService.allCharges().filter(
        (c) => c.kind === 'errand',
      )) {
        const slugs = [c.itemSlug, ...(c.rotate ?? [])].filter(
          (s): s is string => Boolean(s),
        );
        for (const slug of slugs) {
          expect(sourcesForItem(slug).length).toBeGreaterThan(0);
        }
      }
    });

    it("Thabo's rotation only names real, growable crops", () => {
      const thabo = KgotlaService.allCharges().find((c) => c.npcId === 'thabo');
      expect(thabo?.rotate?.length).toBeGreaterThan(0);
      for (const slug of thabo!.rotate!) {
        expect(CROP_IDS).toContain(slug);
      }
    });

    it('a contribute charge is always completable inside the daily cap', () => {
      for (const c of KgotlaService.allCharges().filter(
        (c) => c.kind === 'contribute',
      )) {
        expect(c.targetQty).toBeLessThanOrEqual(KGOTLA_DAILY_CONTRIBUTION_CAP);
      }
    });
  });

  // ------------------------------------------------------------------
  // AC-01 — the whole point of the rewrite. Tapping must not mint Pula.
  // ------------------------------------------------------------------
  describe('AC-01 — no payout for tapping', () => {
    it('accepting a charge moves no balance at all', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);
      expect(pula()).toBe(0);
      expect(botho()).toBe(0);
    });

    it('a freshly accepted charge reports objective progress, never regard', async () => {
      // Regression: acceptCharge once passed the player's REGARD as `progress`,
      // so a high-standing elder's fresh charge could report `ready` before a
      // single item was delivered. Regard 40, 2 thatch in the bag, asked 4.
      db.npc_reputation.push({
        id: 'rep-1',
        farm_id: 'farm-1',
        npc_id: 'refilwe',
        reputation: 40,
      });
      inventory.countOwned.mockResolvedValue(2);

      const res = await service.acceptCharge('farm-1', 'user-1', 'refilwe', NOW);
      expect(res.charge.status).toBe('active');
      expect(res.charge.progress).toBe(2);
      expect(res.charge.ready).toBe(false);
    });

    it('turning in an unfinished charge pays nothing and consumes nothing', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);
      inventory.countOwned.mockResolvedValue(3); // asked 6, have 3

      await expect(
        service.turnInCharge('farm-1', 'user-1', 'oupa_kabelo', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(pula()).toBe(0);
      expect(botho()).toBe(0);
      expect(inventory.removeItem).not.toHaveBeenCalled();
      expect(chapters.addTokens).not.toHaveBeenCalled();
    });

    it('turning in with no charge accepted at all is rejected', async () => {
      await expect(
        service.turnInCharge('farm-1', 'user-1', 'thabo', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pula()).toBe(0);
    });

    it('rejects an unknown elder before touching anything', async () => {
      await expect(
        service.acceptCharge('farm-1', 'user-1', 'no-such-elder', NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.kgotla_quests).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  // AC-02 — the shared pool of three, and one charge per elder per day.
  // ------------------------------------------------------------------
  describe('AC-02 — the shared pool', () => {
    it('allows exactly KGOTLA_DAILY_CHARGE_POOL charges and rejects the next', async () => {
      const elders = ['elder_neo', 'mama_naledi', 'oupa_kabelo', 'refilwe'];
      for (let i = 0; i < KGOTLA_DAILY_CHARGE_POOL; i++) {
        await service.acceptCharge('farm-1', 'user-1', elders[i]!, NOW);
      }
      expect(db.kgotla_quests).toHaveLength(KGOTLA_DAILY_CHARGE_POOL);

      await expect(
        service.acceptCharge('farm-1', 'user-1', elders[3]!, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.kgotla_quests).toHaveLength(KGOTLA_DAILY_CHARGE_POOL);
    });

    it('rejects a second charge from the same elder on the same day', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'thabo', NOW);
      await expect(
        service.acceptCharge('farm-1', 'user-1', 'thabo', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.kgotla_quests).toHaveLength(1);
    });

    it('reports the pool the board renders (AC-16)', async () => {
      const empty = await service.getChargeBoard('farm-1', 'user-1', NOW);
      expect(empty.poolTotal).toBe(KGOTLA_DAILY_CHARGE_POOL);
      expect(empty.poolRemaining).toBe(KGOTLA_DAILY_CHARGE_POOL);
      expect(empty.charges).toHaveLength(5);

      await service.acceptCharge('farm-1', 'user-1', 'thabo', NOW);
      const one = await service.getChargeBoard('farm-1', 'user-1', NOW);
      expect(one.poolUsed).toBe(1);
      expect(one.poolRemaining).toBe(KGOTLA_DAILY_CHARGE_POOL - 1);
      // The accepted elder is now 'active'; the rest are still only offers.
      const thabo = one.charges.find((c) => c.npcId === 'thabo')!;
      expect(thabo.status).toBe('active');
      expect(one.charges.filter((c) => c.status === 'none')).toHaveLength(4);
    });

    it('a new Botswana day refills the pool', async () => {
      for (const id of ['elder_neo', 'mama_naledi', 'oupa_kabelo']) {
        await service.acceptCharge('farm-1', 'user-1', id, NOW);
      }
      const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
      await expect(
        service.acceptCharge('farm-1', 'user-1', 'refilwe', tomorrow),
      ).resolves.toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // AC-03 — the objective must be satisfied by state recorded elsewhere.
  // ------------------------------------------------------------------
  describe('AC-03 — turn-in settles against the outside world', () => {
    it('consumes the errand goods and pays Pula + capped Botho', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);
      inventory.countOwned.mockResolvedValue(6);

      const result = await service.turnInCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);

      expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'poleto', 6);
      expect(result.consumed).toEqual({ slug: 'poleto', qty: 6 });
      expect(result.pulaReward).toBe(12);
      expect(result.bothoReward).toBe(10);
      expect(pula()).toBe(12);
      expect(botho()).toBe(10);
      expect(result.reputationGain).toBe(10);
    });

    it('consumes only what was asked for, not the whole stack', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'refilwe', NOW);
      inventory.countOwned.mockResolvedValue(40); // hoarder

      await service.turnInCharge('farm-1', 'user-1', 'refilwe', NOW);

      expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'thatch', 4);
    });

    it('cannot be turned in twice', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);
      inventory.countOwned.mockResolvedValue(6);
      await service.turnInCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);

      await expect(
        service.turnInCharge('farm-1', 'user-1', 'oupa_kabelo', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Pula must not double.
      expect(pula()).toBe(12);
    });

    it('a volume charge is measured from the ledger, not from the bag', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'mama_naledi', NOW);

      // 60 Pula of Co-op sales recorded AFTER acceptance (source coop_sale).
      (db.ledger_entries as any[]).push({
        player_id: 'user-1',
        currency: 'pula',
        amount: 60,
        balance_after: 60,
        source: 'coop_sale',
        created_at: new Date(NOW.getTime() + 60_000).toISOString(),
      });

      const result = await service.turnInCharge(
        'farm-1',
        'user-1',
        'mama_naledi',
        NOW,
      );
      expect(result.pulaReward).toBe(12);
      expect(inventory.removeItem).not.toHaveBeenCalled();
    });

    it('sales recorded BEFORE acceptance do not count', async () => {
      (db.ledger_entries as any[]).push({
        player_id: 'user-1',
        currency: 'pula',
        amount: 999,
        balance_after: 999,
        source: 'coop_sale',
        created_at: daysAgo(1).toISOString(),
      });

      await service.acceptCharge('farm-1', 'user-1', 'mama_naledi', NOW);
      await expect(
        service.turnInCharge('farm-1', 'user-1', 'mama_naledi', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a farming charge keeps the crop it was accepted with', async () => {
      const res = await service.acceptCharge('farm-1', 'user-1', 'thabo', NOW);
      const slug = res.charge.objective.itemSlug;
      expect(slug).toBeTruthy();

      // Same day, so the rotation must not drift under the player.
      const board = await service.getChargeBoard('farm-1', 'user-1', NOW);
      expect(board.charges.find((c) => c.npcId === 'thabo')!.objective.itemSlug).toBe(
        slug,
      );
    });
  });

  // ------------------------------------------------------------------
  // AC-15 — decay: −2 per full 7-day idle period, once, floored at 0.
  // ------------------------------------------------------------------
  describe('AC-15 — regard decay (SPEC §4.1)', () => {
    const seed = (reputation: number, lastChargeAt: Date | null) => {
      (db.npc_reputation as any[]).push({
        id: 'rep-1',
        farm_id: 'farm-1',
        user_id: 'user-1',
        npc_id: 'thabo',
        reputation,
        last_charge_at: lastChargeAt ? lastChargeAt.toISOString() : null,
      });
    };
    const thabo = async (now = NOW) =>
      (await service.getNPCs('farm-1', 'user-1', now)).find((n) => n.id === 'thabo')!;

    it('charges one period after 7 idle days', async () => {
      seed(30, daysAgo(7));
      expect((await thabo()).reputation).toBe(30 - REGARD_DECAY.points);
    });

    it('charges three periods after 21 idle days', async () => {
      seed(30, daysAgo(21));
      expect((await thabo()).reputation).toBe(30 - 3 * REGARD_DECAY.points);
    });

    it('does not charge for a partial period', async () => {
      seed(30, daysAgo(6));
      expect((await thabo()).reputation).toBe(30);
    });

    it('is idempotent — reading twice charges once', async () => {
      seed(30, daysAgo(7));
      expect((await thabo()).reputation).toBe(28);
      expect((await thabo()).reputation).toBe(28);
    });

    it('never drives regard below zero', async () => {
      seed(1, daysAgo(365));
      expect((await thabo()).reputation).toBe(0);
    });

    it('does not punish a player whose clock was never started', async () => {
      seed(30, null);
      expect((await thabo()).reputation).toBe(30);
    });

    it('warns when the next period is within the warning window', async () => {
      seed(30, daysAgo(7 - 1)); // 6 days + 23h elapsed → <24h to go
      const almost = new Date(daysAgo(7 - 1).getTime() + (7 * 24 - 1) * 60 * 60 * 1000);
      expect((await thabo(almost)).decayWarning).toBe(true);
    });

    it('does not warn about a period that is nowhere near elapsing', async () => {
      seed(30, NOW);
      expect((await thabo()).decayWarning).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // Regard gain + tier maths (SPEC §4).
  // ------------------------------------------------------------------
  describe('regard and tiers', () => {
    it('grants +10 with the elder and reports the new tier', async () => {
      await service.acceptCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);
      inventory.countOwned.mockResolvedValue(6);
      const result = await service.turnInCharge('farm-1', 'user-1', 'oupa_kabelo', NOW);

      expect(result.reputation).toBe(10);
      expect(result.tier).toBe('Acquaintance');
    });

    it('reports progress to the next tier on every seat (AC-05)', async () => {
      const npcs = await service.getNPCs('farm-1', 'user-1', NOW);
      for (const npc of npcs) {
        expect(npc.tier).toBe('Acquaintance');
        expect(npc.toNext).toBe(25);
        expect(npc.nextTier).toBe('Friend');
      }
    });

    it('honours questAvailable only while the pool has room (§5.1)', async () => {
      // Pin `now`: acceptCharge writes today's rows at NOW, so talkToNPC must
      // read the same Botswana day or this test only passes on 2026-09-23.
      const open = await service.talkToNPC('farm-1', 'user-1', 'thabo', NOW);
      expect(open.questAvailable).toBe(true);

      for (const id of ['elder_neo', 'mama_naledi', 'oupa_kabelo']) {
        await service.acceptCharge('farm-1', 'user-1', id, NOW);
      }
      const spent = await service.talkToNPC('farm-1', 'user-1', 'thabo', NOW);
      expect(spent.questAvailable).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // AC-04 — honest, per-farm project rewards.
  // ------------------------------------------------------------------
  describe('AC-04 — honest project rewards', () => {
    it('never promises an effect on other farmers', async () => {
      const projects = await service.getProjects('farm-1');
      for (const p of projects) {
        expect(p.reward).not.toMatch(/all farmers/i);
      }
    });

    it('the three retired village-wide strings are gone from the live copy', async () => {
      const retired = [
        'All farmers gain +10% water efficiency',
        'All farmers gain +5% XP from all actions',
        'All farmers gain +5% sell prices',
      ];
      const rewards = (await service.getProjects('farm-1')).map((p) => p.reward);
      expect(rewards.length).toBeGreaterThan(0);
      for (const copy of rewards) {
        expect(retired).not.toContain(copy);
      }
    });

    it('grants the reward once, when the farm’s own bar first fills', async () => {
      (db.player_wallets as any[]).push({
        player_id: 'user-1',
        pula_balance: 1000,
        botho_points: 0,
      });

      await service.donateToProject('farm-1', 'user-1', 'water_reservoir', 100, NOW);
      expect(chapters.addTokens).toHaveBeenCalledWith('user-1', 5, NOW);

      // A second donation past the threshold must not pay out again.
      await service.donateToProject('farm-1', 'user-1', 'water_reservoir', 50, NOW);
      expect(chapters.addTokens).toHaveBeenCalledTimes(1);
    });

    it('does not grant before the bar is full', async () => {
      (db.player_wallets as any[]).push({
        player_id: 'user-1',
        pula_balance: 1000,
        botho_points: 0,
      });

      await service.donateToProject('farm-1', 'user-1', 'water_reservoir', 30, NOW);
      expect(chapters.addTokens).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // AC-07 — the allowance must be visible BEFORE any donation is made.
  // ------------------------------------------------------------------
  describe('AC-07 — the contribution allowance is readable up front', () => {
    it('reports the full allowance on a first read, with nothing donated', async () => {
      const view = await service.getProjectsView('farm-1', 'user-1', NOW);
      expect(view.contribution).toEqual({
        contributedToday: 0,
        dailyCap: KGOTLA_DAILY_CONTRIBUTION_CAP,
        remainingToday: KGOTLA_DAILY_CONTRIBUTION_CAP,
      });
      expect(view.projects.length).toBeGreaterThan(0);
    });

    it('reflects a donation made earlier the same day', async () => {
      (db.player_wallets as any[]).push({
        player_id: 'user-1',
        pula_balance: 1000,
        botho_points: 0,
      });
      await service.donateToProject('farm-1', 'user-1', 'water_reservoir', 30, NOW);

      const view = await service.getProjectsView('farm-1', 'user-1', NOW);
      expect(view.contribution.contributedToday).toBe(30);
      expect(view.contribution.remainingToday).toBe(
        KGOTLA_DAILY_CONTRIBUTION_CAP - 30,
      );
    });
  });

  // ------------------------------------------------------------------
  // Donations: the Letsema sink, its daily cap, and amount validation.
  // ------------------------------------------------------------------
  describe('donateToProject (02 §9, 05 §P2/P5)', () => {
    it('spends Pula via the wallet and earns capped Botho', async () => {
      (db.player_wallets as any[]).push({
        player_id: 'user-1',
        pula_balance: 1000,
        botho_points: 0,
      });

      const result = await service.donateToProject(
        'farm-1',
        'user-1',
        'water_reservoir',
        30,
        NOW,
      );
      expect(result.bothoReward).toBe(30);
      expect(botho()).toBe(30);
      expect(result.contributedToday).toBe(30);
      expect(result.dailyCap).toBe(KGOTLA_DAILY_CONTRIBUTION_CAP);
      expect(result.remainingToday).toBe(KGOTLA_DAILY_CONTRIBUTION_CAP - 30);
    });

    it('throws NotFoundException for an unknown project and spends nothing', async () => {
      await expect(
        service.donateToProject('farm-1', 'user-1', 'no-such-project', 10, NOW),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(pula()).toBe(0);
    });

    it('rejects a donation that would exceed the daily cap', async () => {
      (db.player_wallets as any[]).push({
        player_id: 'user-1',
        pula_balance: 5000,
        botho_points: 0,
      });
      await service.donateToProject(
        'farm-1',
        'user-1',
        'water_reservoir',
        KGOTLA_DAILY_CONTRIBUTION_CAP,
        NOW,
      );
      await expect(
        service.donateToProject('farm-1', 'user-1', 'school', 1, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['negative (would mint Pula)', -100],
      ['zero', 0],
      ['fractional', 12.5],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['a string', '50' as unknown as number],
    ])('rejects %s and never touches the wallet', async (_label, amount) => {
      await expect(
        service.donateToProject('farm-1', 'user-1', 'water_reservoir', amount, NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(botho()).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // Doc 11 4 - Nako ya Go Arogana (The Village Feast): social currency only.
  // The three load-bearing rules: capped Botho via the wallet (I4), NEVER Pula,
  // and the cosmetic is granted once (idempotent re-donations).
  // ------------------------------------------------------------------
  describe('village feast (Doc 11 4)', () => {
    it('takes exactly 20 watermelons, credits capped Botho, and never Pula', async () => {
      const result = await service.donateVillageFeast('farm-1', 'user-1');

      expect(result).toMatchObject({
        donated: 20,
        cropType: 'watermelon',
        cosmeticId: 'feast_fence',
        cosmeticGranted: true,
        pulaAwarded: 0,
      });
      // The bag is checked first (removeItem fails loudly before any grant).
      expect(inventory.removeItem).toHaveBeenCalledWith('user-1', 'watermelon', 20);
      // I4 - Botho flows only through the capped path; the request was 100,
      // the legal day still governs (BOTHO_DAILY_CAP = 50).
      expect(result.bothoAwarded).toBeGreaterThan(0);
      expect(result.bothoAwarded).toBeLessThanOrEqual(50);
      expect(botho()).toBe(result.bothoAwarded);
      // Sharing is a social act: Pula NEVER moves.
      expect(pula()).toBe(0);
    });

    it('refuses anything but exactly 20 watermelons before touching the bag', async () => {
      await expect(
        service.donateVillageFeast('farm-1', 'user-1', 'watermelon', 19),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.donateVillageFeast('farm-1', 'user-1', 'sorghum', 20),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(inventory.removeItem).not.toHaveBeenCalled();
      expect(botho()).toBe(0);
      expect(pula()).toBe(0);
    });

    it('grants the cosmetic once - re-donating is fine, never a dup, never Pula', async () => {
      const first = await service.donateVillageFeast('farm-1', 'user-1');
      expect(first.cosmeticGranted).toBe(true);

      const second = await service.donateVillageFeast('farm-1', 'user-1');
      expect(second.cosmeticGranted).toBe(false);
      expect(second.donated).toBe(20);
      // Botho is capped: the second feast of the day may earn 0 - still no Pula.
      expect(pula()).toBe(0);
    });

    it('grants the Friend of the Feast honour once, and getFeastStatus reports both', async () => {
      const first = await service.donateVillageFeast('farm-1', 'user-1');
      expect(first.titleId).toBe('friend_of_the_feast');

      // The honour is a single lore row - cosmetic-adjacent, never a currency.
      const lore = db.lore_entries as Array<Record<string, unknown>>;
      const rows = () => lore.filter((r) => r.kind === 'village_feast');
      expect(rows()).toHaveLength(1);
      expect(rows()[0]).toMatchObject({
        player_id: 'user-1',
        slug: 'friend_of_the_feast',
        is_original: false,
      });

      // Re-feasting never duplicates the honour.
      const second = await service.donateVillageFeast('farm-1', 'user-1');
      expect(second.titleId).toBe('friend_of_the_feast');
      expect(rows()).toHaveLength(1);

      await expect(service.getFeastStatus('user-1')).resolves.toEqual({
        hasFeastFence: true,
        isFriendOfTheFeast: true,
      });
    });

    it('getFeastStatus reports nothing for a player who never feasted', async () => {
      await expect(service.getFeastStatus('user-1')).resolves.toEqual({
        hasFeastFence: false,
        isFriendOfTheFeast: false,
      });
    });

    it('getFeastStatus reads the fence and the honour independently', async () => {
      (db.player_cosmetics as Array<Record<string, unknown>>).push({
        player_id: 'user-1',
        cosmetic_id: 'feast_fence',
      });
      const status = await service.getFeastStatus('user-1');
      expect(status.hasFeastFence).toBe(true);
      expect(status.isFriendOfTheFeast).toBe(false);
    });
  });
});
