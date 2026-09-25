const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);

// In SINGLE-QUOTED JS strings (this script):
//   '\\'  → one backslash char (\)
//   '`'   → one backtick char (`)
//   '\\`' → two chars: backslash + backtick  (\`)
// When written to generator file line inside a template literal: \` = escaped backtick = literal ` in output

// Build the generator's template literal content using single-quoted strings.
// Each literal backtick in GENERATOR OUTPUT = \` in generator file = '\\`' in this script.

const a = '\\`'; // backslash + backtick (2 chars) → in generator file: \` (escaped backtick)

// The template literal content (everything BETWEEN the outer ` delimiters of the generator's console.log):
const content =
  'The economics above are the **1.0\u00d7 baseline** (every price at base value). The live ' + a +
  'Co-op price for a raw or foraged good swings in $' + '{PRICE_BAND} [$' + '{PRICE_BAND.min}, $' + '{PRICE_BAND.max}] every $' + '{PRICE_CYCLE_HOURS}h; every recipe ' + a +
  'output (DITSALO/DIKUNO) is exempt and sells in $' + '{CRAFTED_BAND} [$' + '{CRAFTED_BAND.min}, $' + '{CRAFTED_BAND.max}]. Opportunity cost of an input is its live ' + a +
  'net sell price (' + a + 'base × band × (1 − COOP_TAX)' + a + '), but ' + a + 'recipeEconomics' + a + ' evaluates ' + a + 'it at 1.0× only — so the §6 table is the baseline, not the live margin. ' + a +
  'Worst-case = output at the band floor with inputs at their band ceiling; best-case = ' + a +
  'output at the band ceiling with inputs at their floor. Break-even mult = the input ' + a +
  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes ' + a +
  'negative when its raw inputs peak; the signal is for the player to sell the inputs raw ' + a +
  'instead — intended, not a bug.\n';

console.log('Content backtick count:', (content.match(/`/g) || []).length); // should be 10
console.log('Content length:', content.length);

// Build line 92: console.log(` + content + `)
// The outer backticks delimit the generator's template literal.
// Inside: content (which has \` for each literal backtick).
// When Node parses generator file: \` inside template = escaped bt = literal ` in result.
const line92 = 'console.log(`' + content + '`)';
console.log('Line 92 backtick count:', (line92.match(/`/g) || []).length); // should be 12 (2 delimiters + 10 in content)
console.log('Line 92 first 100 chars:', line92.slice(0, 100));

// Verify content has correct interpolations
console.log('Has ${PRICE_BAND}:', content.includes('${PRICE_BAND}'));
console.log('Has ${CRAFTED_BAND}:', content.includes('${CRAFTED_BAND}'));

// Replacement: lines hdrIdx through endIdx-1 → [sectionHeader, line92, tableHeader, tableSep]
// The "const r2" line at endIdx stays.
const sectionHeader = lines[hdrIdx];
const tableHeader = "console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')";
const tableSep    = "console.log('|---|---|---|---|---|---|---|')";

const replacement = [sectionHeader, line92, tableHeader, tableSep];
const newLines = [
  ...lines.slice(0, hdrIdx),
  ...replacement,
  ...lines.slice(endIdx),  // includes the "const r2" line
];
fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));

console.log('\nDone. Old lines:', lines.length, 'New lines:', newLines.length);

// Verify result
const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('\n=== Result lines 89-102 ===');
for (let i = 88; i < Math.min(103, v.length); i++) {
  console.log((i+1) + ': ' + v[i].replace(/\r$/, '').slice(0, 130));
}

// Check consecutive duplicates
const dups = [];
for (let i = 0; i < v.length - 1; i++) {
  if (v[i].trim() === v[i+1]?.trim()) dups.push([i+1, i+2]);
}
console.log('\nConsecutive duplicates:', dups.length ? dups : 'none');

// Check backtick balance per line
console.log('\nBacktick counts per line (lines 90-96):');
for (let i = 89; i < Math.min(97, v.length); i++) {
  const bt = (v[i].match(/`/g) || []).length;
  console.log((i+1) + ': ' + bt + ' backticks' + (bt % 2 !== 0 ? '  ← ODD!' : ''));
}
