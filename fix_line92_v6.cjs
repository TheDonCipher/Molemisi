const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);

// The generator's line 92 is a TEMPLATE LITERAL (backtick-delimited).
// Inside: CONTENT with \u0060 for each literal backtick, ${...} for interpolation.
//
// In THIS script's template literal (building gen file line 92):
//   \u0060 → ` (backtick char) in output → closes gen file's template literal. WRONG.
//   \\u0060 → \u0060 (6 chars) in output → gen file's template literal parses as:
//     \u0060 → backtick CHAR in gen file template → closes gen template. WRONG (same issue).
//   \\\\u0060 → \\u0060 (7 chars) in gen file template → gen template parses:
//     \\ → \, u0060 → u0060 literal. Content = \u0060 (6 chars in gen template content).
//     Gen template output = \u0060 (6 chars) in DOC. ✓ CORRECT!
//
// For ${ interpolation in gen file template:
//   ${PRICE_BAND} in this script's template → tries to interpolate. PRICE_BAND undefined. ERROR.
//   \${PRICE_BAND} in this script's template → \$ → $ literal, {PRICE_BAND} → literal.
//     Output = ${PRICE_BAND} (13 chars) in gen file template content.
//     Gen template interpolates ${PRICE_BAND} → actual value in DOC. ✓ CORRECT!
//
// So:
//   \\\\u0060 in this script's template → \u0060 literal text in DOC ✓
//   \${var} in this script's template → ${var} interpolated value in DOC ✓
//
// Let me build line92 correctly now.

const line92 = `console.log(\`The economics above are the **1.0\$\\u00d7 baseline** (every price at base value). The live \`\n  \`\$\\u0060Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \$\\u0060\` +\n  \`\$\\u0060output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \$\\u0060\` +\n  \`\$\\u0060net sell price (\$\\u0060base × band × (1 − COOP_TAX)\$\\u0060), but \$\\u0060recipeEconomics\$\u0060 evaluates \$\\u0060it at 1.0\$\\u00d7 only — so the §6 table is the baseline, not the live margin. \$\\u0060\` +\n  \`\$\\u0060Worst-case = output at the band floor with inputs at their band ceiling; best-case = \$\\u0060\` +\n  \`\$\\u0060output at the band ceiling with inputs at their floor. Break-even mult = the input \$\\u0060\` +\n  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \$\\u0060' +\n  \`\$\\u0060negative when its raw inputs peak; the signal is for the player to sell the inputs raw \$\\u0060\` +\n  \`\$\\u0060instead — intended, not a bug.\\n\`);`;

console.log('=== VERIFICATION ===');
console.log('line92 length:', line92.length);
console.log('Backtick count:', (line92.match(/`/g) || []).length);
console.log('\\u0060 count:', (line92.match(/\\u0060/g) || []).length);
console.log('\\u00d7 count:', (line92.match(/\\u00d7/g) || []).length);
console.log('\\${ count:', (line92.match(/\\\${/g) || []).length);

// Write to file for inspection
fs.writeFileSync('./line92_v6.txt', line92);
console.log('Written to line92_v6.txt');
console.log('\n=== First 250 chars ===');
console.log(line92.slice(0, 250));
console.log('\n=== Last 150 chars ===');
console.log(line92.slice(-150));

// Build replacement
const sectionHeader = lines[hdrIdx];
const tableHeader = "console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')";
const tableSep    = "console.log('|---|---|---|---|---|---|---|')";
const replacement = [sectionHeader, line92, tableHeader, tableSep];
const newLines = [...lines.slice(0, hdrIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));
console.log('\nDone. Old:', lines.length, 'New:', newLines.length);

const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
let dups = [];
for (let i = 0; i < v.length - 1; i++) if (v[i].trim() === v[i+1]?.trim()) dups.push([i+1, i+2]);
console.log('Dups:', dups.length ? dups : 'none');
