# 31 — Inventory, Crafting, Market, Maintenance & Progression Systems Audit

Status: **audit / pre-fix reference**. No gameplay code was changed by this document.
Audit date: 2026-09-25.
Source material: `README.md`, `docs/23_Scene_Render_Specifications.md`,
`docs/24_Player_Experience_Analysis.md`, `docs/25_Inventory_Item_Detail_UX.md`,
`docs/26_Inventory_Crafting_System.md`.
Cross-checked against the current implementation:

- `packages/game-config/src/` — `items.ts`, `crops.ts`, `livestock.ts`, `crafting.ts`,
  `buildings.ts`, `bushveld.ts`, `chapters.ts`, `economy.ts`, `weather.ts`,
  `itemRelations.ts`, `almanac.ts`.
- `apps/api/src/` — `market/market.service.ts`, `livestock/livestock.service.ts`,
  `contracts/contracts.service.ts`, `kgotla/kgotla.service.ts`,
  `progression/progression.service.ts`, `chapters/chapter.service.ts`,
  `chapters/chapter.controller.ts`, `buildings/buildings.service.ts`,
  `crops/crops.service.ts`, `simulation/simulation.service.ts`, `water/water.service.ts`.
- Database seed/reconciliation: `supabase/migrations/20260924000000_reconcile_market_prices_to_catalogue.sql`.

---

## Verdict

The intended loop is coherent and mostly complete. The shipped implementation leaks in four
places that break the economy:

1. the Co-op buy endpoint accepts **any item**, not just seeds;
2. livestock **feed is free** and feed items do not exist;
3. contracts are **repeatable and pay 1.7–6.7× the Co-op value**;
4. the **Setswana seasonal gates are not enforced** in gameplay, and weather/water runs on a
   separate four-week game-season cycle.
   A player can therefore skip production, farm market/craft arbitrage, and out-earn the field
   loop. Several progression tracks are also dead ends: Chapter Tokens, Regard, tools, and
   Storage tier 3.

---

## Executive summary

| Subsystem            | Intended shape                                                                      | Actual state                                                                 | Loop health                   |
| -------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Item catalogue       | 42 items: 11 seeds, 11 crops, 4 livestock products, 7 materials, 5 crafted, 4 tools | Matches config exactly                                                       | OK                            |
| Recipes              | 5 recipes, all outputs real, no orphans                                             | Matches config                                                               | OK                            |
| Market               | Seeds buy-only; raw 0.5–2.0× band; crafted 0.9–1.1×; 5% tax                         | 38 market rows; base prices correct after migration `20260924000000`         | Buy path unrestricted         |
| Crafting economics   | Positive margins, “no accidental losses”                                            | Positive at base prices, but raw inputs can exceed break-even                | Loss risk                     |
| Building maintenance | Recurring Poleto/Thapo/Setena demand after build-out                                | Only 3 poleto + 2 thapo + 2 setena + P285 per 90 days                        | Too small to sustain bushveld |
| Livestock            | Feed competes with selling; manure fertilises crops                                 | Feed not consumed; feed items missing; fertilize endpoint has no Farm button | Free Pula faucet              |
| Seasonal gate        | Chapters rotate seeds and water demand                                              | `rainCoverage` unused at runtime; out-of-season seed buys/planting allowed   | Core pillar not wired         |
| Botho                | Quest/donation ladder unlocks recipes, scenes, heritage                             | Ladder works; Kgotla charges work; catch-up works                            | Tokens/Regard dead            |
| Journal / endgame    | Scene restoration + Guardian → Heritage Tree                                        | Requires seasonal `phane`; can be 3–7 months away                            | Hard real-world gate          |
| Land ladder          | 4→8→12→20, P1,200/P6,000/P30,000                                                    | Live; tier 3 payback ~254 days incremental                                   | Severe pacing tail            |

---

## 1. Complete item catalogue with source and purpose

Catalogue size is 42 items; 4 are tools and not stored. The 38 stored items all have
`market_prices` rows after migration `20260924000000_reconcile_market_prices_to_catalogue.sql`.

### 1.1 Seeds — DIPEO (11) — purpose: plant

| Item                                                                                      | Base | Buy chapters (intended)  | Purpose | Notes                    |
| ----------------------------------------------------------------------------------------- | ---: | ------------------------ | ------- | ------------------------ |
| `sorghum_seed`                                                                            |   P2 | Pula, Moriti, Letlhafula | Plant   | grain for Bupi           |
| `millet_seed`                                                                             |   P2 | Pula, Moriti, Letlhafula | Plant   | grain for Bupi           |
| `maize_seed`                                                                              |   P3 | Pula, Phane              | Plant   | no recipe                |
| `cowpeas_seed`                                                                            |   P3 | Pula, Moriti             | Plant   | no recipe; contract item |
| `tomatoes_seed`                                                                           |   P5 | Pula, Phane              | Plant   | no recipe                |
| `watermelon_seed`                                                                         |   P6 | Phane, Letlhafula        | Plant   | no recipe                |
| `groundnuts_seed`                                                                         |   P8 | Pula, Phane              | Plant   | no recipe                |
| `sesame_seed`                                                                             |  P10 | Phane, Moriti            | Plant   | no recipe                |
| `pepper_seed`                                                                             |  P12 | Phane, Letlhafula        | Plant   | no recipe                |
| `herbs_seed`                                                                              |  P16 | Moriti, Letlhafula       | Plant   | no recipe                |
| `morula_seed`                                                                             |  P28 | Moriti, Letlhafula       | Plant   | no recipe                |
| **Gap:** the Co-op buy endpoint does not restrict to the current chapter’s six seeds, and |
| `plantCrop` does not check season. The calendar is currently advisory UI, not a gate.     |

