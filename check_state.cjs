const fs = require('fs');
const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('Total lines:', v.length);
console.log('\n=== Lines 84-92 ===');
for (let i = 83; i < 92; i++) {
  console.log((i+1) + ': [' + v[i].length + '] ' + v[i].replace(/\r$/, '').slice(0, 90));
}
console.log('\n=== Lines 86-89 (duplicate check area) ===');
const dups = [];
for (let i = 0; i < v.length - 1; i++) {
  if (v[i].trim() === v[i+1]?.trim()) dups.push([i+1, i+2, v[i].trim()]);
}
console.log('Duplicates:', dups.length ? dups : 'none');
