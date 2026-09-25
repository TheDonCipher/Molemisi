const fs = require('fs');
// Append the price formation section to market_section.txt
const chunk = `
**Price formation (five layers, in order):**

1. **Base** — \`ItemDef.baseValue\` (e.g. sorghum 3, milk 15, bupi 20). Seeds are in \`market_prices\`
   because they are buyable; their live price is used on the buy path, not the sell path (seeds are
   never sold — \`sellable: false\`, §11).
2. **Band clamp** — \`CRAFTED_BAND { min: 0.9, max: 1.1 }\` for DITSALO/DIKUNO outputs (poleto, thapo,
   setena, bupi, borotho); \`PRICE_BAND { min: 0.5, max: 2.0 }\` for everything else (raw crops, livestock
   products, bushveld materials). This is the *only* place the two bands diverge — a sorghum crop and a
   poleto plank draw from the same constants, just different bands.
3. **Supply-demand modifier** — \`±30%\` capped, derived from \`demand / supply\`: at ratio 1.0 → 0%; the
   modifier grows with imbalance but is clamped to \`[-0.3, +0.3]\`.
4. **Event modifier** — additive sum of all *active* market events (\`ends_at > now\`) whose \`effect\`
   matches the item. Event modifiers are stored as a price *multiplier*; the service adds \`multiplier − 1\`
   to the running total (so a 1.3× event contributes +0.3). An item can be affected by multiple events
   simultaneously; their modifiers stack.
5. **Final** — \`base × max(band.min, min(band.max, 1 + supplyDemandModifier + eventModifier))\`, rounded
   to the nearest integer Pula. The band clamp is applied *after* the modifiers, so events cannot push a
   raw good outside its 0.5–2.0 band; crafted goods are similarly bounded to 0.9–1.1.
`;
fs.appendFileSync('./market_section.txt', chunk);
console.log('Appended. Size:', fs.readFileSync('./market_section.txt', 'utf8').length);
