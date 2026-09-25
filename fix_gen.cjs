const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

// Verify line 91 (index 90) is the section header
console.log('Line 91:', lines[90].slice(0, 60));
if (!lines[90].includes('### Crafting vs. the market band')) {
  console.log('ERROR: line 91 mismatch');
  process.exit(1);
}

// Lines 91-105 (indices 90-104) will be replaced.
// New content: 5 lines using a single template literal for the long console.log.

const newLines = [
  // Line 91: section header (unchanged logic, just re-written)
  `console.log('### Crafting vs. the market band (C14 reconciled)\\n')`,
  // Line 92: console.log STARTS — single template literal, all ${} work.
  // Backticks in content are escaped as \\u0060 (= \` in the JS file).
  `console.log(\`The economics above are the **1.0\\u00d7 baseline** (every price at base value). The live \`` +
  `Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \`` +
  `output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \`` +
  `net sell price (\`base × band × (1 − COOP_TAX)\`), but \`recipeEconomics\` evaluates \`it at 1.0× only — so the §6 table is the baseline, not the live margin. \`` +
  `Worst-case = output at the band floor with inputs at their band ceiling; best-case = \`` +
  `output at the band ceiling with inputs at their floor. Break-even mult = the input \`` +
  `multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \`` +
  `negative when its raw inputs peak; the signal is for the player to sell the inputs raw \`` +
  `instead — intended, not a bug.\\n\`)`,
  // Line 106: table header (original line 106)
  `console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')`,
  // Line 107: table separator (original line 107)
  `console.log('|---|---|---|---|---|---|---|')`,
];

// Replace indices 90-104 (lines 91-105) with newLines (4 lines)
const before = lines.slice(0, 90);   // indices 0-89 = lines 1-90
const after  = lines.slice(105);     // indices 105+ = line 106 onward
const result = before.concat(newLines).concat(after);

fs.writeFileSync('./scripts/generate-inventory-reference.cjs', result.join('\n'));
console.log('Done. Old lines:', lines.length, 'New lines:', result.length);
console.log('Replaced 15 lines (91-105) with', newLines.length, 'lines.');

// Verify
const verify = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('\n=== Lines 89-115 ===');
for (let i = 88; i < Math.min(115, verify.length); i++) {
  console.log((i+1) + ': ' + JSON.stringify(verify[i].replace(/\r$/, '')));
}