### 1.2 Crops — DIJALO (11) — purpose: sell; sorghum/millet → Bupi

| Crop                                                                                           | Base | Seed | Yield | Hours | Water | Net/day | Net/day after water | Craft use |
| ---------------------------------------------------------------------------------------------- | ---: | ---: | ----: | ----: | ----: | ------: | ------------------: | --------- |
| Sorghum                                                                                        |   P3 |   P2 |   4–6 |    18 |  0.72 |  P12.25 |              P11.53 | Bupi      |
| Millet                                                                                         |   P4 |   P2 |   3–5 |    16 |  0.96 |  P13.20 |              P12.24 | Bupi      |
| Maize                                                                                          |   P5 |   P3 |   4–6 |    22 |  4.40 |  P20.75 |              P16.35 | none      |
| Cowpeas                                                                                        |   P6 |   P3 |   3–5 |    20 |  2.00 |  P19.80 |              P17.80 | none      |
| Tomatoes                                                                                       |  P10 |   P5 |   2–4 |    24 |  6.24 |  P23.50 |              P17.26 | none      |
| Watermelon                                                                                     |  P11 |   P6 |   4–6 |    44 | 13.20 |  P23.13 |              P16.52 | none      |
| Groundnuts                                                                                     |  P11 |   P8 |   4–6 |    40 |  4.00 |  P22.13 |              P20.13 | none      |
| Sesame                                                                                         |  P15 |  P10 |   3–5 |    46 |  5.52 |  P23.50 |              P20.74 | none      |
| Pepper                                                                                         |  P17 |  P12 |   3–5 |    44 |  7.92 |  P26.30 |              P22.34 | none      |
| Herbs                                                                                          |  P25 |  P16 |   2–4 |    48 |  6.72 |  P27.63 |              P24.27 | none      |
| Morula                                                                                         |  P46 |  P28 |   2–3 |    48 |  1.92 |  P40.63 |              P39.66 | none      |
| **Works:** the 3.3× spread is ordered by seed cost and capital at risk; water cost changes the |
| rankings materially, so the Moriti squeeze would be meaningful if it were wired to the real    |
| chapter calendar.                                                                              |
| **Gap:** the generic `use` string says “Sell at the Co-op, or cook with it” on every crop,     |
| but only sorghum and millet can be cooked. Nine crops over-promise.                            |

### 1.3 Livestock products — DIPHOLOGOLO (4) — purpose: sell; manure → fertilise

| Item                                                                                            | Base | Source                       | Purpose         | Notes                                                            |
| ----------------------------------------------------------------------------------------------- | ---: | ---------------------------- | --------------- | ---------------------------------------------------------------- |
| `eggs`                                                                                          |   P5 | Chicken                      | Sell            | `use` says “Sell, or bake into bread”; no bread recipe uses eggs |
| `milk`                                                                                          |  P15 | Goat, Cow                    | Sell            | no recipe                                                        |
| `truffle`                                                                                       |  P50 | Pig                          | Sell            | no recipe                                                        |
| `manure`                                                                                        |   P1 | Every animal, +1 per collect | Sell, fertilise | +20% growth, one stage; endpoint live but no Farm-screen button  |
| **Works:** manure has a real source and consumer, and livestock collect grants product + manure |
| in one slot-check.                                                                              |
| **Break:** feed types (`grain`, `hay`, `mixed_feed`) have no item definitions and `feedAnimal`  |
| never charges inventory. Livestock is free income after purchase. See §4 and §7.                |

### 1.4 Bushveld materials — DITSHIMOLOGO TSA NAGENG (7)

| Item         | Base | Source scene/hotspot                | Purpose                                             | Recurring demand?                       |
| ------------ | ---: | ----------------------------------- | --------------------------------------------------- | --------------------------------------- |
| `wood`       |   P2 | Open Bush (2), Riverbank, Deep Bush | Craft → Poleto                                      | yes, boundary maintenance + Kgotla      |
| `hardwood`   |   P8 | Deep Bush only                      | Sell + Journal                                      | no production sink                      |
| `stone`      |   P3 | Rocky Outcrop, Deep Bush            | Craft → Setena                                      | yes, water maintenance                  |
| `clay`       |   P3 | Riverbank                           | Craft → Setena                                      | yes, water maintenance                  |
| `palm_fiber` |   P4 | Riverbank                           | Craft → Thapo                                       | yes, kraal maintenance                  |
| `thatch`     |   P3 | Riverbank                           | Kraal construction, Storage upgrades, Kgotla errand | finite build demand; no maintenance use |
| `phane`      |  P10 | Open Bush, Apr/Dec only             | Sell + Journal                                      | no recipe; Journal gate                 |
| **Gaps:**    |

- `hardwood` is the densest timber in the game but has no recipe and no building use; it is
  sell-only plus a Journal discovery.
- `thatch` has only two build/upgrade consumers plus one Kgotla errand. After storage is maxed
  and the kraal is built, it becomes a low-value sell item.
- `phane` is correctly seasonal, but because it counts as a Journal find it hard-gates
  Journal 100%.

### 1.5 Crafted goods — DITSALO / DIKUNO (5)

| Item                                                                                           | Base | Recipe           | Consumers                                                            | Terminal?                  |
| ---------------------------------------------------------------------------------------------- | ---: | ---------------- | -------------------------------------------------------------------- | -------------------------- |
| `poleto` Plank                                                                                 |   P7 | 2 wood           | Kraal build, Boundary build+repair, Workshop build/upgrade, Kgotla 6 | no                         |
| `thapo` Rope                                                                                   |  P18 | 3 palm fiber     | Kraal build+repair, Boundary build                                   | no                         |
| `setena` Brick                                                                                 |  P11 | 2 clay/stone     | Jojo build+repair, Workshop upgrades                                 | no                         |
| `bupi` Flour                                                                                   |  P20 | 4 sorghum/millet | Borotho, contract 5                                                  | no                         |
| `borotho` Bread                                                                                |  P60 | 2 bupi           | Sell only                                                            | yes, intended top of chain |
| No orphaned recipes: every recipe output is a real item and every output is either consumed or |
| sellable. This is the strongest part of the item system.                                       |

