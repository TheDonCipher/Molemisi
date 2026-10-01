# 32 — Molemisi v1 Sprint Roadmap (P0/P1 Reconciliation → Execution)

**Status:** **LIVING DOCUMENT** — updated as implementation lands and dependencies are discovered.
**Created:** 2026-09-28 · **Author:** Cline (technical game implementation lead)
**Inputs reconciled:** `docs/30_Gameplay_Visual_Narrative_Review.md` (review ledger),
`docs/31_Inventory_Crafting_Progression_Systems_Audit.md` (systems audit),
`simulator-out-2/SIMULATION_REPORT.md` (Run 3 post-fix), `simulator-out-3/summary.md` (Run 3 metrics),
`README.md` (MVP code-complete status).

**Authority chain (per `README.md` + `DOCUMENTATION_AUDIT.md` golden rule):**
`docs/MVP/` normative set > `docs/30` §6 four-pass plan (solution guide for this sprint) >
`docs/31` recommendations (economy integrity detail) > original design suite (`docs/01`–`23`) is intent.
Where 30 and 31 disagree, the **30 §6 four-pass roadmap governs the pathway** (task ruling);
31's P0/P1 items are slotted into it, not run in parallel.

---

## 1. Unified issue map (reconciliation across all four documents)

| # | Issue | Source findings | Severity | Player/economy impact | Sprint slot |
| --- | --- | --- | --- | --- | --- |
| **R1** | Livestock permanent soft-lock: health decays at `hunger<0.2`, `is_sick` at `health<0.3`, feeding **throws** when sick, no heal endpoint/medicine → every animal dead after one overnight gap | 30:**P0-1**/G-2 · summary: zero livestock activity | **P0** | Destroys the livestock pillar; violates #1 product constraint ("no game over states") | Pass 1 tasks 1.1, 1.2, 1.4, 1.5 |
| **R2** | Feeding costs nothing: `feedAnimal` debits no item/Pula; `feedType`/`feedPerDay` are declared-but-unread; client shows `2 sorghum` the server never charges | 30:**P0-2**/G-3 · 31:P0-2 · summary: water P1920 sink vs P0 market income | **P0** | Free faucet; livestock = best ROI; inverts F7 sink model; breaks doc 24 "every number server-backed" claim | Pass 1 tasks 1.3, 1.6, 1.7 |
| **R3a** | Market `/market/buy` accepts **any priced item** (docs say seeds only) → craft arbitrage | 31:**P0-1**/§10.3.1 | **P0** | Players skip production, farm market/craft arbitrage | Pass 1 (economy integrity) |
| **R3b** | Contracts pay 1.68–6.66× Co-op net value, are repeatable with no cooldown/cap, one has corrupt CJK copy, all pay Pula only | 31:**P0-3**/§9.1 · 30:G-8 | **P0** | Contract farming out-earns the field loop; Pula-only rewards starve Botho/Almanac | Pass 1 (economy integrity) + Pass 3 task 3.6 |
| **R4** | `/payments/create` accepts malformed payloads (5×201) — `CreatePaymentDto` is an `interface` so `ValidationPipe` skips it; 60/60s rate limiter never observed (SEC-04 FAIL — masked by harness client-pacing + 429 auto-retry in `client.ts`) | SIM report **API-1**, **API-4** · summary SEC-02 ×5 FAIL, SEC-04 FAIL | **P0** (security) | Malicious clients can drive unintended payment states; throttle control unverified | Pass 1 (safeguards lane) |
| **R5** | ~198/423 art files unreachable (47%); 0% palette adherence (generator noise); no building states; non-integer render scaling; **orphan asset families with no catalogue entry** (borehole/greenhouse/saffron/wool/marula/salt; 7 stale legacy building folders) and **`pig`+`truffle` culturally off** | 30:**P0-3**, V-1…V-14, **N-8**, **N-9** | **P0** (visual) | Farm screen not a farm; 4-state building spec (05 §5) unmet; catalogue implies content that does not exist | Pass 2 (2.1–2.12) |
| **R6** | Two season clocks (28 d sim vs 91 d chapter) disagree by 3.26×; seasonal gates advisory | 30:G-5 · 31:**P0-4** | **P1** | Setswana year cosmetic; weather arbitrary | Pass 3 task 3.1 (+ market seed gate now) |
| **R7** | Journal/Phane hard gate; Storage T3 = 96 slots/38 types at P12,000; crafting margins invert on raw spikes; maintenance demand too small (P3.17/day) | 31:**P1** 5–8 | **P1** | Loop closure & pacing | Pass 3 |
| **R8** | Dead-end currencies: Chapter Tokens (no spend endpoint), Regard (no effect); Almanac tiers ungated | 31:P1-9 · 30:G-7 | **P1** | Progression dead-ends; free payouts | Pass 3 task 3.4 |
| **R9** | Narrative voice stops: Market screen has **zero** voice; Elder has no animal fields (silent at the exact moment G-2 traps a player) | 30:**N-10**, **N-1** | **P1** | Pula/Botho/Madi pillar representation imbalance | Pass 4 tasks 4.2 (+1.10) |
| **R10** | Run 3 economy numbers confounded (reused `--run-token`, carryover state); cohort too small to move prices; ARPU intentionally unreported | SIM §4/§9 · summary fidelity warning | **P1** validation | Cannot tune until cleanly measured | Post-sprint: fresh 30–50 cohort run |
| **R11** | **Economy/monetization strategy undecided for production.** Store still grants **Pula** for BWP (against "free players get everything"), the withdrawable-vs-premium **Madi** definition collides with `MVP/02 §3.2`, boosts are catalogue entries with no effects, land tail pays back in **254 days**, and livestock feed makes 3 of 4 animals **loss-making** | **`docs/33` (decided 2026-10-01)** · `docs/MVP/02 §1/§3/§6.6` · 31:P0-3, P2-13 · `docs/34` build sequence | **P0** economy | Sellable loop misaligned with the cozy promise; a promised pillar (livestock) is net-negative; last land rung is a churn wall | **Pass 5** (5.1–5.11) |


