const fs = require('fs');
const v = fs.readFileSync('./scripts/generate-inventory-reference.cjs', 'utf8').split('\n');
console.log('=== Line 92 (first 300 chars) ===');
console.log(v[91].replace(/\r$/, '').slice(0, 300));
console.log('\n=== Line 92 backtick count ===');
console.log('Backticks:', (v[91].match(/`/g) || []).length);
console.log('\n=== Line 92 \\u0060 count ===');
console.log('\\u0060:', (v[91].match(/\\u0060/g) || []).length);
console.log('\n=== Does §6 market band section exist in generator? ===');
const hasMarketBand = v.some(l => l.includes('Crafting vs. the market band'));
console.log('Has market band section:', hasMarketBand);
if (hasMarketBand) {
  const idx = v.findIndex(l => l.includes('Crafting vs. the market band'));
  console.log('At line', idx + 1);
  console.log('Content:', v[idx].replace(/\r$/, '').slice(0, 200));
}
console.log('\n=== Check \\u0060 in entire generator ===');
const allU0060 = v.filter(l => l.includes('\\u0060'));
console.log('Lines with \\u0060:', allU0060.length);
allU0060.forEach(l => console.log('  ', l.replace(/\r$/, '').slice(0, 80)));
