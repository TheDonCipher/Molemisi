# 27 — Market ↔ Inventory Reconciliation

**Date:** 2026-09-24 · **Author:** Belvedere (for Princess Eugenia)
**Scope:** Align `market_prices` (the Co-op) with the authoritative item catalogue in
`@molemisi/game-config`, per the invariant stated in `docs/26_Inventory_Crafting_System.md §11.1`.

---

## 1. Verdict

**The market was running a different, pre-refactor economy than the inventory system.**
The two historical seeders — migration `20260902000003_market_dynamic_pricing.sql` and
`supabase/seed/seed.sql` — were written long before the G-batch refactor (truffle, the
`milk` merge, `hardwood`, `thatch` as a build material, the `bupi`/`borotho` craft chain)
and were never updated. Result:

- **13 catalogue items were completely unsellable** (no `market_prices` row →
  `getDynamicPrice()` returns `0` → `BadRequest "Item has no market value"`).
- **23 rows carried stale prices 4–8× the catalogue** `baseValue` (so every crop/seed sale
  and every seed purchase was wildly overpriced).
- **14 orphan rows** referenced slugs that no longer exist in the catalogue.
- `seed.sql`'s block was also **structurally broken** (omitted the required `item_name`/
  `category` columns) and would abort a fresh `db reset`.
- The sell path had **no guard against selling seeds**, even though §11.1 says seeds never
  sell — and seeds now *need* a market row for the buy path, so without the guard players
  could flip them.

Everything is now reconciled. The fix is **idempotent and self-healing**: an upsert plus an
orphan delete, so re-applying it (or whatever stray `*.cjs` market scripts already wrote to
a live DB) converges to the same correct state.

---

## 2. Canonical mapping (catalogue `baseValue` → old DB → status)

**Sellable items that had NO row at all (unsellable — returned P0):**

| Item | Catalogue value | Old DB | Status |
|---|---|---|---|
| `morula` | 46 | *missing* | ➕ added |
| `eggs` | 5 | *missing* (legacy `egg` only) | ➕ added (legacy `egg` dropped) |
| `manure` | 1 | *missing* | ➕ added |
| `hardwood` | 8 | *missing* | ➕ added |
| `clay` | 3 | *missing* | ➕ added |
| `palm_fiber` | 4 | *missing* | ➕ added |
| `thatch` | 3 | *missing* | ➕ added |
| `phane` | 10 | *missing* | ➕ added |
| `poleto` | 7 | *missing* (legacy `flour` only) | ➕ added |
| `thapo` | 18 | *missing* | ➕ added |
| `setena` | 11 | *missing* | ➕ added |
| `bupi` | 20 | *missing* (legacy `flour` only) | ➕ added |
| `borotho` | 60 | *missing* (legacy `bread` only) | ➕ added |

**Rows that existed but at the WRONG price (stale pre-refactor numbers):**

| Item | Catalogue | Old (migration) | Old (seed.sql) | Fix |
|---|---|---|---|---|
| `sorghum` | 3 | 25 | 15 | → 3 |
| `millet` | 4 | 28 | 12 | → 4 |
| `maize` | 5 | 35 | 20 | → 5 |
| `cowpeas` | 6 | 30 | 18 | → 6 |
| `tomatoes` | 10 | 38 | 22 | → 10 |
| `watermelon` | 11 | 45 | 40 | → 11 |
| `groundnuts` | 11 | 32 | 25 | → 11 |
| `sesame` | 15 | 40 | 35 | → 15 |
| `pepper` | 17 | 36 | 45 | → 17 |
| `herbs` | 25 | 22 | 80 | → 25 |
| `milk` | 15 | 30 | — | → 15 |
| `wood` | 2 | 8 | — | → 2 |
| `stone` | 3 | 6 | — | → 3 |
| *all 11 seeds* | 2–28 | 10–80 | — | → catalogue value |

**Orphan rows deleted (slug not in catalogue):** `saffron`, `saffron_seed`, `wool`, `honey`,
`herb_bundle`, `wild_saffron`, `egg`, `goat_milk`, `cow_milk`, `flour`, `butter`, `cheese`,
`leather`, `bread`.

