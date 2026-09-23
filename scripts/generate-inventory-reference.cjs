/**
 * Regenerate the data tables for docs/26_Inventory_Crafting_System.md.
 * Reads ONLY the built @molemisi/game-config (packages/game-config/dist) — run
 * `npm run build` in packages/game-config first. Prints markdown to stdout.
 */
const gc = require('../packages/game-config/dist/index.js');

const {
  ITEMS, RECIPES, BUILDINGS, CHAPTERS, ANIMALS, HOTSPOTS, DEEP_BUSHVELD_HOTSPOTS,
  STORAGE_TIERS, GUILD_STORAGE_MULTIPLIER, SETSWANA_MONTHS,
  storageUpgradeCost, productValuePula,
  sourcesForItem, recipesUsingItem, buildingsUsingItem,
  recipeEconomics, intentGroup, TOOL_SLUGS,
  BATCH_SIZES, BATCH_FEE_MULTIPLIER, CRAFTING_SLOTS, BONUS_YIELD_CHANCE,
  OPPORTUNITY_COST_FACTOR, COOP_TAX,
} = gc;

const CATEGORY_ORDER = ['DIPEO', 'DIJALO', 'DIPHOLOGOLO', 'DITSHIMOLOGO TSA NAGENG', 'DITSALO', 'DIKUNO', 'DIDIRISIWA'];

function fmtSource(s) {
  switch (s.kind) {
    case 'grow': return `Grow (${s.cropId})`;
    case 'forage': {
      const months = s.months ? ` [${s.months.map((m) => SETSWANA_MONTHS[m - 1]).join(' & ')}]` : '';
      return `Forage ${s.scene}/${s.hotspotId}${months}`;
    }
    case 'raise': return `Raise ${s.animalId}`;
    case 'craft': return `Craft (${s.recipeSlug})`;
    case 'buy': return `Co-op: ${s.chapters.join(', ')}`;
  }
}

console.log('## 4. Complete item catalogue\n');
console.log(`Catalogue size: **${Object.keys(ITEMS).length} items** (${TOOL_SLUGS.length} tools are equipment, not stored).\n`);

for (const cat of CATEGORY_ORDER) {
  const items = Object.values(ITEMS).filter((i) => i.category === cat);
  if (!items.length) continue;
  console.log(`### ${cat} (${items.length})\n`);
  console.log('| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const i of items) {
    const sources = sourcesForItem(i.slug).map(fmtSource).join('<br>') || '— *(starter)*';
    const usedIn = recipesUsingItem(i.slug).map((r) => r.slug).join(', ') || '—';
    const usedBy = buildingsUsingItem(i.slug)
      .map((u) => `${u.building.id} (${u.uses.join('+')})`)
      .join('<br>') || '—';
    console.log(`| \`${i.slug}\` | ${i.setswana} | ${i.name} | ${i.maxStack} | P${i.baseValue} | ${intentGroup(i)} | ${sources} | ${usedIn} | ${usedBy} |`);
  }
  console.log('');
}

console.log('### Lore appendix (all items)\n');
console.log('| Slug | Use (03 §2.1) | Lore |');
console.log('|---|---|---|');
for (const i of Object.values(ITEMS)) {
  console.log(`| \`${i.slug}\` | ${i.use.replace(/\|/g, '\\|')} | ${i.lore.replace(/\|/g, '\\|')} |`);
}
console.log('');

console.log('## 6. Recipe table\n');
console.log(`Constants: COOP_TAX=${COOP_TAX}, OPPORTUNITY_COST_FACTOR=${OPPORTUNITY_COST_FACTOR}, BONUS_YIELD_CHANCE=${BONUS_YIELD_CHANCE}, slots=${JSON.stringify(CRAFTING_SLOTS)}, batch fees=${JSON.stringify(BATCH_FEE_MULTIPLIER)}\n`);
console.log('| Recipe | Output | Inputs (anyOf × qty) | Fee P1 | Time | Unlock |');
console.log('|---|---|---|---|---|---|');
for (const r of Object.values(RECIPES)) {
  const inputs = r.inputs.map((g) => `${g.anyOf.join('/')} ×${g.qty}`).join(' + ');
  console.log(`| ${r.setswana} (${r.name}) | ${r.output} ×${r.outputQty} | ${inputs} | P${r.feePula} | ${r.durationMinutes} min | ${r.unlock ? `Botho ≥ ${r.unlock.bothoGte}` : 'start'} |`);
}
console.log('');
console.log('### Recipe economics per batch (inputs at opportunity cost, Co-op tax applied)\n');
console.log('| Recipe | Inputs chosen | Batch | Input cost | Fee | Gross | Net | Profit | ROI |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of Object.values(RECIPES)) {
  const variants = r.inputs[0].anyOf.map((first) => {
    const chosen = {};
    for (const g of r.inputs) chosen[g.anyOf.includes(first) ? first : g.anyOf[0]] = g.qty;
    return chosen;
  });
  for (const chosen of variants) {
    for (const b of BATCH_SIZES) {
      const scaled = Object.fromEntries(Object.entries(chosen).map(([k, v]) => [k, v * b]));
      const e = recipeEconomics(r, scaled, b);
      const label = Object.entries(chosen).map(([k, v]) => `${v} ${k}`).join(' + ');
      console.log(`| ${r.slug} | ${label} | ${b} | ${e.inputValue} | ${e.fee} | ${e.saleGross} | ${e.netAfterTax} | ${e.profit} | ${Math.round(e.roi * 100)}% |`);
    }
  }
}
console.log('');

