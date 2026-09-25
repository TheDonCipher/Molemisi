# 28 — Economy Reconciliation: Verification of the Provided Rulings

**Date:** 2026-09-24 · **Author:** Belvedere (for Princess Eugenia)
**Subject:** Audit of the user-supplied "Economy Reconciliation — Market, Crafting &
Inventory" document (findings F1–F7, rulings E1–E6, implementation checklist) against
the **local authoritative repo** (`Molemisi`, not the `github.com/TheDonCipher/Molemisi`
fork the document cites). Evidence is `file:line` in this tree.

---

## 1. Verdict

- **F4 / F5 (the seed-data drift) — the real, verified bug — is ALREADY fixed** in this
  tree by `supabase/migrations/20260924000000_reconcile_market_prices_to_catalogue.sql`
  + the regenerated `supabase/seed/seed.sql` block + `scripts/generate-market-seed.cjs`.
  That migration is written but **not yet pushed** to a live DB.
- **E1, E2, E3, E4, E5 are NOT implemented**, and **E1/E2/E3/E4 contradict the normative
  `docs/26_Inventory_Crafting_System.md §11.1`** (the detailed market spec). They describe a
  *redesign* of Co-op pricing, not a bug fix. Do not apply them without your ruling.
- **E6 is partially done** but its purge list is **factually wrong**: it includes `truffle`,
  which is a canonical `DIPHOLOGOLO` item (the pig's product, `baseValue 50`). Purging it
  would break pig farming. The migration correctly **keeps** `truffle`.
- **F1, F3, F6 observations are accurate** as descriptions of the current code; their fixes
  are bundled into the conflicting E-rulings.

---

## 2. Per-ruling status

| ID | Ruling (as written) | Status | Evidence in this tree |
|---|---|---|---|
| **E1** | `grain` event = `{sorghum, millet}`; maize excluded | **NOT IMPLEMENTED** (and conflicts doc 26 §11.1) | `apps/api/src/market/market.service.ts:390` still `['sorghum','maize','millet']` |
| **E2** | Remove `SUPPLY_IMPACT`/`DEMAND_IMPACT`/`PRICE_DECAY` + `supply`/`demand`; revert to `PRICE_CYCLE_HOURS` time drift | **NOT IMPLEMENTED** (and conflicts doc 26 §11.1) | constants at `market.service.ts:132-134`; `updateSupplyDemand` at `:407-419`; `getDynamicPrice` uses S/D at `:367-384` |
| **E3** | S/D-reactive pricing reserved for v1.1 Exchange | **NOT IMPLEMENTED** (moot until E2; also contradicts doc 26, which puts S/D in the Co-op) | no Exchange code exists |
| **E4** | Trend = last cycle tick vs previous | **NOT IMPLEMENTED** | `market.service.ts:311` still `currentPrice > basePrice ? 'up' : …` (stateless) |
| **E5** | `recipeEconomics()` applies `CRAFTED_BAND.min` | **NOT IMPLEMENTED** (conflicts doc 26's 1.0× baseline design) | `packages/game-config/src/crafting.ts:169` `saleGross = (out?.baseValue ?? 0) * outputQty` (flat 1.0×); `CRAFTED_BAND` not imported here |
| **E6** | Regenerate `market_prices` from `items.ts.baseValue`; purge orphans; add `morula` | **PARTIALLY DONE** (data only) | `20260924000000` migration + `seed.sql` + `generate-market-seed.cjs` do this; but `truffle` wrongly listed for purge (kept), and the two seed sources were *reconciled*, not deleted |

## 3. Implementation checklist status

| # | Item | Status | Note |
|---|---|---|---|
| 1 | Remove S/D constants + `supply`/`demand` cols | **NOT DONE** | present; conflicts doc 26 |
| 2 | Restore `PRICE_CYCLE_HOURS` drift | **NOT DONE** | `PRICE_CYCLE_HOURS = 6` defined `economy.ts:17` but unused in pricing (confirms F7); conflicts doc 26 |
| 3 | `grain` → `['sorghum','millet']` | **NOT DONE** | conflicts doc 26 |
| 4 | `recipeEconomics` `CRAFTED_BAND.min` | **NOT DONE** | conflicts doc 26 |
| 5 | Delete one of the two seed sources | **NOT DONE** (different resolution) | kept both, made them canonical/agreeing |
| 6 | Regenerate `market_prices` from `items.ts.baseValue` | **DONE** (unpushed) | `generate-market-seed.cjs` + migration |
| 7 | Purge orphans + add `morula` | **DONE** (unpushed) | purges `saffron, wild_saffron, honey, wool, leather, goat_milk, cow_milk, cheese, butter`; adds `morula`; **keeps `truffle`** (doc's list is wrong) |
| 8 | Trend vs previous tick | **NOT DONE** | |
| 9 | CI check diffing seed vs `baseValue` | **NOT DONE** | worthwhile; not started |

---

## 4. Conflicts that need YOUR ruling (do not implement blindly)

The document's E1/E2/E3/E4 rest on a different mental model of the Co-op than the one the
project already locked in `docs/26 §11.1`:

- **Supply/demand is the *intended* Co-op design, not an accident.** `docs/26 §11.1`
  specifies the Co-op price formation as a **5-layer** model whose layer 3 is a
  **±30% supply/demand modifier** and whose decay is `PRICE_DECAY = 0.02` (layer 4/price
  cycle). The document's F7 frames this as a "design-intent mismatch" against `02 §4.1`,
  but `docs/26 §11.1` is the more recent, detailed, and explicit market spec and it
  *embraces* S/D. Removing it (E2/E3) is a **spec reversal**, not a bug fix.
- **`grain` = `{sorghum, maize, millet}` is locked in doc 26 §11.1** (and hardcoded at
  `market.service.ts:390`). E1 would change it; F3's premise ("maize is grain-priced but
  not a Bupi input") is a **non-sequitur** — event targeting and recipe inputs are
  independent. Maize is a grain crop; pricing it as grain is correct.
- **`truffle` is canonical.** `items.ts` defines `truffle` (DIPHOLOGOLO, `baseValue 50`,
  the pig's product, sellable). E6's purge list including `truffle` is simply wrong; the
  migration keeps it. (The doc may have confused `truffle` with a retired item.)
- **E5 vs doc 26 baseline.** `docs/26 §11.1` "Crafting vs. the live market (C14,
  reconciled)" states the §6 recipe-economics table is the **1.0× baseline** and the live
  market may be better or worse; `generate-inventory-reference.cjs` already emits
  *Worst-case / Best-case / Verdict* columns from the same band constants. So the recipe
  card showing 1.0× is the **intended** baseline, not a hidden bug. E5 would change that
  intent.

**Bottom line:** only E6's *data* half is correct and is already handled (by my migration,
with `truffle` correctly retained). E1–E5 are a competing redesign that contradicts the
normative market spec.

---

## 5. What the document got right

- **F1** — `PRICE_DECAY` lives in `market.service.ts:134`, not `economy.ts`; this breaches
  `economy.ts`'s own "nothing hardcoded outside here" rule. Accurate observation.
- **F4 / F5** — the two seeders (`20260902000003` + `seed.sql`) disagreed with each other
  and with the catalogue; a wrong seeded value fails *silently* (plausible number, not an
  error). Exactly the bug my migration fixes.
- **F6** — trend is a stateless current-vs-base compare (`market.service.ts:311`). Accurate.

---

## 6. Recommendation

Two coherent paths; pick one:

- **Path A — keep `docs/26 §11.1` as normative (recommended).** My migration
  `20260924000000` *is* the correct reconciliation. Withdraw E1–E5 as written. Remaining
  work: **push the migration** (needs your go-ahead — it's a DB change) and optionally add
  the CI check (checklist #9) so the seed can never drift again. This also resolves the
  `ItemDef.sellable` doc/code gap noted in `docs/27`.
- **Path B — adopt the document's vision** (time-based drift, no S/D, maize out of grain,
  floor-margin recipe cards). That is a **spec change to `docs/26 §11.1` first**; then
  implement E1–E5 and rewrite `getDynamicPrice`/`updateSupplyDemand`/`recipeEconomics`.
  Larger, behavioural, and reverses a locked design — only if you intend it.

I have **not** implemented E1–E5. Tell me which path, and I'll proceed.
