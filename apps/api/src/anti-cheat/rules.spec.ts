/**
 * Anti-cheat rule tests (13 §4, §9).
 *
 * Two families are covered: PASSIVE (impossible states) and ACTIVE (suspicious
 * sequences). Each rule is exercised with fixture arrays — no database — so a
 * changed threshold or a broken condition fails here first.
 */

import {
  detectCostBypass,
  detectMarketManipulation,
  detectNegativeBalances,
  detectNegativeInventory,
  detectOrphanCrops,
  detectRapidGains,
  detectResourceWithoutSource,
  detectSequenceViolations,
  type LedgerRow,
} from './rules';

const NOW = '2026-09-15T12:00:00.000Z';
const NOW_MS = Date.parse(NOW);
const hoursAgo = (h: number) => new Date(NOW_MS - h * 3_600_000).toISOString();
const secondsAgo = (s: number) => new Date(NOW_MS - s * 1000).toISOString();

/* ================================================================ PASSIVE */

describe('Passive rules — impossible states (13 §4)', () => {
  it('flags a negative Pula or Botho balance as critical', () => {
    const flags = detectNegativeBalances(
      [
        { playerId: 'u1', pulaBalance: 100, bothoPoints: 0 },
        { playerId: 'u2', pulaBalance: -5, bothoPoints: 0 },
        { playerId: 'u3', pulaBalance: 0, bothoPoints: -1 },
      ],
      NOW,
    );
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.playerId).sort()).toEqual(['u2', 'u3']);
    expect(flags.every((f) => f.kind === 'negative_currency')).toBe(true);
    expect(flags[0]!.severity).toBe('critical');
    expect(flags[0]!.detectedAt).toBe(NOW);
  });

  it('returns no flags for healthy wallets', () => {
    expect(
      detectNegativeBalances([{ playerId: 'u1', pulaBalance: 0, bothoPoints: 0 }], NOW),
    ).toHaveLength(0);
  });

  it('flags negative inventory as a resource-without-source symptom', () => {
    const flags = detectNegativeInventory(
      [
        { farmId: 'f1', itemType: 'sorghum', quantity: 5 },
        { farmId: 'f1', itemType: 'maize', quantity: -3 },
      ],
      NOW,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: 'negative_inventory', severity: 'high', farmId: 'f1' });
    expect(flags[0]!.evidence.itemType).toBe('maize');
  });

  it('flags orphan crops in BOTH directions', () => {
    const flags = detectOrphanCrops(
      [
        { plotId: 'p1', farmId: 'f1', state: 'GROWING', hasCrop: false }, // occupied, no crop
        { plotId: 'p2', farmId: 'f1', state: 'EMPTY', hasCrop: true }, // crop on empty plot
        { plotId: 'p3', farmId: 'f1', state: 'READY', hasCrop: true }, // consistent
        { plotId: 'p4', farmId: 'f1', state: 'EMPTY', hasCrop: false }, // consistent
      ],
      NOW,
    );
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.severity).sort()).toEqual(['high', 'medium']);
    expect(flags.every((f) => f.kind === 'orphan_crop')).toBe(true);
  });

  it('flags inventory growth that no credited source explains', () => {
    const flags = detectResourceWithoutSource(
      'f1',
      [
        { itemType: 'sorghum', netGain: 20 },
        { itemType: 'eggs', netGain: 4 },
      ],
      [
        { itemType: 'sorghum', netGain: 5 }, // only 5 were earned
        { itemType: 'eggs', netGain: 4 }, // fully explained
      ],
      NOW,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: 'resource_without_source', farmId: 'f1' });
    expect(flags[0]!.evidence).toMatchObject({
      itemType: 'sorghum',
      observedGain: 20,
      creditedGain: 5,
    });
  });
});

/* ================================================================== ACTIVE */

