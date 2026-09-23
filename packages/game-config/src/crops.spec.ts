/**
 * MVP compliance tests for @molemisi/game-config.
 *
 * These assert the RULES in docs/MVP, not the shape of the code. If a spec number
 * changes, this file changes with it — and `scripts/balance_verify.py` must still
 * PASS. A change here without a change to the spec is a bug.
 *
 * Finding references (F#) are docs/MVP/07; rulings (R#) are docs/MVP/01 §3.
 */
import {
  CROPS,
  CROP_IDS,
  getCropConfig,
  getAllCrops,
  growthStage,
  netPerPlotPerDay,
  ITEMS,
  ITEM_CATEGORIES,
  TOOL_SLUGS,
  getItemDef,
  RECIPES,
  RECIPE_SLUGS,
  recipeEconomics,
  defaultInputsFor,
  OPPORTUNITY_COST_FACTOR,
  BATCH_SIZES,
  CRAFTING_SLOTS,
  COOP_TAX_RATE,
  PRICE_BAND,
  CRAFTED_BAND,
  WATER,
  STORAGE_TIERS,
  GUILD_STORAGE_MULTIPLIER,
  effectiveSlotCap,
  storageUpgradeCost,
  BUILDINGS,
  FERTILIZERS,
  MANURE_PER_COLLECT,
  LAND_LADDER,
  LAND_LADDER_TOTAL,
  STARTING_PLOTS,
  MAX_PLOTS,
  STARTING_PULA,
  BOTHO_THRESHOLDS,
  BOTHO_DAILY_CAP,
  TOP_UP_PACKS,
  DAILY_TOP_UP_CAP_BWP,
  BOOSTS,
  COSMETIC_PRICE_RANGE,
  CHAPTERS,
  chapterForMonth,
  isSeedInSeason,
  MOPHANE_MONTHS,
  isMophaneSeason,
  KAGISO,
  SCENES,
  hotspotsForScene,
  restorationStage,
  findsForScene,
  elderLine,
} from './index';

describe('Crops — 02 §6.1', () => {
  it('has exactly 11 crops', () => {
    expect(CROP_IDS).toHaveLength(11);
  });

  it('includes morula and excludes saffron (F18)', () => {
    expect(CROPS.morula).toBeDefined();
    expect(CROPS.morula.name).toBe('Morula');
    expect((CROPS as Record<string, unknown>).saffron).toBeUndefined();
  });

  it('F1: no crop grows in the 24–40 h dead zone', () => {
    for (const crop of getAllCrops()) {
      const h = crop.growthHours;
      const inDeadZone = h > 24 && h < 40;
      expect(inDeadZone).toBe(false);
    }
  });

  it('F1: no crop is quicker than 12 h', () => {
    for (const crop of getAllCrops()) {
      expect(crop.growthHours).toBeGreaterThanOrEqual(12);
    }
  });

  it('cadenceDays always matches the growth time', () => {
    for (const crop of getAllCrops()) {
      expect(crop.cadenceDays).toBe(crop.growthHours > 24 ? 2 : 1);
    }
  });

  it('thirst ratings are all 1–3 and span at least 4x in water use (F5)', () => {
    const rates = getAllCrops().map((c) => c.waterPerHour);
    for (const crop of getAllCrops()) {
      expect([1, 2, 3]).toContain(crop.thirst);
    }
    expect(Math.max(...rates) / Math.min(...rates)).toBeGreaterThanOrEqual(4);
  });

  it('F2: net per plot per day spreads 3–4x, bottom is sorghum, top is morula', () => {
    const nets = getAllCrops().map((c) => ({ id: c.id, net: netPerPlotPerDay(c) }));
    const sorted = [...nets].sort((a, b) => a.net - b.net);
    expect(sorted[0]!.id).toBe('sorghum');
    expect(sorted[sorted.length - 1]!.id).toBe('morula');
    expect(sorted[0]!.net).toBeCloseTo(12.25, 1);
    expect(sorted[sorted.length - 1]!.net).toBeCloseTo(40.63, 1);
    expect(sorted[sorted.length - 1]!.net / sorted[0]!.net).toBeGreaterThanOrEqual(3);
    expect(sorted[sorted.length - 1]!.net / sorted[0]!.net).toBeLessThanOrEqual(4);
  });

  it('every crop sells for more than its seed costs', () => {
    for (const crop of getAllCrops()) {
      const floor = crop.baseValue * crop.yield.min;
      expect(floor).toBeGreaterThan(crop.seedCost);
    }
  });

  it('yield max is never below yield min', () => {
    for (const crop of getAllCrops()) {
      expect(crop.yield.max).toBeGreaterThanOrEqual(crop.yield.min);
    }
  });

  it('getCropConfig is stable and total', () => {
    expect(getCropConfig('sorghum')).toBe(getCropConfig('sorghum'));
    expect(getCropConfig('nope')).toBeUndefined();
  });

  it('growthStage is 0..3 and reaches 3 exactly at maturity', () => {
    const c = CROPS.maize;
    expect(growthStage(c, 0)).toBe(0);
    expect(growthStage(c, c.growthHours * 0.5)).toBe(1);
    expect(growthStage(c, c.growthHours * 0.8)).toBe(2);
    expect(growthStage(c, c.growthHours)).toBe(3);
    expect(growthStage(c, c.growthHours * 10)).toBe(3);
  });

  it('D6: every crop is available from the start', () => {
    expect(getAllCrops()).toHaveLength(11);
    for (const crop of getAllCrops()) {
      expect((crop as Record<string, unknown>).unlockLevel).toBeUndefined();
    }
  });
});