### 1.1 Contradictions resolved (audit vs audit vs simulation)

| Conflict | Resolution |
| --- | --- |
| 31 says "add `grain`/`hay`/`mixed_feed` items"; 30 task 1.3 says "debit `{config.feedType}`"; client `FEED_INFO` shows **sorghum/herbs** | **Map `feedType` to existing crops** (chicken/pig → `sorghum`, goat/cow → `herbs`) — satisfies 30's mechanism, matches the client, adds zero items, keeps the feed sink inside the crop economy (31's "or map feed to crops/products" option). |
| 30 G-10 suggests `hungerDecayRate` 0.035–0.05/h **and** "one visit per day keeps hunger > 0.5" | Arithmetically incompatible (1.0 − 0.035×24 = 0.16). **The acceptance criterion governs**: feed tops hunger to 1.0, decay = 0.02/h → 1.0 − 0.48 = 0.52 > 0.5 after 24 h. |
| 31 P0-4 wants seasonal enforcement *now*; 30 schedules calendar unification in Pass 3 | Market buy gate enforces **in-season seed stocking immediately** (31 P0-1); weather/planting unification stays Pass 3 (30 §6). One calendar, but sequenced — no parallel half-fixes. |
| SIM says "ARPU not reported, don't tune"; 31 wants rebalancing | **Integrity before tuning:** this sprint closes leaks (R1–R4); economy re-profile runs on a **fresh `--run-token`, 30–50 players** before any balance constants beyond the ones named here are moved. |
| SIM API-4 "limiter may not be wired" vs code showing `RateLimitInterceptor(60_000, 60)` in `main.ts` | Limiter **is** wired; the false negative is client-side: `client.ts` paces to 55 mutations/min (so the burst never exceeds 60 inside one window) and auto-retries 429s (so a throttle would be swallowed). Fix is in the **harness** (`bypassThrottle` for SEC-04), not the API. |
| 30 P0-3 = art unreachable; task brief says "50% unreachable art" | Same finding (47% ≈ 50%). Pass 2 wiring work + PixelLab regeneration for noise/palette/building states. |

---

## 2. Sprint structure — the passes (30 §6, with 31's items slotted; Pass 5 = `docs/33`/`docs/34`)

Effort scale: **S** ≤ 0.5 d · **M** ≤ 1.5 d · **L** ≤ 3 d. Dependencies listed per task.

### Pass 1 — Stop the bleeding (mechanical + economy integrity) — *this sprint's execution*

