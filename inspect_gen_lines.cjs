const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('=== Lines 85-108 ===');
for (let i = 84; i < Math.min(108, lines.length); i++) {
  console.log((i+1) + ': ' + JSON.stringify(lines[i]));
}
console.log('\n=== Lines 135-145 ===');
for (let i = 134; i < Math.min(146, lines.length); i++) {
  console.log((i+1) + ': ' + JSON.stringify(lines[i]));
}