### 1.6 Tools — DIDIRISIWA (4)

| Item                                                                                            | Source           | Purpose   | Reality                  |
| ----------------------------------------------------------------------------------------------- | ---------------- | --------- | ------------------------ |
| `mogoma` Hoe                                                                                    | Starter kit only | Equipment | no gameplay effect found |
| `selepe` Axe                                                                                    | Starter kit only | Equipment | no gameplay effect found |
| `watering_can`                                                                                  | Starter kit only | Equipment | no gameplay effect found |
| `pickaxe`                                                                                       | Starter kit only | Equipment | no gameplay effect found |
| **Gap:** the tools are inert. No action gates on them, no recipe consumes them, and they cannot |
| be sold or upgraded. They are cosmetic keepsakes labelled “equipment”. `docs/25` falls back to  |
| “Comes from the everyday work of the farm,” which masks the missing source but not the missing  |
| effect.                                                                                         |

---

## 2. Discoverables — 23 Field Journal finds

`findsForScene()` counts material discoveries as well as rare animal/plant discoveries. Page
totals are therefore higher than the “discovery” list alone.

| Scene                                                                                       | Finds counted for page | Journal checkmarks                             | Rare/unique discoveries                                                                  |
| ------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Open Bush                                                                                   | 9                      | wood, phane + 7 discoveries                    | Kudu, Steenbok, Warthog, Honey Badger, Guinea Fowl, Patterned Feather, Vulture           |
| Riverbank                                                                                   | 12                     | clay, palm fiber, thatch, wood + 8 discoveries | Smooth River Stone, Catfish, Kingfisher, Otter, Waterbuck, Heron, Crocodile, Marula Tree |
| Rocky Outcrop                                                                               | 8                      | stone + 7 discoveries                          | Quartz Shard, Fossilized Leaf, Rock Hyrax, Baboon, Leopard, Raptor, Aloe                 |
| Deep Bushveld                                                                               | 5                      | wood, hardwood, stone + 1 discovery            | Leopard Spoor                                                                            |
| **Total**                                                                                   | **34**                 | **7 material finds**                           | **23 discoveries**                                                                       |
| **Doc drift found:** `docs/26 §9` omits three configured discoveries — `patterned_feather`, |
| `smooth_river_stone`, and `fossilized_leaf`.                                                |
| **Major gate:** Open Bush page completion requires `phane`, which only appears via          |
| `ob_setlhare_sa_phane` in Moranang (April) and Sedimonthole (December). Journal 100% →      |
| Guardian of Sesana → Heritage Tree is therefore real-world-month constrained, potentially a |
| 3–7 month wait.                                                                             |

---

## 3. Production → crafting → market → maintenance → progression map

```
Co-op seeds ──► Crops ──► Sell ──► Pula ──► Water / Land / Buildings / Cosmetics
                  │
                  └──► Bupi ──► Borotho ──► Sell
Bushveld forage ──► Wood/Clay/Stone/Palm ──► Poleto/Setena/Thapo
                  │                         │
                  │                         └──► Build / Upgrade / Repair
                  └──► Hardwood / Phane ──► Sell (no craft path)
Livestock ──► Eggs/Milk/Truffle ──► Sell
        └──► Manure ──► Fertilize (+20% one stage)   [endpoint live, no UI]
Kgotla charges ──► consume Poleto/Thatch/Crops/Pula ──► Pula + Botho + Tokens + Regard
Contracts ──► consume crops/products/bupi ──► Pula only
Almanac ──► claim tiers ──► Pula + Botho + Tokens   [no activity gate]
Chapter Tokens ──► earned ──► no spend endpoint  ← dead end
```

### What closes correctly

- Seed → crop → sale → Pula → land/water is functional and self-explaining.
- Bushveld → crafted building material → maintenance gives crafted goods a recurring purpose.
- Livestock → product + manure gives manure a source and a crop-yield purpose.
- The Botho ladder unlocks real systems: Bupi/Borotho at 100, Deep Bushveld at 300,
  Letsema/Heritage prerequisite at 500.

### Where the loop leaks

- A player can buy any item at the Co-op, bypassing growing/foraging and crafting from
  purchased inputs.
- Livestock feed is free, so livestock is not a trade-off against crops or selling.
- Contracts outpay the Co-op 1.7–6.7×, are repeatable, and can be fed by the market-buy exploit.
- Chapter Tokens and Regard have no meaningful sink/effect.
- Maintenance demand is negligible after build-out, so bushveld gathering loses purpose.
- Seasonal enforcement is absent, so the Setswana year is not the pacing system it claims to be.

---

## 4. Crafting economics and the loss-risk gap

Base-price margins (single batch, inputs at opportunity cost `base × 0.95`, output net of 5%
Co-op tax):

