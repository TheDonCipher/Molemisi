/**
 * Economy metric tests (16 §6 "Economy Balance").
 *
 * These are the pure functions behind the dashboard, so a change in threshold
 * or formula fails here rather than showing up as a quietly wrong chart.
 */

import {
  giniCoefficient,
  percentile,
  summarizeBalances,
  inflationRate,
  priceDrift,
  supplyFlag,
  transactionVelocity,
  progressionBottlenecks,
} from './economy.metrics';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('percentile', () => {
  it('interpolates between neighbours', () => {
    const xs = [10, 20, 30, 40, 50];
    expect(percentile(xs, 50)).toBe(30);
    expect(percentile(xs, 25)).toBe(20);
    expect(percentile(xs, 90)).toBeCloseTo(46, 5);
  });

  it('handles a single value and an empty sample', () => {
    expect(percentile([7], 90)).toBe(7);
    expect(percentile([], 50)).toBe(0);
  });
});

describe('giniCoefficient', () => {
  it('is 0 when everyone holds the same amount', () => {
    expect(giniCoefficient([100, 100, 100, 100])).toBeCloseTo(0, 6);
  });

  it('approaches 1 when one holder owns nearly everything', () => {
    const xs = [...Array(99).fill(0), 1_000_000];
    expect(giniCoefficient(xs)).toBeGreaterThan(0.9);
    expect(giniCoefficient(xs)).toBeLessThanOrEqual(1);
  });

  it('is between 0 and 1 for a skewed sample', () => {
    const g = giniCoefficient([10, 20, 40, 80, 160, 320]);
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
  });

  it('ignores negative / non-finite values and returns 0 for <2 samples', () => {
    expect(giniCoefficient([])).toBe(0);
    expect(giniCoefficient([50])).toBe(0);
    expect(giniCoefficient([10, -5, Number.NaN, 20])).toBeGreaterThanOrEqual(0);
    expect(giniCoefficient([0, 0, 0])).toBe(0); // all zero: defined as 0
  });
});

describe('summarizeBalances', () => {
  it('reports count, total, bands and Gini', () => {
    const s = summarizeBalances([100, 200, 300, 400, 1000]);
    expect(s.count).toBe(5);
    expect(s.total).toBe(2000);
    expect(s.mean).toBe(400);
    expect(s.min).toBe(100);
    expect(s.max).toBe(1000);
    expect(s.p50).toBe(300);
    expect(s.gini).toBeGreaterThan(0);
    expect(s.gini).toBeLessThan(1);
  });

  it('returns a zeroed summary for no wallets', () => {
    const s = summarizeBalances([]);
    expect(s).toMatchObject({ count: 0, total: 0, mean: 0, gini: 0, max: 0 });
  });
});

describe('inflation / drift', () => {
  it('inflationRate is positive for a rise, negative for a fall', () => {
    expect(inflationRate(100, 120)).toBeCloseTo(0.2, 6);
    expect(inflationRate(100, 80)).toBeCloseTo(-0.2, 6);
    expect(inflationRate(100, 100)).toBe(0);
    expect(inflationRate(0, 50)).toBe(0); // no baseline => no rate (never /0)
  });

  it('priceDrift is the same ratio against a catalogue baseline', () => {
    expect(priceDrift(15, 10)).toBeCloseTo(0.5, 6);
    expect(priceDrift(5, 10)).toBeCloseTo(-0.5, 6);
  });
});

describe('supplyFlag', () => {
  it('flags over-supply when supply far exceeds demand', () => {
    expect(supplyFlag(300, 100)).toBe('oversupplied');
    expect(supplyFlag(10, 0)).toBe('oversupplied'); // stock, no buyers
  });

  it('flags under-supply when demand outruns stock', () => {
    expect(supplyFlag(50, 100)).toBe('undersupplied');
    expect(supplyFlag(0, 50)).toBe('undersupplied');
  });

  it('stays balanced in the middle band, and for empty/empty', () => {
    expect(supplyFlag(100, 100)).toBe('balanced');
    expect(supplyFlag(150, 100)).toBe('balanced'); // 1.5 exactly is not >1.5
    expect(supplyFlag(0, 0)).toBe('balanced');
  });
});

describe('transactionVelocity', () => {
  it('counts and sums only what falls inside the window', () => {
    const v = transactionVelocity(
      [
        { currency: 'pula', amount: 100, createdAt: daysAgo(1) },
        { currency: 'pula', amount: -40, createdAt: daysAgo(3) },
        { currency: 'botho', amount: 5, createdAt: daysAgo(2) },
        { currency: 'pula', amount: 999, createdAt: daysAgo(30) }, // outside 7 d
      ],
      NOW,
      7,
    );
    expect(v.transactionCount).toBe(3);
    expect(v.volumePula).toBe(140); // abs(100) + abs(-40); Botho excluded
    expect(v.transactionsPerDay).toBeCloseTo(3 / 7, 5);
    expect(v.volumePerDay).toBeCloseTo(140 / 7, 5);
    expect(v.days).toBe(7);
  });

  it('is all-zero for an empty ledger', () => {
    const v = transactionVelocity([], NOW, 7);
    expect(v.transactionCount).toBe(0);
    expect(v.volumePula).toBe(0);
  });
});

describe('progressionBottlenecks', () => {
  it('scores retention as advanced / reached', () => {
    const steps = progressionBottlenecks([
      { step: '4 -> 8', reached: 100, advanced: 60 },
      { step: '12 -> 20', reached: 10, advanced: 1 },
    ]);
    expect(steps[0]!.retention).toBeCloseTo(0.6, 6);
    expect(steps[1]!.retention).toBeCloseTo(0.1, 6);
  });

  it('treats a step nobody reached as 100% (no bottleneck reported)', () => {
    const steps = progressionBottlenecks([{ step: 'x', reached: 0, advanced: 0 }]);
    expect(steps[0]!.retention).toBe(1);
  });

  it('clamps nonsense input into [0, 1]', () => {
    const steps = progressionBottlenecks([
      { step: 'over', reached: 10, advanced: 50 },
      { step: 'under', reached: 10, advanced: -5 },
    ]);
    expect(steps[0]!.retention).toBe(1);
    expect(steps[1]!.retention).toBe(0);
  });
});
