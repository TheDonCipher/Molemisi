const fs = require('fs');
const CRLF = '\r\n';
function p(...lines) {
  return lines.map(l => l.replace(/\n/g, CRLF)).join(CRLF) + CRLF;
}

let s = p(
'**Event taxonomy (which event type affects which items):**',
'',
'| Effect type | Items it matches | Notes |',
'|---|---|---|',
'| `all` | Every item with a market price row | Multiplier applies to all |',
'| `grain` | `sorghum`, `maize`, `millet` | Hardcoded set in `getEventModifier` |',
'| `food` | Any item whose slug does **not** end in `_seed` | Processed goods (bupi, borotho), raw crops, livestock products, materials all match |',
'| `materials` | `wood`, `stone`, `iron` | Hardcoded set; `iron` is reserved for future tool tiers |',
'| `<itemType>` | Exactly one item (e.g. `pepper`) | Per-item targeted event |',
'',
'An event with `effect: \'food\'` and `multiplier: 1.4` therefore affects bupi, borotho, sorghum, milk,',
'poleto, etc. — everything except the seed items. The modifier is additive across matching events: two',
'active events that both match an item sum their contributions.',
''
);

fs.appendFileSync('./market_section.txt', s);
console.log('Part C1 appended:', s.length, 'chars; total:', fs.readFileSync('./market_section.txt', 'utf8').length);
