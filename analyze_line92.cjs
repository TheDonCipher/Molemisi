const fs = require('fs');

// Read the current generator file line 92
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
const line92 = lines[91]; // 0-indexed

console.log('=== Line 92 full content ===');
console.log(line92);
console.log('\n=== Character analysis ===');
console.log('Total length:', line92.length);

// Track every backtick position
const btPositions = [];
for (let i = 0; i < line92.length; i++) {
  if (line92[i] === '`') btPositions.push(i);
}
console.log('Backtick positions:', btPositions);
console.log('Number of backticks:', btPositions.length);

// Show context around each backtick
btPositions.forEach((pos, idx) => {
  const start = Math.max(0, pos - 10);
  const end = Math.min(line92.length, pos + 11);
  console.log(`Backtick ${idx+1} at pos ${pos}: ...${line92.slice(start, end).replace(/\n/g, '\\n')}...`);
});

// Simulate template literal parsing
console.log('\n=== Template literal parsing simulation ===');
// Line 92 is: console.log(`CONTENT`)
// The backtick at position 9 (after "console.log(") opens the template.
// The next backtick closes it.
const openPos = 9; // position of ` after console.log(
const closePos = btPositions[1]; // second backtick closes
console.log('Template opens at pos:', openPos, '(after console.log)');
console.log('Template closes at pos:', closePos);
console.log('Template content length:', closePos - openPos - 1);
console.log('Template content:', line92.slice(openPos + 1, closePos));
console.log('\nAfter template close (pos ' + (closePos + 1) + '):', line92.slice(closePos + 1, closePos + 20));