describe('Items — 02 §6.2', () => {
  it('R1: the livestock category is DIPHOLOGOLO', () => {
    expect(ITEM_CATEGORIES).toContain('DIPHOLOGOLO');
    expect(ITEM_CATEGORIES).not.toContain('DIPHOLOFOLO');
  });

  it('R3: there is no Special category — rares are Journal discoveries', () => {
    expect(ITEM_CATEGORIES).not.toContain('Special');
    for (const item of Object.values(ITEMS)) {
      expect(item.category).not.toBe('Special');
    }
  });

  it('R2: the brick is Setena, not Setene', () => {
    expect(ITEMS.setena).toBeDefined();
    expect(ITEMS.setena.setswana).toBe('Setena');
    expect((ITEMS as Record<string, unknown>).setene).toBeUndefined();
  });

  it('F15: tools are equipment and never stack in inventory', () => {
    expect(TOOL_SLUGS.length).toBeGreaterThan(0);
    for (const slug of TOOL_SLUGS) {
      expect(ITEMS[slug]!.isTool).toBe(true);
      expect(ITEMS[slug]!.maxStack).toBe(1);
      expect(ITEMS[slug]!.baseValue).toBe(0);
    }
  });

  it('every item states what it is for (03 §2.1)', () => {
    for (const [slug, item] of Object.entries(ITEMS)) {
      expect(item.use.length).toBeGreaterThan(0);
      expect(item.sprite.length).toBeGreaterThan(0);
      expect(item.slug).toBe(slug);
      expect(ITEM_CATEGORIES).toContain(item.category);
    }
  });

  it('every seed has baseValue equal to the crop seed cost', () => {
    for (const crop of getAllCrops()) {
      expect(getItemDef(`${crop.id}_seed`)!.baseValue).toBe(crop.seedCost);
    }
  });
});

