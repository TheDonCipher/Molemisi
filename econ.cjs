const g = require('./packages/game-config/dist/index.js');
const need = ['wood','hardwood','stone','clay','palm_fiber','thatch','phane',
  'sorghum','millet','maize','cowpeas','tomatoes','watermelon','groundnuts',
  'sesame','pepper','herbs','morula','poleto','thapo','setena','bupi','borotho'];
console.log('=== ITEMS (baseValue, category) ===');
for (const s of need) { const i = g.ITEMS[s]; console.log(s, 'P'+i.baseValue, i.category); }
console.log('=== CONFIG ===');
console.log('CRAFTED_CATEGORIES', JSON.stringify(g.CRAFTED_CATEGORIES));
console.log('PRICE_BAND', JSON.stringify(g.PRICE_BAND));
console.log('CRAFTED_BAND', JSON.stringify(g.CRAFTED_BAND));
console.log('OPPORTUNITY_COST_FACTOR', g.OPPORTUNITY_COST_FACTOR);
console.log('COOP_TAX', g.COOP_TAX);
console.log('=== RECIPES (baseline economics @ qty 1) ===');
for (const [k, v] of Object.entries(g.RECIPES)) {
  const inps = v.inputs.map(x => x.anyOf.join('/')+' x'+x.qty).join(' ; ');
  const chosen = Object.fromEntries(v.inputs.map(x => [x.anyOf[0], x.qty]));
  const e = g.recipeEconomics(v, chosen, 1);
  const outItem = g.ITEMS[v.output];
  console.log(JSON.stringify({
    recipe: k, output: v.output, outputQty: v.outputQty,
    outBase: outItem.baseValue, outCat: outItem.category,
    inputs: inps, fee: v.feePula,
    inputValue: e.inputValue, saleGross: e.saleGross,
    netAfterTax: e.netAfterTax, totalCost: e.totalCost, profit: e.profit, roi: e.roi
  }));
  // break-even raw multiplier: netAfterTax_baseline(=outBase*0.95*outQty) at min output band (0.9)
  // real input cost = Σ inBase * m * 0.95 * qty ; real output net = outBase*outQty*m_out*0.95
  // profit>=0 => outBase*outQty*m_out*0.95 >= Σ inBase*m*qty*0.95 + fee
  // worst case output m_out=0.9; solve for input raw multiplier m:
  const sumInBase = v.inputs.reduce((a,x)=>a + (g.ITEMS[x.anyOf[0]].baseValue * x.qty),0);
  // m such that outBase*outQty*0.9*0.95 == sumInBase * m * 0.95 + fee
  const mBreakEven = (outItem.baseValue * v.outputQty * 0.9 * 0.95 - v.feePula) / (sumInBase * 0.95);
  console.log('   breakEvenRawMult(min output 0.9):', mBreakEven.toFixed(3), '| baselineRawMultForZeroProfit:', ((outItem.baseValue * v.outputQty * 0.95 - v.feePula)/(sumInBase*0.95)).toFixed(3));
}
