const fs = require('fs');
const f = 'scripts/generate-inventory-reference.cjs';
let s = fs.readFileSync(f, 'utf8');
const key = "The economics above are the";
let i = s.indexOf(key);
if (i < 0) { console.error('start key not found'); process.exit(1); }
const open = s.lastIndexOf("console.log(", i);
const endKey = "intended, not a bug.";
let k = s.indexOf(endKey, i);
if (k < 0) { console.error('end key not found'); process.exit(1); }
const nl = s.indexOf("\n", k);
const close = s.indexOf(");", nl);
let after = s.indexOf("\n", close) + 1;
const clean =
"console.log(\n" +
"  'The §6 economics above are the 1.0× baseline (every price at base value). Live Co-op prices: raw goods swing in PRICE_BAND [' + PRICE_BAND.min + '–' + PRICE_BAND.max + '× every ' + PRICE_CYCLE_HOURS + 'h; recipe outputs (DITSALO/DIKUNO) are exempt in CRAFTED_BAND [' + CRAFTED_BAND.min + '–' + CRAFTED_BAND.max + ']× (C14). ' +\n" +
"  'Opportunity cost of an input is its live net sell price (base × band × (1 − COOP_TAX)), but recipeEconomics uses 1.0× only — so the §6 table is the baseline, not the live margin. ' +\n" +
"  'Worst-case = output at band floor, inputs at band ceiling; best-case = output at band ceiling, inputs at band floor. ' +\n" +
"  'Break-even mult = the raw input multiplier at which the 1.0×-output margin hits zero. ' +\n" +
"  'A recipe marked ✗ goes negative when its raw inputs peak; the signal is to sell the inputs raw instead — intended, not a bug.\n'\n" +
");\n";
s = s.slice(0, open) + clean + s.slice(after);
fs.writeFileSync(f, s);
// sanity: syntax check by requiring (will throw on syntax error)
try { new Function(s); console.log('OK syntax check'); } catch (e) { console.error('SYNTAX ERR:', e.message); process.exit(2); }
console.log('spliced OK; file length', s.length);
