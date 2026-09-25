const fs = require('fs');
const doc = fs.readFileSync('./docs/26_Inventory_Crafting_System.md', 'utf8');
console.log('Doc size:', doc.length, 'bytes, lines:', doc.split('\n').length);
// Find insertion point
const anchor = 'after tax.\r\n';
const insertAt = doc.indexOf(anchor) + anchor.length;
console.log('Insertion byte position:', insertAt);
console.log('Context at insert:', JSON.stringify(doc.slice(insertAt - 10, insertAt + 30)));
