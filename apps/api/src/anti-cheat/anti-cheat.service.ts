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

    const results = await Promise.all([
      admin.from('player_wallets').select('player_id, pula_balance, botho_points'),
      admin.from('inventory').select('farm_id, item_type, quantity'),
      admin.from('farm_plots').select('id, farm_id, state'),
      admin.from('crop_instances').select('id, plot_id'),
    ]);
    const wallets = results[0].data;
    const inventory = results[1].data;
    const plots = results[2].data;
    const crops = results[3].data;

    const walletRows = (wallets ?? []).map((w) => ({
      playerId: w.player_id as string,
      pulaBalance: Number(w.pula_balance ?? 0),
      bothoPoints: Number(w.botho_points ?? 0),
    }));
    const inventoryRows = (inventory ?? []).map((r) => ({
      farmId: r.farm_id as string,
      itemType: r.item_type as string,
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

    // Resolve farm -> player so market rows carry a playerId.
    const farmOwner = new Map<string, string>();
    for (const f of farms ?? []) farmOwner.set(f.id as string, f.user_id as string);
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
      const observed = await admin
        .from('inventory')
        .select('farm_id, item_type, quantity')
        .gt('quantity', 0);
      const byFarm = new Map<string, Array<{ itemType: string; netGain: number }>>();
      for (const r of observed.data ?? []) {
        const farmId = r.farm_id as string;
        const list = byFarm.get(farmId) ?? [];
        list.push({ itemType: r.item_type as string, netGain: Number(r.quantity ?? 0) });
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


