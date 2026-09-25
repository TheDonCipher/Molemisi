const fs = require('fs');
const content = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8');
const lines = content.split('\n');
const line92 = lines[91];
console.log('=== Line 92 raw (first 200 chars) ===');
console.log(line92.slice(0, 200));
console.log('\n=== Character-by-character analysis of first 100 chars ===');
for (let i = 0; i < Math.min(100, line92.length); i++) {
  const c = line92[i];
  const name = c === '\n' ? 'NL' : c === '\r' ? 'CR' : c === '`' ? 'BT' :
                c === '\\' ? 'BS' : c === '$' ? 'DS' : c === '{' ? 'BR' :
                c === '×' ? 'MULT' : c === '§' ? 'SEC' : c === '✗' ? 'CHK' :
                c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
  if (i % 10 === 0) console.log(`\n${i.toString().padStart(3)}: `);
  process.stdout.write(name + ' ');
}
console.log('\n');

// Check for template literal structure
const btPositions = [];
for (let i = 0; i < line92.length; i++) if (line92[i] === '`') btPositions.push(i);
console.log('\nBacktick positions:', btPositions);
console.log('Number of backticks:', btPositions.length);

// Show what's at each backtick position
btPositions.forEach((pos, idx) => {
  const before = line92.slice(Math.max(0, pos - 3), pos);
  const after = line92.slice(pos + 1, Math.min(line92.length, pos + 4));
  console.log(`BT ${idx+1} at ${pos}: before=[${before}] after=[${after}]`);
});

// Check the \\u0060 sequences
const u0060matches = line92.match(/\\u0060/g);
console.log('\n\\u0060 matches:', u0060matches ? u0060matches.length : 0);
const u0060positions = [];
let m;
while ((m = line92.match(/\\u0060/g)) !== null) {
  // find position
  const idx = line92.indexOf('\\u0060', u0060positions.length > 0 ? u0060positions[u0060positions.length-1] + 6 : 0);
  if (idx >= 0) u0060positions.push(idx);
}
console.log('\\u0060 positions:', u0060positions);
