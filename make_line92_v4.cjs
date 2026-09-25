const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);

// BUILD THE GENERATOR'S LINE 92:
// The generator's line 92 should be a series of single-quoted strings concatenated,
// where each single-quoted string contains literal backtick characters (no \u0060 needed).
// In the generator file: 'hello ` world' is valid JS, the string contains ` char.
// When generator runs: doc outputs hello ` world. ✓
//
// In THIS script, I write the generator's JS source as a string.
// I use a template literal in this script, BUT the generator's JS source uses
// SINGLE-QUOTED strings (no backticks as delimiters in generator).
// So the generator's single-quoted strings are delimited by ' (single quote).
// In this script's template literal, ' is just a char (doesn't close template).
// And ` IS a char that closes this script's template!
//
// But the generator's single-quoted strings contain ` chars (literal backticks).
// In this script's template literal: I can't write ` (closes template).
// I need \u0060 in this script's template literal → produces ` char in output.
// \u0060 in template literal = Unicode escape = backtick CHARACTER in output. ✓
// This backtick char is part of my template literal's content (not a delimiter).
// When written to generator file: generator file has ` char (literal backtick).
// When generator file's JS parser reads single-quoted string with ` inside:
// The string contains a backtick. ✓ (valid in single-quoted strings)
// When generator runs: doc outputs backtick. ✓

// So:
// - \u0060 in this script's template literal → ` char in generator file →
//   (inside generator's single-quoted string) → ` char in doc output. ✓
// - × in this script's template literal → × char in generator file → × in doc. ✓
// - ✗ in this script's template literal → ✗ char in generator file → ✗ in doc. ✓
// - § in this script's template literal → § char in generator file → § in doc. ✓
// - \n in this script's template literal → newline in generator file. ✓
// - ${PRICE_BAND} in this script's template literal → INTERPOLATES! ✗
//   I need literal ${PRICE_BAND} in generator file. Use \${PRICE_BAND} in this script.
//   \$ in template literal → literal $ in output. Then {PRICE_BAND} is literal. ✓
//   So \${PRICE_BAND} in template literal → ${PRICE_BAND} in generator file. ✓

// Build the generator's line 92 using a template literal in this script.
const line92 = `console.log('The economics above are the **1.0× baseline** (every price at base value). The live ' +\n  '\u0060Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \u0060' +\n  '\u0060output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \u0060' +\n  '\u0060net sell price (\u0060base × band × (1 − COOP_TAX)\u0060), but \u0060recipeEconomics\u0060 evaluates \u0060it at 1.0× only — so the §6 table is the baseline, not the live margin. \u0060' +\n  '\u0060Worst-case = output at the band floor with inputs at their band ceiling; best-case = \u0060' +\n  '\u0060output at the band ceiling with inputs at their floor. Break-even mult = the input \u0060' +\n  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \u0060' +\n  '\u0060negative when its raw inputs peak; the signal is for the player to sell the inputs raw \u0060' +\n  '\u0060instead — intended, not a bug.\n');`;

console.log('=== VERIFICATION ===');
console.log('line92 length:', line92.length);
console.log('Backtick count (should be 12: 2 delimiters + 10 in content):', (line92.match(/`/g) || []).length);
console.log('\${ count (should be 8):', (line92.match(/\$\{/g) || []).length);
console.log('Has ×:', line92.includes('×'));
console.log('Has ✗:', line92.includes('✗'));
console.log('Has §:', line92.includes('§'));
console.log('Has \\n at end:', line92.endsWith('\n\'));
console.log('\nLine 92 preview (first 200):', line92.slice(0, 200));
console.log('\nLine 92 end (last 100):', line92.slice(-100));

fs.writeFileSync('./line92_v4.txt', line92);
console.log('\nWritten to line92_v4.txt');

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
console.log('\n=== Result lines 90-96 ===');
for (let i = 89; i < 97; i++) console.log((i+1) + ': ' + v[i].replace(/\r$/, '').slice(0, 110));
