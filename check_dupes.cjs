const fs = require('fs');
const c = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8');
const lines = c.split('\n');
const dups = [];
for (let i = 0; i < lines.length - 1; i++) {
  if (lines[i].trim() === lines[i + 1]?.trim()) {
    dups.push([i + 1, i + 2, lines[i].trim()]);
  }
}
if (dups.length) {
  console.log('Duplicate consecutive lines:');
  dups.forEach(([a, b, t]) => console.log(a + ' === ' + b + ': ' + t));
} else {
  console.log('No consecutive duplicates found');
}
console.log('\nTotal lines:', lines.length);
console.log('\n=== Lines 88-100 ===');
for (let i = 87; i < Math.min(100, lines.length); i++) {
  console.log((i + 1) + ': ' + lines[i].replace(/\r$/, ''));
}
