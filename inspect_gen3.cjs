const fs = require('fs');
const lines = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');

// Show context around the error lines
console.log('=== Lines 88-107 (error region) ===');
for (let i = 87; i < Math.min(108, lines.length); i++) {
  const lineNum = i + 1;
  // Show each line with its content, stripping trailing \r for display
  const content = lines[i].replace(/\r$/, '');
  console.log(lineNum + ': ' + JSON.stringify(content));
}

// Also show the OLD §6 section header context  
console.log('\n=== Lines 135-145 ===');
for (let i = 134; i < Math.min(146, lines.length); i++) {
  const content = lines[i].replace(/\r$/, '');
  console.log((i+1) + ': ' + JSON.stringify(content));
}
