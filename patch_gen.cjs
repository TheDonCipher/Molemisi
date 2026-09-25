const fs = require('fs');
const c = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8');

const oldLine = 'console.log(`Constants: COOP_TAX=${COOP_TAX}, OPPORTUNITY_COST_FACTOR=${OPPORTUNITY_COST_FACTOR}, BONUS_YIELD_CHANCE=${BONUS_YIELD_CHANCE}, slots=${JSON.stringify(CRAFTING_SLOTS)}, batch fees=${JSON.stringify(BATCH_FEE_MULTIPLIER)}\\n`);';

const newLine = 'console.log(`Constants: COOP_TAX=${COOP_TAX}, OPPORTUNITY_COST_FACTOR=${OPPORTUNITY_COST_FACTOR}, BONUS_YIELD_CHANCE=${BONUS_YIELD_CHANCE}, slots=${JSON.stringify(CRAFTING_SLOTS)}, batch sizes=${JSON.stringify(BATCH_SIZES)}, batch fees=${JSON.stringify(BATCH_FEE_MULTIPLIER)}, PRICE_BAND=${JSON.stringify(PRICE_BAND)}, CRAFTED_BAND=${JSON.stringify(CRAFTED_BAND)}, PRICE_CYCLE_HOURS=${PRICE_CYCLE_HOURS}h\\n`);';

const n = c.indexOf(oldLine);
console.log('FOUND_AT:', n);
if (n >= 0) {
  const out = c.slice(0, n) + newLine + c.slice(n + oldLine.length);
  fs.writeFileSync('./scripts/generate-inventory-reference.cjs', out);
  console.log('DONE');
} else {
  console.log('NOT_FOUND');
  // Show context around the constants line
  const lines = c.split('\n');
  for (let i = 60; i < Math.min(68, lines.length); i++) {
    console.log(i + 1 + ': ' + lines[i]);
  }
}
