const fs = require('fs');
const doc = fs.readFileSync('./docs/26_Inventory_Crafting_System.md', 'utf8');

// search for the last bullet text (without the apostrophe complication)
const simple = 'after tax.';
const idx1 = doc.indexOf(simple);
console.log('Simple "after tax." found at:', idx1);

// show what comes right after "after tax." 
if (idx1 >= 0) {
  console.log('After "after tax.":', JSON.stringify(doc.slice(idx1, idx1 + 30)));
}

// search for the ## 12 marker
const idx2 = doc.indexOf('## 12. Invariants');
console.log('"## 12. Invariants" found at:', idx2);

// build the exact insertion text from the doc itself
const before12 = doc.slice(idx2 - 30, idx2);
console.log('Before ## 12:', JSON.stringify(before12));

// The insertion point is at the end of the last bullet (before the blank line + ## 12)
// Find the end of "after tax." 
const insertEnd = idx1 + simple.length;
console.log('Insert after this position:', insertEnd);
console.log('Text at insert point:', JSON.stringify(doc.slice(insertEnd, insertEnd + 20)));
