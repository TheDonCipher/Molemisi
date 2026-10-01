/**
 * Economy-analysis service — the queryable face of the game's economy health.
 *
 * Answers the questions in the brief (§5 "Analyze economy health"):
 *   - total currency in circulation,
 *   - wealth distribution (percentile bands + Gini),
 *   - inflation/deflation (price change per item, per day),
 *   - transaction velocity (volume + count per day),
 *   - item price drift from the catalogue baseline,
 *   - over/under-supply of key crops,
 *   - progression bottlenecks.
 *
 * Design: all maths lives in ./economy.metrics.ts (pure, unit-tested). This
 * service only reads rows and adapts them. Every method is read-only — nothing
 * here mutates game state.
 *
 * Views defined in the companion migration (`economy_currency_supply`,
 * `economy_wealth_distribution`, `economy_transaction_velocity`) expose the
 * same numbers in SQL for dashboards; this service recomputes in-process so it
 * works whether or not the views are deployed and can be asserted in Jest.
 */

import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import {
  inflationRate,
  priceDrift,
  progressionBottlenecks,
  supplyFlag,
  transactionVelocity,
  summarizeBalances,
  type ProgressionStep,
  type ProgressionStepInput,
  type SupplyFlag,
  type TransactionVelocity,
  type WealthSummary,
} from './economy.metrics';

export interface CurrencySupply {
  totalPula: number;
  totalBotho: number;
  walletCount: number;
  /** Net new Pula minted/burned over the window, from the ledger. */
  netFlowPula: number;
  createdPula: number;
  destroyedPula: number;
  windowDays: number;
}

export interface PriceDriftRow {
  itemType: string;
  itemName: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  /** (current - base) / base. */
  drift: number;
  supply: number;
  demand: number;
  supplyState: SupplyFlag;
}

