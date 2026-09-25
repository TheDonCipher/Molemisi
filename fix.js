const fs = require('fs');
const f = 'scripts/generate-inventory-reference.cjs';
let s = fs.readFileSync(f, 'utf8');
const head = "console.log('### Crafting vs. the market band (C14 reconciled)";
const start = s.indexOf(head);
const tableHeader = "console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |');";
const end = s.indexOf(tableHeader, start);
if (start < 0 || end < 0) { console.error('anchors not found', start, end); process.exit(1); }
const clean = [
  "console.log('### Crafting vs. the market band (C14 reconciled)');",
  "console.log('');",
  "console.log(",
  "  'The \\u00a76 economics above are the 1.0\\u00d7 baseline (every price at base value). ' +",
  "  'Live Co-op prices: raw goods swing in PRICE_BAND [' + PRICE_BAND.min + '-' + PRICE_BAND.max + ']\\u00d7 every ' + PRICE_CYCLE_HOURS + 'h; recipe outputs (DITSALO/DIKUNO) are exempt in CRAFTED_BAND [' + CRAFTED_BAND.min + '-' + CRAFTED_BAND.max + '] (C14). ' +",
  "  'Opportunity cost of an input is its live net sell price (base \\u00d7 band \\u00d7 (1 \\u2212 COOP_TAX)), but recipeEconomics uses 1.0\\u00d7 only \\u2014 so \\u00a76 is the baseline, not the live margin. ' +",
  "  'Worst-case = output at band floor, inputs at band ceiling; best-case = output at band ceiling, inputs at band floor. ' +",
  "  'Break-even mult = the raw input multiplier at which the 1.0\\u00d7-output margin hits zero. ' +",
  "  'A recipe marked \\u2717 goes negative when its raw inputs peak; sell the inputs raw instead \\u2014 intended, not a bug.'",
  ");",
  "console.log('');",
].join('\n') + '\n';
s = s.slice(0, start) + clean + s.slice(end);
fs.writeFileSync(f, s);
try { new Function(s); } catch (e) { console.error('SYNTAX ERR:', e.message); process.exit(2); }
console.log('fix.js OK; anchors', start, end);
