const fs = require('fs');
const CRLF = '\r\n';
function p(...lines) {
  return lines.map(l => l.replace(/\n/g, CRLF)).join(CRLF) + CRLF;
}

let s = p(
'**Price cycle & decay:**',
'',
'- The cycle is **6 hours** (`PRICE_CYCLE_HOURS` / `MARKET_PRICE_UPDATE_INTERVAL_HOURS`) — the same',
'  constant the doc cites for the Co-op band drift.',
'- Each cycle, `updateSupplyDemand` applies `PRICE_DECAY = 0.02` (2%) to both supply and demand before',
'  adding the marginal change from recent sells/buys. So a one-time sell\'s supply bump fades over ~35',
'  cycles (≈ 210 hours) back toward baseline; a sustained selling pattern holds supply elevated.',
'- `trend` is computed purely from `currentPrice vs basePrice` — it is *not* a moving average and says',
'  nothing about trajectory. A price that rose because of an event and then decayed back can still show',
'  \'stable\' if it lands exactly on base.',
''
);

fs.appendFileSync('./market_section.txt', s);
console.log('Part B2 appended:', s.length, 'chars; total:', fs.readFileSync('./market_section.txt', 'utf8').length);
