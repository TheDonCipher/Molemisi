const fs = require('fs');

// Strategy: build the generator file's line 92 as a plain string in THIS script
// using a SINGLE-QUOTED string. In a single-quoted string:
//   - ` is a literal backtick (no special meaning)
//   - \u0060 is a Unicode escape → produces a backtick CHARACTER in the string
//   - ${...} is literal text (no interpolation)
//   - \' is an escaped single quote
//
// When this string is written to the generator file, it becomes JS source code.
// The generator file's JS parser reads this source. If the string in the generator
// file is a single-quoted string containing ` characters, those are literal backticks
// in the generator's single-quoted string → output (doc) has backticks. ✓
//
// So the generator file's line 92 will be a series of single-quoted strings
// (concatenated with +), each containing literal backtick characters.
// This is valid JS, and produces backticks in the doc output.

// Build the generator's line 92 as a string in this script.
// The generator's line 92 (as it will appear in the generator file):
//
// console.log('The economics above are the **1.0× baseline** (every price at base value). The live ' +
//   '`Co-op price for a raw or foraged good swings in ${PRICE_BAND} [${PRICE_BAND.min}, ${PRICE_BAND.max}] every ${PRICE_CYCLE_HOURS}h; every recipe ' +
//   '`output (DITSALO/DIKUNO) is exempt and sells in ${CRAFTED_BAND} [${CRAFTED_BAND.min}, ${CRAFTED_BAND.max}]. Opportunity cost of an input is its live ' +
//   '`net sell price (`base × band × (1 − COOP_TAX)`), but `recipeEconomics` evaluates `it at 1.0× only — so the §6 table is the baseline, not the live margin. ' +
//   '`Worst-case = output at the band floor with inputs at their band ceiling; best-case = ' +
//   '`output at the band ceiling with inputs at their floor. Break-even mult = the input ' +
//   'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes ' +
//   '`negative when its raw inputs peak; the signal is for the player to sell the inputs raw ' +
//   '`instead — intended, not a bug.\n');
//
// In the generator file, this is valid JS: a series of single-quoted strings (each
// containing literal backtick chars, literal ${...}, literal ×), concatenated with +.
//
// To produce this from this script, I write a single-quoted string in this script
// that contains the above JS source code. In this script's single-quoted string:
//   - ' is escaped as \'
//   - ` is a literal backtick (fine)
//   - ${...} is literal text (fine)
//   - × is a literal character (fine, UTF-8)
//   - \u00d7 would be a Unicode escape producing × char (also fine)

const line92 = 
  'console.log(\'The economics above are the **1.0\u00d7 baseline** (every price at base value). The live \' +\n  ' +
  '\'`Co-op price for a raw or foraged good swings in ${PRICE_BAND} [${PRICE_BAND.min}, ${PRICE_BAND.max}] every ${PRICE_CYCLE_HOURS}h; every recipe \' +\n' +
  '\'`output (DITSALO/DIKUNO) is exempt and sells in ${CRAFTED_BAND} [${CRAFTED_BAND.min}, ${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \' +\n' +
  '\'`net sell price (`base × band × (1 − COOP_TAX)`), but `recipeEconomics` evaluates `it at 1.0× only — so the §6 table is the baseline, not the live margin. \' +\n' +
  '\'`Worst-case = output at the band floor with inputs at their band ceiling; best-case = \' +\n' +
  '\'`output at the band ceiling with inputs at their floor. Break-even mult = the input \' +\n' +
  '\'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \' +\n' +
  '\'`negative when its raw inputs peak; the signal is for the player to sell the inputs raw \' +\n' +
  '\'`instead — intended, not a bug.\\n\');';

console.log('line92 length:', line92.length);
console.log('line92 backtick count:', (line92.match(/`/g) || []).length);
console.log('line92 single-quote count (escaped):', (line92.match(/\\'/g) || []).length);
console.log('line92 has ${PRICE_BAND}:', line92.includes('${PRICE_BAND}'));
console.log('line92 preview:', line92.slice(0, 120));
console.log('line92 end:', line92.slice(-30));

// Write to file for inspection
fs.writeFileSync('./line92_check.txt', line92);
console.log('Written to line92_check.txt');
