const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('Total lines:', lines.length);
for (let i = 94; i < Math.min(102, lines.length); i++) {
  console.log((i+1) + ': ' + JSON.stringify(lines[i]));
}
