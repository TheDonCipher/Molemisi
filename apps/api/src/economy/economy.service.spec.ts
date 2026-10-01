/**
 * Economy service tests (16 §6) — query adapters over the pure metrics.
 *
 * The maths is covered in economy.metrics.spec.ts; this spec proves the
 * Supabase adapter reads the right tables, filters by the window, and degrades
 * gracefully when a source table is empty (inflation => insufficientData).
 */

import { EconomyService } from './economy.service';
import { SupabaseService } from '../database/supabase.service';
import { makeDb, clientFor, type MockDb } from '../test/supabase-mock';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

function makeService(seed: Partial<MockDb>) {
  const db = makeDb(seed);
  const client = clientFor(db);
  const svc = new EconomyService({
    getAdminClient: () => client,
    getClient: () => client,
  } as unknown as SupabaseService);
  return { svc, db };
}

describe('EconomyService', () => {
  it('sums total currency in circulation from wallets', async () => {
    const { svc } = makeService({
      player_wallets: [
        { player_id: 'u1', pula_balance: 100, botho_points: 10 },
        { player_id: 'u2', pula_balance: 400, botho_points: 0 },
        { player_id: 'u3', pula_balance: 50, botho_points: 5 },
      ],
    });
    const supply = await svc.getCurrencySupply({ now: NOW, windowDays: 7 });
    expect(supply.totalPula).toBe(550);
    expect(supply.totalBotho).toBe(15);
    expect(supply.walletCount).toBe(3);
    expect(supply.windowDays).toBe(7);
  });

  it('computes net money flow from the ledger inside the window only', async () => {
    const { svc } = makeService({
      ledger_entries: [
        { player_id: 'u1', currency: 'pula', amount: 500, created_at: daysAgo(1) },
        { player_id: 'u1', currency: 'pula', amount: -150, created_at: daysAgo(2) },
        { player_id: 'u2', currency: 'botho', amount: 30, created_at: daysAgo(1) },
        { player_id: 'u2', currency: 'pula', amount: 9999, created_at: daysAgo(40) }, // outside
      ],
    });
    const supply = await svc.getCurrencySupply({ now: NOW, windowDays: 7 });
    expect(supply.createdPula).toBe(500);
    expect(supply.destroyedPula).toBe(150);
    expect(supply.netFlowPula).toBe(350);
  });

  it('reports wealth distribution with percentile bands and Gini', async () => {
    const { svc } = makeService({
      player_wallets: [
        { player_id: 'u1', pula_balance: 100 },
        { player_id: 'u2', pula_balance: 200 },
        { player_id: 'u3', pula_balance: 300 },
        { player_id: 'u4', pula_balance: 1400 },
      ],
    });
    const w = await svc.getWealthDistribution();
    expect(w.count).toBe(4);
    expect(w.total).toBe(2000);
    expect(w.max).toBe(1400);
    expect(w.gini).toBeGreaterThan(0);
    expect(w.gini).toBeLessThanOrEqual(1);
  });

  it('computes transaction velocity per day over the window', async () => {
    const { svc } = makeService({
      ledger_entries: [
        { player_id: 'u1', currency: 'pula', amount: 100, created_at: daysAgo(1) },
        { player_id: 'u2', currency: 'pula', amount: -50, created_at: daysAgo(2) },
        { player_id: 'u3', currency: 'pula', amount: 700, created_at: daysAgo(20) },
      ],
    });
    const v = await svc.getTransactionVelocity({ now: NOW, days: 7 });
    expect(v.transactionCount).toBe(2);
    expect(v.volumePula).toBe(150);
    expect(v.volumePerDay).toBeCloseTo(150 / 7, 5);
  });

  it('computes price drift and supply state per item', async () => {
    const { svc } = makeService({
      market_prices: [
        {
          item_type: 'sorghum',
          item_name: 'Sorghum',
          category: 'crop',
          base_price: 25,
          current_price: 50,
          supply: 400,
          demand: 100,
        },
        {
          item_type: 'milk',
          item_name: 'Milk',
          category: 'product',
          base_price: 30,
          current_price: 15,
          supply: 10,
          demand: 100,
        },
      ],
    });
    const rows = await svc.getItemPriceDrift();
    expect(rows).toHaveLength(2);

    const sorghum = rows.find((r) => r.itemType === 'sorghum')!;
    expect(sorghum.drift).toBeCloseTo(1.0, 6); // 25 -> 50
    expect(sorghum.supplyState).toBe('oversupplied');

    const milk = rows.find((r) => r.itemType === 'milk')!;
    expect(milk.drift).toBeCloseTo(-0.5, 6);
    expect(milk.supplyState).toBe('undersupplied');
  });

  it('reports insufficientData for inflation until a price history exists', async () => {
    const { svc } = makeService({ economy_price_snapshots: [] });
    const report = await svc.getInflation({ now: NOW, days: 7 });
    expect(report.insufficientData).toBe(true);
    expect(report.rate).toBe(0);
    expect(report.perItem).toHaveLength(0);
  });

  it('computes per-item and aggregate inflation from two snapshots', async () => {
    const { svc } = makeService({
      economy_price_snapshots: [
        { item_type: 'sorghum', avg_price: 25, snapshot_at: daysAgo(6) },
        { item_type: 'maize', avg_price: 40, snapshot_at: daysAgo(6) },
        { item_type: 'sorghum', avg_price: 30, snapshot_at: daysAgo(1) },
        { item_type: 'maize', avg_price: 36, snapshot_at: daysAgo(1) },
        // Outside the window — must not be used as the baseline.
        { item_type: 'sorghum', avg_price: 10, snapshot_at: daysAgo(30) },
      ],
    });
    const report = await svc.getInflation({ now: NOW, days: 7 });
    expect(report.insufficientData).toBe(false);
    expect(report.perItem).toHaveLength(2);

    const sorghum = report.perItem.find((p) => p.itemType === 'sorghum')!;
    expect(sorghum.baseline).toBe(25); // daysAgo(6), NOT daysAgo(30)
    expect(sorghum.current).toBe(30);
    expect(sorghum.change).toBeCloseTo(0.2, 6);

    // Aggregate: baseline avg 32.5 -> current avg 33 => ~+0.0154
    expect(report.rate).toBeCloseTo((33 - 32.5) / 32.5, 6);
    expect(report.rate).toBeGreaterThan(0); // net inflation
    expect(report.days).toBe(7);
  });

  it('returns only crops and products from getCropSupplyFlags', async () => {
    const { svc } = makeService({
      market_prices: [
        { item_type: 'sorghum', item_name: 'Sorghum', category: 'crop', base_price: 25, current_price: 25, supply: 10, demand: 10 },
        { item_type: 'milk', item_name: 'Milk', category: 'product', base_price: 30, current_price: 30, supply: 10, demand: 10 },
        { item_type: 'sorghum_seed', item_name: 'Seed', category: 'seed', base_price: 10, current_price: 10, supply: 10, demand: 10 },
      ],
    });
    const flags = await svc.getCropSupplyFlags();
    expect(flags.map((f) => f.itemType).sort()).toEqual(['milk', 'sorghum']);
  });

  it('computes land-ladder progression retention (bottleneck signal)', async () => {
    const { svc } = makeService({
      farms: [
        { id: 'f1', plot_count: 4 },
        { id: 'f2', plot_count: 4 },
        { id: 'f3', plot_count: 4 },
        { id: 'f4', plot_count: 8 },
        { id: 'f5', plot_count: 12 },
      ],
      buildings: [
        { farm_id: 'f1', state: 'ACTIVE' },
        { farm_id: 'f2', state: 'MAINTENANCE_NEEDED' },
      ],
    });
    const steps = await svc.getProgressionBottlenecks();
    const land1 = steps.find((s) => s.step === 'land: 4 -> 8 plots')!;
    expect(land1.reached).toBe(5);
    expect(land1.advanced).toBe(2);
    expect(land1.retention).toBeCloseTo(2 / 5, 6);

    const buildings = steps.find((s) => s.step.startsWith('buildings'))!;
    expect(buildings.retention).toBeCloseTo(0.5, 6);
  });

  it('getOverview assembles every report in one read-only call', async () => {
    const { svc } = makeService({
      player_wallets: [{ player_id: 'u1', pula_balance: 100, botho_points: 0 }],
      ledger_entries: [{ player_id: 'u1', currency: 'pula', amount: 25, created_at: daysAgo(1) }],
      market_prices: [
        { item_type: 'sorghum', item_name: 'Sorghum', category: 'crop', base_price: 25, current_price: 25, supply: 10, demand: 10 },
      ],
      farms: [{ id: 'f1', plot_count: 4 }],
      buildings: [],
    });
    const o = await svc.getOverview({ now: NOW, days: 7 });
    expect(o.generatedAt).toBe(NOW.toISOString());
    expect(o.supply.totalPula).toBe(100);
    expect(o.wealth.count).toBe(1);
    expect(o.velocity.transactionCount).toBe(1);
    expect(o.prices).toHaveLength(1);
    expect(o.inflation.insufficientData).toBe(true); // no snapshots seeded
    expect(o.cropSupply).toHaveLength(1);
    expect(o.progression.length).toBeGreaterThan(0);
  });
});