| Recipe                                                                                          | Inputs chosen   | Input cost | Fee | Net sale | Profit | ROI | Break-even input multiplier |
| ----------------------------------------------------------------------------------------------- | --------------- | ---------: | --: | -------: | -----: | --: | --------------------------: |
| Poleto                                                                                          | 2 wood          |      P3.80 |  P1 |    P6.65 |  P1.85 | 39% |                       1.58× |
| Thapo                                                                                           | 3 palm fiber    |     P11.40 |  P1 |   P17.10 |  P4.70 | 38% |                       1.48× |
| Setena                                                                                          | 2 clay or stone |      P5.70 |  P2 |   P10.45 |  P2.75 | 36% |                       1.58× |
| Bupi (sorghum)                                                                                  | 4 sorghum       |     P11.40 |  P2 |   P19.00 |  P5.60 | 42% |                       1.57× |
| Bupi (millet)                                                                                   | 4 millet        |     P15.20 |  P2 |   P19.00 |  P1.80 | 10% |                       1.18× |
| Borotho                                                                                         | 2 bupi          |     P38.00 |  P3 |   P57.00 | P16.00 | 39% |                       1.49× |
| Batching works as intended: fees scale ×1 / ×2.5 / ×4, so batch 6 lifts ROI to roughly 43–49%   |
| for most recipes. Substitution is explicit and visible.                                         |
| **Break-even gap:** outputs are clamped to `CRAFTED_BAND 0.9–1.1`, but raw inputs are clamped   |
| to `PRICE_BAND 0.5–2.0`. That means wood above ~1.58× base makes Poleto a loss, palm fiber      |
| above ~1.48× makes Thapo a loss, clay/stone above ~1.58× makes Setena a loss, sorghum above     |
| ~1.57× makes Bupi a loss, and millet above ~1.18× makes Bupi a loss. The docs claim “No         |
| accidental losses”; the live market can invert the craft.                                       |
| **Related issue:** because the Co-op currently sells any item, a player can buy raw inputs near |
| base, craft, and sell the output at the 0.9–1.1× crafted band with no farming or foraging.      |
| That turns the crafting chain into a Pula generator rather than a production sink.              |

---

## 5. Building material demand and maintenance

| Building                                                                                       | Build                                  | Upgrades                                                     | Maintenance / 90d |
| ---------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ | ----------------- |
| Storage                                                                                        | Starter                                | P2,500 + 6 thatch → P12,000 + 12 thatch                      | none              |
| Jojo Tank                                                                                      | P800 + 4 setena                        | —                                                            | 2 setena + P60    |
| Kraal                                                                                          | P1,200 + 6 poleto + 2 thapo + 4 thatch | —                                                            | 2 thapo + P90     |
| Farm Boundary                                                                                  | P1,500 + 8 poleto + 3 thapo            | —                                                            | 3 poleto + P90    |
| Workshop                                                                                       | P600 + 4 poleto                        | P3,000 + 6 poleto + 4 setena → P9,000 + 10 poleto + 8 setena | P45               |
| Heritage Tree                                                                                  | P12,000                                | —                                                            | none              |
| **One-time material sink:** 34 poleto, 5 thapo, 16 setena, 22 thatch.                          |
| **Doc drift:** `docs/26 §7` claims 18 setena; config builds to 16.                             |
| **Recurring sink:** 3 poleto + 2 thapo + 2 setena + P285 per 90 days — about P3.17/day and     |
| roughly 7 material units per 90 days.                                                          |
| **Loop implication:** this is far too small to sustain bushveld gathering after the initial    |
| build-out. A player can satisfy 90 days of maintenance from one or two good foraging sessions. |
| Recommendation: tie maintenance material demand to building count/use, add `thatch` and        |
| `hardwood` to recurring repair recipes, or introduce periodic upgrades that consume bulk       |
| materials.                                                                                     |
| **Total capital to max the current game (excluding cosmetics): approximately P79,800** —       |
| P37,200 land + P14,500 storage + P800 water + P1,200 kraal + P1,500 boundary + P12,600         |
| workshop + P12,000 heritage.                                                                   |

---

## 6. Progression and pacing

### 6.1 Land ladder

| Rung                                                                                           |    Cost | Income anchor from `docs/24` | Incremental payback |
| ---------------------------------------------------------------------------------------------- | ------: | ---------------------------: | ------------------: |
| 4 plots                                                                                        |       — |                     ~P64/day |                   — |
| 4 → 8                                                                                          |  P1,200 |                            — |          ~18.8 days |
| 8 → 12                                                                                         |  P6,000 |                    ~P176/day |          ~53.6 days |
| 12 → 20                                                                                        | P30,000 |                    ~P294/day |         ~254.2 days |
| Total to 20 plots at full reinvestment: **~327 days**.                                         |
| This is the largest pacing problem in the game. The 12→20 rung costs half the total ladder but |
| adds only ~P118/day of modelled income. It is already flagged in `docs/24 §7`; this audit      |
| confirms it is a genuine bottleneck.                                                           |
| **Doc drift:** `docs/24 §4.1` says P37,800 total including rung 1; `LAND_LADDER_TOTAL` and the |
| test say P37,200. The doc is wrong by P600.                                                    |

### 6.2 Storage

| Tier                                                                                           | Slots |             Upgrade | Other benefit |
| ---------------------------------------------------------------------------------------------- | ----: | ------------------: | ------------- |
| Basket                                                                                         |    24 |             starter | 5 listings    |
| Shed                                                                                           |    48 |   P2,500 + 6 thatch | 10 listings   |
| Storehouse                                                                                     |    96 | P12,000 + 12 thatch | 20 listings   |
| There are only 38 distinct stored item types. Tier 2 (48 slots) can already hold every item in |
| the game. Tier 3’s extra 48 slots are pure headroom; its only real benefit is the P2P Exchange |
| listing count, which is a separate economy (Madi, not in the MVP Co-op loop). **Tier 3 is      |
| effectively a P12,000 dead sink in the current content set.**                                  |
| Recommendations: reduce its Pula cost; make tier 3 add a functional benefit (stack-cap         |
| multiplier, auto-collect, off-season seed preservation); or add enough new item types/quality  |
| grades to create real slot pressure.                                                           |