**Already correct:** `truffle` (50) — the only row that needed no change.

Final canonical row count: **38** (42 catalogue items − 4 tools, which are equipment and
never enter `market_prices`).

---

## 3. What was applied

| File | Change |
|---|---|
| `supabase/migrations/20260924000000_reconcile_market_prices_to_catalogue.sql` | **New.** Idempotent reconciliation: `DELETE` orphan slugs, then `INSERT … ON CONFLICT DO UPDATE` all 38 canonical rows (`base_price = current_price = ItemDef.baseValue`). |
| `supabase/seed/seed.sql` | Replaced the stale/broken `market_prices` block with the same canonical 38 rows (`ON CONFLICT DO NOTHING`), including the previously-missing `item_name`/`category` columns so a fresh `db reset` succeeds. |
| `apps/api/src/market/market.service.ts` | Added the `isSeedItem` guard so `sellItem`/`quoteSale` reject seeds (`BadRequest "Seeds cannot be sold at the Co-op"`), fulfilling §11.1. The buy path is untouched. |
| `scripts/generate-market-seed.cjs` | **New.** Generates the canonical `market_prices` rows straight from `ITEMS`, so the market can never drift from the catalogue again. Re-run after any catalogue change; regenerate the migration in lock-step. |

The migration resets `current_price` to `base_price` because the live values were the stale
pre-refactor numbers and carried no legitimate market signal; live drift resumes from the
service's 6-hour cycle after it runs.

---

## 4. Secondary findings (not blocking, flagged for the realm)

1. **`docs/26 §2.1 / §11.1` reference a field `ItemDef.sellable` that does not exist.**
   `packages/game-config/src/items.ts` `ItemDef` has no `sellable` property. "Sellable" is
   currently *implicit* (= "has a `market_prices` row with `base_price > 0`", except seeds
   which are now explicitly blocked by the new guard). Recommend either adding a real
   `sellable` boolean to `ItemDef` or striking the field from the doc so the doc stops
   over-claiming. Leaving as-is means the doc is the *intended* invariant, not the *actual*
   code shape.
2. **Event `materials` set hardcodes `['wood','stone','iron']`** (market.service.ts) but `iron`
   is not in the catalogue — it is reserved for future tool tiers (doc §11.1 notes this).
   Benign; an `iron` market event simply no-ops until the item ships. No action needed.
3. **Stray `*.cjs` market scripts in the repo root** (`append_market.cjs`, `insert_market_final.cjs`,
   `write_market_*.cjs`, `wm_*.cjs`, `check_market.cjs`, `fix_gen*.cjs`, …) are scratch artifacts
   from a prior, incomplete market-reconciliation attempt. They are superseded by this migration
   + generator. Recommend deleting them once this lands, to keep the realm tidy.

---

## 5. How to apply (needs your go-ahead — pushes a migration)

The migration touches the live database, so it is **not** auto-applied. Two safe paths:

**A. Local / full reset**
```
supabase db reset        # re-applies all migrations + seed.sql (now canonical)
```

**B. Push to a remote (careful — a second work stream also pushes migrations).**
Per the repo's push discipline, push *only this* migration from a scratch copy so you don't
collide with another agent's pending migrations:
```
cp -r supabase /tmp/molemisi-supabase-scratch
# move every OTHER pending migration out of /tmp/.../migrations except 20260924000000_*
supabase db push --db-url "<your remote>"   # from the scratch dir
```
Or simply run the SQL of `20260924000000_…sql` directly against the target DB — it is
idempotent and safe to re-run.

**Verification after applying:**
- `GET /market/prices` returns exactly the 38 canonical items; every `basePrice` matches the
  catalogue `baseValue`.
- Selling `poleto`/`bupi`/`borotho`/`wood`/`eggs`/`morula`/… now quotes and pays (no more P0).
- Selling any `*_seed` returns `"Seeds cannot be sold at the Co-op"`.
- `GET /market/prices` no longer lists `saffron`, `wool`, `butter`, `leather`, etc.