| Task | Finding(s) | Change | Files | Deps | Effort | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 `POST .../livestock/:id/treat` | R1 (30 1.1) | Consumes 1 `herbs` via `InventoryService`; `is_sick=false, health=0.6`, clears starvation timer | `livestock.{service,controller}.ts` | — | S | DONE |
| 1.2 Feed clamps when sick | R1 (30 1.2) | Sick feed = +0.15 hunger, `sick:true` in response, never 400 (400 only ownership/full/insufficient feed) | `livestock.service.ts` | — | S | DONE |
| 1.3 Charge feed | R2 (30 1.3, 31 P0-2) | Debit `{slug: config.feedType, qty: config.feedPerDay}` **before** hunger update; insufficient feed → clear 4xx, hunger untouched; `feedType` remapped to real crops | `livestock.ts`, `livestock.service.ts` | — | M | DONE |
| 1.4 Starvation window (N = 12 h) | R1 (30 1.4) | Health decays only after 12 **consecutive** hours at `hunger == 0`; persisted `hunger_zero_since` column | `simulation.service.ts` + 1 migration | migration | M | DONE |
| 1.5 Self-sustaining for livestock from **uncapped** time | R1 (30 1.5, G-4) | `SELF_SUSTAINING_THRESHOLD_HOURS` computed pre-clamp, livestock only; constant no longer dead | `simulation.service.ts` | — | S | DONE |
| 1.6 ~24 h feed cycle | R2 (30 G-10.1) | `hungerDecayRate` → 0.02/h (acceptance: one visit/day keeps hunger > 0.5) | `livestock.ts` | 1.3 | S | DONE |
| 1.7 Per-kraal feed | R2 (30 1.7) | One tap feeds every feedable animal, consuming summed rations atomically; per-animal feed kept as fallback | `livestock.{service,controller}.ts`, `FarmScreen.tsx`, `gameState.tsx` | 1.3 | M | DONE |
| 1.8 Contract copy + rewards | R3b (30 G-8, 31 P0-3) | Fix corrupt `grain储备` string; rebalance six contracts to ≈1.05× Co-op net value; add Botho (3 community/farming) + Chapter Tokens (all six) | `contracts.service.ts`, `contracts.module.ts` | — | M | DONE |
| 1.8b Contract cooldown + daily cap | R3b (31 P0-3) | Per-contract cooldown after completion (24/36/48 h by difficulty); max 3 accepts/farm/day | `contracts.service.ts` | 1.8 | S | DONE |
| 1.9 Market buy gate | R3a (31 P0-1) | `/market/buy` rejects non-seeds and out-of-season seeds (current chapter's six) | `market.service.ts` | — | S | DONE |
| 1.10 Elder animal rules | R9 (30 N-1, 1.10) | `hungryAnimals`/`sickAnimals` in `ElderSnapshot` + 2 Setswana-first rules above `harvest_ready` | `bushveld.ts`, `progression.service.ts` | 1.2 | S | DONE |
| 1.11 Payments DTO validation | R4 (SIM API-1) | `CreatePaymentDto` interface → **class** + class-validator decorators so global `ValidationPipe({whitelist, forbidNonWhitelisted})` applies | `payments.service.ts` | — | S | DONE |
| 1.12 Safeguard coverage | R4 (SIM API-4) | SEC-02B strict-400 expectation for `/payments/create`; SEC-04 bursts **unpaced** with 429-visible transport (`bypassThrottle`) | `packages/simulator/src/{safeguards,client}.ts` | 1.11 | S | DONE |
| 1.13 Time-base comment | 30 G-1 | `docs/09 §2:46` says 1 real min = 1 game h — correct to 1 h = 1 h | `docs/09` | — | S | DONE |
| 1.14 Livestock actor: feed pays | R2 (simulation lane) | Simulator feed step asserts the feed debit; purchases/collects move off zero | `packages/simulator/src/actors.ts` | 1.3 | S | DONE |

**Pass 1 gate:** tsc api/web = 0 · jest green (new feed/treat/starvation/contract/market tests) ·

### Pass 2 — Make the farm visible (art pipeline + render) — R5

| Task | Finding | Change | Deps | Effort | Status |
| --- | --- | --- | --- | --- | --- |
| 2.1 Palette quantise + denoise + budget gate | 30 V-2 | `scripts/palette.mjs` (64-entry `docs/05 §3` indexed palette); regenerate noisy icons via **PixelLab**; build fails on budget breach | PIXELLAB_API_KEY | L | IN PROGRESS |
| 2.2 `<PixelSprite>` integer-scale component | 30 V-3 | New component; no non-integer render scale anywhere | — | M | TODO |
| 2.3 Backgrounds → integer-friendly sizes; declare 32 px base | 30 V-1 (Q2 ruling: 32 px) | Re-export backgrounds; update `docs/05 §2/§4` | 2.1 | M | TODO |
| 2.4 Ground/plot tiles wired, chapter-tinted | 30 V-4.1/V-4.4 | `FarmScreen` renders `plot_empty`/`plot_soil`/ground autotiles | 2.2 | M | DONE |
| 2.5 Buildings as sprites in **four states** (CONSTRUCTION / ACTIVE / MAINTENANCE / DISABLED) | 30 V-4.2/4.3, 05 §5 | Generate state sprites via PixelLab; `BUILDINGS[*].spriteSheet` resolves; rename legacy folders | 2.1 | L | IN PROGRESS |
| 2.6 Hotspots from `sprites/hotspots/` | 30 V-5 | Zero emoji in hotspot layer | 2.2 | S | TODO |
| 2.7 Emoji → `ui/icons/`; Kagiso pips from PNG | 30 V-6 | Grep for nine player-facing emoji returns 0 in `components/screens/` | 2.2 | M | DONE |
| 2.8 One `<Attention>` component, one pulse | 30 V-14 | Single priority derivation per screen | — | S | DONE |
| 2.9 Chapter particles; delete `snowflake.png`; fix Market 404 fallback | 30 V-11/V-13 | Zero console 404s | — | S | DONE |
| 2.10 2-frame animal idle loops | 30 V-9 | ~14 PixelLab frames | 2.1 | M | TODO |
| 2.11 Asset↔item catalogue reconciliation | 30 **N-8** (Q6) | **DONE** — 14 files archived to `assets/_archive/` (+README); 7 stale legacy `assets/sprites/buildings/*/lvl1.png` folders deleted (zero code refs); dead `saffron`/`wool` client refs removed. **Borehole archived, not promoted** — the original design reserves the 3-tier water line for post-MVP (v1.1). | — | M | **DONE** |
| 2.12 Guinea-fowl swap for `pig` | 30 **N-9** (Q1: *kgaka*) | **CODE DONE, ART BLOCKED.** Config/client swap complete: `pig`→`guinea_fowl` in `livestock.ts` (36 h cycle, 2 eggs), new `guinea_fowl_egg` item (P12, replacing `truffle`), `PRODUCT_ITEM` bridge, `FEED_INFO`/`PRODUCT_EMOJI`/`ANIMAL_EMOJI`/`ANIMAL_NAME_KEY`, `itemRelations.spec` (2 assertions), `translations.animalGuineaFowl` (Kgaka), generator `ANIMALS`/`ANIMAL_PRODUCTS`. **Pig sprites archived; 4 guinea-fowl sprites not generated — PixelLab account is out of credits (HTTP 402).** Client falls back to the 🐦 emoji meanwhile. | PixelLab credits | M | **IN PROGRESS (art-blocked)** |

**Pass 2 gate:** screenshot pass over all ten screens at 800×480 — zero 404s, zero scene-layer emoji,
no non-integer sprite scale, sampled assets ≥ 90% in-palette; **and zero orphan asset families**
(doc 30 §7 "unreachable asset files < 20").

### Pass 3 — Make the year felt (wire what exists) — R6/R7/R8

| Task | Finding | Change | Effort | Status |
| --- | --- | --- | --- | --- |
| 3.1 Delete sim season clock; weather probabilities + growth modifier from `chapter.rainCoverage` | 30 G-5, 31 P0-4 | One calendar, one authority | M | **DONE** |
| ECON-0 Economy strategy decided | `docs/33` (2026-10-01) | Simple cozy plan: 2 currencies + 1 meter, decorations + M50 Village Pass, Madi packs, land tail fix, 4 known fixes | — | **DECIDED — implementation in `docs/34`, tracked as Pass 5 below** |
| 3.1b Rename market/storage lines to the decided ladder | `docs/33` §3.2 + `docs/34` Wave 4 | Adopt decided land costs (8 plots P1,200 · 12 P6,000 · 16 P8,000 · 20 P15,000) in config + specs; every rung ≤ ~2-month payback | S | **TODO (docs/34 Wave 4)** |
| 3.2 Re-key the ten world events to four chapters; strip `xpModifier`/`energyModifier` | 30 N-7 | Drop `winter_solstice` + `frost_warning` | S | **DONE** |
| 3.3 Rotating chapter-scoped market event pool + rotation job | 30 G-11 | Fresh install has an active event | M | **DONE** |
| 3.4 Wire the five Almanac requirement counters; surface progress + token balance + expiry | 30 G-7, 31 P1-9 | Rewards track that rewards (Q7: lock tuning after counters land) | M | **BLOCKED — needs schema sign-off** |
| 3.5 Botho-gated automation (**superseded — see `docs/33` §4 / `docs/34` Wave 1**) | 30 G-6 | ~~Auto-Collector 150 → Auto-Feeder 300 → Irrigation 500~~ → **Auto-Feeder 300 → Auto-helper 500** (Collector folds into helper; needs schema sign-off) | M | **SUPERSEDED — re-spec'd in `docs/34` Wave 1** |
| 3.6 Contracts surface `category`; Almanac `quests` counter on completion | 30 3.6 (R3b tail) | Test asserts counter increments | S | **PART-BLOCKED — `category` doable now; `quests` counter waits on 3.4** |
| 3.7 Insert 16-plot land rung (superseded cost — see `docs/33` §3.2 / `docs/34` Wave 4) | 30 G-9, 31 P2-13 | Rung exists (**DONE** as structure); cost retuned to **~P8,000** and 16→20 to **~P15,000** by decision | S | **DONE (structure) · RETUNE in `docs/34` Wave 4** |
| 3.8a Journal/Phane gate relief (second low-probability route) | 31 P1-5 | `bushveld.ts` — Moriti dry-season deadfall (May–Jul), reuses the `phane` slug so the page denominator is unchanged | S | **DONE** |
| 3.8b Storage T3 utility (P12,000 → functional benefit) | 31 P1-6 | `economy.ts` + `inventory.service.ts` — tier 3 doubles every per-type stack cap (depth, not breadth) | S | **DONE** |
| 3.8c Live crafting margin (read live input quote; warn, never block) | 31 P1-7 | `crafting.ts` `recipeEconomicsAt` + live prices in `crafting.service` + honest card warning | M | **DONE** |
| 3.8d Maintenance demand ↑: `thatch`/`hardwood` repair recipes, scale with building count | 31 P1-8 | `buildings.ts`, `economy.ts` | M | **DONE** |
| 3.8e Maintenance rhythm: 90-day lump → 30-day bill | `docs/33` §8 · `docs/34` Wave 1 | Shorter interval, ~⅓ the quote each time + a day's warning | S | **TODO (`docs/34` Wave 1)** |
| 3.9 Welcome-back discards (G-12); lazy wear accrual (G-13) | 30 G-12/G-13 | Honesty + fairness for weekly players | S | **DONE** |

**Pass 3 gate:** `balance_verify.py` PASS · Almanac shows real progress on a live account ·
season-boundary test asserts one calendar only.

`balance_verify.py` PASS · integration arc: *fed → 24 h offline → alive, feedable, producing; treated if sick*.



### Pass 4 — Voice (strings + data only) — R9

| Task | Finding | Change | Effort | Status |
| --- | --- | --- | --- | --- |
| 4.1 `MOPHANE_LINES` pool (months 4/12 only) | 30 N-6.1 | Shaped like `WATER_WHISPERS` | S | TODO |
| 4.2 `MARKET_WHISPERS` — 5 price conditions, Mama Naledi's voice | 30 **N-10** | `dialogue.ts` + `MarketScreen.tsx`; Market screen gains narrative | S | DONE |
| 4.3 Chapter beat: one Mogolo line + sky swap per boundary | 30 N-5 | Fires once per crossing, not per load | S | TODO |
| 4.4 Rewrite three project descriptions; Mogolo completion lines | 30 N-3 | No project promises an effect on another player's farm | S | TODO |
| 4.5 Thabo rewrite, `Oupa Kabelo` → `Ntate Kabelo`, consolidate elders | 30 N-2 | One cast source of truth | M | TODO |
| 4.6 Chapter-scoped project sequencing | 30 N-4 | One project per chapter | S | TODO |
| 4.7 Environmental storytelling from the 22 scene props | 30 V-10 | Every prop has a state binding or is retired | L | TODO |
| 4.8 Deep Bushveld restoration art + hotspot set | 30 V-12 | 4 backgrounds + hotspots | M | TODO |
| 4.9 Growth-stage silhouette rule; `READY` text → icon + sparkle | 30 V-7 | stage 0 ≤ 6 px, final ≥ 2× stage 0 | M | TODO |
| 4.10 Product sprite as animal state | 30 V-8 | `animalMood()` can return `product` | S | TODO |

**Pass 4 gate:** every one of the ten screens has ≥ 1 piece of state-reactive narrative voice.

---

### Pass 5 — Ship the decided simple economy (`docs/33` → `docs/34`)

> **RULING 2026-10-01.** The economy/monetization strategy in `docs/33` is **decided**: two currencies + one
> meter, two store products, Pula never sold, Madi spend-only, boosts cut, land tail retuned.
> **The build sequence lives in `docs/34_Economy_Monetization_Implementation.md` — implement from that file.**
> This pass is the roadmap slot for it; the rows below are index-only.

| Task | Change | Wave (`docs/34`) | Effort | Status |
| --- | --- | --- | --- | --- |
| 5.1 | **Fix livestock feed economics** — goat/cow feed → `sorghum`, goat qty 1→2, `feedPerDay` 2/3/3/6 | Wave 1 | S | **DONE** — chicken **P14**, guinea fowl **P7**, goat **P21**, cow **P27**/day. ⚠️ *Corrected mid-build:* `milk` was **already P15** (`MVP/02 §6.2` is stale), so no price change and no `_milk_price.sql` migration were needed. `livestock.spec.ts` locks the margins. |
| 5.2 | **Botho helper ladder** — Auto-Feeder **300**, Auto-helper **500** (supersedes 3.5) | Wave 1 | M | **CONFIG DONE, persistence BLOCKED** — `BOTHO_THRESHOLDS` + `AUTOMATION_LADDER` + `automationUnlockedAt()` landed; storing unlocks still needs schema sign-off. |
| 5.3 | **Maintenance rhythm** 90 d → **30 d** (pairs with 3.8e) | Wave 1 | S | **DONE** — ⚠️ *Corrected mid-build:* the bill is held, **not** cut to ⅓ (that is self-cancelling). Period ÷3 triples the daily drain and leaves the annual cost unchanged. + `warningLeadHours: 24`. |
| 5.4 | **Madi balance** — migration + `wallet_apply` support + `madi_balance`; entitlements grant **Madi not Pula** | Wave 2 | **L** | **DONE + APPLIED TO THE REMOTE DB.** `20261001000003_add_madi_balance.sql` applied via `supabase db push`. Verified live: `madi_balance` exists (existing players defaulted to 0) and `wallet_apply('madi', …)` is in the whitelist, with `'gold'` as the rejected control. `WalletCurrency`/`LedgerSource` extended; `creditMadi`/`spendMadi`/`canAffordMadi` added; `awardEntitlement` now `creditMadi(...,'madi_topup')`. |
| 5.5 | **Top-up packs re-denominated** P5/20/50/100/250 → 5/20/55/110/275 **Madi** | Wave 2 | S | **DONE** — `grantedPula` → `grantedMadi`; bonus asserted 0–10%; P500 pack removed (its top rung sat exactly on the daily cap). |
| 5.6 | **Two decoration shelves** — Market (Pula P200/600/1500) + Festival (Madi M40/80/150/300); every Festival slot has a Market cousin | Wave 2 | M | **DONE** — `shelf` + `slot` on every cosmetic; `StoreService.purchase` debits the wallet the SKU's own currency names. Cousin rule asserted. |
| 5.7 | **Village Pass M50/mo** replaces Guild (helper + monthly outfit +50% storage) | Wave 3 | M | **DONE** — `VILLAGE_PASS` replaces `GUILD_SUBSCRIPTION` (slug `village_pass`, `priceMadi: 50`); weekly Pula Stone grant job **and** its `admin/grant-weekly` route deleted. |
| 5.8 | **Cut boosts** from the catalogue entirely (not merely `available:false`) | Wave 3 | S | **DONE** — `BOOSTS`/`BOOST_SLUGS` empty; the `boost` store category is gone from the TS union; `awardEntitlement` refuses a boost entitlement loudly. |
| 5.9 | **Season stamps** — rename Chapter Tokens in UI + **wire a spend route** (or hide the currency) | Wave 3 | M | **PART-DONE** — renamed to **Season Stamp** in `CurrencyGuide` with a real spend route advertised (souvenirs). ⚠️ **The `POST /chapters/tokens/spend` route is still NOT wired** — `ChapterService.spendTokens()` exists with no controller route. Until it lands, the copy over-promises. |
| 5.10 | **Land tail retune** — 16 plots ~P8,000 · 20 plots ~P15,000 (pairs with 3.7/3.1b) | Wave 4 | S | **DONE** — `LAND_LADDER_TOTAL` **P51,200 → P31,200**; `landRungPaybackDays()` added and asserted ≤100 days at morula density (7.4 / 36.9 / 49.2 / **92.3**). |
| 5.11 | **Store UI** — no React store screen exists today | Wave 4 | L | **NOT STARTED** — the catalogue, purchase path and Wallet/CurrencyGuide copy are all in place, but there is still **no React storefront** and no wired end-to-end purchase. |

**Pass 5 gate:** `balance_verify.py` PASS · a free player reaches every content item with **no** purchase ·
a spec asserts **every animal is net-positive/day** at base prices · top-ups credit **Madi**, never Pula ·
`wallet_apply` accepts `madi` and **rejects any Pula-granting top-up** · boosts are absent from the catalogue.

**Schema applied 2026-10-01.** `supabase db push --include-all` cleared all three queued migrations.
It first failed on `20261001000001_economy_metrics.sql`, which is **not part of Pass 5**: that file
called `public.is_admin()` bare, but `is_admin` is declared `is_admin(user_id uuid)` in
`20260902000015_admin_role.sql` and has no zero-arg overload — a 42883 at `CREATE POLICY` time that
aborts the whole transaction and blocks everything queued behind it. Fixed to
`public.is_admin(auth.uid())`. Worth noting: **every migration in this repo is written as if it
applies in isolation**, so a single bad statement silently blocks an entire queue.

---

## 3. Post-sprint validation plan (R10)

1. Rebuild API + simulator; run gates (tsc ×2, jest, `balance_verify.py`, eslint on touched files).
2. **Fresh cohort economy run** (SIM §9): `--run-token=<fresh>` · `--players=30–50` · `--days=7` ·
   raised `--mutations-per-minute` · background. Expected: livestock/crafting/building activity > 0;
   market buys = seeds only; contract Pula measurable; ARPU/ARPPU toward `MVP/02 §6` targets
   (blended ARPU **P2.27**, ARPPU **P75.80**).
3. Re-run safeguard suite: SEC-02 all 4xx (payments **strict 400**), SEC-04 throttles on the
   unpaced burst, AC suite unchanged.
4. Update `SIMULATION_REPORT.md`, `docs/DEVELOPMENT_STATE.md`, and this roadmap's status column.

## 4. Progress ledger (living)

| Date | Change |
| --- | --- |
| 2026-10-01 | **R11 added + Pass 5 opened — economy strategy DECIDED and folded into the roadmap.** `docs/33_Economy_and_Monetization_Strategy.md` was rewritten as the **simple cozy edition** (215 lines; supersedes the earlier decision-matrix draft in the same file). The decision: **2 currencies + 1 meter** (Pula earned-only · Madi spend-only · Botho a meter), **2 store products** (decorations + M50 Village Pass), **top-ups grant Madi not Pula**, **boosts cut**, land tail retuned to ~P8k/~P15k. Pass 5 (5.1–5.11) tracks the build; the task-level sequence is **`docs/34_Economy_Monetization_Implementation.md`**. Consequential supersessions recorded in place: **3.5** (Auto-Collector 150 folds into the 500 Auto-helper), **3.7** (cost retuned, structure stays), **3.8e** (new), **MVP/01 D2/D7/D10/R8/R9**, **`MVP/02 §1/§3.1/§3.2/§3.3/§6.4/§6.5/§6.6`**, **`docs/10 §1/§2`**, `README.md`, `DEVELOPMENT_STATE.md` (M14a), `DOCUMENTATION_AUDIT.md` (33 + 34). **Not yet built — no schema work has run; the store still grants Pula.** |
| 2026-09-28 | Roadmap created from 30/31/SIM/summary reconciliation. Pass 1 executed: R1/R2/R3/R4 code fixes, safeguards extended (SEC-02B + unpaced SEC-04), narrative N-1 + N-10 landed, PixelLab regeneration launched for noisy icons and building-state sprites. |
| 2026-09-28 | **Pass 3 (mechanics) executed**: 3.1 calendar unification, 3.2 world-event re-key, 3.3 chapter market events, 3.7 16-plot rung, 3.8d maintenance demand, 3.9 welcome-back discards + lazy wear. Gates: api jest 293/293, game-config jest 86/86, `tsc` api+web clean, `balance_verify.py` PASS. Two stale-spec regressions from earlier passes found and fixed (crops land ladder, water growth modifier). Remaining Pass-3 = the four forks below. |
| 2026-09-28 | **Pass 3 (forks) executed** — Princess ruled all three: 3.8a Moriti dry-season `phane` route; 3.8b Storage T3 stack-cap ×2; 3.8c warn-not-block. Gates: api jest 300/300, game-config jest 89/89, `tsc` api+web clean, `balance_verify.py` PASS. Remaining Pass-3 = schema work only (3.4/3.5, 3.6's counter). |
| 2026-09-30 | **2.11 executed (N-8 closed).** Princess ruled the borehole belongs to the post-MVP water line (`archive/MOLEMISI_Core_Systems_v2.md:166` — Stone Well → Windmill → Solar Borehole), so it was **archived, not promoted**. 14 files → `assets/_archive/` (with a README documenting every one); 7 stale tracked `assets/sprites/buildings/*/lvl1.png` deleted (zero code refs; bytes differ from the live `ui/items/building_*.png`); dead `saffron`/`wool` client refs removed from `pixelIcons.ts` + `gameState.tsx`. Gates: game-config jest **89/89**, api jest **300/300**, `tsc` api+web clean, `balance_verify.py` PASS. Reachability: live tree 396 png, 66 unreferenced — essentially all **pending wiring** (64 ground autotiles for 2.4, hotspots for 2.6, scene-props for 4.7), not orphans. `kraal/` (untracked) left untouched. |
| 2026-09-30 | **2.12 executed (N-9 code-complete, art-blocked).** Pig → **guinea fowl** (`kgaka`): `livestock.ts` (36 h / 2 eggs / P300), new `guinea_fowl_egg` item (P12) replacing `truffle`, `PRODUCT_ITEM` bridge, all four client maps, `translations.animalGuineaFowl`, generator tables, and 2 spec assertions. Retired `pig` sprites + `truffle` item archived. **PixelLab returned HTTP 402 — account out of credits (0/5000)** → the 4 fowl sprites are ungenerated; the client degrades to the 🐦 emoji via `AnimalSprite`'s existing `onError` fallback. Gates: game-config jest **89/89**, api jest **300/300**, `tsc` api+web **0**, `balance_verify.py` PASS. Also fixed manifest drift: the generator **merges and never prunes**, leaving 21 entries pointing at archived/deleted files — pruned + generator declarations cleaned (planned 306→284). |

| 2026-09-30 | **2.4 executed (V-4.1 + V-4.4 closed).** Farm ground + plot tiles now render. New `apps/web/src/lib/groundTiles.ts` (pure: chapter→set map, adjacency classifier, tile resolver) + `apps/web/src/components/FarmGround.tsx` (texture layer, not a sprite — background-size pinned to `scale×16px`, `background-position` crop for the `grass_base` atlas). `FarmScreen` paints two layers per plot cell: the seasonal ground, then `plot_empty` (TILLED) / `plot_soil` (planted) on top. Chapter is derived client-side via `chapterForDate` — the web app already imported game-config, so **no API change**. Mapping: pula→`grass_water`, phane→`grass_dirt`, moriti→`grass_dry` (both pinned by 30), letlhafula→`grass_path` (Princess ruled). **V-4.4 corrected**: the "8 stray UUID PNGs" are *load-bearing* (`wang_0` all-lower + `wang_15` all-upper — each set's only uniform tiles, no numeric twin), so purging would break the set; they were **renamed to `0.png`/`15.png`** with all four `.json` `file` fields updated, and `grass_base.png` regenerated as the real 64×64 4×4 sheet (was a stale 32×32). Script: `scripts/normalize-ground-tiles.mjs` (idempotent). **Also hardened `scripts/sync-assets.mjs`**: it used `cpSync({force:true})`, which only adds/overwrites and never deletes, so the served tree was permanently accretionary — renamed files lingered and stayed downloadable. It now wipes `apps/web/public/assets` first (`--keep` opts out). Verified 0 ghosts / 0 missing. Gates: `tsc` web **0**, game-config jest **89/89**, api jest **300/300**, `balance_verify.py` PASS. |
| 2026-09-30 | **2.7 / 2.8 / 2.9 executed — the Pass-2 wiring sweep the PixelLab block left runnable.** **2.7 (V-6)**: new `components/PixelUiIcon.tsx` — the existing `PixelIcon` resolves an icon from an *item type* and so could not reach the 53 curated interface icons; this accessor takes an icon *name* + emoji fallback. Wired into Bushveld HUD (**Kagiso pips now the real `status_kagiso_pip` sprite**, empty pips desaturated rather than grey CSS squares), hotspot state markers, FarmScreen (welcome-back rows, granary, ready/dry flags, Heritage shade, Tsholofelo gift), Wallet (pula/botho/history), Inventory (category tabs + item origin kinds). All 20 referenced icon names verified to exist on disk. **2.8 (V-14)**: new `components/Attention.tsx` implements the `03 §13` four-level queue (critical→high→medium→low) with `deriveAttention()` collapsing live farm state to **at most one** pulse and `ownsPulse()` enforcing it; four `attention-pulse-*` keyframes added (red/orange/blue/grey) incl. a `prefers-reduced-motion` off switch. FarmScreen's plot borders now derive from it; removed the competing pulses (13 simultaneous hotspot pulses, per-ready-crop `animate-bounce`, always-on weather sprite pulse, toast icon pulse). Remaining pulses are one-shot entries or single-element empty/loading states. **2.9 (V-11/V-13)**: new `components/ChapterParticles.tsx` (Pula→water/sparkle, Phane→leaf/petal, Moriti→dust/smoke, Letlhafula→autumn leaf/gold spark), wired into Farm + Bushveld. **`particles/snowflake.png` deleted** (Botswana has no snow; 05 §1.5) and removed from the generator + manifest so it cannot be regenerated. Market fallback repointed from the non-existent `backgrounds/market_scene.png` to the real, previously-unused `tiles/sky/market.png`. **404 audit: all 12 literal asset refs + 13 hotspots + 12 restoration stages + 11 crop stage-sets + 3 animal mood-sets resolve; the single remaining miss is `ui/items/product_guinea_fowl_egg.png`, which is the deliberately-deferred kgaka art and degrades via `onError`.** Manifest 283→282, 0 missing. Gates: `tsc` web **0**, game-config jest **89/89**, api jest **300/300**, `balance_verify.py` PASS. |
**2.11 follow-on — v1.1 water-tier line (ruled 2026-09-30, out of v1 scope).** Doc 30 N-8 proposed
promoting `building_borehole.png` to a live building. Ruled **against for v1**: the original design
reserves the three-tier water line (Stone Well → Windmill → Solar Borehole) as *"the first thing built
after MVP ships"*, and `water.service.ts` currently assumes a single `water_source` row — promoting it
now would be a feature, not housekeeping. The art is safe in `assets/_archive/ui/items/building_borehole.png`
for v1.1 to claim.

### ⛔ BLOCKER — PixelLab credits exhausted (found 2026-09-30)

`PIXELLAB_API_KEY` is present in `.env`, but every generation returns
**`402: Insufficient generations and credits. Generations: 0.0/5000.0, Credits: 0.0`**.
This blocks **2.1, 2.5, and 2.10** as well as 2.12's art — i.e. **the whole art-generation half of
Pass 2**, exactly as the superseded reconciliation doc §8 predicted. What is *not* blocked: every
Pass-2 task that only **wires existing art** (2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9) and the scripts-only
V-2 palette gate. Recommend either topping up the PixelLab account or accepting the "wire existing
art" ceiling for v1 and deferring regeneration.

> **PRINCESS RULING 2026-09-30 — defer, do not top up.** *"Since the pixellab credits are done defer
> the kgaka and its wiring. Wire everything else."* So: **2.12's four guinea-fowl sprites, 2.1, 2.5
> and 2.10 are DEFERRED** until credits exist. All art-wiring tasks were then executed and are DONE
> (2.2, 2.4, 2.6, 2.7, 2.8, 2.9). The code is deliberately left in a state where the deferred art
> **degrades cleanly rather than breaking**: `AnimalSprite`, `PixelIcon` and `PixelSprite` all carry
> `onError` emoji fallbacks, so the fowl renders as 🐦 and its missing product icon as 🥚. Nothing in
> the shipped path depends on art that does not exist. When credits return, the remaining work is
> purely `node scripts/generate-pixellab-assets.mjs --group <g>` plus a visual review — **no code
> change**, because every call site already points at the correct path.

**Manifest hygiene (also 2026-09-30).** `generate-pixellab-assets.mjs` **merges** into
`assets/manifest.json` and never prunes, so retired assets accumulated as entries pointing at
non-existent files (21 of them, all from 2.11's archive/delete set). Pruned to **283 entries, all
resolving**. The generator's own retired declarations were removed too (planned calls 306 → 284) so a
future run cannot resurrect them — including the legacy `sprites/buildings/*/lvl1.png` set and the
`saffron`/`wool` icons. **Now 282** after `snowflake` was deleted in 2.9.

**Served-tree hygiene (also 2026-09-30, found during 2.4).** `scripts/sync-assets.mjs` used
`cpSync({force: true})`, which **only adds and overwrites — it never deletes**. The served tree at
`apps/web/public/assets/` was therefore accretionary: a renamed or archived asset kept its old file
and stayed downloadable forever (this is how the 2.4 ground-tile UUIDs survived the rename).

> **⚠️ Caution learned the hard way.** The first fix **wiped the served directory and re-copied**,
> which deleted four files that are **committed directly and have no `assets/` counterpart** —
> `backgrounds/{bushveld,farm,kgotla,market}_scene.png`, tracked since `ecf811d`. That was a
> regression, caught in `git status` and reverted. The sync now prunes **conservatively**: it deletes
> a served file only when the source tree has no counterpart at the same path, **and** it protects the
> known hand-committed backdrops by pattern (`PROTECTED`). It reports every removal and every kept
> orphan, and supports `--dry-run`. **Lesson: a served tree is not necessarily a mirror of the source
> tree — check what git owns before deleting anything in it.**
>
> Verified: served-only set = exactly those 4 backdrops, missing = 0, 424 files.

**`assets/_archive/` must not be published (also 2026-09-30).** The 2.11 archives are tracked in the
repo for provenance, and the sync was faithfully copying them — so retired pig/saffron/borehole art
was publicly downloadable at `/assets/_archive/...`. The sync now **excludes `_archive/` at the copy
stage** (and prunes it if an earlier run published it), so archived art stays in the repo but never
reaches a URL. Served tree 424 → **405 files**.

---

## 5. Design forks — RULED (2026-09-28)

All three contained Pass-3 forks are now closed. What remains of Pass 3 is **schema work only**
(3.4/3.5, + 3.6's counter), which still needs sign-off.

| Task | Fork | Ruling (2026-09-28) |
| --- | --- | --- |
| **3.8a** Phane endgame gate | `phane` appeared only in Moranang / Sedimonthole, so a May starter waited until December to finish the Open Bush page | **(b) rare dry-season route.** New `ob_dry_deadfall` in Open Bush, Moriti months `[5,6,7]`, `kagisoCost` 2, phane weight 2 against wood's 10. It reuses the existing `phane` and `dikgong` discovery slugs, so `findsForScene` dedupes it away — the page denominator and the 34-checkmark Journal are unchanged. |
| **3.8b** Storage T3 | P12,000 + 12 thatch for 96 slots was a dead sink (Tier 2 already holds all 38 item types) | **(b) functional benefit = stack-cap ×2.** The roadmap's "+listing slots" was void — the listing count belongs to the Madi / P2P economy, outside the v1 Co-op loop (31 §6.2). Tier 3 now doubles every item's per-type stack cap: depth, not breadth, and it pairs with the reactive market. No income change, so the balance gate is untouched. |
| **3.8c** Crafting margin | The live raw band (up to 2.0×) can push a recipe's input cost above its crafted sell price → an accidental-loss craft | **(a) warn, never block.** New `recipeEconomicsAt` values a recipe at TODAY's prices; `underwaterNow` drives the card warning. The previous warning was computed from BASE values, so it could not actually see a spike — it was a lie. |

| **3.4 / 3.5** | Schema sign-off | `3.4` needs a place for the five Almanac counters (e.g. `player_chapter_state.almanac_progress` JSONB); `3.5` needs the automation unlocks (Botho-gated: Auto-Collector 150 → Auto-Feeder 300 → Irrigation 500). Both are additive; neither is pushed without Princess sign-off. |
