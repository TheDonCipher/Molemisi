const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);
if (hdrIdx < 0 || endIdx < 0) { console.log('MARKERS NOT FOUND'); process.exit(1); }

// In the GENERATOR FILE, line 92 must be a SINGLE-QUOTED STRING (not template literal),
// because single-quoted strings can contain literal backtick characters without closing.
// In the generator's single-quoted string:
//   - \\u0060 → \u0060 (literal text, 5 chars: \, u, 0, 0, 6, 0) in doc output ✓
//   - \\u00d7 → \u00d7 (literal text) in doc output ✓
//   - \u0060  → backtick char in doc output (WRONG - closes template in generator!)
//   - ×     → × char in doc output ✓
//
// So the generator file's single-quoted string must use \\u0060, \\u00d7, etc.
// (double backslash + uXXXX).
//
// To produce \\u0060 in the generator file from THIS script's template literal:
//   \\\\u0060 → \\u0060 (in generator file) → \u0060 (in doc output)
//   (4 backslashes + u0060 in template literal → 2 backslashes + u0060 in gen file)

// Build line92 content for the generator file.
// The generator's line 92 is: console.log('...' + '...' + ...);
// Each '...' is a single-quoted string in the generator file.
//
// Piece format in generator file: 'CONTENT'
// In THIS script's template literal, to produce 'CONTENT' in the generator file:
//   - ' at start/end: just write ' (single quote, no escaping needed in template literal)
//   - × in CONTENT: write × (literal char) OR \\u00d7 in template literal → \u00d7 in gen file
//     But \u00d7 in gen file's single-quoted string = × char in doc. So write × directly.
//   - \u0060 in CONTENT (for doc): write \\u0060 in generator file.
//     In THIS script's template literal: \\\\u0060 → \\u0060 in gen file.

// Actually, simpler: write the multiplication sign as the literal × character in the
// generator file. In THIS script's template literal, just write × (it's a regular char,
// passes through to generator file as ×, then gen file's single-quoted string contains ×,
// and doc output has ×).

// Backticks in generator file's single-quoted strings: need \u0060 (literal text) in doc.
// In generator file: \\u0060 (in single-quoted string) → \u0060 (literal text) in doc.
// In THIS script's template literal: \\\\u0060 → \\u0060 in generator file.

// ${ in generator file's single-quoted string: need ${...} (literal text) in doc.
// In generator file: ${ (just $ and {, no backslash) → ${...} in doc.
// In THIS script's template literal: ${ would be interpolation! So write \${ → ${ in gen file.
//   \${ in template literal: \$ escapes $, producing literal $ + {. → ${ in generator file. ✓

const line92 = `console.log('The economics above are the **1.0× baseline** (every price at base value). The live ' +\n  '`\\\\u0060Co-op price for a raw or foraged good swings in \\${PRICE_BAND} [\\${PRICE_BAND.min}, \\${PRICE_BAND.max}] every \\${PRICE_CYCLE_HOURS}h; every recipe \\\\u0060' +\n  '`\\\\u0060output (DITSALO/DIKUNO) is exempt and sells in \\${CRAFTED_BAND} [\\${CRAFTED_BAND.min}, \\${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \\\\u0060' +\n  '`\\\\u0060net sell price (\\\\u0060base × band × (1 − COOP_TAX)\\\\u0060), but \\\\u0060recipeEconomics\\\\u0060 evaluates \\\\u0060it at 1.0× only — so the §6 table is the baseline, not the live margin. \\\\u0060' +\n  '`\\\\u0060Worst-case = output at the band floor with inputs at their band ceiling; best-case = \\\\u0060' +\n  '`\\\\u0060output at the band ceiling with inputs at their floor. Break-even mult = the input \\\\u0060' +\n  'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \\\\u0060' +\n  '`\\\\u0060negative when its raw inputs peak; the signal is for the player to sell the inputs raw \\\\u0060' +\n  '`\\\\u0060instead — intended, not a bug.\\n');`;

console.log('=== VERIFICATION ===');
console.log('line92 length:', line92.length);
console.log('Backticks in line92 (should be 0):', (line92.match(/`/g) || []).length);
console.log('\\\\u0060 in line92 (should be 10):', (line92.match(/\\\\u0060/g) || []).length);
console.log('\\${ in line92 (should be 8):', (line92.match(/\\${/g) || []).length);
console.log('\\n at end:', line92.endsWith('\\n\');'));

fs.writeFileSync('./line92_v3.txt', line92);
console.log('\nWritten to line92_v3.txt');
console.log('\n=== First 200 chars ===');
console.log(line92.slice(0, 200));
console.log('\n=== Last 100 chars ===');
console.log(line92.slice(-100));
