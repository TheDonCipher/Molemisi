const fs = require('fs');

const content = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8');

// The problematic section spans lines 91-105 (0-indexed: 90-104).
// We replace lines 91-105 with a corrected version using a template literal.
// Line 91: console.log('### Crafting vs. the market band (C14 reconciled)\n');
// Lines 92-105: console.log( ... ) — the multi-line string concatenation

const lines = content.split('\n');

// Find line 91 (1-indexed) = index 90 (0-indexed)
// Verify it contains the section header
const line91 = lines[90]; // 0-indexed
console.log('Line 91 (index 90):', JSON.stringify(line91));
if (!line91.includes('### Crafting vs. the market band')) {
  console.log('ERROR: Expected section header at line 91, got:', line91.slice(0, 80));
  process.exit(1);
}

// Lines 92-105 are the console.log block (indices 91-104)
// Verify line 92 starts the console.log(
const line92 = lines[91];
console.log('Line 92 (index 91):', JSON.stringify(line92));
if (!line92.includes('console.log(')) {
  console.log('ERROR: Expected console.log( at line 92, got:', line92.slice(0, 80));
  process.exit(1);
}

// Verify line 105 closes the console.log
const line105 = lines[104];
console.log('Line 105 (index 104):', JSON.stringify(line105));

// Replace lines 91-105 (indices 90-104) with corrected version
const newSection = [
  `console.log('### Crafting vs. the market band (C14 reconciled)\\n')`,
  `console.log(\`The economics above are the **1.0\\u00d7 baseline** (every price at base value). The live \`` +
  `\`Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \`` +
  `\`output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \`` +
  `\`net sell price (\`base × band × (1 − COOP_TAX)\`), but \`recipeEconomics\` evaluates \`it at 1.0× only — so the §6 table is the baseline, not the live margin. \`` +
  `\`Worst-case = output at the band floor with inputs at their band ceiling; best-case = \`` +
  `\`output at the band ceiling with inputs at their floor. Break-even mult = the input \`` +
  `\`multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \`` +
  `\`negative when its raw inputs peak; the signal is for the player to sell the inputs raw \`` +
  `\`instead — intended, not a bug.\\n\`)`,
  `console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')`,
  `console.log('|---|---|---|---|---|---|---|')`,
];

// Replace indices 90-104 (15 lines) with newSection (5 lines)
const before = lines.slice(0, 90);
const after = lines.slice(105); // index 105 onwards = original line 106+
const newLines = before.concat(newSection).concat(after);

const newContent = newLines.join('\n');
fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newContent);

console.log('Replaced lines 91-105 with', newSection.length, 'new lines');
console.log('Old line count:', lines.length, 'New line count:', newLines.length);
console.log('File written.');

// Verify the new content
const verifyLines = newContent.split('\n');
console.log('\n=== Verification: lines 89-115 ===');
for (let i = 88; i < Math.min(115, verifyLines.length); i++) {
  console.log((i+1) + ': ' + JSON.stringify(verifyLines[i].replace(/\r$/, '')));
}
