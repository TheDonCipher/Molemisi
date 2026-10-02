/**
 * Pass 3.3 / 3.8d — chapter-scoped market events, and maintenance demand that
 * scales with the size of the estate (docs/32 §3.3, §3.8d; docs/31 P1-8).
 */
import {
  CHAPTER_MARKET_EVENTS,
  MAINTENANCE_SCALE_PER_BUILDING,
  MAINTENANCE,
  maintenanceScaleFor,
  STORAGE_T3_STACK_MULTIPLIER,
  effectiveStackCap,
  LAND_LADDER,
  LAND_LADDER_TOTAL,
  landRungPaybackDays,
  AUTOMATION_LADDER,
  automationUnlockedAt,
  BOTHO_THRESHOLDS,
} from './economy';
import { BUILDINGS, type BuildCost } from './buildings';
import { CROPS, netPerPlotPerDay } from './crops';

const CHAPTER_SLUGS = ['pula', 'phane', 'moriti', 'letlhafula'] as const;

describe('3.3 — chapter-scoped market events', () => {
  it('covers every chapter with a live, price-moving event', () => {
    for (const slug of CHAPTER_SLUGS) {
      const ev = CHAPTER_MARKET_EVENTS[slug];
      expect(ev).toBeDefined();
      expect(ev.multiplier).toBeGreaterThan(1);
      expect(['grain', 'food', 'materials', 'all']).toContain(ev.effect);
      expect(ev.rotationHours).toBeGreaterThan(0);
      expect(ev.name.length).toBeGreaterThan(0);
    }
  });

  it('uses a unique name per chapter so rotation can match the active event', () => {
    const names = Object.values(CHAPTER_MARKET_EVENTS).map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('3.8d — maintenance demand scales with the estate', () => {
  it('is a no-op for a single building and grows with count', () => {
    expect(maintenanceScaleFor(0)).toBe(1);
    expect(maintenanceScaleFor(1)).toBe(1);
    expect(maintenanceScaleFor(5)).toBeCloseTo(1 + MAINTENANCE_SCALE_PER_BUILDING * 4);
    expect(maintenanceScaleFor(20)).toBeGreaterThan(maintenanceScaleFor(2));
  });

  it('adds thatch/hardwood to recurring repair recipes (audit P1-8)', () => {
    const mats = (id: string): BuildCost => BUILDINGS[id]!.maintenanceMaterials ?? { currency: 0 };
    expect(mats('water_source').thatch).toBeGreaterThan(0);
    expect(mats('kraal').thatch).toBeGreaterThan(0);
    expect(mats('farm_boundary').hardwood).toBeGreaterThan(0);
    expect(mats('crafting').hardwood).toBeGreaterThan(0);
  });
});

describe('3.8b — Storage tier 3 stack-cap multiplier (31 §6.2)', () => {
  it('doubles the per-type stack cap at tier 3 only', () => {
    expect(effectiveStackCap(99, 1)).toBe(99);
    expect(effectiveStackCap(99, 2)).toBe(99);
    expect(effectiveStackCap(99, 3)).toBe(198);
  });

  it('scales every authored cap, not just the 99s', () => {
    expect(effectiveStackCap(50, 3)).toBe(100);
    expect(effectiveStackCap(30, 3)).toBe(60);
    expect(STORAGE_T3_STACK_MULTIPLIER).toBe(2);
  });

  it('never lowers a cap — tiers 1 and 2 keep the authored number', () => {
    for (const tier of [1, 2]) {
      expect(effectiveStackCap(50, tier)).toBe(50);
    }
  });
});

/* ------------------------------------------------------------------ docs/34 */

describe('docs/34 §4.1 — no land rung is a churn wall', () => {
  /** Morula is the top of the crop ladder and what a player farms once the
   *  land is paid for; it is the honest basis for "will I earn this back". */
  const MORULA = netPerPlotPerDay(CROPS.morula);

  it('reproduces each rung payback at the best in-season crop', () => {
    // 4 plots gained per rung, so cost / (4 × 40.63).
    expect(landRungPaybackDays(4, MORULA)).toBeCloseTo(7.4, 1);
    expect(landRungPaybackDays(8, MORULA)).toBeCloseTo(36.9, 1);
    expect(landRungPaybackDays(12, MORULA)).toBeCloseTo(49.2, 1);
    expect(landRungPaybackDays(16, MORULA)).toBeCloseTo(92.3, 1);
  });

  it('keeps every rung inside a quarter — the standing rule', () => {
    // The old 12→20 rung was ~254 days (docs/31 P2-13), sitting exactly in the
    // window where a player decides whether to commit. 92 days for the final
    // rung lands "a full farm" in month 3, which is the docs/33 §3.2 promise.
    for (const plots of [4, 8, 12, 16]) {
      expect(landRungPaybackDays(plots, MORULA)!).toBeLessThanOrEqual(100);
    }
  });

  it('prices the ladder as decided and totals it correctly', () => {
    expect(LAND_LADDER.map((t) => [t.plots, t.costPula])).toEqual([
      [4, null],
      [8, 1200],
      [12, 6000],
      [16, 8000],
      [20, 15000],
    ]);
    expect(LAND_LADDER_TOTAL).toBe(30200);
    // The retune must never make land MORE expensive.
    expect(LAND_LADDER_TOTAL).toBeLessThanOrEqual(31200);
  });

  it('has no rung for a maxed farm', () => {
    expect(landRungPaybackDays(20, MORULA)).toBeNull();
  });
});

describe('docs/34 §1.2 — the earned-helper ladder is three steps, not four', () => {
  it('unlocks 300 then 500, replacing the old 150/300/500 plan', () => {
    expect(BOTHO_THRESHOLDS.AUTO_FEEDER).toBe(300);
    expect(BOTHO_THRESHOLDS.AUTO_HELPER).toBe(500);
    expect(AUTOMATION_LADDER.map((a) => a.botho)).toEqual([300, 500]);
  });

  it('never sells a helper at a threshold a payer could confuse with a price', () => {
    // Nothing below 300: the ladder should feel earned, not ticketed.
    expect(Math.min(...AUTOMATION_LADDER.map((a) => a.botho))).toBeGreaterThanOrEqual(300);
  });

  it('reports unlocks by standing, inclusive at the threshold', () => {
    expect(automationUnlockedAt(0)).toHaveLength(0);
    expect(automationUnlockedAt(299)).toHaveLength(0);
    expect(automationUnlockedAt(300).map((a) => a.slug)).toEqual(['auto_feeder']);
    expect(automationUnlockedAt(500)).toHaveLength(2);
    expect(automationUnlockedAt(5000)).toHaveLength(2);
  });

  it('is strictly ascending so the ladder reads as progress', () => {
    const bothos = AUTOMATION_LADDER.map((a) => a.botho);
    expect([...bothos].sort((a, b) => a - b)).toEqual(bothos);
  });
});

describe('docs/34 §1.3 — maintenance is a rhythm, not a quarterly shock', () => {
  it('bills monthly, not quarterly', () => {
    expect(MAINTENANCE.intervalDays).toBe(30);
  });

  it('agrees with every building that declares its own interval', () => {
    // One cadence for the whole estate — a building on a different clock is
    // how a "seasonal" sink silently becomes an unfair surprise.
    for (const id of ['water_source', 'kraal', 'farm_boundary', 'crafting']) {
      expect(BUILDINGS[id]!.maintenanceIntervalDays).toBe(MAINTENANCE.intervalDays);
    }
  });

  it('keeps the annual bill unchanged — 3× more often, not 3× more expensive', () => {
    // This is the whole point of the change: bill/period tripled (the daily
    // drain audit P1-8 called "too small"), total player cost did not move.
    const was = 90;
    const bill = BUILDINGS.kraal!.maintenanceCost;
    const before = (bill / was) * 30; // Pula/day under the old quarterly clock
    const after = (bill / MAINTENANCE.intervalDays) * 30;
    expect(after / before).toBeCloseTo(3);
  });

  it('warns before a bill lands so a returning player is never ambushed', () => {
    expect(MAINTENANCE.warningLeadHours).toBeGreaterThan(0);
  });
});
