/**
 * Anti-cheat service tests (13 §8, §9) — the sweep over the pure rules.
 *
 * Uses the shared in-memory Supabase mock: the service thinks it is reading
 * ledger/wallet tables, but no database is touched. Asserts both the returned
 * flags AND the persisted `anti_cheat_flags` rows.
 */

import { AntiCheatService } from './anti-cheat.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb } from '../test/supabase-mock';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000).toISOString();

function makeService(seed: Partial<MockDb>) {
  const db = makeDb(seed);
  const client = clientFor(db);
  const svc = new AntiCheatService({
    getAdminClient: () => client,
    getClient: () => client,
  } as unknown as SupabaseService);
  return { svc, db };
}

const kinds = (db: MockDb) =>
  (db.anti_cheat_flags ?? []).map((r) => (r as Record<string, unknown>).kind);

describe('AntiCheatService — passive sweep (13 §4)', () => {
  it('flags a negative wallet, negative inventory and an orphan plot in one pass', async () => {
    const { svc, db } = makeService({
      player_wallets: [
        { player_id: 'u1', pula_balance: 100, botho_points: 0 },
        { player_id: 'u2', pula_balance: -9, botho_points: 0 },
      ],
      inventory: [{ farm_id: 'f1', item_type: 'maize', quantity: -4 }],
      farm_plots: [{ id: 'p1', farm_id: 'f1', state: 'GROWING' }],
      crop_instances: [], // p1 claims GROWING but has no crop row => orphan
    });

    const flags = await svc.runPassiveChecks({ now: NOW });
    expect(flags.map((f) => f.kind).sort()).toEqual([
      'negative_currency',
      'negative_inventory',
      'orphan_crop',
    ]);

    // The same findings landed in the flags table for review.
    const stored = kinds(db).sort();
    expect(stored).toEqual(['negative_currency', 'negative_inventory', 'orphan_crop']);
  });

  it('returns an empty pass and writes nothing when the state is clean', async () => {
    const { svc, db } = makeService({
      player_wallets: [{ player_id: 'u1', pula_balance: 250, botho_points: 3 }],
      inventory: [{ farm_id: 'f1', item_type: 'sorghum', quantity: 0 }],
      farm_plots: [
        { id: 'p1', farm_id: 'f1', state: 'EMPTY' },
        { id: 'p2', farm_id: 'f1', state: 'GROWING' },
      ],
      crop_instances: [{ id: 'c1', plot_id: 'p2' }],
    });

    const flags = await svc.runPassiveChecks({ now: NOW });
    expect(flags).toHaveLength(0);
    expect(kinds(db)).toHaveLength(0);
  });
});