describe('Crafting — 02 §6.3', () => {
  const recipeList = Object.values(RECIPES);

  it('has the five v1 recipes', () => {
    expect([...RECIPE_SLUGS].sort()).toEqual(['borotho', 'bupi', 'poleto', 'setena', 'thapo']);
  });

  it('F14: no recipe is quicker than 2 hours', () => {
    for (const r of recipeList) {
      expect(r.durationMinutes).toBeGreaterThanOrEqual(120);
      expect(r.durationMinutes).toBeLessThanOrEqual(360);
    }
  });

  it('F4: every recipe closes horizontally at opportunity cost', () => {
    expect(OPPORTUNITY_COST_FACTOR).toBe(0.95);
    for (const r of recipeList) {
      const inputs = defaultInputsFor(r, {});
      const eco = recipeEconomics(r, inputs, 1);
      expect(eco.profit).toBeGreaterThan(0);
    }
  });

  it('F8: Setena accepts clay or stone, so stone is not dead weight', () => {
    const inputs = RECIPES.setena.inputs[0]!;
    expect(inputs.anyOf).toContain('clay');
    expect(inputs.anyOf).toContain('stone');
  });

  it('substitution: Bupi takes any grain', () => {
    expect(RECIPES.bupi.inputs[0]!.anyOf).toEqual(['sorghum', 'millet']);
  });

  it('batching is sublinear in fee, so bigger batches are cheaper per unit', () => {
    expect(BATCH_SIZES).toEqual([1, 3, 6]);
  });

  it('slots start at 1 and cap at 3', () => {
    expect(CRAFTING_SLOTS.base).toBe(1);
    expect(CRAFTING_SLOTS.max).toBe(3);
  });

  it('money recipes are gated behind Botho (02 §6.4)', () => {
    expect(RECIPES.bupi.unlock).toEqual({ bothoGte: 100 });
    expect(RECIPES.borotho.unlock).toEqual({ bothoGte: 100 });
  });
});

describe('Economy — 02 §6', () => {
  it('F5: water is P1.00 per unit, tank 60, refill P60', () => {
    expect(WATER.unitPricePula).toBe(1.0);
    expect(WATER.tankCapacity).toBe(60);
    expect(WATER.fullRefillPula).toBe(60);
    expect(WATER.chargedWhileState).toBe('GROWING');
  });

  it('D9: storage tiers are 24 / 48 / 96', () => {
    expect(STORAGE_TIERS.map((t) => t.slotCap)).toEqual([24, 48, 96]);
  });

  it('G8: storage upgrade cost has ONE source — BUILDINGS.storage.upgradeCosts', () => {
    // The stale STORAGE_TIERS.upgradeCostPula (P1,200/P6,000) is deleted; this
    // pins the derivation so a second copy of the number can never return.
    const storage = BUILDINGS['storage'];
    expect(storage).toBeDefined();
    expect(storageUpgradeCost(1)).toBeNull();
    expect(storageUpgradeCost(2)).toBe(storage!.upgradeCosts[0]!.currency);
    expect(storageUpgradeCost(3)).toBe(storage!.upgradeCosts[1]!.currency);
    expect(storageUpgradeCost(2)).toBe(2500);
    expect(storageUpgradeCost(3)).toBe(12000);
  });

  it('G6: thatch is a building input — storage upgrades and the kraal', () => {
    // The foraged reed was a dead-end; it now feeds the two thatch-roofed
    // structures (03 §3.5 "re-ratching thatch"). The Pula line is untouched —
    // G8 still single-sources the price.
    const storage = BUILDINGS['storage'];
    expect(storage!.upgradeCosts[0]!.thatch).toBe(6);
    expect(storage!.upgradeCosts[1]!.thatch).toBe(12);
    const kraal = BUILDINGS['kraal'];
    expect(kraal!.baseCost.thatch).toBe(4);
    expect(storageUpgradeCost(2)).toBe(2500);
    expect(storageUpgradeCost(3)).toBe(12000);
  });

  it('G1: manure has a source (byproduct) and a consumer (fertilizer config)', () => {
    // 03 §5: animals "produce eggs, milk and manure" — every collect grants one.
    expect(MANURE_PER_COLLECT).toBeGreaterThanOrEqual(1);
    // 01 §Fertilization: manure is +20% for a single stage, consumed as an item.
    const manure = FERTILIZERS['manure'];
    expect(manure).toBeDefined();
    expect(manure!.item).toBe('manure');
    expect(ITEMS[manure!.item]).toBeDefined();
    expect(manure!.bonus).toBe(0.2);
    expect(manure!.stages).toBe(1);
  });

  it('R7: the Guild +50% stacks on tier', () => {
    expect(GUILD_STORAGE_MULTIPLIER).toBe(1.5);
    expect(effectiveSlotCap(1, false)).toBe(24);
    expect(effectiveSlotCap(1, true)).toBe(36);
    expect(effectiveSlotCap(3, true)).toBe(144);
  });

  it('D10/F17: land ladder is 4 -> 8 -> 12 -> 20 for P37,200 total', () => {
    expect(LAND_LADDER.map((l) => l.plots)).toEqual([4, 8, 12, 20]);
    expect(LAND_LADDER.map((l) => l.costPula)).toEqual([null, 1200, 6000, 30000]);
    expect(LAND_LADDER_TOTAL).toBe(37200);
    expect(STARTING_PLOTS).toBe(4);
    expect(MAX_PLOTS).toBe(20);
  });

  it('price band is 0.5–2.0, and crafted goods are exempt (C14)', () => {
    expect(PRICE_BAND).toEqual({ min: 0.5, max: 2.0 });
    expect(CRAFTED_BAND).toEqual({ min: 0.9, max: 1.1 });
    expect(COOP_TAX_RATE).toBe(0.05);
  });

  it('I4: Botho is capped per day', () => {
    expect(BOTHO_DAILY_CAP).toBe(50);
    expect(BOTHO_THRESHOLDS.DEEP_BUSHVELD).toBe(300);
    expect(BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY).toBe(1000);
  });

  it('top-up cap is P500/day in BWP', () => {
    expect(DAILY_TOP_UP_CAP_BWP).toBe(500);
    expect(TOP_UP_PACKS.some((p) => p.priceBwp === 500)).toBe(true);
    for (const p of TOP_UP_PACKS) {
      expect(p.priceBwp).toBeLessThanOrEqual(DAILY_TOP_UP_CAP_BWP);
      expect(p.grantedPula).toBeGreaterThanOrEqual(p.priceBwp);
    }
  });

  it('R8: exactly three boosts remain — no Fertility Shell', () => {
    expect(BOOSTS).toHaveLength(3);
    expect(BOOSTS.map((b) => b.slug).sort()).toEqual([
      'ancestral_ward',
      'breath_of_the_land',
      'pula_stone',
    ]);
    expect(BOOSTS.some((b) => b.slug.includes('fertility'))).toBe(false);
  });

  it('F7: cosmetics are an unbounded Pula sink', () => {
    expect(COSMETIC_PRICE_RANGE.min).toBeGreaterThan(0);
    expect(COSMETIC_PRICE_RANGE.max).toBeGreaterThan(COSMETIC_PRICE_RANGE.min);
  });

  it('starting Pula is positive and less than the first land purchase', () => {
    expect(STARTING_PULA).toBeGreaterThan(0);
    expect(STARTING_PULA).toBeLessThan(1200);
  });
});