### 6.3 Workshop

Workshop slots 1→2→3 are the strongest throughput progression, and the docs correctly identify
slots as the binding constraint rather than timers. But:

- Tier 2 costs P3,000 + 6 poleto + 4 setena.
- Tier 3 costs P9,000 + 10 poleto + 8 setena — more than the 8→12 land rung (P6,000).
- Both compete directly with land for Pula.
  This is not inherently broken, but the player has no clear signal about relative payback. A
  workshop tier-3 recommendation card with projected craft-hour ROI, or a slightly lower tier-3
  Pula cost, would reduce the risk of a “which upgrade first?” stall.

### 6.4 Botho

|                                                                                       Threshold | Unlock                          | Days at 50/day cap | Days from 3 Kgotla charges/day |
| ----------------------------------------------------------------------------------------------: | ------------------------------- | -----------------: | -----------------------------: |
|                                                                                             100 | Bupi / Borotho                  |                  2 |                            3.3 |
|                                                                                             300 | Deep Bushveld                   |                  6 |                           10.0 |
|                                                                                             500 | Letsema / Heritage prerequisite |                 10 |                           16.7 |
|                                                                                            1000 | Prize eligibility               |                 20 |                           33.3 |
|  **Works:** Botho catch-up credits 25% of the daily cap per missed day up to 3 days; thresholds |
|                                            unlock real systems; the daily cap prevents exploit. |
| **Weakness:** community contribution is 1 Botho per 1 Pula with a P200/day contribution cap, so |
|      P50/day saturates the Botho cap. Botho is therefore a time-gated Pula purchase more than a |
|  behavioural achievement. That is defensible for a cozy game, but it means the Community pillar |
|                                            is soft-currency-funded rather than activity-funded. |

### 6.5 Journal → Heritage endgame

Completion requires all 34 checkmarks across four scenes. Open Bush requires `phane`
(April/December only). Guardian of Sesana requires **Journal 100% + Botho ≥ 500**, and the
Heritage Tree additionally requires `is_guardian_of_sesana` server-side
(`buildings.service.ts`). A player starting in May must wait until December for the next Mophane
window, then reach 500 Botho. That is a real-world calendar bottleneck on the endgame.
**Recommended fix:** either:

- count only true discoveries (not material finds) toward page completion, so `phane` is a bonus
  rather than a gate; or
- give `phane` an alternative discovery route (e.g. a rare dry-season deadfall find at much
  lower weight); or
- move Guardian requirement to “all discoveries except seasonal” and keep phane as an optional
  page.

---

## 7. Livestock: the biggest balance break

Current implementation: `feedAnimal` only raises hunger (+0.3) and never removes `grain`, `hay`,
or `mixed_feed` from inventory. `feedType` values exist in `AnimalConfig` but have no matching
item slugs in `ITEMS`. Production is gated only by `hunger > 0.5`, `health > 0.5`, and the
production timer.
Net daily output with no feed cost (tax applied):

| Animal            | Cost | Product/cycle   | Gross/day | Net/day |   Payback | Manure/day |
| ----------------- | ---: | --------------- | --------: | ------: | --------: | ---------: |
| Chicken           |  P50 | 2 eggs / 12h    |    P20.00 |  P19.00 |  2.6 days |      P1.90 |
| Goat              | P150 | 1 milk / 24h    |    P15.00 |  P14.25 | 10.5 days |      P0.95 |
| Cow               | P400 | 3 milk / 24h    |    P45.00 |  P42.75 |  9.4 days |      P0.95 |
| Pig               | P300 | 1 truffle / 48h |    P25.00 |  P23.75 | 12.6 days |      P0.47 |
| **Consequences:** |

- Chickens return 38% of purchase cost per day, before accounting for manure.
- The Kraal capacity check counts animals per `animal_type`, not per building, so one Kraal can
  hold 12 chickens + 12 goats + 12 cows + 12 pigs = 48 animals.
- Livestock is not water-gated, not seasonal, and not feed-gated. It can out-earn crops and
  bushveld without interacting with either.
  **Fix direction:** add real feed items (`grain`, `hay`, `mixed_feed`) or map feed to existing
  crops/products; charge feed through `InventoryService` on feed or collect; make hunger below
  threshold stop production as already coded; and fix the capacity check to count all livestock
  against the Kraal’s capacity.

---

## 8. Seasonal coherence: the Setswana year is not actually wired

The docs make the Setswana year the spine of the game: four real-calendar chapters, six stocked
seeds each, rain coverage 0.8 → 0.5 → 0.05 → 0.15. The runtime does not enforce or use most of
that.

| Claim                                                                                            | Runtime reality                                                                                  | Evidence                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Seed stock rotates by chapter                                                                    | `market.buyItem` accepts any item with a `market_prices` row; no chapter/`isSeedInSeason` check  | `apps/api/src/market/market.service.ts:258-319`                                                      |
| Out-of-season planting impossible                                                                | `plantCrop` checks seed ownership only, not chapter                                              | `apps/api/src/crops/crops.service.ts:71-136`                                                         |
| Rain coverage 0.8 → 0.05 shifts water demand                                                     | `rainCoverage` is not read at runtime; it appears only in config and balance scripts             | `packages/game-config/src/chapters.ts:39-84`                                                         |
| Four real chapters drive weather                                                                 | Weather uses a separate spring/summer/autumn/winter cycle, `SEASON_DURATION_WEEKS = 4`, per farm | `packages/game-config/src/weather.ts:21-91`; `apps/api/src/simulation/simulation.service.ts:142-153` |
| Mophane windows April/December                                                                   | Correct: seasonal Bushveld loot uses `activeMonths [4,12]`                                       | `bushveld.ts` `ob_setlhare_sa_phane`                                                                 |
| **Effect:** a player can buy and plant tomatoes in Moriti while the weather engine is in a rainy |
| summer or a dry winter unrelated to the chapter. The real-calendar chapter service still         |
| correctly shows Pula/Phane/Moriti/Letlhafula and rotates Chapter Tokens, so the UI and the       |
| simulation can disagree.                                                                         |
| **Recommendation:** either:                                                                      |

