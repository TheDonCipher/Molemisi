/**
 * Anti-cheat service — orchestration for the pure rules in ./rules.ts.
 *
 * Responsibilities (13 §4, §9, §8):
 *   1. PASSIVE  — sweep for impossible states (negative balances/inventory,
 *                 orphan crops) and persist a flag per finding.
 *   2. ACTIVE   — scan the ledger + market for rapid gains, cost bypasses and
 *                 market manipulation over a rolling window.
 *   3. AUDIT    — every flag is both inserted into `anti_cheat_flags` AND
 *                 written to the Nest logger, so the trail survives a
 *                 truncated table.
 *
 * Flags are REVIEW signals, not verdicts: detection is separate from action,
 * and nothing here ever mutates player state (13 §9 "flag, review").
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  detectCostBypass,
  detectMarketManipulation,
  detectNegativeBalances,
  detectNegativeInventory,
  detectOrphanCrops,
  detectRapidGains,
  detectResourceWithoutSource,
  detectSequenceViolations,
  type Flag,
  type LedgerRow,
  type MarketTrade,
} from './rules';
import {
  describeIssues,
  planRecovery,
  validateGameState,
  type GameStateSnapshot,
} from '../simulation/state-validation';

/** Default tuning. Raised above anything legal play produces, so flags mean review. */
export const ANTICHEAT_THRESHOLDS = {
  /** Rolling window for credit-sum scans. */
  rapidGainWindowHours: 24,
  /** Pula credited in that window that triggers a rapid-gain flag. */
  maxCreditPulaPerDay: 10_000,
  /** Buy→sell within this many seconds of the same item is a flip. */
  minFlipSeconds: 300,
  /** 02 §4.1 price band, as a MULTIPLIER of the item's base price. */
  priceBandMin: 0.5,
  priceBandMax: 2.0,
} as const;

export interface RunOptions {
  now?: Date;
  rapidGainWindowHours?: number;
  maxCreditPulaPerDay?: number;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(private supabase: SupabaseService) {}

  /** Sweep every account for impossible states (13 §4). */
  async runPassiveChecks(opts: RunOptions = {}): Promise<Flag[]> {
    const now = (opts.now ?? new Date()).toISOString();
    const admin = this.supabase.getAdminClient();

    // C2 (security audit 2026-10-02) — read the CANONICAL store.
    //
    // This used to sweep the legacy farm-scoped `inventory` table, which migration
    // 20260908000020 retired and 20260923000031 emptied of livestock products: no
    // code has written to it since the P3 cutover, so `detectNegativeInventory` and
    // `detectResourceWithoutSource` could never fire on real corruption — they were
    // inert, and their specs passed only because the fixtures matched the wrong
    // table's shape. `player_inventory` (player-scoped, `item_def_id` FK) is the
    // store every harvest, tap and craft actually lands in.
    //
    // Two extra reads resolve player-scoped rows into the (farmId, itemType) shape
    // the pure rules judge: item_def_id -> slug, and player -> farm.
    const results = await Promise.all([
      admin.from('player_wallets').select('player_id, pula_balance, botho_points'),
      admin.from('player_inventory').select('player_id, item_def_id, quantity'),
      admin.from('farm_plots').select('id, farm_id, state'),
      admin.from('crop_instances').select('id, plot_id'),
      admin.from('item_definitions').select('id, slug'),
      admin.from('farms').select('id, user_id'),
    ]);
    const wallets = results[0].data;
    const inventory = results[1].data;
    const plots = results[2].data;
    const crops = results[3].data;
    const defs = results[4].data;
    const farms = results[5].data;

    const slugByDefId = new Map<string, string>();
    for (const d of defs ?? []) slugByDefId.set(d.id as string, d.slug as string);
    const farmByPlayer = new Map<string, string>();
    for (const f of farms ?? []) farmByPlayer.set(f.user_id as string, f.id as string);

    const walletRows = (wallets ?? []).map((w) => ({
      playerId: w.player_id as string,
      pulaBalance: Number(w.pula_balance ?? 0),
      bothoPoints: Number(w.botho_points ?? 0),
    }));
    const inventoryRows = (inventory ?? []).map((r) => ({
      farmId: farmByPlayer.get(r.player_id as string) ?? null,
      itemType: slugByDefId.get(r.item_def_id as string) ?? (r.item_def_id as string),
      quantity: Number(r.quantity ?? 0),
    }));
    const cropPlotIds = new Set((crops ?? []).map((c) => c.plot_id as string));
    const plotRows = (plots ?? []).map((p) => ({
      plotId: p.id as string,
      farmId: p.farm_id as string,
      state: p.state as string,
      hasCrop: cropPlotIds.has(p.id as string),
    }));

    const flags = [
      ...detectNegativeBalances(walletRows, now),
      ...detectNegativeInventory(inventoryRows, now),
      ...detectOrphanCrops(plotRows, now),
    ];

    return this.persist(flags, now);
  }

