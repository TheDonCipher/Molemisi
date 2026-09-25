const fs = require('fs');
const CRLF = '\r\n';
function p(...lines) {
  return lines.map(l => l.replace(/\n/g, CRLF)).join(CRLF) + CRLF;
}

let s = '';

// === SECTION 1: header + market endpoints ===
s += p(
'### 11.1 Market reconciliation (Co-op price formation)',
'',
'This section reconciles the inventory document with `MarketService` (`apps/api/src/market/`).',
'Every field below is traceable to that service or to `economy.ts`; nothing here is hand-waved.',
'',
'**Market endpoints & shapes (read-side):**',
'',
'- `GET /market/prices` → `MarketPrice[]`, each row: `{ itemType, basePrice, currentPrice, trend, supply, demand }`.',
'  `basePrice` = the item\'s `ItemDef.baseValue`. `currentPrice` is the live Co-op price',
'  (see formation below). `trend` is \'up\' | \'down\' | \'stable\' — `currentPrice > basePrice`',
'  → up, `<` → down, `===` → stable. `supply`/`demand` are the decayed values the service',
'  maintains per item type; they reset only by explicit supply/demand updates.',
'- `GET /market/quote` → `SaleQuote` (preview, no write): `{ itemType, quantity, pricePerUnit, gross, tax, taxRate: 0.05, netProceeds, band }`.',
'  `band` is \'wide\' for raw/forage/livestock/materials, \'crafted\' for DITSALO/DIKUNO — same predicate',
'  as `isCrafted()` in the service and the recipe card (C14).',
'- `POST /market/sell` → `SellResult`: `{ transaction: { itemType, quantity, pricePerUnit, totalPrice, tax, netProceeds }, currencyAdded, newCurrencyBalance }`.',
'  The sale **(a)** deducts `quantity` from `player_inventory`, **(b)** adds `netProceeds` to the wallet,',
'  **(c)** bumps `supply` by `quantity × SUPPLY_IMPACT (0.002)` and calls `updateSupplyDemand`.',
'  Both the inventory write and the wallet credit are atomic with the sale — a failed wallet credit',
'  rolls the inventory deduction back.',
''
);

fs.writeFileSync('./market_section.txt', s);
console.log('Part A written:', s.length, 'chars');