1. enforce chapter seed stock in `buyItem` and `plantCrop`; and
2. replace the four-week game-season weather cycle with weather driven by `chapterForDate()` and
   per-chapter `rainCoverage`/weight tables;
   or explicitly re-scope the Setswana chapters as a cosmetic/lore layer and remove the “forces
   rotation / makes water a seasonal decision” claims from the docs.
   This is the single highest-value design fix after the market-buy exploit, because it restores
   the game’s stated identity.

---

## 9. Quests, contracts, and community systems

Quests are not specified in docs 23–26; the actual quest content lives in API code. This section
reports the shipped implementation.

### 9.1 Contracts (Journal / real active contracts)

Six contracts, all available from the start, all reward Pula only, repeatable after completion,
with 36–96h limits.
| Contract | Requirements | Reward | Co-op net value | Payout multiple | Botho |
|---|---|---|---:|---:|---:|---:|
| Sorghum Harvest | 10 sorghum | P150 | P28.50 | 5.26× | 0 |
| Maize Delivery | 15 maize | P300 | P71.25 | 4.21× | 0 |
| Egg Collection | 10 eggs | P80 | P47.50 | 1.68× | 0 |
| Grain Reserve | 8 sorghum + 7 maize + 5 millet | P500 | P75.05 | 6.66× | 0 |
| Mill Order | 5 bupi | P200 | P95.00 | 2.11× | 0 |
| Legume Supply | 8 cowpeas | P180 | P45.60 | 3.95× | 0 |
**Findings:**

- Contracts massively outpay the Co-op. Even without the market-buy exploit they are a major
  Pula faucet.
- There is no cooldown or daily cap; completing one re-enables accepting it.
- Rewards do not include Botho, so contracts do not feed the community pillar.
- Definitions are hardcoded in `contracts.service.ts`, not config, so they are invisible to
  `itemRelations`, the Item Detail card, and balance scripts.
- `contract_mixed_grain_20` requires maize, which is not stocked in Moriti or Letlhafula. If
  seasonality is enforced later, this contract becomes impossible in those chapters. The Kgotla
  charge `thabo` also rotates `maize` in its errand list, creating the same seasonal-completability
  risk.
  **Recommendation:** move contracts to `game-config`, add cooldowns/daily caps, pay near Co-op
  value plus Botho/regard, and validate quest generation against the current chapter.

### 9.2 Kgotla charges

| Charge                                                                                         | Objective       | Reward                       |            Value analysis |
| ---------------------------------------------------------------------------------------------- | --------------- | ---------------------------- | ------------------------: |
| Elder Neo                                                                                      | Contribute P25  | 0 Pula + 10 Botho + 2 tokens | P25 cost for Botho/tokens |
| Mama Naledi                                                                                    | Sell P60        | P12 + 10 Botho               | P48 Pula opportunity cost |
| Oupa Kabelo                                                                                    | 6 poleto        | P12 + 10 Botho               |            P42 item value |
| Refilwe                                                                                        | 4 thatch        | P8 + 10 Botho                |            P12 item value |
| Thabo                                                                                          | 6 rotating crop | P8 + 10 Botho                |           ~P18 item value |
| These are reasonable Pula/item sinks for Botho, and they use three different systems (craft,   |
| bushveld, farm). They work. The daily pool is 3 charges, so max 30 Botho/day from charges; the |
| remaining 20 to hit the cap comes from P50 of donations.                                       |

### 9.3 Dead community reward paths

- **Chapter Tokens have no spend endpoint.** `spendTokens()` exists in `ChapterService`, but
  `ChapterController` exposes only list/current/claim/rollover. Tokens are earned from Kgotla
  charges, community projects, and Almanac tiers, expire at chapter rollover, and cannot be used.
  This is a dead currency.
- **Almanac tiers are not activity-gated.** `claimAlmanacTier` checks only sequential order and
  Guild subscription. The config comment admits the progress-collection system “does not exist
  yet,” so tiers 1–5 are free Pula/Botho/token payouts.
- **Regard/Reputation has no mechanical effect.** +10 per charge, −2 per 7 idle days, tiers
  rename greetings only. It does not gate quests, prices, or rewards.

---

## 10. Dead ends, orphans, and logical gaps

### 10.1 Dead-end items / currencies

| Dead end                                              | Evidence                                       | Severity                    |
| ----------------------------------------------------- | ---------------------------------------------- | --------------------------- |
| Tools (`mogoma`, `selepe`, `watering_can`, `pickaxe`) | Starter-only; no effect, no sale, no upgrade   | Medium                      |
| `hardwood`                                            | Deep Bush exclusive, no recipe/building use    | Medium                      |
| `thatch`                                              | Finite build use; no maintenance recipe        | Low–Medium                  |
| `phane`                                               | Only sell + seasonal Journal gate; no recipe   | Low (by design)             |
| Borotho                                               | Terminal sell-only                             | Low (intended top of chain) |
| Eggs                                                  | `use` promises baking; no recipe consumes eggs | Medium                      |
| Chapter Tokens                                        | No spend endpoint                              | High                        |
| Regard/Reputation                                     | No mechanical effect                           | Medium                      |

### 10.2 Orphaned recipes

None. All five recipes have valid outputs, inputs, and either a consumer or a sell path.
`bupi → borotho` is a clean two-step chain.

