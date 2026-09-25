const fs = require('fs');
// Read the generator and check for the \\u0060 sequences
const content = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8');
const u0060matches = content.match(/\\u0060/g);
console.log('\\u0060 sequences in generator file:', u0060matches ? u0060matches.length : 0);
console.log('Lines containing \\u0060:');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('\\u0060')) console.log((i+1) + ': ' + l.replace(/\r$/, '').slice(0, 100));
});
console.log('\nTotal lines:', lines.length);
