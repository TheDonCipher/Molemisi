const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
if (hdrIdx < 0 || endIdx < 0) { console.log('MARKERS NOT FOUND'); process.exit(1); }

// Build generator line 92. Use \u0060 for backticks (in generator's single-quoted strings),
// \${ for literal ${}, \u00d7 for ×, \u00a7 for §, \u2717 for ✗.
// In this script's template literal: \u0060 = backtick char (doesn't close template);
// \${ = literal ${; \\u00d7 = \u00d7 text (in generator's single-quoted string = × char).

const line92 = `console.log('The economics above are the **1.0\\u00d7 baseline** (every price at base value). The live ' +\n  '`\\u0060Co-op price for a raw or foraged good swings in \\${PRICE_BAND} [\\${PRICE_BAND.min}, \\${PRICE_BAND.max}] every \\${PRICE_CYCLE_HOURS}h; every recipe \\u0060' +\n  '`\\u0060output (DITSALO/DIKUNO) is exempt and sells in \\${CRAFTED_BAND} [\\${CRAFTED_BAND.min}, \\${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \\u0060' +\n  '`\\u0060net sell price (\\u0060base \\u00d7 band \\u00d7 (1 − COOP_TAX)\\u0060), but \\u0060recipeEconomics\\u0060 evaluates \\u0060it at 1.0\\u00d7 only — so the \\u00a76 table is the baseline, not the live margin. \\u0060' +\n  '`\\u0060Worst-case = output at the band floor with inputs at their band ceiling; best-case = \\u0060' +\n  '`\\u0060output at the band ceiling with inputs at their floor. Break-even mult = the input \\u0060' +\n  'multiplier at which the 1.0\\u00d7-output margin hits zero. A recipe marked \\u2717 goes \\u0060' +\n  '`\\u0060negative when its raw inputs peak; the signal is for the player to sell the inputs raw \\u0060' +\n  '`\\u0060instead — intended, not a bug.\\n');`;

console.log('backticks:', (line92.match(/`/g) || []).length);
console.log('\\u0060 count:', (line92.match(/\\u0060/g) || []).length);
console.log('\\${ count:', (line92.match(/\\${/g) || []).length);
console.log('line92 length:', line92.length);
fs.writeFileSync('./line92_final.txt', line92);
console.log('Written to line92_final.txt');

const sectionHeader = lines[hdrIdx];
const tableHeader = "console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')";
const tableSep    = "console.log('|---|---|---|---|---|---|---|')";
const replacement = [sectionHeader, line92, tableHeader, tableSep];
const newLines = [...lines.slice(0, hdrIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));
console.log('Done. Old:', lines.length, 'New:', newLines.length);

const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
let dups = [];
for (let i = 0; i < v.length - 1; i++) if (v[i].trim() === v[i+1]?.trim()) dups.push([i+1, i+2]);
console.log('Dups:', dups.length ? dups : 'none');
for (let i = 88; i < Math.min(103, v.length); i++) console.log((i+1) + ': ' + v[i].replace(/\r$/, '').slice(0, 100));
