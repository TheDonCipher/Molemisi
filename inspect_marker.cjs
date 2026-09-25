const fs = require('fs');
const doc = fs.readFileSync('./docs/26_Inventory_Crafting_System.md', 'utf8');
const idx = doc.indexOf('## 12. Invariants');
const ctx = doc.slice(idx - 80, idx + 20);
console.log('Context around ## 12:');
for (let j = 0; j < ctx.length; j++) {
  const c = ctx.charCodeAt(j);
  const rel = j - (idx - 80);
  if (c > 127 || c < 32 || c === 39 || c === 8217) {
    console.log(`  pos ${rel}: charCode=${c} char=${JSON.stringify(ctx[j])}`);
  }
}
// Also show the exact text of the last bullet line
const lastBulletStart = doc.lastIndexOf('toast reports', idx);
console.log('\nLast bullet fragment:');
console.log(JSON.stringify(doc.slice(lastBulletStart, idx + 20)));
