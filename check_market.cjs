const fs = require('fs');
const content = fs.readFileSync('./market_section.txt', 'utf8');
console.log('Length:', content.length);
console.log('First 300 chars:');
console.log(content.slice(0, 300));
console.log('---');
console.log('Last 200 chars:');
console.log(content.slice(-200));