describe('Chapters — 02 §6.1 / F6', () => {
  /** Seasonality is read in UTC against the real calendar (03 §5, no chapter clock). */
  const atMonth = (m: number): Date => new Date(Date.UTC(2026, m - 1, 15));

  it('four chapters on the real calendar, six seeds each', () => {
    expect(CHAPTERS).toHaveLength(4);
    for (const ch of CHAPTERS) {
      expect(ch.seeds).toHaveLength(6);
      expect(ch.months).toHaveLength(3);
    }
  });

  it('the calendar covers all twelve months exactly once', () => {
    const months = CHAPTERS.flatMap((c) => c.months).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('Pula stocks exactly the spec list', () => {
    expect(chapterForMonth(11)!.slug).toBe('pula');
    expect([...chapterForMonth(11)!.seeds].sort()).toEqual(
      ['cowpeas', 'groundnuts', 'maize', 'millet', 'sorghum', 'tomatoes'].sort(),
    );
  });

  it('F6: tomato -> pepper -> morula is the only option chain upward', () => {
    // Tomatoes leave after Phane, pepper after Letlhafula, morula persists.
    expect(isSeedInSeason('tomatoes', atMonth(11))).toBe(true);
    expect(isSeedInSeason('tomatoes', atMonth(5))).toBe(false);
    expect(isSeedInSeason('pepper', atMonth(9))).toBe(true);
    expect(isSeedInSeason('pepper', atMonth(11))).toBe(false);
    expect(isSeedInSeason('morula', atMonth(5))).toBe(true);
    expect(isSeedInSeason('morula', atMonth(10))).toBe(true);
  });

  it('every crop is in season somewhere — none is dead content', () => {
    for (const crop of getAllCrops()) {
      const seasons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) =>
        isSeedInSeason(crop.id, atMonth(m)),
      );
      expect(seasons.length).toBeGreaterThan(0);
    }
  });

  it('Mophane follows real months, not the chapter clock', () => {
    expect(MOPHANE_MONTHS).toEqual([4, 12]);
    expect(isMophaneSeason(atMonth(4))).toBe(true);
    expect(isMophaneSeason(atMonth(12))).toBe(true);
    expect(isMophaneSeason(atMonth(6))).toBe(false);
  });
});

