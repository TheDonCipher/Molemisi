const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

// Find section header index
const hdrIdx = lines.findIndex(l => l.includes('### Crafting vs. the market band'));
const endIdx = lines.findIndex(l => l.startsWith('const r2 ='));
console.log('hdrIdx:', hdrIdx, 'endIdx:', endIdx);

// Build bigConsole as a series of TEMPLATE LITERAL segments (backticks) for ${} interpolation.
// Each line: \`...\` + — balanced backticks, all interpolations work.
//
// Strategy: each "line" in the concatenation is a complete template literal
// (\`content\` +). Backticks INSIDE the content (e.g. \`base × band × (1 − COOP_TAX)\`)
// are written as \\u0060 in THIS source file → produces \` in the generator file →
// which is an escaped backtick inside the generator's template literal.

const bigConsole =
  // Segment 1: opens console.log( and template literal; ends with \` (literal backtick in output)
  `\`console.log(\`The economics above are the **1.0\\u00d7 baseline** (every price at base value). The live \`` +
  // Segment 2: literal backtick, then text with ${PRICE_BAND} etc interpolations, ends with \`
  `\`\\`Co-op price for a raw or foraged good swings in \${PRICE_BAND} [\${PRICE_BAND.min}, \${PRICE_BAND.max}] every \${PRICE_CYCLE_HOURS}h; every recipe \`` +
  // Segment 3: literal backtick, then text with ${CRAFTED_BAND} interpolations, ends with \`
  `\`\\`output (DITSALO/DIKUNO) is exempt and sells in \${CRAFTED_BAND} [\${CRAFTED_BAND.min}, \${CRAFTED_BAND.max}]. Opportunity cost of an input is its live \`` +
  // Segment 4: literal backtick, inline code \`base × band × (1 − COOP_TAX)\`, then text, ends with \`
  `\`\\`net sell price (\`base × band × (1 − COOP_TAX)\`), but \`recipeEconomics\` evaluates \`it at 1.0× only — so the §6 table is the baseline, not the live margin. \`` +
  // Segment 5
  `\`\\`Worst-case = output at the band floor with inputs at their band ceiling; best-case = \`` +
  // Segment 6
  `\`\\`output at the band ceiling with inputs at their floor. Break-even mult = the input \`` +
  // Segment 7
  `\`\\`multiplier at which the 1.0×-output margin hits zero. A recipe marked ✗ goes \`` +
  // Segment 8
  `\`\\`negative when its raw inputs peak; the signal is for the player to sell the inputs raw \`` +
  // Segment 9: ends the template literal with \` (no +)
  `\`\\`instead — intended, not a bug.\\n\`)\``;

// Verify backtick balance in the GENERATED file content (bigConsole as it will appear)
// Count backticks: each \\u0060 → 1 backtick in output; each \\` → 2 chars (\\ + `) in THIS source
// but in the GENERATED file, \\u0060 is written as \u0060 (the 4 characters \u0060), which
// Node.js then interprets as a backtick when reading the generator file.
// Actually: in THIS source file, \\u0060 is the 6 characters: \ \ u 0 0 6 0
// When written to the generator file, it becomes: \u0060 (6 chars)
// When Node.js reads the generator file and evaluates it as JS source,
// \u0060 inside a template literal is a backtick escape → produces 1 backtick char.
// So in the GENERATED output STRING (the doc), each \\u0060 → 1 backtick.
// 
// In THIS source file, \\` is the 2 characters: \ `. When written to the generator file,
// it becomes \` (2 chars). When Node.js evaluates the generator's template literal,
// \` inside a template literal is an escaped backtick → produces 1 backtick char.
// So in the GENERATED output STRING, each \\` → 1 backtick.
//
// Total backticks in the GENERATED output string:
const btInOutput = (bigConsole.match(/\\u0060/g) || []).length + (bigConsole.match(/\\\\`/g) || []).length;
console.log('Backticks in generated output string:', btInOutput, '(must be even)');

const sectionHeader = lines[hdrIdx];
const tableHeader = `console.log('| Recipe | Inputs | Fee P1 | Worst-case P | Best-case P | Break-even mult | Verdict |')`;
const tableSep = `console.log('|---|---|---|---|---|---|---|')`;

const replacement = [sectionHeader, bigConsole, tableHeader, tableSep];

const newLines = [
  ...lines.slice(0, hdrIdx),
  ...replacement,
  ...lines.slice(endIdx),
];

fs.writeFileSync('./scripts/generate-inventory-reference.cjs', newLines.join('\n'));
console.log('\nDone. Old:', lines.length, 'New:', newLines.length);

// Verify
const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('\n=== Lines 89-102 ===');
for (let i = 88; i < Math.min(103, v.length); i++) {
  console.log((i + 1) + ': ' + v[i].replace(/\r$/, '').slice(0, 120));
}

// Check for consecutive duplicates
const dups = [];
for (let i = 0; i < v.length - 1; i++) {
  if (v[i].trim() === v[i + 1]?.trim()) dups.push([i + 1, i + 2]);
}
console.log('\nConsecutive duplicates:', dups.length > 0 ? dups : 'none');
