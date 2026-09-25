const fs = require('fs');
const f = 'scripts/generate-inventory-reference.cjs';
let s = fs.readFileSync(f, 'utf8');
const re = /console\.log\('### Crafting vs\. the market band \(C14 reconciled\)\\n'\);\nconsole\.log\(\n  'The economics above are the[\s\S]*?\n\);\n/;
if (!re.test(s)) { console.error('anchor not found'); process.exit(1); }
const clean =
"console.log('### Crafting vs. the market band (C14 reconciled)\\n');\n" +
"console.log(            \n" +
"  'The \\u00a76 economics above are the 1.0x baseline (every price at base value). ' +\n" +
"  'On the live Co-op market, raw and foraged goods swing in PRICE_BAND [' + PRICE_BAND.min + ',' + PRICE_BAND.max + '] every ' + PRICE_CYCLE_HOURS + 'h, while every recipe output (DITSALO/DIKUNO) is exempt and sells in CRAFTED_BAND [' + CRAFTED_BAND.min + ',' + CRAFTED_BAND.max + '] (C14). ' +\n" +
"  'Opportunity cost of an input is its live net sell price (base x band x (1 - COOP_TAX)), but recipeEconomics evaluates at 1.0x only - so \\u00a76 is the baseline, not the live margin. ' +\n" +
"  'Worst-case = output at the band floor with inputs at their band ceiling; best-case = output at the band ceiling with inputs at their floor. ' +\n" +
"  'Break-even mult = the input multiplier at which the 1.0x-output margin hits zero. ' +\n" +
"  'A recipe marked X goes negative when its raw inputs peak; the signal is to sell the inputs raw instead - intended, not a bug.\\n'\n" +
");\n";
s = s.replace(re, clean);
fs.writeFileSync(f, s);
console.log('patched OK');