  /**
   * Scan the rolling window for active abuse. `creditedByItem` lets callers
   * supply the item inflows that ARE ledger-backed, so unexplained inventory
   * growth is separable from normal play.
   */
  async runActiveChecks(
    opts: RunOptions & {
      windowHours?: number;
      minFlipSeconds?: number;
      priceBandMin?: number;
      priceBandMax?: number;
      /** farmId -> item inflows the ledger already accounts for. */
      creditedByItem?: Map<string, Array<{ itemType: string; netGain: number }>>;
    } = {},
  ): Promise<Flag[]> {
    const now = (opts.now ?? new Date()).toISOString();
    const windowHours =
      opts.windowHours ?? opts.rapidGainWindowHours ?? ANTICHEAT_THRESHOLDS.rapidGainWindowHours;
    const maxCredit = opts.maxCreditPulaPerDay ?? ANTICHEAT_THRESHOLDS.maxCreditPulaPerDay;
    const minFlip = opts.minFlipSeconds ?? ANTICHEAT_THRESHOLDS.minFlipSeconds;
    const bandMin = opts.priceBandMin ?? ANTICHEAT_THRESHOLDS.priceBandMin;
    const bandMax = opts.priceBandMax ?? ANTICHEAT_THRESHOLDS.priceBandMax;

    const since = new Date(Date.parse(now) - windowHours * 3_600_000).toISOString();
    const admin = this.supabase.getAdminClient();

    const results = await Promise.all([
      admin
        .from('ledger_entries')
        .select('player_id, currency, amount, source, ref_id, created_at')
        .gte('created_at', since),
      admin
        .from('market_transactions')
        .select('farm_id, transaction_type, item_type, quantity, price_per_unit, created_at')
        .gte('created_at', since),
      admin.from('farms').select('id, user_id'),
      // Needed to NORMALISE `price_per_unit` (absolute Pula) into the
      // 0.5–2.0x band the manipulation rule judges (02 §4.1). Without this the
      // rule compares absolute prices to a multiplier band and flags every
      // legal trade. Unknown items default to 1.0 (at par — unjudgeable).
      admin.from('market_prices').select('item_type, base_price'),
    ]);
    const ledger = results[0].data;
    const trades = results[1].data;
    const farms = results[2].data;
    const prices = results[3].data;

    const ledgerRows: LedgerRow[] = (ledger ?? []).map((r) => ({
      playerId: r.player_id as string,
      currency: r.currency as 'pula' | 'botho',
      amount: Number(r.amount ?? 0),
      source: r.source as string,
      refId: (r.ref_id as string | null) ?? null,
      createdAt: r.created_at as string,
    }));

    // Resolve farm <-> player so market rows carry a playerId and player-scoped
    // inventory rows can be attributed back to a farm (C2).
    const farmOwner = new Map<string, string>();
    const farmByPlayer = new Map<string, string>();
    for (const f of farms ?? []) {
      farmOwner.set(f.id as string, f.user_id as string);
      farmByPlayer.set(f.user_id as string, f.id as string);
    }
    const baseByItem = new Map<string, number>();
    for (const p of prices ?? []) baseByItem.set(p.item_type as string, Number(p.base_price ?? 0));

    const tradesRows: MarketTrade[] = (trades ?? []).map((r) => {
      const farmId = r.farm_id as string;
      const itemType = r.item_type as string;
      const unit = Number(r.price_per_unit ?? 0);
      const base = Number(baseByItem.get(itemType) ?? 0);
      return {
        playerId: farmOwner.get(farmId) ?? '',
        farmId,
        itemType,
        side: r.transaction_type === 'BUY' ? 'buy' : 'sell',
        quantity: Number(r.quantity ?? 0),
        // Normalised multiplier vs the catalogue baseline (02 §4.1 band).
        price: base > 0 ? unit / base : 1,
        createdAt: r.created_at as string,
      };
    });

    const flags: Flag[] = [
      ...detectRapidGains(ledgerRows, { windowHours, maxCreditPula: maxCredit }, now),
      ...detectMarketManipulation(tradesRows, { minFlipSeconds: minFlip, bandMin, bandMax }, now),
    ];

    if (opts.creditedByItem) {
      // C2 — the canonical store, same fix as runPassiveChecks. Observed stock is
      // read from `player_inventory` and resolved to (farm, slug) so it can be
      // compared against the ledger-backed inflows the caller supplied.
      const [observed, defs] = await Promise.all([
        admin.from('player_inventory').select('player_id, item_def_id, quantity').gt('quantity', 0),
        admin.from('item_definitions').select('id, slug'),
      ]);
      const slugByDefId = new Map<string, string>();
      for (const d of defs.data ?? []) slugByDefId.set(d.id as string, d.slug as string);

      const byFarm = new Map<string, Array<{ itemType: string; netGain: number }>>();
      for (const r of observed.data ?? []) {
        const farmId = farmByPlayer.get(r.player_id as string);
        if (!farmId) continue; // no farm row -> nothing to attribute
        const list = byFarm.get(farmId) ?? [];
        list.push({
          itemType: slugByDefId.get(r.item_def_id as string) ?? (r.item_def_id as string),
          netGain: Number(r.quantity ?? 0),
        });
        byFarm.set(farmId, list);
      }
      for (const [farmId, observedItems] of byFarm) {
        flags.push(
          ...detectResourceWithoutSource(
            farmId,
            observedItems,
            opts.creditedByItem.get(farmId) ?? [],
            now,
          ),
        );
      }
    }

    return this.persist(flags, now);
  }

