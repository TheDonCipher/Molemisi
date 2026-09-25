const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);
if (hdrIdx < 0 || endIdx < 0) { console.log('MARKERS NOT FOUND'); process.exit(1); }

// Build generator file content using single-quoted strings.
// EBT = \` in generator file = escaped backtick inside generator's template literal.
const EBT = '\\`';

// Template literal content for generator line 92 (backticks as EBT, ${} as literal chars)
const content = 
  'The economics above are the **1.0\u00d7 baseline** (every price at base value). The live ' + EBT +
  'Co-op price for a raw or foraged good swings in ${PRICE_BAND} [${PRICE_BAND.min}, ${PRICE_BAND.max}] every ${PRICE_CYCLE_HOURS}h; every recipe ' + EBT +
  'output (DITSALO/DIKUNO) is exempt and sells in ${CRAFTED_BAND} [${CRAFTED_BAND.min}, ${CRAFTED_BAND.max}]. Opportunity cost of an input is its live ' + EBT +
  'net sell price (' + EBT + 'base × band × (1 − COOP_TAX)' + EBT + '), but ' + EBT + 'recipeEconomics' + EBT + ' evaluates ' + EBT + 'it at 1.0× only — so the §6 table is the baseline, not the live margin. ' + EBT +
  'Worst-case = output at the band floor with inputs at their band ceiling; best-case = ' + EBT +
  'output at the band ceiling with inputs at their floor. Break-even mult = the input ' + EBT +
  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes ' + EBT +
  'negative when its raw inputs peak; the signal is for the player to sell the inputs raw ' + EBT +
  'instead — intended, not a bug.\n';

console.log('Content backticks:', (content.match(/`/g) || []).length);
console.log('Content length:', content.length);

// line92: console.log(` + content + `)
const line92 = 'console.log(`' + content + '`)';
console.log('line92 backticks:', (line92.match(/`/g) || []).length);
console.log('line92 EBT count:', (line92.match(/\\`/g) || []).length);
console.log('line92 length:', line92.length);

console.log('line92 preview:', line92.slice(0, 100));
console.log('line92 end:', line92.slice(-20));