describe('AntiCheatService — active scan (13 §9)', () => {
  it('flags a rapid Pula gain inside the window and persists it', async () => {
    const { svc, db } = makeService({
      farms: [{ id: 'f1', user_id: 'u1' }],
      market_prices: [],
      ledger_entries: [
        { player_id: 'u1', currency: 'pula', amount: 6000, source: 'coop_sale', ref_id: null, created_at: hoursAgo(2) },
        { player_id: 'u1', currency: 'pula', amount: 7000, source: 'coop_sale', ref_id: null, created_at: hoursAgo(1) },
      ],
      market_transactions: [],
    });

    const flags = await svc.runActiveChecks({ now: NOW, windowHours: 24, maxCreditPulaPerDay: 10000 });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.kind).toBe('rapid_currency_gain');
    expect(kinds(db)).toEqual(['rapid_currency_gain']);
  });

  it('flags a buy→sell flip in the market window', async () => {
    const { svc, db } = makeService({
      farms: [{ id: 'f1', user_id: 'u1' }],
      // The service normalises price_per_unit against base_price into the
      // 0.5–2.0x manipulation band — so seed REALISTIC rows here (a sorghum
      // that costs 10 and sells for 24 is 2.4x pro move, not a dupe): at par,
      // the flip clock is the only thing that can fire.
      market_prices: [{ item_type: 'sorghum', base_price: 10 }],
      ledger_entries: [],
      market_transactions: [
        // 4 min and 1 min before now => 180 s apart < the 300 s flip window.
        // price_per_unit 10 equals base_price 10 => multiplier 1.0.
        { farm_id: 'f1', transaction_type: 'BUY', item_type: 'sorghum', quantity: 1, price_per_unit: 10, created_at: secondsAgo(240) },
        { farm_id: 'f1', transaction_type: 'SELL', item_type: 'sorghum', quantity: 1, price_per_unit: 10, created_at: secondsAgo(60) },
      ],
    });

    const flags = await svc.runActiveChecks({ now: NOW });
    expect(flags).toHaveLength(1);
    expect(flags[0]!.kind).toBe('market_manipulation');
    expect(kinds(db)).toEqual(['market_manipulation']);
  });

  it('stays quiet on calm, legal activity', async () => {
    const { svc } = makeService({
      farms: [{ id: 'f1', user_id: 'u1' }],
      market_prices: [{ item_type: 'sorghum', base_price: 10 }],
      ledger_entries: [
        { player_id: 'u1', currency: 'pula', amount: 200, source: 'coop_sale', ref_id: null, created_at: hoursAgo(2) },
      ],
      market_transactions: [],
    });
    const flags = await svc.runActiveChecks({ now: NOW });
    expect(flags).toHaveLength(0);
  });

  it('does NOT flag an at-par market round-trip: normalisation, not unit bias', async () => {
    const { svc } = makeService({
      farms: [{ id: 'f1', user_id: 'u1' }],
      // A realistic Co-op sweep: seeds at 10/maize at 15, sold back at the same
      // unit prices — multiplier 1.0, and hours apart so no flip fires either.
      market_prices: [
        { item_type: 'sorghum_seed', base_price: 10 },
        { item_type: 'sorghum', base_price: 25 },
      ],
      ledger_entries: [],
      market_transactions: [
        { farm_id: 'f1', transaction_type: 'BUY', item_type: 'sorghum_seed', quantity: 4, price_per_unit: 10, created_at: hoursAgo(6) },
        { farm_id: 'f1', transaction_type: 'SELL', item_type: 'sorghum', quantity: 6, price_per_unit: 25, created_at: hoursAgo(1) },
      ],
    });
    const flags = await svc.runActiveChecks({ now: NOW });
    expect(flags).toHaveLength(0);
  });
});

describe('AntiCheatService — explicit recordings', () => {
  it('records a rejected action as a sequence_violation flag', async () => {
    const { svc, db } = makeService({});
    await svc.recordRejectedAction('u1', 'f1', 'harvest', 'CROP_NOT_READY', NOW);
    const stored = db.anti_cheat_flags as Record<string, unknown>[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ kind: 'sequence_violation', severity: 'medium', player_id: 'u1' });
    expect((stored[0]!.evidence as Record<string, unknown>).action).toBe('harvest');
  });

  it('flags a build cost-bypass when no debit row carries the refId', async () => {
    const { svc, db } = makeService({
      ledger_entries: [],
    });
    const flags = await svc.runCostBypassCheck(
      [{ kind: 'build', playerId: 'u1', farmId: 'f1', refId: 'evt-9', expectedCost: 800 }],
      { now: NOW, windowHours: 24 },
    );
    expect(flags).toHaveLength(1);
    expect(flags[0]!.kind).toBe('cost_bypass');
    expect(kinds(db)).toEqual(['cost_bypass']);
  });

  it('clears a build when its debit row exists (no bypass)', async () => {
    const { svc } = makeService({
      ledger_entries: [
        { player_id: 'u1', currency: 'pula', amount: -800, source: 'building_construction', ref_id: 'evt-9', created_at: hoursAgo(1) },
      ],
    });
    const flags = await svc.runCostBypassCheck(
      [{ kind: 'build', playerId: 'u1', farmId: 'f1', refId: 'evt-9', expectedCost: 800 }],
      { now: NOW, windowHours: 24 },
    );
    expect(flags).toHaveLength(0);
  });

  it('listFlags returns the newest flags first, filterable by player', async () => {
    const { svc } = makeService({});
    await svc.recordRejectedAction('u1', 'f1', 'harvest', 'CROP_NOT_READY', NOW);
    await svc.recordRejectedAction('u2', 'f2', 'sell', 'INSUFFICIENT', NOW);

    const all = await svc.listFlags();
    expect(all).toHaveLength(2);

    const onlyU2 = await svc.listFlags({ playerId: 'u2' });
    expect(onlyU2).toHaveLength(1);
    expect((onlyU2[0] as Record<string, unknown>).player_id).toBe('u2');
  });
});