### 10.3 Logical gaps

1. **Market buy path is not seed-restricted.** Docs say seeds only; code buys any priced item and
   can buy crafted goods.
2. **Feed system is non-functional.** Feed types do not exist as items and feeding is free.
3. **Seasonality is advisory, not enforced.** Seed stock and planting ignore chapter; weather is
   a separate four-week cycle.
4. **Contracts outpay the market and repeat.**
5. **Almanac tiers are ungated.**
6. **Chapter Tokens have no sink; Regard has no effect.**
7. **Item relations omit quest/contract demand.** `itemRelations.ts` only derives recipes and
   buildings. Quests now consume `poleto`, `thatch`, and crops; contracts consume crops, eggs,
   bupi, and cowpeas. `docs/25 §7` says quest cross-links are out of scope “until quests consume
   items” — that condition is now met but not implemented.
8. **Kraal capacity counts per animal type**, not total.
9. **`xpGained` fields are still returned** from plant/harvest/feed/collect/pet even though XP and
   levels are retired.
10. **Doc/data drift:** `docs/26` references a nonexistent `ItemDef.sellable`; `docs/26` forage
    table omits three discoveries; `docs/26` claims 18 setena vs config 16; `README` says 7
    buildings vs 6 in config; `docs/24` says P37,800 land total vs P37,200;
    `progression.service.ts` still carries a stale comment that Deep Bushveld has zero hotspots.

---

## 11. Recommended rebalancing, in priority order

### P0 — fix before any economy tuning

1. **Restrict `/market/buy` to DIPEO seeds and enforce the current chapter’s six seeds.** Add
   tests that reject non-seed purchases and out-of-season seeds. This closes the craft-arbitrage
   and contract-farming exploit.
2. **Implement feed as real items and charge them.** Add `grain`, `hay`, `mixed_feed` (or map feed
   to crops/products), deduct through `InventoryService`, and make hunger/health actually stop
   production. Fix the Kraal capacity check to count all animals.
3. **Rebalance contracts.** Move them to `game-config`, add cooldowns/daily caps, pay at/near
   Co-op value plus Botho/regard, and season-validate requirements.
4. **Enforce seasonal coherence.** Either wire weather/water to the real chapters and enforce seed
   stock, or explicitly demote the chapter calendar to lore/UI. Do not leave the docs claiming one
   system while the code runs another.

### P1 — strengthen loop closure and pacing

5. **Fix the Journal/Phane endgame gate.** Count only true discoveries toward Guardian or give
   Phane a second, low-probability seasonal route.
6. **Rework Storage tier 3.** Lower the P12,000 cost or give it a functional benefit; 38 item
   types cannot justify 96 slots.
7. **Make crafting margin live, not static.** Read the live input quote; warn or block
   negative-margin crafts; consider slightly widening `CRAFTED_BAND` or raising output ceilings so
   normal raw spikes cannot invert the chain.
8. **Increase recurring material demand.** Add maintenance recipes using `thatch` and `hardwood`;
   scale maintenance with building count/use. Current P3.17/day and 7 units/90d is too small to
   sustain bushveld play.
9. **Give Chapter Tokens a sink and Regard an effect.** Options: token cosmetics, seed/material
   packs, temporary Almanac boosts, Kgotla price discounts, or expedited crafting. Gate Almanac
   tiers on real activity.
10. **Add quest/contract demand to `itemRelations`.** Show “Needed by Kgotla/Contracts” on the Item
    Detail card.

### P2 — polish and documentation truth

11. **Give tools effects or relabel them.** If equipment is cosmetic starter flavour, say so;
    otherwise wire effects (watering can reduces refill cost, hoe improves yield, axe improves wood
    yield, pickaxe improves stone yield).
12. **Align item `use` strings with recipes.** Add maize meal, cowpea stew, egg bread, etc., or
    change the crop `use` line to “Sell at the Co-op” and reserve “cook with it” for
    sorghum/millet/eggs if recipes exist.
13. **Rebalance the 12→20 land rung.** Split it into 12→16 and 16→20, lower the P30,000 cost, or
    raise high-tier plot yield. A ~254-day incremental payback is too long for a cozy
    real-calendar game.
14. **Regenerate docs 26 and reconcile stale claims** (`sellable`, setena totals, forage
    discoveries, P37,800, building count, Deep Bush comment).
15. **Season-validate Kgotla errands and contracts.** Thabo’s maize rotation and the Grain Reserve
    contract are impossible in Moriti/Letlhafula if seasonality is enforced.

---

## 12. Direct answers to the audit criteria

