const fs = require('fs');
const path = require('path');

try {
  // Delete require cache to get fresh load
  const cacheKey = require.resolve('./packages/game-config/dist/index.js');
  delete require.cache[cacheKey];
  
  const gc = require('./packages/game-config/dist/index.js');
  
  console.log('Loaded game-config successfully');
  console.log('PRICE_BAND:', JSON.stringify(gc.PRICE_BAND));
  console.log('CRAFTED_BAND:', JSON.stringify(gc.CRAFTED_BAND));
  console.log('CRAFTED_CATEGORIES:', JSON.stringify(gc.CRAFTED_CATEGORIES));
  console.log('PRICE_CYCLE_HOURS:', gc.PRICE_CYCLE_HOURS);
  
  // Now run the generator logic up to line 97
  const {
    ITEMS, RECIPES, BUILDINGS, CHAPTERS, ANIMALS, HOTSPOTS, DEEP_BUSHVELD_HOTSPOTS,
    STORAGE_TIERS, GUILD_STORAGE_MULTIPLIER, SETSWANA_MONTHS,
    storageUpgradeCost, productValuePula,
    sourcesForItem, recipesUsingItem, buildingsUsingItem,
    recipeEconomics, intentGroup, TOOL_SLUGS,
    BATCH_SIZES, BATCH_FEE_MULTIPLIER, CRAFTING_SLOTS, BONUS_YIELD_CHANCE,
    OPPORTUNITY_COST_FACTOR, COOP_TAX,
    PRICE_BAND, CRAFTED_BAND, CRAFTED_CATEGORIES, PRICE_CYCLE_HOURS,
  } = gc;
  
  console.log('Desctructured all constants');
  console.log('BATCH_FEE_MULTIPLIER:', JSON.stringify(BATCH_FEE_MULTIPLIER));
  
  // Test the new section code
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const inputBand = (slug) => {
    const def = ITEMS[slug];
    return (def && (CRAFTED_CATEGORIES).includes(def.category)) ? CRAFTED_BAND : PRICE_BAND;
  };
  console.log('inputBand("wood"):', JSON.stringify(inputBand('wood')));
  console.log('inputBand("poleto"):', JSON.stringify(inputBand('poleto')));
  
  // Test the for loop
  for (const r of Object.values(RECIPES)) {
    const branch = r.inputs[0].anyOf
      .map((s) => ({ s, v: ITEMS[s].baseValue }))
      .sort((a, b) => a.v - b.v)[0].s;
    const chosen = {};
    for (const g of r.inputs) chosen[g.anyOf.includes(branch) ? branch : g.anyOf[0]] = g.qty;
    const out = ITEMS[r.output];
    const outBase = out.baseValue * r.outputQty;
    const fee = r.feePula;
    const sumBase = Object.entries(chosen).reduce((a, [s, n]) => a + ITEMS[s].baseValue * n, 0);
    const inputMaxBand = Math.max(...Object.keys(chosen).map((s) => inputBand(s).max));
    const sumAtMax = Object.entries(chosen).reduce((a, [s, n]) => a + ITEMS[s].baseValue * n * inputBand(s).max, 0);
    const sumAtMin = Object.entries(chosen).reduce((a, [s, n]) => a + ITEMS[s].baseValue * n * inputBand(s).min, 0);
    const worst = r2(outBase * CRAFTED_BAND.min * (1 - COOP_TAX) - (sumAtMax * (1 - COOP_TAX) + fee));
    const best = r2(outBase * CRAFTED_BAND.max * (1 - COOP_TAX) - (sumAtMin * (1 - COOP_TAX) + fee));
    const breakeven = r2((outBase * (1 - COOP_TAX) - fee) / (sumBase * (1 - COOP_TAX)));
    const safe = worst >= 0;
    const label = Object.entries(chosen).map(([s, n]) => `${n} ${s}`).join(' + ');
    const verdict = safe ? 'profitable across band ✓' : `loss above raw ×${breakeven.toFixed(2)}`;
    console.log(`Recipe ${r.slug}: worst=${worst}, best=${best}, breakeven=${breakeven}, safe=${safe}, verdict=${verdict}`);
  }
  
  console.log('All tests passed!');
} catch (e) {
  console.error('ERROR:', e.message);
  console.error('STACK:', e.stack);
  process.exit(1);
}