  /** Persist one batch of flags (table + audit log) and return what was stored. */
  async persist(flags: readonly Flag[], nowIso?: string): Promise<Flag[]> {
    if (flags.length === 0) return [];

    for (const f of flags) {
      this.logger.warn(
        `anti-cheat ${f.kind} [${f.severity}] player=${f.playerId ?? '-'} farm=${f.farmId ?? '-'} ${JSON.stringify(f.evidence)}`,
      );
    }

    const rows = flags.map((f) => ({
      player_id: f.playerId,
      farm_id: f.farmId,
      kind: f.kind,
      severity: f.severity,
      evidence: f.evidence,
      detected_at: f.detectedAt || nowIso || new Date().toISOString(),
    }));

    const { error } = await this.supabase.getAdminClient().from('anti_cheat_flags').insert(rows);
    if (error) {
      // Flags are already in the log; a failed insert must not abort the sweep.
      this.logger.error(`failed to persist anti-cheat flags: ${error.message}`);
    }
    return [...flags];
  }

  /** Most recent flags, newest first. */
  async listFlags(opts: { playerId?: string; limit?: number } = {}): Promise<unknown[]> {
    const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
    let query = this.supabase
      .getAdminClient()
      .from('anti_cheat_flags')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);
    if (opts.playerId) query = query.eq('player_id', opts.playerId);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`failed to read anti-cheat flags: ${error.message}`);
      return [];
    }
    return data ?? [];
  }

  /** Record a rejected action as a sequence-violation flag (13 §4). */
  async recordRejectedAction(
    playerId: string,
    farmId: string,
    action: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<void> {
    const nowIso = now.toISOString();
    const flags = detectSequenceViolations(
      [{ playerId, farmId, action, ok: false, reason }],
      nowIso,
    );
    await this.persist(flags, nowIso);
  }

  /**
   * A8 (security audit 2026-10-03) — run the pure state validator over live
   * farm state and turn every finding into a review flag.
   *
   * WHY THIS EXISTS. `simulation/state-validation.ts` was written, specified in
   * 11 §5, and given its own passing spec — but nothing in the running service
   * ever CALLED it. Its module docstring says both halves are pure "so they can
   * run inside the anti-cheat pass"; that never happened. The result was a
   * validation module that was green in CI and inert in production: a farm whose
   * `last_simulated_at` had drifted years into the future, or that carried a
   * crop row on an EMPTY plot, produced no flag and no incident note, because
   * nothing looked.
   *
   * WHY IT IS A SEPARATE METHOD rather than folded into `runPassiveChecks`. The
   * passive sweep answers "is this state impossible?" from the rule module's own
   * rows. This one answers 11 §5's question — "is this state VALID, and what
   * should be done about it?" — and, uniquely, it produces a RECOVERY PLAN via
   * `planRecovery`, which the flag row carries so a reviewer (or a future
   * automated repair job) knows the corrective action without re-deriving it.
   * Keeping it separate also means the existing passive specs keep asserting
   * exactly what they asserted before.
   *
   * NOTHING IS MUTATED. 13 §9 is explicit that flags are review signals, never
   * verdicts, and `planRecovery` output is deliberately NOT applied here. A
   * `SET_CURRENCY_ZERO` action executed automatically would destroy a player's
   * balance on the strength of one bad row — detection and action must stay
   * separate, and the plan travels in the evidence so the decision is made where
   * a human makes it.
   */
  async runStateValidation(opts: RunOptions = {}): Promise<Flag[]> {
    const now = opts.now ?? new Date();
    const nowIso = now.toISOString();
    const admin = this.supabase.getAdminClient();

    // The same six reads the passive sweep makes, deliberately: the validator
    // judges exactly the tables the corruption rules judge, so reading anything
    // else would either miss corruption or invent it.
    const results = await Promise.all([
      admin.from('player_wallets').select('player_id, pula_balance, botho_points'),
      admin.from('player_inventory').select('player_id, item_def_id, quantity'),
      admin.from('farm_plots').select('id, farm_id, state'),
      admin.from('crop_instances').select('id, plot_id'),
      admin.from('item_definitions').select('id, slug'),
      admin.from('farms').select('id, user_id, last_simulated_at'),
    ]);
    const wallets = results[0].data;
    const inventory = results[1].data;
    const plots = results[2].data;
    const crops = results[3].data;
    const defs = results[4].data;
    const farms = results[5].data;

    const slugByDefId = new Map<string, string>();
    for (const d of defs ?? []) slugByDefId.set(d.id as string, d.slug as string);

    const walletByPlayer = new Map<string, { currency: number; botho: number }>();
    for (const w of wallets ?? []) {
      walletByPlayer.set(w.player_id as string, {
        currency: Number(w.pula_balance ?? 0),
        botho: Number(w.botho_points ?? 0),
      });
    }

    const plotsByFarm = new Map<string, Array<Record<string, unknown>>>();
    for (const p of plots ?? []) {
      const farmId = p.farm_id as string;
      if (!plotsByFarm.has(farmId)) plotsByFarm.set(farmId, []);
      plotsByFarm.get(farmId)!.push(p as Record<string, unknown>);
    }

    const cropIdByPlot = new Map<string, string>();
    for (const c of crops ?? []) cropIdByPlot.set(c.plot_id as string, c.id as string);

    const inventoryByPlayer = new Map<string, Array<{ itemType: string; quantity: number }>>();
    for (const r of inventory ?? []) {
      const playerId = r.player_id as string;
      if (!inventoryByPlayer.has(playerId)) inventoryByPlayer.set(playerId, []);
      inventoryByPlayer.get(playerId)!.push({
        itemType: slugByDefId.get(r.item_def_id as string) ?? (r.item_def_id as string),
        quantity: Number(r.quantity ?? 0),
      });
    }

    const flags: Flag[] = [];
    for (const farm of farms ?? []) {
      flags.push(
        ...this.validateOneFarm(farm as Record<string, unknown>, {
          plotsByFarm,
          cropIdByPlot,
          inventoryByPlayer,
          walletByPlayer,
          now,
          nowIso,
        }),
      );
    }

    return this.persist(flags, nowIso);
  }

  /**
   * A8 — the per-farm half of `runStateValidation`, split out so the snapshot
   * assembly above stays readable and so the decision "is this farm corrupt,
   * and how badly" lives in one place.
   */
  private validateOneFarm(
    farm: Record<string, unknown>,
    ctx: {
      plotsByFarm: Map<string, Array<Record<string, unknown>>>;
      cropIdByPlot: Map<string, string>;
      inventoryByPlayer: Map<string, Array<{ itemType: string; quantity: number }>>;
      walletByPlayer: Map<string, { currency: number; botho: number }>;
      now: Date;
      nowIso: string;
    },
  ): Flag[] {
    const farmId = farm.id as string;
    const playerId = farm.user_id as string;
    const wallet = ctx.walletByPlayer.get(playerId);

    // One snapshot PER FARM. Most of the validator's codes are cross-field: a
    // plot is corrupt only in relation to its crop row, and a farm is stale only
    // in relation to `last_simulated_at`. A merged global view would judge every
    // plot on the install against every crop row anywhere.
    const snapshot: GameStateSnapshot = {
      farmId,
      playerId,
      // A farm with no wallet row is a corrupt balance of 0 rather than a skip:
      // the player exists and holds no Pula, and the validator's job is to
      // describe the state as found, not to normalise it first.
      currency: wallet?.currency ?? 0,
      botho: wallet?.botho ?? 0,
      plots: (ctx.plotsByFarm.get(farmId) ?? []).map((p) => ({
        id: p.id as string,
        state: (p.state as string) ?? 'EMPTY',
        cropId: ctx.cropIdByPlot.get(p.id as string) ?? null,
      })),
      inventory: ctx.inventoryByPlayer.get(playerId) ?? [],
      lastSimulatedAt: (farm.last_simulated_at as string | null) ?? null,
    };

    const result = validateGameState(snapshot, ctx.now);
    if (result.valid) return [];

    // The recovery plan is what makes this more than a duplicate of the passive
    // sweep: it names the corrective action for each finding, so a reviewer does
    // not have to know what STALE_SIMULATION implies.
    const recovery = planRecovery(result);

    return [
      {
        kind: 'corrupted_state',
        // A future-dated sim clock is a tamper signal, not a glitch, so it is
        // rated with the severity the passive sweep gives an impossible balance.
        // Everything else here is degradation.
        severity: result.issues.some((i) => i.code === 'FUTURE_SIMULATION')
          ? 'critical'
          : 'high',
        playerId,
        farmId,
        evidence: {
          code: result.issues.map((i) => i.code).join(','),
          issues: result.issues.map((i) => ({ code: i.code, entity: i.entity ?? null })),
          recovery: recovery.map((a) => a.kind),
          report: describeIssues(result),
        },
        detectedAt: ctx.nowIso,
      },
    ];
  }

  /** Cost-bypass sweep: build/craft events with no matching debit row. */
  async runCostBypassCheck(
    events: Array<{
      kind: 'build' | 'craft' | 'upgrade';
      playerId: string;
      farmId: string;
      refId: string;
      expectedCost: number;
    }>,
    opts: RunOptions & { windowHours?: number } = {},
  ): Promise<Flag[]> {
    const now = (opts.now ?? new Date()).toISOString();
    const windowHours = opts.windowHours ?? ANTICHEAT_THRESHOLDS.rapidGainWindowHours;
    const since = new Date(Date.parse(now) - windowHours * 3_600_000).toISOString();
    const { data: ledger } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('player_id, currency, amount, source, ref_id, created_at')
      .gte('created_at', since);

    const rows: LedgerRow[] = (ledger ?? []).map((r) => ({
      playerId: r.player_id as string,
      currency: r.currency as 'pula' | 'botho',
      amount: Number(r.amount ?? 0),
      source: r.source as string,
      refId: (r.ref_id as string | null) ?? null,
      createdAt: r.created_at as string,
    }));

    return this.persist(detectCostBypass(events, rows, now), now);
  }
}