console.log('## 7. Building material demand matrix\n');
console.log('| Building | Setswana | Build | Upgrades | Maintenance (per 90d) |');
console.log('|---|---|---|---|---|');
const fmtCost = (c) => {
  if (!c) return '—';
  const parts = [];
  if (c.currency) parts.push(`P${c.currency}`);
  for (const m of ['poleto', 'thapo', 'setena', 'thatch']) if (c[m]) parts.push(`${c[m]} ${m}`);
  return parts.join(' + ') || '—';
};
for (const b of Object.values(BUILDINGS)) {
  console.log(`| ${b.name} | ${b.setswana} | ${fmtCost(b.baseCost)} | ${b.upgradeCosts.map(fmtCost).join(' → ') || '—'} | ${fmtCost(b.maintenanceMaterials)} (+P${b.maintenanceCost}) |`);
}
console.log('');

console.log('## 8. Seed calendar & livestock products\n');
console.log('| Chapter | Months | Seeds stocked |');
console.log('|---|---|---|');
for (const c of CHAPTERS) {
  console.log(`| ${c.setswana} (${c.name}) | ${c.months.map((m) => SETSWANA_MONTHS[m - 1]).join(', ')} | ${c.seeds.join(', ')} |`);
}
console.log('');
console.log('| Animal | Product → item | Cycle | Qty | Base price | Feed/day | Cost |');
console.log('|---|---|---|---|---|---|---|');
for (const a of Object.values(ANIMALS)) {
  // G3 — the price of record is the mapped ItemDef's baseValue, never a number
  // stored on the animal.
  const price = productValuePula(a);
  console.log(`| ${a.name} | ${a.productType} | ${a.productionCycleHours} h | ${a.productQuantity} | ${price == null ? '—' : `P${price}`} | ${a.feedPerDay} ${a.feedType} | P${a.purchaseCost} |`);
}
console.log('');

console.log('## 9. Forage table\n');
console.log('Finds marked with qty are **materials** (land in inventory); finds marked ◈ are **Field Journal discoveries** (no item).\n');
console.log('| Hotspot | Scene | Finds (item/discovery · rarity · weight · qty) | Seasonal finds | Seasonal window |');
console.log('|---|---|---|---|---|');
const fmtFind = (l) => l.item
  ? `${l.item} · ${l.rarity} · w${l.weight}${l.qty ? ` · ${l.qty.min}-${l.qty.max}` : ''}`
  : `◈ ${l.name} (${l.rarity})`;
for (const h of [...HOTSPOTS, ...(DEEP_BUSHVELD_HOTSPOTS ?? [])]) {
  const loot = h.loot.map(fmtFind).join('<br>');
  const sl = (h.seasonalLoot ?? []).map(fmtFind).join('<br>') || '—';
  const months = h.activeMonths ? h.activeMonths.map((m) => SETSWANA_MONTHS[m - 1]).join(', ') : '—';
  console.log(`| ${h.id} | ${h.scene} | ${loot} | ${sl} | ${months} |`);
}
console.log('');

console.log('## 10. Storage tiers\n');
for (const t of STORAGE_TIERS) {
  // G8 — the upgrade cost is derived from BUILDINGS.storage.upgradeCosts, the
  // single source charged by buildings.service.
  const cost = storageUpgradeCost(t.tier);
  const up = cost == null ? (t.tier === 1 ? '— (starter tier)' : '— (top tier)') : `P${cost}`;
  console.log(`- Tier ${t.tier} ${t.name} (${t.setswana}): ${t.slotCap} slots, ${t.listingSlots} market listings, upgrade ${up}; Guild → ${Math.floor(t.slotCap * GUILD_STORAGE_MULTIPLIER)} slots`);
}
