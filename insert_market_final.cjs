const fs = require('fs');
const doc = fs.readFileSync('./docs/26_Inventory_Crafting_System.md', 'utf8');
const section = fs.readFileSync('./market_section.txt', 'utf8');

// Insert between end of last §11 bullet and the blank line + "## 12"
const anchor = 'after tax.\r\n';
const pos = doc.indexOf(anchor);
if (pos < 0) { console.log('ANCHOR NOT FOUND'); process.exit(1); }

const insertAt = pos + anchor.length;
// The section already ends with \r\n; the doc has \r\n\r\n## 12 after it.
// Insert: [section]\r\n\r\n## 12  => we already have \r\n at end of section,
// so we just need \r\n\r\n## 12  (the existing \r\n\r\n## 12 stays in place)
const out = doc.slice(0, insertAt) + section + doc.slice(insertAt);
fs.writeFileSync('./docs/26_Inventory_Crafting_System.md', out);
console.log('INSERTED. Old size:', doc.length, 'New size:', out.length);
console.log('Section length:', section.length);
// Verify §11.1 is present and §12 follows
console.log('§11.1 present:', out.includes('### 11.1 Market reconciliation'));
console.log('§12 follows §11.1:', out.indexOf('## 12. Invariants') > out.indexOf('### 11.1 Market reconciliation'));
console.log('New §11.1→§12 distance:', out.indexOf('## 12. Invariants') - out.indexOf('### 11.1 Market reconciliation'));
