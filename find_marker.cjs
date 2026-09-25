const fs = require('fs');
const doc = fs.readFileSync('./docs/26_Inventory_Crafting_System.md', 'utf8');

const insertPoint = 'toast reports the server\'s `netProceeds` after tax.\r\n';
const marker = insertPoint + '\r\n\r\n## 12. Invariants';

const n = doc.indexOf(marker);
console.log('Marker found at:', n);
if (n < 0) {
  const approx = doc.indexOf('## 12. Invariants');
  console.log('Approx:', approx);
  console.log('Context:', JSON.stringify(doc.slice(Math.max(0, approx - 60), approx + 60)));
  process.exit(1);
}
console.log('Marker length:', marker.length);
