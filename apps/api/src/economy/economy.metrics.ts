/**
 * Economy metrics — PURE calculations behind the analysis endpoints.
 *
 * Kept free of I/O so they can be asserted with fixture arrays (16 §6 "Economy
 * Balance"). The Supabase-backed `EconomyService` is a thin adapter that feeds
 * these functions, so the maths is tested once, not once per query.
 */

/** The four money-in-question facts the dashboard asks for first. */
export interface WealthSummary {
  count: number;
  total: number;
  mean: number;
  min: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  max: number;
  /** Gini coefficient in [0, 1]. 0 = perfect equality, 1 = one holder owns all. */
  gini: number;
}

/** Ascending percentile (linear interpolation), tolerant of empty input. */
export function percentile(sortedAscending: readonly number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const rank = (p / 100) * (sortedAscending.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAscending[lo]!;
  const frac = rank - lo;
  return sortedAscending[lo]! + frac * (sortedAscending[hi]! - sortedAscending[lo]!);
}

/**
 * Standard Gini over a sample of non-negative values (empirical definition):
 *   gini = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n + 1) / n
 * for x sorted ascending. Returns 0 for a single holder or an empty sample.
 */
export function giniCoefficient(values: readonly number[]): number {
  const xs = values.filter((v) => Number.isFinite(v) && v >= 0).slice().sort((a, b) => a - b);
  const n = xs.length;
  if (n <= 1) return 0;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (i + 1) * xs[i]!;
  return (2 * weighted) / (n * sum) - (n + 1) / n;
}

/** Distribution shape for a set of balances (percentile bands + Gini). */
export function summarizeBalances(balances: readonly number[]): WealthSummary {
  const xs = balances.filter((v) => Number.isFinite(v));
  const sorted = xs.slice().sort((a, b) => a - b);
  const total = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    total,
    mean: sorted.length > 0 ? total / sorted.length : 0,
    min: sorted[0] ?? 0,
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    max: sorted[sorted.length - 1] ?? 0,
    gini: giniCoefficient(sorted),
  };
}

/**
 * Relative price change between two averages: (current - baseline) / baseline.
 * Positive = inflation, negative = deflation. `baseline` of 0 is undefined, so
 * this returns 0 rather than dividing by zero.
 */
export function inflationRate(baseline: number, current: number): number {
  if (!Number.isFinite(baseline) || baseline === 0) return 0;
  return (current - baseline) / baseline;
}

/** How far a price sits from its catalogue baseline, as a ratio. */
export function priceDrift(current: number, base: number): number {
  return inflationRate(base, current);
}

export type SupplyFlag = 'oversupplied' | 'balanced' | 'undersupplied';

/**
 * Over/under-supply of a crop. Ratios are deliberately simple and loud:
 *   supply > 1.5x demand  -> oversupplied (prices should fall, sellers eat it)
 *   supply < 0.67x demand -> undersupplied (prices should rise, buyers bid up)
 * Demand of 0 with stock means oversupply; stock 0 with demand means shortage.
 */
export function supplyFlag(supply: number, demand: number): SupplyFlag {
  const s = Math.max(0, supply);
  const d = Math.max(0, demand);
  if (d === 0) return s > 0 ? 'oversupplied' : 'balanced';
  const ratio = s / d;
  if (ratio > 1.5) return 'oversupplied';
  if (ratio < 0.67) return 'undersupplied';
  return 'balanced';
}

export interface TransactionVelocity {
  /** Total ledger movements (credits + debits) in the window. */
  transactionCount: number;
  /** Absolute Pula volume moved in the window. */
  volumePula: number;
  /** transactionCount / days. */
  transactionsPerDay: number;
  /** volumePula / days. */
  volumePerDay: number;
  days: number;
}

export interface VelocityEntry {
  currency: string;
  amount: number;
  createdAt: string;
}

/** Volume + counts per day over the window ending at `now`. */
export function transactionVelocity(
  entries: readonly VelocityEntry[],
  now: Date,
  days: number,
): TransactionVelocity {
  const cutoff = now.getTime() - days * 86_400_000;
  let transactionCount = 0;
  let volumePula = 0;
  for (const e of entries) {
    const t = Date.parse(e.createdAt);
    if (!Number.isFinite(t) || t < cutoff || t > now.getTime()) continue;
    transactionCount += 1;
    if (e.currency === 'pula') volumePula += Math.abs(e.amount);
  }
  return {
    transactionCount,
    volumePula,
    transactionsPerDay: days > 0 ? transactionCount / days : 0,
    volumePerDay: days > 0 ? volumePula / days : 0,
    days,
  };
}

export interface ProgressionStep {
  step: string;
  reached: number;
  advanced: number;
  /** advanced / reached, clamped to [0, 1]. 1 when nothing reached the step. */
  retention: number;
}

/** What callers supply before `progressionBottlenecks` computes retention. */
export type ProgressionStepInput = Omit<ProgressionStep, 'retention'>;

/** A bottleneck is a step where progressions stack up; retention scores it. */
export function progressionBottlenecks(
  steps: readonly ProgressionStepInput[],
): ProgressionStep[] {
  return steps.map((s) => ({
    ...s,
    retention: s.reached <= 0 ? 1 : Math.max(0, Math.min(1, s.advanced / s.reached)),
  }));
}
