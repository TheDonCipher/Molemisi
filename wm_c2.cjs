const fs = require('fs');
const CRLF = '\r\n';
function p(...lines) {
  return lines.map(l => l.replace(/\n/g, CRLF)).join(CRLF) + CRLF;
}

let s = p(
'**Sellable-item universe invariant:**',
'',
'Every item with `ItemDef.sellable === true` **must** have a seeded row in `market_prices`.',
'`getDynamicPrice` returns 0 when no row exists — so an un-seeded sellable item would sell for P0.',
'The current sellable set (from the §4 catalogue, `sellable: true`): all `DIJALO` crops (sorghum → morula),',
'all `DIPHOLOGOLO` products (eggs, milk, truffle, manure), all `DITSHIMOLOGO` materials (wood, hardwood,',
'stone, clay, palm_fiber, thatch, phane), and all `DITSALO`/`DIKUNO` outputs (poleto, thapo, setena, bupi,',
'borotho). Seeds (`DIPEO`) are *not* sellable. Tools (`DIDIRISIWA`) are equipment — not stored, not sold,',
'`baseValue: 0`.',
'',
'**Crafting vs. the live market (C14, reconciled):**',
'',
'The §6 recipe-economics table uses the *same* band constants the live market uses (`CRAFTED_BAND` for',
'outputs, `PRICE_BAND` for raw inputs). That means the table\'s worst-case column — output at `CRAFTED_BAND.min`,',
'raw inputs at `PRICE_BAND.max`, both net of the 5% Co-op tax — is the *same* worst case the live market can',
'produce for that recipe. The difference is that the table is **static**: it holds every price at base value',
'(1.0×) and applies bands only to compute the floor/ceiling. The live market additionally applies the',
'supply-demand modifier and active event modifiers, so the live margin can be **better or worse** than the',
'table shows when an event is firing or supply is skewed.',
'',
'The table\'s "Break-even mult" column flags the boundary: when the average input multiplier exceeds that',
'value, selling the inputs raw beats crafting. For Bupi from millet that boundary sits below the raw band',
'ceiling (2.0) — so millet Bupi is *sometimes* a loss (when millet peaks). That is by design (millet is',
'worth more raw than sorghum), and the recipe card\'s margin note surfaces it. The §6 table now carries a',
'"Worst-case P / Best-case P / Verdict" column generated from the same constants, so the reader sees the',
'dynamic range explicitly rather than inferring it.',
'',
'**Buy path:**',
'',
'`POST /market/buy` (the `BuyResult` shape: `{ transaction: { itemType, quantity, pricePerUnit, totalPrice }, currencyDeducted, newCurrencyBalance }`)',
'buys **seeds only** — the Co-op seed stock rotates by chapter (§8 seed calendar). A buy deducts Pula from',
'the wallet and adds the seed item to `player_inventory`. This is the `BUY seeds (Co-op, by chapter)` arrow',
'in §1 and the `buy` variant of `ItemSource` in §2.2. Seeds are never sellable (`sellable: false`), so the',
'buy→sell loop for seeds does not exist — seeds are planted, not flipped.',
''
);

fs.appendFileSync('./market_section.txt', s);
console.log('Part C2 appended:', s.length, 'chars; total:', fs.readFileSync('./market_section.txt', 'utf8').length);