describe('Active rules — suspicious sequences (13 §9)', () => {
  const ledger = (over: Partial<LedgerRow>): LedgerRow => ({
    playerId: 'u1',
    currency: 'pula',
    amount: 10,
    source: 'coop_sale',
    refId: null,
    createdAt: NOW,
    ...over,
  });

  it('flags rapid currency gains above the threshold, in-window only', () => {
    const flags = detectRapidGains(
      [
        ledger({ amount: 6000, createdAt: hoursAgo(1) }),
        ledger({ amount: 6000, createdAt: hoursAgo(2) }),
        // Outside the 24 h window — must not be counted.
        ledger({ amount: 999999, createdAt: hoursAgo(48) }),
      ],
      { windowHours: 24, maxCreditPula: 10000 },
      NOW,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]!.kind).toBe('rapid_currency_gain');
    expect(flags[0]!.evidence).toMatchObject({ total: 12000, count: 2 });
  });

  it('ignores debits, Botho, and sub-threshold credit sums', () => {
    const flags = detectRapidGains(
      [
        ledger({ amount: -5000 }),
        ledger({ currency: 'botho', amount: 999999 }),
        ledger({ amount: 500 }),
      ],
      { windowHours: 24, maxCreditPula: 10000 },
      NOW,
    );
    expect(flags).toHaveLength(0);
  });

  it('flags a build or craft with no matching debit (cost bypass)', () => {
    const events = [
      { kind: 'build' as const, playerId: 'u1', farmId: 'f1', refId: 'evt-2', expectedCost: 50 },
    ];
    const ledgerRows = [ledger({ amount: -500, refId: 'evt-1' })];

    const flags = detectCostBypass(events, ledgerRows, NOW);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: 'cost_bypass', severity: 'critical' });
    expect(flags[0]!.evidence.refId).toBe('evt-2');

    // A CREDIT with the same refId does not satisfy a cost.
    const withCreditOnly = detectCostBypass(events, [ledger({ amount: 500, refId: 'evt-2' })], NOW);
    expect(withCreditOnly).toHaveLength(1);
    expect(withCreditOnly[0]!.evidence.refId).toBe('evt-2');
  });

  it('flags a price outside the market band (02 §4.1)', () => {
    const flags = detectMarketManipulation(
      [
        {
          playerId: 'u1',
          farmId: 'f1',
          itemType: 'sorghum',
          side: 'sell',
          quantity: 1,
          price: 3.5, // far above the 0.5–2.0x band
          createdAt: NOW,
        },
      ],
      { minFlipSeconds: 300, bandMin: 0.5, bandMax: 2.0 },
      NOW,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]!.severity).toBe('high');
    expect(flags[0]!.evidence.price).toBe(3.5);
  });

  it('flags a buy→sell flip inside the manipulation window', () => {
    const flags = detectMarketManipulation(
      [
        {
          playerId: 'u1',
          farmId: 'f1',
          itemType: 'sorghum',
          side: 'buy',
          quantity: 1,
          price: 1.0, // inside the band — only the flip should fire
          createdAt: secondsAgo(240), // 4 min before now
        },
        {
          playerId: 'u1',
          farmId: 'f1',
          itemType: 'sorghum',
          side: 'sell',
          quantity: 1,
          price: 1.0, // inside the band — only the flip should fire
          createdAt: secondsAgo(60), // 1 min before now: 180 s apart < 300 s
        },
      ],
      { minFlipSeconds: 300, bandMin: 0.5, bandMax: 2.0 },
      NOW,
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]!.evidence.reason).toContain('flip');
  });

  it('does NOT flag a slow, legitimate buy→sell pair', () => {
    const flags = detectMarketManipulation(
      [
        {
          playerId: 'u1',
          farmId: 'f1',
          itemType: 'sorghum',
          side: 'buy',
          quantity: 1,
          price: 1.0,
          createdAt: hoursAgo(30),
        },
        {
          playerId: 'u1',
          farmId: 'f1',
          itemType: 'sorghum',
          side: 'sell',
          quantity: 1,
          price: 1.0,
          createdAt: hoursAgo(1),
        },
      ],
      { minFlipSeconds: 300, bandMin: 0.5, bandMax: 2.0 },
      NOW,
    );
    expect(flags).toHaveLength(0);
  });

  it('records only REJECTED actions as sequence violations', () => {
    const flags = detectSequenceViolations(
      [
        { playerId: 'u1', farmId: 'f1', action: 'harvest', ok: true },
        { playerId: 'u1', farmId: 'f1', action: 'harvest', ok: false, reason: 'CROP_NOT_READY' },
        { playerId: 'u2', farmId: 'f2', action: 'sell', ok: false },
      ],
      NOW,
    );
    expect(flags).toHaveLength(2);
    expect(flags.every((f) => f.kind === 'sequence_violation')).toBe(true);
    expect(flags[0]!.evidence).toMatchObject({ action: 'harvest', reason: 'CROP_NOT_READY' });
    expect(flags[1]!.evidence.reason).toBe('rejected'); // default
  });
});

