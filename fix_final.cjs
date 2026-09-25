const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
if (hdrIdx < 0 || endIdx < 0) { console.log('MARKERS NOT FOUND'); process.exit(1); }

// Template literal: \\\\u0060 → \\u0060 in gen file → \u0060 literal text in doc
// \\${ → \${ in gen file → ${ literal text in doc
// ×, §, ✗ are literal chars → pass through to gen file → pass through to doc

const line92 = `console.log('The economics above are the **1.0× baseline** (every price at base value). The live ' +\n  '`\\\\u0060Co-op price for a raw or foraged good swings in \\${PRICE_BAND} [\\${PRICE_BAND.min}, \\${PRICE_BAND.max}] every \\${PRICE_CYCLE_HOURS}h; every recipe \\\\u0060' +\n  '`\\\\u0060output (DITSALO/DIKUNO) is exempt and sells in \\${CRAFTED_BAND} [\\${CRAFTED_BAND.min}, \\${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \\\\u0060' +\n  '`\\\\u0060net sell price (\\\\u0060base × band × (1 − COOP_TAX)\\\\u0060), but \\\\u0060recipeEconomics\\\\u0060 evaluates \\\\u0060it at 1.0× only — so the §6 table is the baseline, not the live margin. \\\\u0060' +\n  '`\\\\u0060Worst-case = output at the band floor with inputs at their band ceiling; best-case = \\\\u0060' +\n  '`\\\\u0060output at the band ceiling with inputs at their floor. Break-even mult = the input \\\\u0060' +\n  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \\\\u0060' +\n  '`\\\\u0060negative when its raw inputs peak; the signal is for the player to sell the inputs raw \\\\u0060' +\n  '`\\\\u0060instead — intended, not a bug.\\n');`;

console.log('backticks:', (line92.match(/`/g) || []).length, '| \\\\u0060:', (line92.match(/\\\\u0060/g) || []).length, '| \\${:', (line92.match(/\\${/g) || []).length);
fs.writeFileSync('./line92_v5.txt', line92);
console.log('Written. len:', line92.length);

const sectionHeader = lines[hdrIdx];
const tableHeader = "console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')";
const tableSep    = "console.log('|---|---|---|---|---|---|---|')";
const replacement = [sectionHeader, line92, tableHeader, tableSep];
const newLines = [...lines.slice(0, hdrIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));
console.log('Done. Old:', lines.length, 'New:', newLines.length);
