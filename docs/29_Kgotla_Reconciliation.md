# 29 — Kgotla Reconciliation: Charges vs the Inventory, Crafting and Market Catalogue

**Date:** 2026-09-24 · **Author:** Belvedere (for Princess Eugenia)
**Subject:** Cross-check of every Kgotla charge objective against the canonical item
catalogue (`packages/game-config/src/items.ts`), crafting recipes
(`packages/game-config/src/crafting.ts`), crop catalogue (`crops.ts`), the seeded
`item_definitions` (`supabase/migrations/20260908000019_p3_inventory_crafting.sql`)
and the Kgotla SPEC (`docs/Screens/Kgotla/SPEC.md`). Follows the market-price
reconciliation of docs/27–28.

---

## 1. Verdict

- **Every charge objective maps to a real, obtainable, holdable catalogue item.**
  No missing items, no phantom slugs, no impossible quantities. The "thatch"
  question is settled: `thatch` (*Lotlhaka*) is a canonical
  `DITSHIMOLOGO TSA NAGENG` item, yielded by the Riverbank hotspot
  `rv_lekgotla_riverbed`, and Refilwe's 4-thatch errand is completable.
- **One real bug found and fixed:** `acceptCharge` reported the player's **regard**
  as objective progress (see §3).
- **One doc drift found and fixed:** SPEC §14's ruling table still said "4 herbs"
  where the amended §5.2 and the code both say "4 thatch" (see §4).
- No new migration is required — the DB seed already matches the catalogue for
  every quest-relevant item (that was the scope of the 2026-09-24 market-price
  migration, and it covers `thatch`, `poleto`, and all rotation crops).

## 2. The reconciliation matrix

| Charge | Objective | Catalogue item | Obtainable via | Qty vs `maxStack` | SPEC |
|---|---|---|---|---|---|
| Elder Neo (community) | Contribute 25 Pula | — (ledger `letsema_contribution` credits since acceptance) | `donateToProject` | 25 ≤ 200 daily cap | §5.2 ✅ |
| Mama Naledi (trade) | Sell 60 Pula of goods | — (ledger `coop_sale` credits since acceptance) | Co-op `sellItem` | n/a (Pula-measured) | §5.2 ✅ |
| Oupa Kabelo (construction) | Bring 6 `poleto` | `poleto` Plank, DITSALO, P7 | Craft from 2 `wood` (120 min) | 6 ≤ 99 ✅ | §5.2 ✅ |
| Refilwe (gathering) | Bring 4 `thatch` | `thatch` Lotlhaka, bushveld material, P3 | Riverbank `rv_lekgotla_riverbed` | 4 ≤ 50 ✅ | §5.2 ✅ |
| Thabo (farming) | Bring 6 of one named crop, rotating daily | 10 crops (`CROP_IDS` minus `herbs`) | Farm plots; all crops unlocked from start (D6) | 6 ≤ 50 ✅ | §5.2 ✅ |
| Village Feast (Doc 11 §4) | Donate 20 `watermelon` | `watermelon` Legapu, DIJALO, P11 | Farm plots | 20 ≤ 50 ✅ | — |

Notes on the deliberate exclusions and edge cases:

- **`herbs` is excluded from Thabo's rotation** even though it is a crop — this is
  intentional (herbs straddle the crop/bushveld boundary; the rotation is
  farm-plot staples only).
- **Errand goods are consumed at turn-in**, before any reward is written — so a
  failed turn-in can never mint Pula/Botho, and a successful one cannot be
  double-spent.
- **Sell/contribute progress is credits-only since acceptance** — buying goods
  back (a `coop_sale` *debit*) cannot walk Mama Naledi's objective backwards, and
  refunds cannot walk Elder Neo's backwards.
- All errand items also carry a `baseValue` > 0, so anything gathered for a
  charge remains sellable at the Co-op at catalogue prices (the market leg of
  the reconciliation).

## 3. Bug fixed — `acceptCharge` reported regard as progress

`apps/api/src/kgotla/kgotla.service.ts` — the accept path built its response with

```ts
this.chargeView(def, inserted, reputation)
```

passing the player's **regard with that elder** where `chargeView` expects
objective progress. Consequences:

- the accept response showed regard (e.g. 40) as charge progress, and
- `ready = progress >= targetQty` could be **true the moment a charge was
  accepted** (regard 10 ≥ a 6-item errand ask), a state turn-in would then
  contradict by throwing the shortfall message.

Turn-in itself was never wrong — it always re-derives progress from the world
(SPEC §5.3) — so this was a display/state bug in the accept payload, not a
reward exploit. Fixed by measuring progress the same way turn-in does:

```ts
const progress = await this.measureProgress(def, inserted, userId);
```

Pinned by the spec test *"a freshly accepted charge reports objective progress,
never regard"*.

## 4. Doc drift fixed

`docs/Screens/Kgotla/SPEC.md` §14 ruling #2 recorded the magnitudes as
"6 poleto / **4 herbs** / 6 crop". The normative §5.2 table (amended 2026-09-23),
the simulator specification (§5.1), and the code all say **4 thatch** — herbs
were Refilwe's pre-amendment ask. The ruling table now agrees.

## 5. Build-time guardrails added (`kgotla.service.spec.ts`)

So future catalogue drift fails CI instead of failing a player at turn-in:

1. Every errand slug (fixed and rotation) exists in the catalogue *(pre-existing)*.
2. **Every errand ask fits inside one inventory stack** (`targetQty ≤ maxStack`).
3. **Every errand item is obtainable in the world** — `sourcesForItem()` walks
   crops, bushveld hotspots, crafting recipes and buildings; an empty list fails.
4. **Thabo's rotation only names real, growable crops** (`CROP_IDS`).
5. **A contribute charge is always completable inside the daily contribution cap**
   (`targetQty ≤ KGOTLA_DAILY_CONTRIBUTION_CAP`).
6. Regression: a freshly accepted charge reports objective progress, never regard.