**Does every item have a clear source and purpose?**
Yes for 38 of 42: seeds buy/plant; crops grow/sell; products raise/sell; materials
forage/craft/build; crafted goods craft/build/sell. The exceptions are the four tools, which have
a starter source but no effect, and `hardwood`, whose only purposes are sale and a Journal
discovery. `eggs` also has a false purpose claim (“bake into bread”) with no recipe.
**Do prices, material costs, and sell values create meaningful trade-offs?**
At base prices, yes: crop net/day runs P12.25–P40.63 after tax before water; recipes return
10–42% single-batch ROI and more when batched. But the live raw band can exceed recipe break-even
(especially millet at 1.18×), so crafting can become a loss. The unrestricted buy path destroys
the trade-off entirely by allowing purchased inputs and purchased quest turn-ins.
**Do maintenance costs sustain long-term material demand?**
No. Recurring demand is about 3 poleto + 2 thapo + 2 setena + P285 per 90 days, roughly
P3.17/day. That is a rounding error against P64–P294/day income. After build-out, bushveld
becomes optional and crafted goods become surplus sellables.
**Do the land/storage/workshop ladders align with resource availability?**
Early rungs do. Land 4→8 and 8→12 are reasonable. Land 12→20 is not: P30,000 for ~P118/day
incremental. Storage tier 2 covers the whole catalogue; tier 3 is headroom-only. Workshop tiers
are meaningful but expensive enough to compete with land without a clear payback signal.
**Do seasonal chapters gate crops, seeds, and foraged items meaningfully?**
Only Mophane (`phane`, April/December) is truly gated. Seed stock and planting are not enforced,
and weather/water use a separate four-week season cycle, so the Setswana year does not currently
shape water or crop choice in the way the docs claim.
**Do Botho thresholds unlock meaningful progression?**
Yes: 100 unlocks Bupi/Borotho, 300 unlocks Deep Bushveld, 500 is the Letsema/Heritage
prerequisite, and 1000 gives prize eligibility. The ladder is reachable in 2–20 days at cap. The
weakness is that tokens and regard, the other community rewards, lead nowhere.
**Is the loop self-sustaining?**
The intended loop is self-sustaining; the shipped loop is not yet balanced. Production, crafting,
market, and maintenance connect, but four leaks — unrestricted market buying, free livestock
feed, overpaying repeatable contracts, and unenforced seasons — let players bypass the core
seed-to-sale cycle. Fix those four and the game’s stated design becomes coherent.
---

## 13. Fix checklist

Use this as the starting worklist; check items off in the fix branch and update this document if
the design ruling changes.

### P0 — economy integrity

- [ ] `apps/api/src/market/market.service.ts` — `buyItem`: reject non-DIPEO items; reject seeds not
      stocked in `chapterForDate(now)`; add spec coverage for both rejections.
- [ ] `apps/api/src/crops/crops.service.ts` — `plantCrop`: reject out-of-season crops (or document
      that planting is intentionally season-agnostic).
- [ ] `packages/game-config/src/items.ts` + `livestock.ts` + `apps/api/src/livestock/livestock.service.ts`
      — add/define `grain`, `hay`, `mixed_feed`; consume feed through `InventoryService`; make
      hunger/health gate production; fix Kraal capacity to count all livestock.
- [ ] `apps/api/src/contracts/contracts.service.ts` — move contract definitions to `game-config`;
      add cooldown/daily cap; rebalance rewards to near Co-op value + Botho/regard.
- [ ] `packages/game-config/src/weather.ts` + `apps/api/src/simulation/simulation.service.ts` —
      drive weather/water from the real chapter (`chapterForDate`), or remove the seasonal claims
      from docs 24/26 and the chapter copy.

### P1 — loop closure and pacing

- [ ] `packages/game-config/src/bushveld.ts` — adjust `findsForScene` / `restorationStage` so
      seasonal `phane` is not a hard 100% gate, or add a second low-weight route.
- [ ] `packages/game-config/src/buildings.ts` — rework Storage tier 3 cost/benefit.
- [ ] `apps/web/src/lib/crafting.ts` + `packages/game-config/src/crafting.ts` — surface live
      negative margins; block or warn on loss crafts.
- [ ] `packages/game-config/src/buildings.ts` + `economy.ts` — raise recurring maintenance demand;
      add `thatch`/`hardwood` to repair recipes.
- [ ] `apps/api/src/chapters/chapter.controller.ts` + `chapter.service.ts` — expose token spend;
      gate Almanac tiers on activity; give Regard a mechanical effect.
- [ ] `packages/game-config/src/itemRelations.ts` + `apps/api` quest/contract data — add
      quest/contract demand to Item Detail.

### P2 — polish and doc truth

- [ ] Decide tools: effects or relabel from “equipment”.
- [ ] Add the missing cooking recipes or fix the crop/egg `use` strings.
- [ ] Rebalance land 12→20.
- [ ] Regenerate `docs/26` and fix stale claims (`sellable`, setena 18→16, forage omissions,
      P37,800→P37,200, README building count, Deep Bush zero-hotspot comment).
- [ ] Season-validate Kgotla errands and contracts (Thabo maize rotation, Grain Reserve maize).

---

## 14. Verification performed

- Extracted the full 42-item catalogue, 5 recipes, 6 buildings, 4 animals, 4 scenes / 23 hotspots,
  11 crops, 4 chapters, and progression constants directly from the built `@molemisi/game-config`
  package.
- Cross-checked `docs/26` tables against `items.ts`, `crafting.ts`, `buildings.ts`,
  `livestock.ts`, `bushveld.ts`, `chapters.ts`, `economy.ts`, `weather.ts`, and
  `itemRelations.ts`.
- Read current API paths: `market.service.ts`, `livestock.service.ts`, `contracts.service.ts`,
  `kgotla.service.ts`, `progression.service.ts`, `chapter.service.ts`, `chapter.controller.ts`,
  `buildings.service.ts`, `crops.service.ts`, and `simulation.service.ts`.
- Computed paybacks, break-even multipliers, contract payout multiples, Kgotla charge values,
  total capital, and recurring material demand from the authoritative config.

### Key calculations

- Land payback: 4→8 ≈ 18.8 days; 8→12 ≈ 53.6 days; 12→20 ≈ 254.2 days; ~327 days total at full
  reinvestment.
- Contract payout multiples: 1.68× (eggs) to 6.66× (mixed grain) of Co-op net value.
- Livestock net/day (no feed): chicken P19.00, goat P14.25, cow P42.75, pig P23.75.
- Maintenance per 90 days: 3 poleto + 2 thapo + 2 setena + P285.
- Distinct stored item types: 38; Storage tier 3: 96 slots.
- Recipe break-even input multipliers: 1.18× (millet Bupi) to 1.58× (Poleto/Setena).