export interface InflationReport {
  days: number;
  /** Aggregate % change in the basket over the window. */
  rate: number;
  perItem: Array<{ itemType: string; baseline: number; current: number; change: number }>;
  insufficientData: boolean;
}

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);

  constructor(private supabase: SupabaseService) {}

  /** Total currency in circulation (the money-supply number). */
  async getCurrencySupply(opts: { now?: Date; windowDays?: number } = {}): Promise<CurrencySupply> {
    const now = opts.now ?? new Date();
    const windowDays = opts.windowDays ?? 7;
    const since = new Date(now.getTime() - windowDays * 86_400_000).toISOString();
    const admin = this.supabase.getAdminClient();

    const results = await Promise.all([
      admin.from('player_wallets').select('pula_balance, botho_points'),
      admin.from('ledger_entries').select('currency, amount, created_at').gte('created_at', since),
    ]);
    const wallets = results[0].data ?? [];
    const ledger = results[1].data ?? [];

    let totalPula = 0;
    let totalBotho = 0;
    for (const w of wallets) {
      totalPula += Number(w.pula_balance ?? 0);
      totalBotho += Number(w.botho_points ?? 0);
    }

    let createdPula = 0;
    let destroyedPula = 0;
    for (const l of ledger) {
      if (l.currency !== 'pula') continue;
      const amt = Number(l.amount ?? 0);
      if (amt > 0) createdPula += amt;
      else destroyedPula += -amt;
    }

    return {
      totalPula,
      totalBotho,
      walletCount: wallets.length,
      createdPula,
      destroyedPula,
      netFlowPula: createdPula - destroyedPula,
      windowDays,
    };
  }

  /** Wealth distribution across all wallets — bands + Gini (0..1). */
  async getWealthDistribution(): Promise<WealthSummary> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('player_wallets')
      .select('pula_balance');
    if (error) {
      this.logger.error(`wealth distribution read failed: ${error.message}`);
      return summarizeBalances([]);
    }
    return summarizeBalances((data ?? []).map((w) => Number(w.pula_balance ?? 0)));
  }

  /** Transaction volume and count per day over a window. */
  async getTransactionVelocity(
    opts: { now?: Date; days?: number } = {},
  ): Promise<TransactionVelocity> {
    const now = opts.now ?? new Date();
    const days = opts.days ?? 7;
    const since = new Date(now.getTime() - days * 86_400_000).toISOString();
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('ledger_entries')
      .select('currency, amount, created_at')
      .gte('created_at', since);
    if (error) {
      this.logger.error(`velocity read failed: ${error.message}`);
      return transactionVelocity([], now, days);
    }
    return transactionVelocity(
      (data ?? []).map((r) => ({
        currency: String(r.currency),
        amount: Number(r.amount ?? 0),
        createdAt: String(r.created_at),
      })),
      now,
      days,
    );
  }

  /** Every catalogued item's live price vs its baseline + supply/demand state. */
  async getItemPriceDrift(): Promise<PriceDriftRow[]> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('market_prices')
      .select('item_type, item_name, category, base_price, current_price, supply, demand');
    if (error) {
      this.logger.error(`price drift read failed: ${error.message}`);
      return [];
    }
    return (data ?? []).map((r) => {
      const base = Number(r.base_price ?? 0);
      const current = Number(r.current_price ?? 0);
      const supply = Number(r.supply ?? 0);
      const demand = Number(r.demand ?? 0);
      return {
        itemType: String(r.item_type),
        itemName: String(r.item_name ?? r.item_type),
        category: String(r.category ?? ''),
        basePrice: base,
        currentPrice: current,
        drift: priceDrift(current, base),
        supply,
        demand,
        supplyState: supplyFlag(supply, demand),
      };
    });
  }

  /**
   * Per-item price change over a window, from `economy_price_snapshots`
   * (written by the companion migration). Falls back to an "insufficient data"
   * report when no history exists yet rather than inventing a rate.
   */
  async getInflation(opts: { now?: Date; days?: number } = {}): Promise<InflationReport> {
    const now = opts.now ?? new Date();
    const days = opts.days ?? 7;
    const startIso = new Date(now.getTime() - days * 86_400_000).toISOString();

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('economy_price_snapshots')
      .select('item_type, avg_price, snapshot_at')
      .gte('snapshot_at', startIso)
      .order('snapshot_at', { ascending: true });

    if (error || !data || data.length < 2) {
      return { days, rate: 0, perItem: [], insufficientData: true };
    }

    // First vs last snapshot per item inside the window.
    const first = new Map<string, number>();
    const last = new Map<string, number>();
    for (const row of data) {
      const item = String(row.item_type);
      const price = Number(row.avg_price ?? 0);
      if (!first.has(item)) first.set(item, price);
      last.set(item, price);
    }

    const perItem: InflationReport['perItem'] = [];
    for (const [itemType, baseline] of first) {
      const current = last.get(itemType);
      if (current === undefined) continue;
      perItem.push({ itemType, baseline, current, change: inflationRate(baseline, current) });
    }
    if (perItem.length === 0) return { days, rate: 0, perItem: [], insufficientData: true };

    const baselineAvg = perItem.reduce((s, p) => s + p.baseline, 0) / perItem.length;
    const currentAvg = perItem.reduce((s, p) => s + p.current, 0) / perItem.length;
    return {
      days,
      rate: inflationRate(baselineAvg, currentAvg),
      perItem,
      insufficientData: false,
    };
  }

  /** Crops (and products) whose supply/demand says over- or under-stocked. */
  async getCropSupplyFlags(): Promise<
    Array<{ itemType: string; supplyState: SupplyFlag; supply: number; demand: number }>
  > {
    const rows = await this.getItemPriceDrift();
    return rows
      .filter((r) => r.category === 'crop' || r.category === 'product')
      .map((r) => ({
        itemType: r.itemType,
        supplyState: r.supplyState,
        supply: r.supply,
        demand: r.demand,
      }));
  }

  /**
   * Progression bottlenecks: where players stall. The land ladder is the
   * clearest signal (4 -> 8 -> 12 -> 20 plots); `retention = advanced/reached`
   * is the share of players who got past a rung. A retention far below the
   * others marks the tier that is pricing players out (24 §7 tracks this same
   * tier-3 jump risk).
   */
  async getProgressionBottlenecks(): Promise<ProgressionStep[]> {
    const admin = this.supabase.getAdminClient();
    const results = await Promise.all([
      admin.from('farms').select('plot_count'),
      admin.from('buildings').select('farm_id, state'),
    ]);
    const farms = results[0].data ?? [];
    const buildings = results[1].data ?? [];

    const plotCounts = farms.map((f) => Number(f.plot_count ?? 4));
    const atLeast = (n: number) => plotCounts.filter((c) => c >= n).length;
    const activeBuildings = buildings.filter((b) => b.state === 'ACTIVE').length;

    const steps: ProgressionStepInput[] = [
      { step: 'land: 4 -> 8 plots', reached: atLeast(4), advanced: atLeast(8) },
      { step: 'land: 8 -> 12 plots', reached: atLeast(8), advanced: atLeast(12) },
      { step: 'land: 12 -> 20 plots', reached: atLeast(12), advanced: atLeast(20) },
      {
        step: 'buildings: constructed -> ACTIVE',
        reached: buildings.length,
        advanced: activeBuildings,
      },
    ];
    return progressionBottlenecks(steps);
  }

  /**
   * One call for a dashboard / admin screen. Read-only, and every sub-report
   * still returns its own (possibly empty) shape if a source table is missing.
   */
  async getOverview(opts: { now?: Date; days?: number } = {}): Promise<{
    generatedAt: string;
    supply: CurrencySupply;
    wealth: WealthSummary;
    velocity: TransactionVelocity;
    prices: PriceDriftRow[];
    inflation: InflationReport;
    cropSupply: Array<{ itemType: string; supplyState: SupplyFlag; supply: number; demand: number }>;
    progression: ProgressionStep[];
  }> {
    const now = opts.now ?? new Date();
    const days = opts.days ?? 7;
    const results = await Promise.all([
      this.getCurrencySupply({ now, windowDays: days }),
      this.getWealthDistribution(),
      this.getTransactionVelocity({ now, days }),
      this.getItemPriceDrift(),
      this.getInflation({ now, days }),
      this.getCropSupplyFlags(),
      this.getProgressionBottlenecks(),
    ]);
    return {
      generatedAt: now.toISOString(),
      supply: results[0],
      wealth: results[1],
      velocity: results[2],
      prices: results[3],
      inflation: results[4],
      cropSupply: results[5],
      progression: results[6],
    };
  }
}