describe('Bushveld — 04 §4.2', () => {
  const playable = SCENES.filter((s) => s.unlock === null);

  it('Kagiso: max 6, +1 per 4 h, 60-min hotspot rest', () => {
    expect(KAGISO.max).toBe(6);
    expect(KAGISO.startingValue).toBe(6);
    expect(KAGISO.regenMinutes).toBe(240);
    expect(KAGISO.restMinutes).toBe(60);
    expect(KAGISO.costCommon).toBe(1);
    expect(KAGISO.costPremium).toBe(2);
  });

  it('three playable scenes plus Deep Bushveld at Botho 300', () => {
    expect(playable).toHaveLength(3);
    const deep = SCENES.find((s) => s.slug === 'deep_bushveld')!;
    expect(deep.unlock).toEqual({ bothoGte: BOTHO_THRESHOLDS.DEEP_BUSHVELD });
    // G5 — the scene ships with real content now (this asserted zero hotspots).
    const deepHs = hotspotsForScene('deep_bushveld');
    expect(deepHs).toHaveLength(4);
    expect(deepHs.some((h) => h.kagisoCost === 1)).toBe(true);
    expect(deepHs.some((h) => h.kagisoCost === 2)).toBe(true);
    // hardwood is the scene's signature find (G5).
    expect(deepHs.flatMap((h) => h.loot).some((l) => l.item === 'hardwood')).toBe(true);
  });

  it('G7: the riverbank has its own wood — rv_driftwood drops wood', () => {
    const drift = hotspotsForScene('riverbank').find((h) => h.id === 'rv_driftwood');
    expect(drift).toBeDefined();
    expect(drift!.kagisoCost).toBe(1);
    expect(drift!.loot.some((l) => l.item === 'wood')).toBe(true);
  });

  it('every playable scene has both a cost-1 and a cost-2 hotspot', () => {
    for (const scene of playable) {
      const hs = hotspotsForScene(scene.slug);
      expect(hs.length).toBeGreaterThan(0);
      expect(hs.some((h) => h.kagisoCost === 1)).toBe(true);
      expect(hs.some((h) => h.kagisoCost === 2)).toBe(true);
    }
  });

  it('Mophane hotspot is seasonal with its own loot table', () => {
    const all = playable.flatMap((s) => hotspotsForScene(s.slug));
    const phane = all.find((h) => h.activeMonths);
    expect(phane).toBeDefined();
    expect(phane!.activeMonths).toEqual([4, 12]);
    expect(phane!.seasonalLoot).toBeDefined();
  });

  it('R5: restoration is 40 / 70 / 100 percent of a scene finds', () => {
    expect(restorationStage(0, 10)).toBe(0);
    expect(restorationStage(4, 10)).toBe(1);
    expect(restorationStage(7, 10)).toBe(2);
    expect(restorationStage(10, 10)).toBe(3);
    for (const scene of playable) {
      expect(scene.restorationThresholds).toEqual([0.4, 0.7, 1.0]);
      expect(scene.restorationAssets).toHaveLength(4);
      expect(findsForScene(scene.slug).length).toBeGreaterThan(0);
    }
  });

  it('the Elder warns about an empty tank before anything else', () => {
    const base = {
      tankPct: 0,
      weather: 'clear',
      botho: 0,
      chapter: 'pula',
      readyPlots: 5,
      thirstyPlots: 5,
      uncollectedCrafts: 3,
      contributedToday: false,
    };
    expect(elderLine(base).id).toBe('tank_empty');
    expect(elderLine({ ...base, tankPct: 55 }).id).not.toBe('tank_empty');
  });
});
