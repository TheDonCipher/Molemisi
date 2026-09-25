const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

// Find the section header at line 91 (index 90)
const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
console.log('Section header at index:', hdrIdx, '(line', hdrIdx + 1, ')');

// Find the line AFTER the new section: first line that starts with "const r2"
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('r2 line at index:', endIdx, '(line', endIdx + 1, ')');

if (hdrIdx < 0 || endIdx < 0) {
  console.log('Could not find markers');
  process.exit(1);
}

// Print what we're replacing
console.log('\n=== Lines being replaced (' + (hdrIdx + 1) + ' through ' + endIdx + ') ===');
for (let i = hdrIdx; i <= endIdx; i++) {
  console.log((i + 1) + ': ' + lines[i].replace(/\r$/, ''));
}

// Build replacement: 
// - Keep line 91 (section header) as-is
// - Replace lines 92-endIdx with: big console.log (single-quoted, backticks literal) +
//   table header + table separator
// - The "const r2" line stays

const sectionHeader = lines[hdrIdx]; // e.g. console.log('### Crafting vs. the market band (C14 reconciled)\n');

// Big console.log using single-quoted strings (backticks are literal characters, no escaping needed)
// All ${} interpolations use the outer template literal
const bigConsole = `console.log(\`The economics above are the **1.0\\u00d7 baseline** (every price at base value). The live \`` +
  `\`Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \`` +
  `'output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \`` +
  `'net sell price (\`base × band × (1 − COOP_TAX)\`), but \`recipeEconomics\` evaluates \`it at 1.0× only — so the §6 table is the baseline, not the live margin. \`` +
  `'Worst-case = output at the band floor with inputs at their band ceiling; best-case = \`` +
  `'output at the band ceiling with inputs at their floor. Break-even mult = the input \`` +
  `'multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \`` +
  `'negative when its raw inputs peak; the signal is for the player to sell the inputs raw \`` +
  `'instead — intended, not a bug.\\n\`)`;

// Count backticks in bigConsole to verify balance
const btCount = (bigConsole.match(/`/g) || []).length;
console.log('\nBacktick count in bigConsole:', btCount, '(must be even)');

const tableHeader = `console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')`;
const tableSep = `console.log('|---|---|---|---|---|---|---|')`;

const replacement = [sectionHeader, bigConsole, tableHeader, tableSep];

// Replace indices hdrIdx through endIdx (inclusive) with replacement (4 lines)
// But we want to keep the "const r2" line, so replace hdrIdx through endIdx-1 with replacement,
// and keep endIdx (the r2 line)
const newLines = [
  ...lines.slice(0, hdrIdx),   // before section header
  ...replacement,              // section header + big console + table header + table sep
  ...lines.slice(endIdx),      // r2 line onwards (including r2 line)
];

fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));
console.log('\nDone. Old lines:', lines.length, 'New lines:', newLines.length);
console.log('Replaced', (endIdx - hdrIdx + 1), 'lines with', replacement.length, 'lines');

// Verify the result
const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('\n=== Verification: lines 88-105 ===');
for (let i = 87; i < Math.min(106, v.length); i++) {
  console.log((i + 1) + ': ' + v[i].replace(/\r$/, ''));
}
