# 30 — Gameplay, Visual & Narrative Review

**Date:** 2026-09-28 · **Author:** Cline (review pass, for the solo developer)
**Status:** **Recommendations ledger — nothing in this document is implemented yet.**
**Scope:** A grounded audit of the *player experience* of v1: the balance and pacing of the
core loop, the pixel-art pipeline as it actually exists on disk, and the narrative layer as it
is actually wired. Every claim below is derived from the repository, not from the design
intent, and every defect carries a `file:line`.

**Evidence base**

| Source | Used for |
| --- | --- |
| `docs/MVP/01`–`07` | The normative numbers and the reasoning behind them |
| `docs/01`, `03`, `05`, `09`, `24` | Original design suite — treated as **intent**, per `DOCUMENTATION_AUDIT.md` golden rule 2 |
| `packages/game-config/src/*` | Numbers of record (`crops`, `chapters`, `economy`, `buildings`, `livestock`, `bushveld`, `crafting`, `almanac`, `dialogue`, `weather`) |
| `apps/api/src/*` | As-built behaviour (`simulation`, `water`, `livestock`, `contracts`, `kgotla`, `world-events`) |
| `apps/web/src/*` | As-built presentation (ten screens, `gameState`, `pixelIcons`) |
| `assets/` (423 files) | Measured pixel-level audit: dimensions, colour counts, alpha edges, reachability |

**Authority.** This document is a *review*, not a specification. Where it disagrees with
`docs/MVP/`, `docs/MVP/` still wins and this document is wrong until a ruling says otherwise
(§9 lists the items that need exactly such a ruling). Where it disagrees with the code, the
code is the truth and this document is the finding.

---

## How to read this document

1. **§1 Verdict** — the three P0 defects and the one-line assessment.
2. **§2 Method** — what was measured and how, so any number here can be re-derived.
3. **§3–§5** — Gameplay / Visual / Narrative. Each finding has an ID (`G-n`, `V-n`, `N-n`),
   an evidence line, and a recommendation.
4. **§6 Implementation plan** — the same findings re-cut into four workable passes with
   file targets and acceptance criteria. **Implement from §6, not from §3–§5.**
5. **§7** — how to verify this pass; **§8** — deliberate non-goals; **§9** — open rulings.
6. **Appendices** — the measured asset tables and a verified fact sheet worth keeping.

Each finding carries a status box so the ledger can be ticked off in place:

```
Status: OPEN · Owner: — · Impl: — · Verified: —
```

`OPEN` → `IN PROGRESS` → `DONE` (with the commit/PR that closed it) is the whole lifecycle.

---

## 1. Verdict

**The numbers are the best part of this game, and the presentation is the weakest.**

The crop table, the F1/F2/F4/F5 retune, the 24 h offline cap and the Setswana chapter calendar
fit together better than most shipped farm sims — a 1-day crop matures in one daily visit and a
2-day crop matures in exactly two, because 24 h + 24 h = 48 h. That is not luck; it is the cap
and the crop table being tuned to each other.

Against that, three defects outrank everything else in this document, and all three are
verified line-by-line:

| # | P0 defect | Impact | Evidence |
| --- | --- | --- | --- |
| **P0-1** | **Animals become permanently, unrecoverably sick in 7–12 hours.** Health decays once `hunger < 0.2`; `is_sick` is set at `health < 0.3`; feeding **throws** when sick; and **no heal endpoint or medicine item exists**. Production requires `health > 0.5`, so a sick animal never produces again. Every animal is permanently dead after a single overnight gap. | Destroys the livestock pillar and violates the #1 product constraint — *"no game over states or punitive mechanics."* | `simulation.service.ts:307–309, 336`, `livestock.service.ts:182–184` |
| **P0-2** | **Feeding costs nothing.** `feedAnimal` sets `hunger += 0.3` and writes `last_fed_at`. It debits no item and no Pula, while the client renders `🌾 2 sorghum` / `🌿 4 herbs` on the button and `feedPerDay` is read by **nothing** on the server. | Breaks doc 24's core trust claim ("every number on screen is server-backed"), and makes livestock the best ROI in the game — inverting the F7 sink model and the 3.3× crop spread `balance_verify.py` protects. | `livestock.service.ts:156–199`, `FarmScreen.tsx:83–91`, `livestock.ts:27,45,61,77,93` |
| **P0-3** | **~198 of 423 shipped art files are unreachable from the client (47%).** All 86 unused tiles (including every ground autotile and both plot tiles), 48 of 53 UI icons, all 13 hotspot sprites, all 22 scene props, all 12 particles, 3 UI panels and 3 UI buttons are served but never drawn. Plot cells are `bg-wood-dark/80 border-2` rectangles; buildings render as 32×32 *item icons* in a list, so construction, wear, maintenance and upgrade tiers have **zero** visual presence. | The Farm screen is not a farm. Doc 05 §5 requires four building states and 03 §1 says the farm view is *"always the primary visual"* — neither is met. | §4.4 table; `FarmScreen.tsx:702`, `:206`, `BushveldScreen.tsx:122–136` |

**Assessment in one paragraph.** Scoring against the design's own stated priorities: the
**economy and the calendar are strong** (A-), **the narrative system is unusually good and
already systemic** (A-, and cheap to extend), **the core loop's arithmetic is sound but its
livestock leg is broken** (C, and the break is a soft-lock), and **the pixel-art pipeline is
delivering assets that the game does not show, in a palette the spec does not contain** (D).
The reassuring diagnosis: none of this needs new architecture. The three P0s are ~200 lines
across six files, and the largest visual gain available is *wiring art that has already been
paid for*.

### 1.1 What must be protected

Listed so that a subsequent pass does not "simplify" them away:

- **The 24 h offline cap** (`MAX_OFFLINE_HOURS`, `game-config/src/index.ts:26`) and the
  16–24 h / 40–48 h crop cadence. **These two are correct as a pair.** Do not raise the cap
  without re-cutting the crop table, and do not re-cut the table without re-reading `MVP/07 §1 F1`.
- **Water as the central tension** (`WATER.unitPricePula = 1.0`, tank 60, `rainCoverage` per
  chapter 0.8 → 0.05) and the rule that **an empty tank halts growth and never kills a crop**.
- **The four-chapter Setswana year** as the discovery mechanism that replaced the level gate
  (C12/D6), and Chapter Tokens that expire at chapter end.
- **`ELDER_RULES` first-match semantics** and the deliberate absence of a scold pool in
  `TSHOLOFELO_DIALOGUE`. This is the game's voice; it is the thing a competitor cannot copy.
- **The inventory-as-equipment division** (F15: tools never occupy a storage slot).

---

## 2. Method & reproducibility

Every number in this document was measured, not estimated. The three techniques:

**(a) Spec-vs-code reconciliation.** Each `docs/` claim was read against the implementation and
the config. `docs/MVP/` is normative; `docs/01`–`23` are intent; the code is the truth.

**(b) Number tracing.** Every balance figure was traced to its single source
(`packages/game-config/src/*`) and then to its consumer (`apps/api/src/*`), to catch constants
that are declared, seeded and documented — but never read. **Three were found:**
`feedPerDay` (G-3), `SELF_SUSTAINING_THRESHOLD_HOURS` (G-4) and the `Almanac.requirement`
counters (G-7).

**(c) Pixel-level asset audit.** For all 423 files under `assets/`: dimensions read via
`System.Drawing`; unique-colour count and the number of colours needed to cover 80% of opaque
pixels (a direct, numeric measure of per-pixel noise); partial-alpha pixel count (a direct
measure of anti-aliasing); and **reachability**, by recursively resolving every `assets/`
reference in `apps/web/src` — literal paths plus the five template families
(`ui/icons/${…}`, `ui/items/${…}`, `sprites/crops/${…}/stage_${…}.png`,
`sprites/animals/${…}/${…}.png`, `sprites/npcs/${…}`) and the dynamic
`/assets/${restorationAssetKey}`.

The reusable scripts are in **Appendix C**; the measurements and their implications are in
**Appendix A** and **Appendix B**.

---

## 3. Gameplay Mechanics & Progression

### 3.1 The core loop: correct arithmetic, one stale doc comment

The spine — `Invest → Grow → Harvest → Sell` — is sound, and the reason is worth stating
precisely so a future pass does not break it.

**The time base.** Both live simulation paths use **1 real hour = 1 game hour**:

```ts
// apps/api/src/simulation/simulation.service.ts:98
const elapsedHours = elapsedMs / (1000 * 60 * 60);
// apps/api/src/water/water.service.ts:73
const elapsedHours = Math.min((nowMs - lastSim) / 3_600_000, MAX_OFFLINE_HOURS);
```

**`docs/09_Game_Simulation_Specification.md §2` line 46 still says**
`elapsed / (1000 * 60); // 1 real minute = 1 game hour` — **stale by a factor of 60.** It is not
cosmetic: the F1 rule ("a crop finishing just after 24 h still yields only one harvest per visit,
so it earns half what a 23 h crop of identical value earns") only *works* under the 1 h = 1 h
mapping. Under the doc's own comment every crop would mature in under an hour, and the crop
table would be nonsense.

> **G-1 — Correct the time-base comment in doc 09 §2.**
> Evidence: `docs/09_Game_Simulation_Specification.md:46` vs `simulation.service.ts:98`,
> `water.service.ts:73`. Fix: `// 1 real hour = 1 game hour`. One line. Do it **before** any
> pacing work, or the next reader will "fix" the code to match the doc.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

**The cap and the cadence are a matched pair.** With `growthHours` 18/24 (1-day) and 40/48
(2-day) and `MAX_OFFLINE_HOURS = 24`:

| Crop class | Growth | Visits to mature (1/day) | Wasted time |
| --- | --- | --- | --- |
| 1-day (16–24 h) | 18–24 h | 1 | none |
| 2-day (40–48 h) | 40–48 h | 2 (24 + 24) | 0–8 h |

Nothing sits in the 24–40 h trap band, so the cap never truncates a cycle. **Protect this** (§1.1).

### 3.2 Defect register — friction points, in priority order

| ID | Finding | Impact | Evidence |
| --- | --- | --- | --- |
| **G-2** | Animal sickness is a permanent soft-lock (P0-1) | **Critical** | `simulation.service.ts:307–309,336`; `livestock.service.ts:182–184` |
| **G-3** | Feeding is free while the UI says it costs feed (P0-2) | **Critical** | `livestock.service.ts:156–199` |
| **G-4** | `SELF_SUSTAINING_THRESHOLD_HOURS = 72` is unreachable | High | below |
| **G-5** | Two independent season clocks (28 d vs 91 d) | High | below |
| **G-6** | Automation is gated on a retired progression axis | High | below |
| **G-7** | The Almanac's requirements are decorative | High | below |
| **G-8** | Contracts award Pula only; one has corrupt copy | Medium | below |
| **G-9** | Tier-3 land rung is an 80% cliff | Medium | below |
| **G-10** | The feed cycle demands 2–4 taps/day/animal | Medium | below |
| **G-11** | Market events never fire and are not seasonal | Medium | §3.5 |
| **G-12** | The offline cap silently discards time | Low | §3.6 |
| **G-13** | Wear accrues only in the capped window (perverse) | Low | §3.6 |

#### G-2 (P0-1) — Animal sickness is a permanent soft-lock

The chain, verified end to end:

| Step | Code | Effect |
| --- | --- | --- |
| Hunger decays at full rate | `simulation.service.ts:300–304` | chicken `hungerDecayRate 0.15/h` (`livestock.ts:51`) |
| Health decays once `hunger < 0.2` | `simulation.service.ts:307–309` | `health -= healthDecayRate × elapsedHours` |
| `is_sick = health < 0.3` | `simulation.service.ts:336` | sets the flag |
| Feeding **throws** when sick | `livestock.service.ts:182–184` | `BadRequestException('Animal is sick and needs medicine')` |
| **No heal endpoint, no medicine item** | grep of `apps/api/src`, `packages/game-config/src` | only `animals_heal.png`, unused |
| Production requires `hunger > 0.5 && health > 0.5` | `simulation.service.ts:322` | production stops permanently |

Measured time-to-permanent-sickness from a fully-fed animal (hunger 1.0, health 1.0):

| Animal | `hungerDecayRate` / `healthDecayRate` | Permanently sick after |
| --- | --- | --- |
| Chicken | 0.15 / 0.10 | **~7 h** |
| Goat | 0.12 / 0.08 | ~8.8 h |
| Pig | 0.13 / 0.07 | ~10 h |
| Cow | 0.10 / 0.06 | ~11.7 h |

**Every animal is permanently dead after one overnight gap.** The fix has three parts:

1. **Add a recovery path.** The cheapest correct version is
   `POST /farms/:farmId/livestock/:id/treat`, consuming an existing item — `herbs`, whose own
   description reads *"Traditional medicine, gathered leaf by leaf. Slow, and never cheap"*
   (`crops.ts:241`) — and setting `is_sick = false, health = 0.6`. Zero new art, zero new
   economy, and it makes Refilwe's herbalist identity **mechanical** instead of decorative.
2. **Clamp instead of throw.** Feeding a sick animal should grant `+0.15` hunger and no
   production, not a hard `400`. Cozy games degrade; they do not lock.
3. **Gate health decay on a starvation window** (e.g. health falls only after 12 consecutive
   hours at zero hunger), so one missed visit is a nudge rather than a death.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-3 (P0-2) — The client says feeding costs feed; the server charges nothing

`feedAnimal` (`livestock.service.ts:156–199`) sets `hunger = Math.min(1.0, hunger + 0.3)` and
writes `last_fed_at`. **No inventory debit, no wallet debit.** Meanwhile:

- the Feed button renders `🌾 2 sorghum` / `🌿 4 herbs` (`FarmScreen.tsx:83–91`);
- `AnimalConfig.feedPerDay` (2/4/6/8) and `feedType` are declared and populated
  (`livestock.ts:27,45,61,77,93`) and **read by nothing on the server** — the only reader is a
  comment;
- `docs/01 §10` and `MVP/03 §5` both specify *"Feed cost: Normal feed consumption."*

**Consequences:** livestock income is pure profit minus the purchase price (chickens at P50
paying 2 eggs per 12 h with free feed out-earn every crop), which inverts the `F7` sink model and
the 3.3× crop spread `scripts/balance_verify.py` exists to protect; and it breaks doc 24's
central trust claim. A visible cost that is not charged is worse than no cost at all.

**Fix:** charge `{slug: feedType, qty: feedPerDay}` through `InventoryService`, using the same
combined slot-check pattern as collect (G1/G4 in `MVP/03`), so a full store fails the whole feed
atomically. Then `feedPerDay` becomes the number it claims to be, and feeding becomes a real
Pula/crop decision.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-4 — The published 3-day livestock allowance cannot happen

`simulateLivestock` computes `offlineDays = elapsedHours / 24` where `elapsedHours` is already
clamped to 24, so `offlineDays ≤ 1` and `selfSustaining = offlineDays > SELF_SUSTAINING_THRESHOLD_HOURS / 24`
is **always false** (`simulation.service.ts:296–297`). Yet `docs/09 §9` publishes
*"Livestock | 3 days (self-sustaining after) | Minimal decay"* as a player-facing allowance, and
`SELF_SUSTAINING_THRESHOLD_HOURS = 72` is exported from `game-config`.

**Consequence:** livestock decays at *full* rate for the whole capped window with no protection —
which is exactly what turns G-2 from a nudge into a kill.

**Fix (preferred):** apply the self-sustaining rule to **livestock only**, computed from the
*uncapped* elapsed time, before the 24 h clamp is applied to growth: hunger ×0.25, no production,
floor 0.1. This is the off-switch that makes G-2 survivable and it honours the published promise.
**Alternative:** delete the constant and the doc row. Do not leave both in place.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-5 — Two calendars that disagree by 3.26×

`weather.ts`: `SEASON_DURATION_WEEKS = 4` → `SEASON_DURATION_HOURS = 672` → **28 real days** per
sim season (`spring`/`summer`/`autumn`/`winter`). `chapters.ts`: four chapters of **3 real months**
each. All ten world events key off the *sim* seasons
(`world-events.service.ts:41,50,58,69,79,88,98,107`); seed stocking, tokens, the Almanac, the
Mophane windows and `isSeedInSeason` key off the *chapter* calendar.

**Consequence:** the season the player *feels* (chapter, ~91 days) and the season that moves
weather probabilities and the 0.8–1.1× growth modifier (**28 days**) never align. Weather is
effectively arbitrary and the Setswana year is cosmetic rather than mechanical — which
contradicts doc 24's claim that the Setswana year *is* the moat.

**Fix:** delete the sim season clock. Drive weather probabilities and the growth modifier from
`chapter.rainCoverage` — already the single source, already verified by
`scripts/balance_verify.py` — and re-key the ten world events to the four chapters (§5.4). One
calendar, one authority.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-6 — Automation is specified against a progression axis that was deleted

`docs/01 §18` gates Irrigation (level 7), Auto-Feeder (8), Auto-Collector (9) and Production
Automation (10), with Pula + material costs. **Levels and XP were retired entirely** by D5/C12
(`buildings.ts:13`, `livestock.ts:4–8`, enforced by a static scan). What actually ships is the
Guild subscription's `auto_collector` entitlement (`economy.ts:219–229`) and four `is_automated`
buildings. **The mid-game therefore has no answer for tap repetition at all** — and the automaton
that matters most, the auto-feeder that would prevent G-2, does not exist.

**Fix:** re-gate on the axis that exists. Botho already gates crafting at 100 and Deep Bushveld at
300, so the idiom is established:

| Automaton | Gate | Effect policy (§3.3) |
| --- | --- | --- |
| Auto-Collector | Botho 150 (Guild keeps it earlier as a perk) | buffer N units, overflow to market at live price |
| Auto-Feeder | Botho 300 + Kraal tier | per-kraal daily cap, tops up only below hunger 0.5 |
| Irrigation | Botho 500 + Water Source tier | Even vs Deep rationing policy |

Prefer **Kgotla project unlock** over a shop listing: it routes time-saving through community
standing, which is thematically exact and gives Botho the sink it lacks (§3.4).

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-7 — The Almanac is inert, and it is the biggest missed hook in the game

`almanac.ts:18–21` states it outright: *"Actual activity-gating is a follow-up (the
progress-collection system that would measure these does not exist yet); for now tiers are
claimable in sequence."* A **season-long reward track** for a **3-month chapter** therefore gives
the player nothing to aim at — while all five requirement kinds (`logins`, `quests`, `community`,
`bushveld`, `harvest`) are already emitted as analytics events.

**Fix:** wire the five counters; surface them on the Almanac panel beside the existing
`daysUntilChapterEnd` countdown (`chapters.ts:146`); and show the **Chapter Token balance with its
expiry**. Tokens already expire at chapter end (`chapter.service.ts`) — that honest pressure is
currently invisible until it is too late, and it is the only "clock" in a game with no failure
states.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-8 — Contracts feed Pula but not standing, and one string is corrupt

All six contracts reward `{ currency }` only — no Botho, no tokens, no items
(`contracts.service.ts:42–107`) — even though doc 01 §16 makes reputation the Kgotla axis and
lists `COMMUNITY` as a first-class contract type. And **line 76 is garbled**:

```ts
description: 'Build a grain储备 by delivering 20 units of mixed grain.',
```

That is a stray CJK string in player-facing copy.

**Fix:** correct the string; add `botho` and/or `chapterTokens` to the three community/farming
contracts (`contract_sorghum_10`, `contract_cowpeas_8`, `contract_maize_15`); surface `category`,
which is already modelled and then ignored by the UI.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-9 — Tier-3 land is an 80% cliff

`LAND_LADDER_TOTAL = 37200`; the 12 → 20 rung is **P30,000** — about 80% of the entire ladder in
one step (doc 24 §7 already flags it as "the largest single leap"). It is also the only rung that
jumps the grid by two rows.

**Fix:** insert a 16-plot rung (~P14,000). 4 → 8 → 12 → 16 → 20 gives `PLOT_GRID.cols = 4` rows of
2/3/4/5 instead of a 3 → 5 jump, and gives the mid-game a visible next step to save toward.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

#### G-10 — The real repetition is the feed cycle, not the harvest

Feeding adds **+0.3** hunger capped at 1.0 (`livestock.service.ts:187`); animals start at **0.8**
(`:131`); hunger decays at 0.10–0.15/h. That is a **6–10 hour feed cycle** — 2–4 taps per animal
per day, so **8–16 taps/day for a four-animal kraal**, against a stated 1–10 minute session target.

**Fix, cheapest first:**

1. Once G-2's starvation window and G-3's item cost land, reduce `hungerDecayRate` to a **~24 h
   cycle** (0.035–0.05/h) so **one visit a day is sufficient**. This is the single highest-value
   change for the casual target audience, and it is a one-line config edit per animal.
2. Make feeding a **per-kraal** action: one tap consumes the summed `feedPerDay` for every animal
   in the kraal. No multi-step flow, no drag, no movement.
3. Keep the **12–48 h production cycle** as the actual pacing lever — it is the number a player can
   plan around, and it survives a 24 h absence without harm.

> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 3.3 Automation: remove the tap, keep the decision

The philosophy in doc 01 §18 is right — *automation replaces repetitive physical actions, not
player decision-making*. The implementation is simply absent (G-6). The tuning principle that keeps
an automaton cozy **and** meaningful is to have it **execute a policy the player set**, rather than
erase the action:

- **Irrigation — not "waters everything."** A one-tap *rationing policy*: **Even** (spread the tank
  across all growing plots so everything advances slowly) versus **Deep** (finish the
  nearest-to-ready plot first so something lands today). Both are one tap; they produce different
  farms. During Moriti (`rainCoverage 0.05`) this becomes the season's central decision — and it
  composes with the Heritage Tree's adjacency buff (`buildings.ts:290–315`,
  `waterDemandMultiplier: 0.8`), which already exists and already shares one implementation between
  server and client, so the glow and the saving can never disagree.
- **Auto-Feeder — a per-kraal daily cap,** topping up only below `hunger < 0.5`, stopping when the
  grain runs out and *saying so*. This keeps the animal → crop link alive instead of severing it,
  and it is the mechanic that defuses G-2.
- **Auto-Collector — keep `MVP/05:316` verbatim:** it runs inside the offline-elapsed pass and
  **must never** call the Botho increment, deliver a quest or donate (I4). Add a **buffer** that
  holds N units and overflows to the market at the live price, so it has a decision surface and no
  failure mode.

One gate worth adding: make the **first** automaton a Kgotla reward rather than a purchase. The joy
moment for a cozy player is not *buying* the auto-feeder — it is the morning the game notices they
have been carrying the farm alone.

### 3.4 The four economies: Pula dominates; Botho and Kagiso are keys, not currencies

| Pillar | Earn | Spend | Verdict |
| --- | --- | --- | --- |
| **Capital** (Pula) | crops, animal products, market, contracts, Almanac | seeds, water, land, storage, crafting fees, cosmetics | **Dominant** — every other pillar is priced in it or convertible to it |
| **Community** (Botho) | charges (+10), donations (+1/P), catch-up (25% of cap per missed day, ≤3 days) | **thresholds only**: 100 (Bupi/Borotho), 300 (Deep Bushveld), 500 (Letsema) | **A key, not a currency** — no spend where the *amount* is a choice |
| **Wildcraft** (Kagiso + finds) | regen 1 per 4 h, max 6 | hotspot cost 1–2 | **A gate** — no earn/spend decision beyond waiting |
| **Time** | showing up | — | real calendar + expiring Chapter Tokens: **the strongest structural idea in the game** |

Nothing is *imbalanced*; the failure is **interdependence**. Three tightenings, in order of value:

1. **Botho becomes the price of automation** (G-6). Botho then stops being a gate you pass once and
   becomes a resource you *choose* to spend, and the community economy directly buys **time** —
   which is precisely the thematic claim the game is making.
2. **Kagiso gets a Kgotla use.** A council herb-garden exchange trading Kagiso → Chapter Tokens,
   unlocked only after the Almanac's `bushveld` tier is claimed. Kagiso then routes into the *time*
   economy instead of dead-ending in crafting inputs.
3. **Chapter Token expiry becomes visible** (G-7). Expiry is a beautiful, honest, non-punitive
   pressure — the only clock in a game with no failure states. It deserves to be seen.

The two-way link worth naming: **Time ↔ Botho** already exists (catch-up credits, daily-capped
donations, Letsema's 7-day lock, the Prize's monthly window). It is the most culturally authentic
system in the build, and it should be the loudest.

### 3.5 Weather, seasons and market events

**Weather works, and it is built from two numbers.** Five types on a `WEATHER_CHANGE_INTERVAL` of
6 game hours (6 real hours → 4 changes/day); rain credits the tank at `rainRatePerHour: 2`, storms
at 5; tank capacity 60; sorghum drinks `waterPerHour: 0.04`. So **one rain hour waters ~50
plot-hours of sorghum**, and the chapter's `rainCoverage` (0.8 → 0.5 → 0.05 → 0.15) turns the same
grid into four genuinely different games. Keep the mechanic; re-source it from the chapter (G-5).

**Market events are seeded dead.** `20260902000003_market_dynamic_pricing.sql:95–97` inserts two
events with `ends_at = NOW() - INTERVAL '1 hour'`. Both are in the past, so on a fresh install **no
market event is ever active** and the Market screen's event banner (`MarketScreen.tsx:270`) never
renders.

> **G-11 — Market events never fire, and they are not seasonal.**
> Evidence: `20260902000003_market_dynamic_pricing.sql:95–97` (both rows already ended);
> `market.service.ts:342,381` selects `ends_at > now`.
> **Fix:** replace the two one-shot rows with a **rotating, chapter-scoped pool** driven by a
> rotation job. The events machinery is complete and server-authoritative — only the content is
> stillborn:
>
> | Chapter | Event | Direction |
> | --- | --- | --- |
> | Pula | *"Pula e tlile"* | seed demand ↑, water-hungry produce ↓ |
> | Phane | **Mophane** window (Apr/Dec) | `phane` ↑ — decoupled from the chapter clock, exactly as `chapters.ts:132–143` intends |
> | Moriti | scarcity | water-hungry produce ↑ |
> | Letlhafula | *Letlhafula* festival | grain + food ↑, materials ↓ |
>
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 3.6 The 24-hour offline cap: keep it, and stop hiding what it does

The cap **supports** the cozy philosophy. It is exactly right for the crop cadence (§3.1) and it is
why a 2-day crop costs two visits rather than being wasted. Three honesty fixes are worth more than
any tuning:

1. **G-12 — Say what was discarded.** A player back after five days receives 24 h of progress with
   no accounting. Doc 24's entire thesis is that the numbers do not lie, so show the truth in the
   welcome-back sheet (`FarmScreen.tsx:586–612` already assembles `wbRows` — this is one added row,
   reusing existing plumbing): *"You were away 5 days. The farm rested; 24 hours of growth were
   applied."*
   ```
   Status: OPEN · Owner: — · Impl: — · Verified: —
   ```
2. **Fix the livestock asymmetry** (G-4). The cap is safe for crops *because* crops wait. It is not
   safe for livestock, because livestock does not wait.
3. **G-13 — Note the perverse incentive.** Building wear accrues only within the capped 24 h
   (`simulation.service.ts:372–388`), so a **daily** player accrues more wear than a **weekly** one.
   That is player-hostile in the wrong direction. Either accrue wear lazily per building, or record
   it openly as an accepted quirk.
   ```
   Status: OPEN · Owner: — · Impl: — · Verified: —
   ```

---

## 4. Pixel Art & Visual Improvements

### 4.1 The spec and the assets are two different games

Everything about the declared pixel grid is contradicted by the files on disk:

| Property | `docs/05` says | On disk | Measured |
| --- | --- | --- | --- |
| Base tile | 16×16 | **32×32** | `tiles/ground/plot_empty.png` = 32×32 |
| NPC | 16×24 | **64×64** | `sprites/npcs/mogolo.png` = 64×64 |
| Crop (max) | 16×24 / 16×32 | **32×64** | every `sprites/crops/*/stage_N.png` |
| Animal | 16×16 … 24×24 (large max 48×32) | **64×48** | `sprites/animals/chicken/idle.png` |
| Building | 32×32 … 48×48 | **96×64** | `sprites/buildings/well/lvl1.png` |
| UI icon | 16×16 | **32×32** | `ui/icons/farming_water.png` |
| Kagiso pip | — | **24×24** | `ui/icons/status_kagiso_pip.png` |
| Base resolution | **800×600** (4:3) | backgrounds **512×288** (16:9); sky **400×300** (4:3) | 800/512 = **1.5625×**; 800/480 = **1.667×** |

**The backgrounds cannot integer-scale into any declared frame.** 512×288 → 800×480 is 1.667×, and
→ 800×600 is 1.5625×. Combined with `object-cover` on a full-bleed element
(`BushveldScreen.tsx:32–41`), the one piece of scenery the player looks at most is *always* being
non-integerly resampled. Every Stitch mock in `docs/Screens/` is drawn at **800×480**, which is a
third number again.

> **V-1 — Declare one pixel grid and make the assets obey it.**
> Recommendation: **adopt 32 px as the declared base** — the art is already authored there, and
> 800×480 ÷ 32 = 25 × 15 exactly. Then:
> 1. Rewrite `docs/05 §2` (Pixel Resolution) and `§4` (Tile and Sprite Standards) to 32 px, and
>    delete the 16 px table so it cannot be believed again.
> 2. Re-export backgrounds at **480×270** or **400×240**, so `800×480` is exactly 5/3 or 2×.
> 3. Define the plot cell as **2×2 tiles = 64×64**, which is already `PLOT_GRID.plotSize = 64` in
>    `theme.ts` and currently unused by the render path.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 4.2 Colour: 0% palette adherence, and the cause is measurable

Eleven assets were sampled against the complete `docs/05 §3` palette (primary + secondary +
tertiary + UI, 54 named colours):

```
ui/icons/farming_water.png              in-palette   0.0%
ui/icons/status_ready.png               in-palette   0.0%
ui/icons/market_sell.png                in-palette   0.0%
sprites/crops/sorghum/stage_4.png       in-palette   0.0%
sprites/crops/tomatoes/stage_4.png      in-palette   0.0%
sprites/animals/chicken/idle.png        in-palette   0.0%
tiles/ground/plot_empty.png             in-palette   0.0%
backgrounds/open_bush_stage_0.png       in-palette   0.0%
sprites/npcs/mogolo.png                 in-palette   0.0%
ui/panels/panel_sheet.png               in-palette   0.0%
tiles/sky/farm_day.png                  in-palette   0.0%
```

**Not one opaque pixel in any sampled asset is an approved colour.** And the failure is not
chromatic drift — it is **per-pixel noise**:

| Asset | Colours needed for 80% of opaque pixels | Total colours |
| --- | --- | --- |
| `ui/icons/farming_water.png` (32×32) | **20** | 37 |
| `ui/icons/status_ready.png` | **24** | 57 |
| `sprites/npcs/mogolo.png` | **23** | 50 |
| `tiles/ground/plot_empty.png` | 18 | 46 |
| `sprites/crops/sorghum/stage_4.png` | 11 | 37 |
| `sprites/animals/chicken/idle.png` | 14 | 27 |

Clean pixel art reaches 80% coverage in **3–5** colours. The dominant "colours" in
`farming_water.png` are `#3A1A16` ×61, `#391916` ×53, `#3A1A17` ×40, `#3A1916` ×29 — four values
that differ by ±1 per channel. That is generator noise where there should be one flat fill. The
crop is the same: `#310609` ×201, `#32080A` ×185.

**Good news, and it is real:** there are **zero partial-alpha pixels** in any sampled sprite
(0 of 816 / 1014 / 1246 / 147,456 opaque pixels). **The no-anti-aliasing rule is genuinely
honoured** — the edges are hard. This is a *one-pass* problem, not a redraw.

**The cause is in the pipeline, not the prompt.** `assets/manifest.json` records the generation
prompt per asset, and the `farming_water` prompt already asks for exactly the right thing:

> *"minimal flat color blocks (max 4 colors + outline), crisp pixel art, flat colors, no gradients,
> no anti-aliasing … palette: warm amber #FF8F00, cream #F5E6D3, grass green #5A8F3C, sky blue
> #87CEEB, terracotta #C05C3C."*

The result has 37 colours and 0% palette adherence. `scripts/generate-pixellab-assets.mjs` asks for
the right thing and ships the output unverified — which is the review step `docs/05 §17` (AI Asset
Policy) already mandates and which has evidently never been run.

> **V-2 — Add a quantise + denoise + colour-budget gate to the asset pipeline.**
> In `scripts/generate-pixellab-assets.mjs` (and `scripts/sync-assets.mjs`), before the manifest is
> written:
> 1. **Quantise** to a fixed 64-entry indexed palette derived from `docs/05 §3`, so each category
>    gets one shared ramp and two browns can never disagree.
> 2. **Denoise:** if a pixel's colour is within a small ΔE of a neighbour's *and* appears fewer than
>    N times in the sprite, snap it to that neighbour. This alone removes the ±1 jitter that causes
>    the visible "dirty" look.
> 3. **Fail the build** if an asset exceeds a colour budget (e.g. 24 for a 32×32 icon, 40 for a
>    32×64 sprite). This converts `docs/05 §16`'s acceptance checklist from a document into an
>    enforced gate — the only form in which it survives a solo dev shipping fast.
>
> Scope note: this is a scripts-only change. No asset needs to be re-prompted, and the
> `docs/05 §17` human-review step becomes a script assertion instead of a promise.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 4.3 Non-integer render scaling — a live pixel-grid bug

`CropSprite` renders a **32×64** source into `width={size} height={size}` = **44×44** with
`objectFit: 'contain'` (`FarmScreen.tsx:228–268`, called with `size={44}` at `:714–719`). That is a
**0.6875×** scale under `imageRendering: 'pixelated'` — nearest-neighbour dropping roughly one pixel
in three, so **pixel sizes become uneven within a single sprite**. It reads as mushy at exactly the
moment (a ripe crop) when it should read crispest.

Two further scaling facts from the same pass:

- `object-cover` on full-bleed backgrounds (`BushveldScreen.tsx:34`, and the equivalent on
  `KgotlaScreen`/`MarketScreen`) is a permanent non-integer resample of the scene the player looks
  at most.
- `imageRendering: 'pixelated'` is set in only **2** of the ~14 places that render a PNG
  (`PixelIcon.tsx`, `HeaderNav.tsx`) — so most sprites are not even being *asked* to be
  pixel-perfect. (`CropSprite` sets it; the animal, hotspot and weather sprites do not.)

> **V-3 — Introduce one `<PixelSprite>` component and enforce integer scales.**
> - Render sprites only at **integer multiples** of their source.
> - Never square-crop an off-square sprite: crops should render at `height: 2 × 32 = 64` (or 1×) and
>   be **anchored bottom-centre**, so the plant stays planted as it grows.
> - Centralise `imageRendering: 'pixelated'`, `draggable={false}` and the emoji fallback in one
>   component, and route the five existing PNG render sites through it.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 4.4 Asset utilisation: ~198 of 423 files are unreachable (P0-3)

Every `assets/` reference in `apps/web/src` was resolved recursively — literal paths plus the five
template families and the dynamic `/assets/${restorationAssetKey}`. Counts are exact file counts.

| Folder | Files | Reachable | Unreachable | Notes |
| --- | --- | --- | --- | --- |
| `sprites/crops/{11}/` | 83 | 83 | 0 | `stage_N` (5, watermelon 6) + seed + product |
| `sprites/animals/{4}/` | 16 | 16 | 0 | `idle`/`happy`/`sick`/`product` — **single frames** |
| `sprites/npcs/` | 13 | 13 | 0 | portraits + `_head` variants |
| `ui/items/` | 62 | 62 | 0 | via `pixelIcons.ts` (79 mappings) |
| `backgrounds/` | 12 | 12 | 0 | 3 scenes × 4 stages, via `restorationAssetKey` |
| `ui/` root (`tsholofelo_f1–3`) | 3 | 3 | 0 | |
| `ui/icons/` | 53 | **5** | **48** | exactly **one** call site: `FarmScreen.tsx:65`, driving 5 weather icons |
| `weather/` | 7 | 3 | 4 | `rain_cloud`, `cloud_storm`, `dust_drought` only |
| `tiles/` | 91 | **5** | **86** | `setlhare_sa_boswa` + 4 of 9 `tiles/sky` |
| `sprites/hotspots/` | 13 | **0** | **13** | hotspots render as an **emoji** `🌿` in a 40×40 CSS circle |
| `sprites/scene-props/` | 22 | **0** | **22** | fire pits, council dais, stools, boards… |
| `particles/` | 12 | **0** | **12** | leaves, dust, sparkle, water drop |
| `sprites/buildings/` | 7 | **0** | **7** | keyed to retired ids; buildings render as item icons |
| `ui/panels/` + `ui/buttons/` | 6 | **0** | **6** | |
| `branding/` | 22 | ~6 | ~16 | logos + `welcome_sunrise` used; `font/` atlas + `MolemisiPixel-Small.ttf` unused |
| **Total** | **423** | **~225** | **~198 (47%)** | |

Two structural consequences:

**(a) The farm screen is not a farm.** Plots are `aspect-square bg-wood-dark/80 border-2` cells
(`FarmScreen.tsx:702`) composited over a single 400×300 sky PNG (`:627`). The tilled-soil and ground
autotile art (`plot_empty.png`, `plot_soil.png`, `grass_base|dirt|dry|path|water` + their JSON
atlases) is unused. UX Principle 1 — *"Farm First: the farm/world view is always the primary
visual"* (`docs/03 §1`) — is not met.

**(b) Buildings have no visual state at all.** `BUILDINGS[*].spriteSheet` is never read for
rendering (`FarmScreen.tsx:149` is only a comment; `:206` renders a 32×32 **item icon**). So
`CONSTRUCTION`, `ACTIVE`, `MAINTENANCE` and `DISABLED` — the four states `docs/05 §5` explicitly
requires — have **zero** visual presence, and neither does any upgrade tier. The v1 buildings
borrow icons with no relationship to what they are:

| v1 building | Config `spriteSheet` | What it actually depicts |
| --- | --- | --- |
| `storage` | `ui/items/building_barn.png` | a barn (a retired id) |
| `kraal` | `ui/items/building_paddock.png` | a paddock (a retired id) |
| `water_source` | `ui/items/building_jojo_tank.png` | **the Jojo tank** — a different system's asset (the screen-level water bar) |
| `crafting` | `ui/items/building_mill.png` | a mill (a retired id) |
| `farm_boundary` | `ui/items/building_fence.png` | a fence |
| `setlhare_sa_boswa` | `tiles/decorations/setlhare_sa_boswa.png` | correct ✅ |

And `sprites/buildings/{well,coop,barn,goat_pen,mill,paddock,pig_pen}/lvl1.png` exist, are correctly
described in the manifest (`"size":{"w":96,"h":64}`), and are **never referenced**.

> **V-4 — Put the farm on the ground and give buildings their four states.**
> 1. Render plots using `plot_soil.png` / `plot_empty.png` on the ground autotiles, so the grid reads
>    as Botswana soil instead of dark panels. `grass_dry` is the Moriti look and `grass_water` the
>    Pula look — so **the same grid can read as a different season for free**.
> 2. Render buildings from `sprites/buildings/<v1-id>/lvlN.png`. Rename the legacy folders
>    (`paddock`→`kraal`, `mill`→`crafting`, `well`→`water_source`) and stop pointing `water_source`
>    at the tank icon.
> 3. State overlays, per `docs/05 §5`: `CONSTRUCTION` → scaffolding; `ACTIVE` → base sprite +
>    `particles/smoke_puff.png`; `MAINTENANCE` → wear overlay + `ui/icons/buildings_repair.png`;
>    `DISABLED` → desaturated, darkened, no particles.
> 4. ~~Purge the 8 stray UUID-named PNGs inside the autotile folders (e.g.
>    `tiles/ground/grass_dirt/03de5ae4-….png`) or they will end up in an atlas.~~
>    **CORRECTED 2026-09-30 (2.4) — misdiagnosed; the proposed remedy was wrong.**
>    Those 8 PNGs are **load-bearing**, not stray. Each of the four sets is a complete
>    16-tile Wang set in which `wang_0` (all four corners `lower` — pure ground fill) and
>    `wang_15` (all four `upper` — pure overlay fill) were written to disk under their
>    generation UUID while the other fourteen use numeric ids. Neither uniform tile has a
>    numeric twin, so purging would leave the set un-completable. The defect is the *name*,
>    not the file. Nor can they collide in an atlas: `assets/manifest.json` declares each
>    set **once** as `kind: "tileset"` pointing at the `.json`, and the client loads tiles
>    by direct path. **DONE**: renamed to `0.png` / `15.png`, `file` fields in all four
>    `.json` files updated, `grass_base.png` regenerated as the real 64×64 4×4 sheet (it
>    was a stale 32×32). Script: `scripts/normalize-ground-tiles.mjs` (idempotent).
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

> **V-5 — Render hotspots from `sprites/hotspots/`, not emoji.**
> All 13 files exist and every hotspot already declares its own `sprite` in config
> (`bushveld.ts:176` `'sprites/hotspots/open_bush_deadfall.png'`). `BushveldScreen.tsx:122–136`
> currently draws a 40×40 rounded CSS circle containing `🌿` with `animate-pulse`. Swapping to the
> declared sprite restores the *"visual cue the player taps"* that `HotspotDef.tell` promises, and
> makes `✦`/`🌸` state markers into real particles.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

> **V-6 — Wire the 48 unused UI icons in place of emoji.**
> `ui/icons/` has exactly one call site (`FarmScreen.tsx:65`). Meanwhile the UI uses emoji for
> `🌾 🥚 🤝 🔧 🏗️ 💧 🌳 ✦ 🌸` (`FarmScreen.tsx:589–610,670,741`; `BushveldScreen.tsx:137,140,156`).
> **This is the single biggest cohesion break in the interface** — emoji ignore the palette, ignore
> the 32 px grid, and render differently on every OS. The replacements already exist and are
> purpose-made: `status_ready`, `status_thirsty`, `status_hungry`, `animals_collect`,
> `buildings_repair`, `social_botho`, `social_quest`, `currency_pula`, `currency_token`,
> **`status_kagiso_pip`** (Kagiso is currently drawn as `w-3 h-3 rounded-sm` CSS squares at
> `BushveldScreen.tsx:69–79`).
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 4.5 Specific asset refinements, by payoff ÷ effort

> **V-7 — Growth-stage legibility, without the label.** The per-crop `spriteStages` (5; watermelon 6,
> `crops.ts:61`) honours `docs/05 §6`'s "4–6 stages" — the best compliance in the project. Add one art
> rule to keep it readable: **stage 0 must be a ≤6 px dot and stage N−1 must be ≥2× the width of
> stage 0**, so growth is legible in silhouette before the label is read. Then replace the literal
> word `READY` (`FarmScreen.tsx:734`, `animate-bounce` text) with `ui/icons/status_ready.png` plus
> the unused `particles/sparkle_gold.png` — same information, no text, no clutter.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **V-8 — Use the product sprite as the animal's *state*.** `sprites/animals/<type>/product.png`
> exists for all four animals. Today `animalMood()` returns only `'idle' | 'happy' | 'sick'`
> (`FarmScreen.tsx:288`) and `product.png` is at best a badge. Swap the **whole sprite** when the
> production timer completes. One asset already paid for; the kraal becomes readable from across the
> screen, which is the entire point of an attention system.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **V-9 — Animation: ~14 files unlock "Life over stillness."** Every animal state is a **single
> frame**, so `docs/05 §12`'s 2–4 fps standard is unrealised (only `ui/tsholofelo_f1–3` and
> `scene-props/fire_pit_f1–3` are true frame sets). Add a **2-frame idle loop** (breathe/blink) for
> the 4 animals + Tsholofelo. At 32×24 that is ~14 files, and it converts a diorama into a farm.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **V-10 — Environmental storytelling from the 22 unused props — zero new art.** These are exactly
> the vocabulary for a world that reacts without dialogue. Suggested state bindings:
>
> | Prop (currently unused) | State it should express |
> | --- | --- |
> | `fire_pit_f1–f3` | a Kgotla charge is live / a project is funded / Letlhafula |
> | `market_cart`, `stall_canopy`, `price_board`, `goods_display` | a market event is active (G-11) |
> | `animal_track`, `resource_node`, `wild_berry` | a Bushveld hotspot is ready to collect |
> | `council_dais`, `council_seat`, `elder_chair` | a council member has a new charge (`NpcView`) |
> | `community_circle`, `stone_bench`, `herb_garden` | a project crossed a threshold; Refilwe's standing tier |
> | `quest_board` | ≥1 contract accepted and incomplete |
> | `cave_entrance`, `river_rock`, `bush_camp` | which Bushveld scene is selected |
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

> **V-11 — Season particles, with one cultural correction.** The 12 unused particles map onto the
> four chapters: **Pula** → `water_drop` + `rain_cloud` (weather assets already exist);
> **Phane** → `leaf_green` + `petal_pink`; **Moriti** → `dust_puff` + `smoke_puff`;
> **Letlhafula** → `leaf_autumn` + `sparkle_gold`.
> **Do not use `particles/snowflake.png`.** Botswana has no snow, and a snowflake in a *"Botswana's
> landscape and culture"* art set is exactly the Western default that `docs/05 §1` principle 5
> forbids. Delete it, or repurpose it as seed-fluff in Moriti — grass seed drifting in the dry season
> is a real Botswana image.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

> **V-12 — Finish the one scene with no restoration art.** `deep_bushveld` is the Botho-300 endgame
> scene and the only one with `restorationAssets: []` (`bushveld.ts:114`), so `assetKeyFor` returns
> `''` and the client falls back to the generic `tiles/sky/bushveld_savanna.png`
> (`BushveldScreen.tsx:23–25`). Four backgrounds (`deep_bushveld_stage_0..3.png`) plus a hotspot set
> closes the restoration arc — which doc 24 §2 calls "the long game" — for the players who have
> earned it.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **V-13 — Fix the broken Market fallback.** `MarketScreen.tsx:239` falls back to
> `/assets/backgrounds/market_scene.png`, which **does not exist** (`backgrounds/` contains only the
> 12 Bushveld stage files). Either ship the file or point the fallback at
> `tiles/sky/market.png`, which does exist and is currently unused.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

### 4.6 The Attention System: good doctrine, generic execution

`docs/03 §13` is well-designed — a **priority queue** in which only the highest-priority element
animates and everything else shows a static indicator. It is not what shipped:

- The Farm screen runs **1 pulse + 2 bounce** plus 12 other animations concurrently
  (`FarmScreen.tsx`), so *"only the highest-priority element pulses at once"* is violated on the
  busiest screen. Bushveld, Wallet and Inventory each add their own pulse as well.
- Indicators are **emoji**, not icons (V-6) — the largest single cohesion break in the UI.
- `docs/03 §13` priority 2 is *"Animal hungry (orange pulse)."* Given G-2, that pulse frequently
  leads to a **blocked action**. An indicator that leads nowhere trains players to ignore
  indicators — which would undo the whole system. Fix the mechanic (G-2) and the indicator becomes
  honest.

> **V-14 — One `<Attention>` component, one priority, one pulse.**
> Centralise the priority derivation — `gameState.tsx:949,969` already computes exactly the right
> signal (`a.hunger < 0.3 || a.isSick ? a.id : ''`) for notifications — and let every screen read
> from it. Then only the top-priority element animates, per `docs/03 §13`.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

---

## 5. Story, Lore & Narrative Depth

### 5.1 What is already excellent — protect this, do not rebuild it

The systemic narrative voice is the most distinctive thing in the codebase, and it is cheap to
extend because it is **all data**:

- **`ELDER_RULES`** (`bushveld.ts:941–996`) — nine first-match rules read from **real state**
  (`tankPct`, `weather`, `botho`, `chapter`, `readyPlots`, `thirstyPlots`, `uncollectedCrafts`,
  `contributedToday`), Setswana first and English second. *"The tank is dry. Nothing grows without
  water — fill it and the clock starts again."* / *"They have stopped, not failed."* This is the
  best writing in the game, and it **refuses to scold** — which is the single most important tonal
  decision in a cozy title.
- **`WATER_WHISPERS`** — 6 lines at a 10% roll on watering. *"Every drop carries an old rain. The
  soil knows them all by name."*
- **`TSHOLOFELO_DIALOGUE`** — 13 lines across `idle`/`gift`/`repair`, with an explicit design note
  that there is deliberately **no scold pool**. That decision deserves to be named as doctrine in
  the art bible, not left as a code comment.
- **42 proverbs** + `REACTIVE_PROVERBS` keyed by `PlayerActionKind` — a line can react to *what the
  player just did*, not just to what state they are in.
- **Setswana-first naming throughout** — `Mabele`, `Peo ya Mabele`; categories as `DIPEO / DIJALO /
  DIPHOLOGOLO / DITSHIMOLOGO TSA NAGENG / DITSALO / DIKUNO / DIDIRISIWA`; `Seroto` / `Shedi` / `Ntlo
  ya Polokelo`; and a per-item one-line `use` written for a semi-literate English reader
  (`items.ts:11–12`). This last detail is a genuine accessibility decision disguised as
  localisation.

### 5.2 Where the voice stops — five gaps, each closeable inside an existing system

> **N-1 — Livestock has no voice, and it is the system that needs one most.**
> `ElderSnapshot` (`bushveld.ts:930–939`) has **no animal fields**, so Mogolo — the game's moral
> centre — is silent about the kraal. That is precisely the moment a player in G-2's trap needs
> him. **Add `hungryAnimals` and `sickAnimals` to the snapshot** and two rules above
> `harvest_ready`:
>
> > *sick animal* — **"Ngaka e a batlwa. Merogo e tswa kwa nageng, e bedisiwe. Yo o ka fola."**
> > *"A healer is wanted. Herbs from the field, boiled — this one can still come back."*
> >
> > *hungry kraal* — **"Loso ga lo a fela. Tshimo ya gago e santse e le teng."**
> > *"Nothing is lost yet. Your field is still there."*
>
> Four strings. It converts the game's worst moment into its most characteristic one, and it makes
> the Elder's promise — *"they have stopped, not failed"* — true of animals too.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **N-2 — The NPC cast needs one authoritative, culturally-checked version.**
> `kgotla.service.ts:233–275` defines five NPCs inline (not in `game-config`), and one has a direct
> tonal collision:
>
> | Current | Problem | Suggested |
> | --- | --- | --- |
> | **Thabo** — role "Farmer", personality **"Competitive, ambitious"**, greeting *"Show me what you can grow. I will be watching."* | Competitive framing contradicts **botho** and the cozy mandate outright | Keep the character, drop the rivalry: *"My rows are straighter than yours. Come — I will show you how."* A peer who is generous with knowledge and proud of his own work |
> | **Oupa Kabelo** — *Oupa* is **Afrikaans**, not Setswana | Language authenticity | **Ntate Kabelo** / **Rre Kabelo** |
> | **Two elders**: `elder_neo` (NPC) and `mogolo` (the Elder voice; `mogolo.png` exists) | The cast is split between `game-config` (`dialogue.ts`, `bushveld.ts`) and a hardcoded API array — two sources of truth for who lives in this world | One authoritative cast list, in `game-config`, with one elder |
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **N-3 — Kgotla projects promise community and deliver tokens.**
> The ruling was right (per-farm rewards, AC-04), but only the `reward` string was corrected — the
> **descriptions** still carry the retired fiction (`kgotla.service.ts:286–313`):
>
> | Project | Current description (still live) | Suggested description |
> | --- | --- | --- |
> | `water_reservoir` | *"Build a community water reservoir for all farmers."* | *"Dig your share of the council's borehole. The poles, the cement, the sweat: yours."* |
> | `school` | *"Build a school to educate the next generation."* | *"Carry clay for the school wall. Your grandchildren will not know your hands were in it."* |
> | `market_square` | *"Expand the market for better prices."* | *"Raise the shade where Mama Naledi's stall will stand. She will remember who built it."* |
>
> Then let **Mogolo's completion line** carry the civic feeling — e.g. on the reservoir: *"Metsi a
> teng. The water is there. Your name was read at the Kgotla."* This is the fix that makes the Kgotla
> feel like a community **without promising a shared simulation you do not run.**
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **N-4 — Projects and charges need an arc, not a list.**
> The Kgotla currently offers three static projects (100/200/150 contributions) and five rotating
> charges with **no order and no memory**. Give each chapter **one** project and sequence them so the
> year tells a story — the existing projects already map onto this; only `requiredContributions` and
> chapter visibility need to change:
>
> | Chapter | Project | Narrative job |
> | --- | --- | --- |
> | Pula | **Water Reservoir** (first spadeful) | rain is here; **begin** |
> | Phane | **the Mophane festival** | share the first rain's food; the Botho moment |
> | Moriti | **the water store** | the dry season is the test; storage and restraint |
> | Letlhafula | **the school** | leave something behind |
>
> And let the project **remember who contributed**: `NpcView` already tracks per-NPC standing with
> lazy decay (`kgotla.service.ts:335–380`), so a returning player being recognised by name is a
> presentation change, not a new system.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **N-5 — The four-chapter year has mechanics but no narrator.**
> `chapters.ts` gives each chapter a `character` line and a `tokenName`; `daysUntilChapterEnd` drives
> a countdown; the Almanac panel exists as a surface. But **nothing marks the boundary**. Add a
> **chapter beat** — one Mogolo line plus one art swap at each transition (`tiles/sky/` already ships
> `farm_day`, `farm_sunset`, `farm_night`) — rendered in the Almanac panel, which already exists and
> already counts down.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

### 5.3 The four-chapter arc, as the mechanics already teach it

The recommendation is not to invent a plot. It is to **name the lesson each chapter's numbers already
deliver**, and let Mogolo say it once at the boundary (N-5):

| Chapter | Months | `rainCoverage` | Seeds | Lesson the mechanics already teach |
| --- | --- | --- | --- | --- |
| **Pula** — *Sekala sa Pula* | Nov–Jan | **0.8** | sorghum, maize, tomatoes, cowpeas, groundnuts, millet | *Water you did not pay for.* The lesson is **capital**: plant thirsty; the tank fills itself. The 4→8 land rung plausibly lands here |
| **Phane** — *Sekala sa Phane* | Feb–Apr | **0.5** | maize, watermelon, tomatoes, groundnuts, sesame, pepper | *The April window.* The lesson is **timing and generosity** — the Mophane festival is a Botho moment, not a market one |
| **Moriti** — *Sekala sa Moriti* | May–Jul | **0.05** | sorghum, millet, cowpeas, sesame, herbs, morula | *"Water is the whole game."* The lesson is **storage and restraint** — where the Jojo upgrade and the Heritage Tree's 0.8× adjacency buff land, and where the already-written `drought` Elder rule gets its season |
| **Letlhafula** — *Sekala sa Letlhafula* | Aug–Oct | **0.15** | millet, sorghum, watermelon, pepper, herbs, morula | *Harvest, wind, preparation.* The lesson is **selling, and leaving something behind** — the Prize and the Heritage Tree belong here |

This is also the answer to the "did the calendar land?" question in `MVP/07 §10` (open question 3):
the calendar cannot make players rotate if the *reason* to rotate is never voiced. Six stocked seeds
per chapter is a **constraint**; the chapter beat is what makes it a **choice**.

**Bonus — Mophane is the strongest untold story in the game.** `isMophaneSeason` is a **2-month
real-calendar** window, `MOPHANE_MONTHS = [4, 12]` deliberately straddles chapters 2 and 1
(`chapters.ts:132–143` calls that mismatch *"a feature, not a bug"*), the `phane` item exists, and
the hotspot swap exists. All it lacks is voice and a visual. Three cheap additions, all inside
existing systems:

> **N-6 — Give Mophane a voice and a visual.**
> 1. A `MOPHANE_LINES` pool in `dialogue.ts` using the **exact shape of `WATER_WHISPERS`** — 3–4
>    lines from Mogolo or Refilwe about the worms, the first rain, and the grandmother who taught
>    them.
> 2. A prop swap in the Bushveld (`scene-props/fire_pit_f1.png`, plus the existing phane node).
> 3. A **Field Journal page that only exists in those two months** — the Journal already has a finds
>    ledger and a restoration panel (`JournalScreen.tsx:197–202`), so this is a content drop, not a
>    new system.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

### 5.4 Cultural-authenticity corrections (each verified in the repo)

> **N-7 — Re-key the world events to the Setswana year and remove two Western seasonals.**
> `world-events.service.ts` keys all ten events to `spring`/`summer`/`autumn`/`winter`, and includes:
>
> - **`winter_solstice`** — *"The shortest day brings special blessings."* A solstice festival is not
>   a Setswana seasonal marker.
> - **`frost_warning`** — *"Cold snap! Protect your crops from frost damage."* Botswana's winter is
>   **dry**; frost is a marginal, regional event, and the game has already ruled out punitive crop
>   loss.
> - Plus the `particles/snowflake.png` asset (§4.5 V-11) reinforcing the same wrong image.
>
> The same file still computes **`xpModifier`** and **`energyModifier`** (`:13,61,80,99,237–262`) for
> two systems `D5/C12` retired, and includes a `traveling_merchant`. Replace the four-season framing
> with the four chapters (G-5) and the two named seasonals with **Mophane** (Apr/Dec) and
> **Letlhafula**. A *"travelling merchant"* is a defensible market archetype, but if it is kept it
> should arrive with a name and a route (Kanye → Serowe → your farm), not a generic label.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

> **N-8 — Reconcile the asset catalogue with the item catalogue.**
> Three classes of orphan were found, all of which imply content that does not exist:
>
> | Asset | Status | Recommendation |
> | --- | --- | --- |
> | `ui/items/building_borehole.png` | no `BUILDINGS` entry | **Promote to a real building.** A borehole is exactly right for Botswana and gives Moriti/Letlhafula a water tier above the Jojo tank |
> | `ui/items/building_greenhouse.png` | no `BUILDINGS` entry | **Retire.** A greenhouse is not Botswana |
> | `sprites/crops/saffron/*`, `ui/items/*saffron*` (7 files) | `saffron` was correctly replaced by `morula` in `crops.ts:259` | Delete, or keep only as a documented archive |
> | `ui/items/product_wool.png`, `material_marula.png`, `material_salt.png` | no `ITEMS` entry | Either give them a harness (wool ⇒ sheep, a fifth animal) or delete |
> | `ui/items/building_{well,coop,barn,goat_pen,pig_pen,mill,paddock}.png` | legacy ids (D8) | Rename to v1 ids (V-4) |
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

> **N-9 — Review the four animals for cultural fit.**
> `chicken`, `goat`, `cow`, `pig` — where **pig** is the weakest choice for a Botswana setting and its
> product is a **truffle**, a European foraging trope (`livestock.ts:89–104`). A swap costs one animal
> config, one sprite folder, and one product item. The two authentic candidates:
> **donkey** (a real Botswana working animal, and it introduces a "help with hauling" verb the game
> does not yet have) or **guinea fowl** (*kgaka*, widespread, and it reuses the chicken rig almost
> exactly). This is a genuine authenticity decision and belongs in §9.
> `Status: OPEN · Owner: — · Impl: — · Verified: —`

### 5.5 The one narrative addition I would make, rather than refine

The **Market screen has no narrative voice at all**: no lore, no NPC line, zero animations
(`MarketScreen.tsx` is the only one of the ten screens with none). That is a missed symmetry — the
tank whispers, the Elder notices, and the economy, which is what players think about most, says
nothing.

> **N-10 — Add `MARKET_WHISPERS`, selected exactly like `WATER_WHISPERS`, keyed on price condition
> rather than a timer.** One pool in `dialogue.ts`, in **Mama Naledi's** voice, one function, one line
> of UI:
>
> | Condition | Line |
> | --- | --- |
> | price ≥ 1.5× base | *"The town has forgotten how to grow this. Ask for what it is worth today."* |
> | price ≤ 0.6× base | *"Everyone planted the same thing. Everyone is selling the same thing. Keep some back."* |
> | a market event is active | *"Did you hear? They are paying well for grain this week."* |
> | first sale of the day | *"A good morning. The scale is honest."* |
> | no stock / nothing sellable | *"Come back with something in your hands, and we will talk."* |
>
> This is the clearest statement of the pattern to follow everywhere else: **lore should emerge from
> state, never from exposition.** It also gives the Market the same "the world notices you" feeling
> the water already has — and it is the cheapest narrative win in this document.
> ```
> Status: OPEN · Owner: — · Impl: — · Verified: —
> ```

---

## 6. Implementation Plan

**Implement from here, not from §3–§5.** Same findings, re-cut into four passes, each independently
shippable, each with its quality gate. Pass 1 first — it contains the only two defects that can
destroy a player's game.

Every pass ends with the project's existing gates:

```
npx tsc --noEmit -p apps/api          # must be 0
npx tsc --noEmit -p apps/web          # must be 0
npx jest                              # apps/api — 18 suites / 209 tests (2026-09-28 reading)
                                     # 2026-10-02: workspace total is 37 suites / 615 tests
python scripts/balance_verify.py      # must PASS
npx eslint <touched files>            # no new issues
```

### Pass 1 — Stop the bleeding (mechanical)

**Goal:** no player can lose their kraal, and no visible number lies. Roughly 200 lines across six
files. **No new art, no new screens, no schema change beyond one timestamp column.**

| # | Task | Files | Acceptance criteria |
| --- | --- | --- | --- |
| **1.1** | Recovery path: `POST /farms/:farmId/livestock/:id/treat`. Consumes `herbs` via `InventoryService`; sets `is_sick = false, health = 0.6`. Ownership-checked like `feedAnimal`. | `apps/api/src/livestock/livestock.{service,controller}.ts` | An animal at `health 0.1, is_sick true` becomes feedable and producing again after treatment. Test covers the whole arc: fed → 12 h offline → sick → treated → fed → producing |
| **1.2** | `feedAnimal` **clamps instead of throwing** when sick: `+0.15` hunger, no production, response carries `sick: true`. Still `400` only for ownership and `hunger >= 1.0`. | `livestock.service.ts:178–187` | Feeding a sick animal returns 200 with a reduced gain, never a 400 |
| **1.3** | Charge feed: debit `{slug: config.feedType, qty: config.feedPerDay}` in the same transaction as the hunger update; a full store fails the whole feed (G1/G4 pattern). | `livestock.service.ts:156–199` | `feedPerDay` has ≥1 non-test reader. Feeding with 0 sorghum returns a clear 4xx and does **not** change hunger |
| **1.4** | Starvation window: health decays only after **N consecutive hours at `hunger === 0`** (recommend N = 12), persisted as `hunger_zero_since` on `livestock` so it survives simulation passes. | `simulation.service.ts:306–310`; one migration | A 12 h absence from `hunger 1.0` leaves `health ≥ 0.5`; a 36 h absence still sickens |
| **1.5** | Apply self-sustaining to **livestock only**, from **uncapped** elapsed time (G-4); fix the constant's semantics. | `simulation.service.ts:96–101, 296–297` | A 4-day absence yields `selfSustaining === true`; the constant is no longer dead code |
| **1.6** | `hungerDecayRate` → a ~24 h feed cycle (0.035–0.05/h) on all four animals (G-10.1). Re-run `scripts/livestock_probe.py`. | `packages/game-config/src/livestock.ts` | One visit per real day keeps a fed animal above `hunger 0.5` and still producing |
| **1.7** | Per-kraal feeding: one action feeds every animal in the kraal, consuming the summed feed. Keep per-animal feeding as the fallback. | `livestock.service.ts`; `FarmScreen.tsx` | A 4-chicken kraal costs 8 sorghum and one tap |
| **1.8** | Fix the corrupt contract string; add `botho`/`chapterTokens` to the three community contracts (G-8). | `contracts.service.ts:42–107` | No non-Latin characters in player-facing copy (add a `grep` gate) |
| **1.9** | Correct the time-base comment in `docs/09 §2:46` (G-1). | `docs/09_Game_Simulation_Specification.md` | The doc states 1 real hour = 1 game hour |
| **1.10** | Add `hungryAnimals` / `sickAnimals` to `ElderSnapshot` plus the two rules from N-1. | `bushveld.ts:930–996` + the snapshot builder | A farm with a sick animal gets the `sick_animal` Elder line, not `default` |

**Pass 1 gate:** all gates above green, plus one new integration test that simulates **the worst
case a casual player can produce** — *fed at 20:00, return at 20:00 the next day, four animals* —
and asserts every animal is alive, feedable and producing.

### Pass 2 — Make the farm visible (art pipeline + render)

**Goal:** the Farm screen looks like the game in the pitch, using art that already exists. **This
pass adds no new assets except the ~14 animation frames in 2.10.**

| # | Task | Files | Acceptance criteria |
| --- | --- | --- | --- |
| **2.1** | Pipeline quantise + denoise + colour-budget gate (V-2). Build the 64-entry indexed palette from `docs/05 §3` as a data file. | `scripts/generate-pixellab-assets.mjs`, `scripts/sync-assets.mjs`, new `scripts/palette.mjs` | Every asset in `ui/` + `sprites/` reports **≥90% in-palette**; the build **fails** on a budget breach. Report before/after figures in the commit message |
| **2.2** | `<PixelSprite>` component: integer-only scale, aspect preserved, bottom-centre anchor for crops, centralised `imageRendering: pixelated` + emoji fallback (V-3) | new `apps/web/src/components/PixelSprite.tsx` | No render site passes a non-integer scale; crops render at 1× or 2× with a stable baseline |
| **2.3** | Re-export backgrounds at an integer-friendly size; update `docs/05 §2/§4` to a **32 px base** (V-1) | `assets/backgrounds/*`, `docs/05_Art_Direction_and_Asset_Specification.md` | `800 × 480 ÷ background width` is an integer; the doc's tile table matches the files on disk |
| **2.4** | Farm ground + plot tiles; the ground follows the chapter (V-4.1) | `FarmScreen.tsx` | `plot_empty.png`, `plot_soil.png` and the ground autotiles each gain ≥1 non-test render path; `grass_dry` in Moriti, `grass_water` in Pula |
| **2.5** | Buildings render as sprites in four states; rename the legacy folders (V-4.2, V-4.3) | `FarmScreen.tsx`, `assets/sprites/buildings/*`, `buildings.ts` | `BUILDINGS[*].spriteSheet` resolves to an existing file; CONSTRUCTION / ACTIVE / MAINTENANCE / DISABLED are visually distinct |
| **2.6** | Hotspots render from `sprites/hotspots/` (V-5) | `BushveldScreen.tsx:119–148` | Zero emoji in the hotspot layer; the sprite comes from `HotspotDef.sprite` |
| **2.7** | Emoji → `ui/icons/`, and Kagiso pips from `status_kagiso_pip.png` (V-6) | `FarmScreen.tsx`, `BushveldScreen.tsx`, `InventoryScreen.tsx` | A grep for the nine player-facing emoji returns **0** hits in `components/screens/` |
| **2.8** | One `<Attention>` component with a single priority (V-14) | new component + all ten screens | At most one pulsing element per screen at any moment |
| **2.9** | Chapter particles; delete `snowflake.png`; fix the Market fallback (V-11, V-13) | `FarmScreen`, `BushveldScreen`, `MarketScreen:239` | `snowflake.png` is gone; **zero 404s** in the console across all ten screens |
| **2.10** | 2-frame animal idle loops (~14 files) (V-9) | `assets/sprites/animals/*` | Each animal has ≥2 frames per state and animates at 2–4 fps |

**Pass 2 gate:** a screenshot pass over all ten screens at **800×480** with zero 404s, zero emoji in
the scene layer, and no non-integer sprite scale. Attach the before/after shots.

### Pass 3 — Make the year felt (systems that already exist)

**Goal:** one calendar, a reward track that rewards, and standing that buys time. No new subsystems —
every task wires something already built.

| # | Task | Files | Acceptance criteria |
| --- | --- | --- | --- |
| **3.1** | Delete the sim season clock; source weather probabilities + the growth modifier from `chapter.rainCoverage` (G-5) | `weather.ts`, `simulation.service.ts:108–153`, `chapters.ts` | Exactly one season concept remains in `game-config`; Moriti produces measurably fewer rain hours than Pula over a fixed seed |
| **3.2** | Re-key the ten world events to the four chapters; drop `winter_solstice` + `frost_warning`; strip `xpModifier`/`energyModifier` (N-7) | `world-events.service.ts:40–130, 237–262` | No `xp`/`energy` field anywhere in the events service; every event names a chapter |
| **3.3** | Rotating chapter-scoped market event pool + a rotation job (G-11) | new migration; `market.service.ts`; admin tooling | A fresh install has an **active** market event; the Market banner renders within one rotation cycle |
| **3.4** | Wire the five Almanac requirement counters; surface progress + Chapter Token balance + expiry on the panel (G-7) | `chapter.service.ts`, `almanac.ts`, the Almanac UI | Each of the five tiers shows real progress; tokens show a days-to-expiry countdown |
| **3.5** | Botho-gated automation via Kgotla project unlock: Auto-Collector 150 → Auto-Feeder 300 → Irrigation 500 (G-6) | `buildings.ts`, `economy.ts`, `kgotla.service.ts`, `simulation.service.ts` | Each automaton has a server-enforced gate and an effect; the auto-feeder demonstrably prevents the 1.4 starvation case |
| **3.6** | Contracts award Botho/tokens; surface `category` (G-8) | `contracts.service.ts`, `KgotlaScreen.tsx`/`JournalScreen.tsx` | At least two contracts pay Botho; a test asserts `contractsCompleted` increments the Almanac `quests` counter |
| **3.7** | Insert a 16-plot land rung (~P14,000) (G-9) | `economy.ts` `LAND_LADDER` | Ladder is 4 → 8 → 12 → 16 → 20; `balance_verify.py` still PASSes |
| **3.8** | Welcome-back line for discarded time (G-12) | `FarmScreen.tsx:586–612`, `simulation.service.ts` | The sheet states how long the player was away and how much time was applied |
| **3.9** | Build wear accrues lazily per building, not per capped window (G-13) | `simulation.service.ts:372–388` | A daily player and a weekly player accrue equal wear for equal elapsed wall-clock time |

**Pass 3 gate:** `balance_verify.py` PASS; the Almanac shows real progress on a live account; a
season-boundary test asserts one calendar only.

### Pass 4 — Voice (strings and data only)

**Goal:** the narrative layer extends into the systems that currently have no voice. **No new
mechanics; almost no new code.**

| # | Task | Files | Acceptance criteria |
| --- | --- | --- | --- |
| **4.1** | `MOPHANE_LINES` pool, shaped exactly like `WATER_WHISPERS` (N-6.1) | `dialogue.ts` + its consumer | Lines appear only in months 4 and 12; a test asserts a false negative outside the window |
| **4.2** | `MARKET_WHISPERS` pool keyed on price condition, in Mama Naledi's voice (N-10) | `dialogue.ts`, `MarketScreen.tsx` | Each of the five conditions has a line; the Market screen has ≥1 narrative element |
| **4.3** | Chapter beat: one Mogolo line + one sky swap at each boundary (N-5) | `dialogue.ts`, Almanac panel, `tiles/sky/*` | Crossing a chapter boundary shows a beat once, not on every load |
| **4.4** | Rewrite the three project descriptions; add Mogolo completion lines (N-3) | `kgotla.service.ts:286–313` | No project description promises an effect on another player's farm |
| **4.5** | Thabo rewrite, `Oupa Kabelo` → `Ntate Kabelo`, consolidate the elder (N-2) | `kgotla.service.ts:233–275` (+ move to `game-config`) | One elder in the cast; no Afrikaans-derived personal names; no competitive framing |
| **4.6** | Chapter-scoped project sequencing (N-4) | `kgotla.service.ts` `PROJECTS` | Each chapter surfaces exactly one project |
| **4.7** | Environmental storytelling from the 22 scene props (V-10) | `FarmScreen`, `KgotlaScreen`, `MarketScreen`, `BushveldScreen` | Every prop in the V-10 table has ≥1 state binding or is formally retired |
| **4.8** | Deep Bushveld restoration art + hotspot set (V-12) | `assets/backgrounds/`, `bushveld.ts:108–116` | `deep_bushveld.restorationAssets` has 4 entries and all resolve |
| **4.9** | Growth-stage silhouette rule + `READY` → icon + sparkle (V-7) | `assets/sprites/crops/*`, `FarmScreen.tsx:734` | No literal `READY` text; stage 0 ≤6 px, final stage ≥2× stage 0 |
| **4.10** | Product sprite as the animal's state (V-8) | `FarmScreen.tsx:288`, animal sprite sets | `animalMood()` (or its successor) can return a `product` state that swaps the whole sprite |

**Pass 4 gate:** the screen-by-screen voice check — **every one of the ten screens has at least one
piece of narrative voice** that is state-reactive rather than static.

---

## 7. Verification of this review

This document is a ledger; it is *done* when every `Status:` line reads `DONE`. Progress is measured
by six counts, all mechanically checkable:

| Measure | Before | Target |
| --- | --- | --- |
| Unreachable asset files | **~198 / 423 (47%)** | **< 20** (only a genuine archive) |
| Sampled assets ≥90% in-palette | **0 / 11** | **11 / 11** |
| Constants declared but never read | **3** | **0** |
| Screens with zero narrative voice | **1** (Market) | **0** |
| Calendars in `game-config` | **2** | **1** |
| Reachable player-bricking states | **1** (G-2) | **0** |

Suggested automated gates worth adding to CI (each is a few lines and pays for itself):

1. **Asset reachability** — fail the build when `assets/**` grows without a matching reference
   (Appendix C script 1).
2. **Palette budget** — fail on a colour-budget breach (Pass 2.1).
3. **Dead-constant scan** — fail when an exported `game-config` constant has no non-test importer.
4. **Copy scan** — fail on non-Latin characters in player-facing strings (`contracts.service.ts:76`
   would have been caught).
5. **Emoji scan in the scene layer** — fail on emoji inside `components/screens/` outside a
   fallback branch.

## 8. Deliberate non-goals

Recorded so a future pass does not mistake restraint for an oversight. **None of the following should
be added**, and every recommendation above was written to avoid them:

- **Character movement or a walkable avatar.** Every finding works through the existing screens,
  config tables and assets. Point-and-click is a stated constraint, not a limitation to repair.
- **Drag-and-drop.** Per-kraal feeding (1.7) and one-tap rationing (3.3) are deliberately single taps.
- **Punitive decay.** No crop withering, no animal death, no "game over." G-2 is a *bug* precisely
  because it violates this.
- **XP, levels or skill trees.** `docs/01 §6` still describes them; the build correctly retired them
  (D5/C12). Fix the *spec*; do not restore the system.
- **Shared-economy rewards or PvP framing.** N-3 exists to remove the last trace of them.
- **Weather that can destroy a crop.** `docs/03 §1.2` is right — an empty tank halts growth and never
  kills. Extend that rule to animals (G-2); do not weaken it.
- **Adding content to fix a presentation problem.** Pass 2 is deliberately almost asset-free: the
  largest visual gain available is wiring art that has already been paid for.

## 9. Open questions requiring a ruling

Judgement calls, not defects. Each blocks or shapes exactly one task.

| # | Question | Blocks | Recommendation |
| --- | --- | --- | --- |
| **Q1** | Pig, or donkey, or guinea fowl? (§5.4 N-9) | 4.10 / a future animal task | **Guinea fowl** (*kgaka*) — most authentic fit, cheapest art reuse |
| **Q2** | Is 32 px the new base, or do the assets get downsampled to 16 px? (§4.1 V-1) | all of Pass 2 | **32 px.** The art is authored there and 800×480 ÷ 32 is exact |
| **Q3** | Automation: Kgotla unlock, Botho purchase, or both? (§3.3 G-6) | 3.5 | **Kgotla unlock.** It gives Botho a sink and routes time-saving through community — the thematic claim itself |
| **Q4** | Raise the 24 h cap for livestock, or let the starvation window carry it? (§3.6 G-4) | 1.4 / 1.5 | **Starvation window + uncapped self-sustaining.** Leave `MAX_OFFLINE_HOURS` at 24; it is load-bearing for crops |
| **Q5** | Do contracts pay Botho, Chapter Tokens, or both? (§3.2 G-8) | 3.6 | **Both** — Botho feeds standing, tokens feed the Almanac counters. Different systems |
| **Q6** | Is `saffron` archived or deleted? (§5.4 N-8) | 2.5 housekeeping | **Archive** under `assets/_archive/` — one commit, and the history survives |
| **Q7** | Lock the Almanac's provisional tuning now, or once the counters land? (`almanac.ts` already flags this) | 3.4 | **Once the counters land**, so requirements are measurable before payouts are fixed |

---

## Appendix A — Measured asset audit

**Method:** every file under `assets/` was opened with `System.Drawing`; dimensions, unique-colour
count, the number of colours required to cover 80% of opaque pixels, and the partial-alpha pixel
count were recorded. Reachability was determined by recursively resolving every `assets/` reference
in `apps/web/src`.

### A.1 Dimensions (spec vs. disk)

| Asset | Disk size | `docs/05` spec | Ratio |
| --- | --- | --- | --- |
| `tiles/ground/plot_empty.png` | 32×32 | 16×16 | 2× |
| `tiles/ground/plot_soil.png` | 32×32 | 16×16 | 2× |
| `ui/icons/farming_water.png` | 32×32 | 16×16 | 2× |
| `ui/icons/status_kagiso_pip.png` | 24×24 | — | — |
| `ui/items/product_sorghum.png` | 32×32 | 16×16 | 2× |
| `sprites/crops/sorghum/stage_0.png` | 32×64 | 16×24 / 16×32 | 2× |
| `sprites/crops/watermelon/stage_5.png` | 32×64 | 16×32 | 2× |
| `sprites/animals/chicken/idle.png` | 64×48 | 16×16 → 48×32 max | ≥2× |
| `sprites/animals/chicken/product.png` | 32×32 | — | — |
| `sprites/npcs/mogolo.png` | 64×64 | 16×24 / 16×32 | ≥2× |
| `tiles/decorations/setlhare_sa_boswa.png` | 96×128 | 32×32 … 48×48 | ≥2× |
| `tiles/sky/farm_day.png` | 400×300 | 800×600 logical | 0.5× |
| `backgrounds/open_bush_stage_0.png` | 512×288 | 800×600 logical | 0.64× |
| `ui/panels/panel_sheet.png` | 384×512 | — | — |

### A.2 Colour integrity (the noise measurement)

| Asset | Unique colours | Colours for 80% coverage | Partial-alpha px | Verdict |
| --- | --- | --- | --- | --- |
| `ui/icons/farming_water.png` | 37 | **20** | 0 | noisy |
| `ui/icons/status_ready.png` | 57 | **24** | 0 | noisy |
| `sprites/npcs/mogolo.png` | 50 | **23** | 0 | noisy |
| `tiles/ground/plot_empty.png` | 46 | 18 | 0 | noisy |
| `ui/items/seed_sorghum.png` | 55 | 24 | 0 | noisy |
| `backgrounds/open_bush_stage_0.png` | 44 | 22 | 0 | noisy |
| `sprites/crops/sorghum/stage_4.png` | 37 | 11 | 0 | borderline |
| `sprites/animals/chicken/idle.png` | 27 | 14 | 0 | borderline |
| **Target for clean pixel art** | 4–16 | **3–5** | **0** | — |

**In-palette adherence** against the full 54-colour `docs/05 §3` palette: **0.0%** on all eleven
sampled assets (§4.2 lists them).

**Anti-aliasing: compliant.** Zero partial-alpha pixels anywhere, including a 147,456-pixel
background. The hard-edge rule is honoured; only the colour discipline is missing.

### A.3 Dominant colours (the jitter, shown directly)

```
ui/icons/farming_water.png      #3A1A16 ×61   #391916 ×53   #3A1A17 ×40   #3A1916 ×29
sprites/crops/sorghum/stage_4   #310609 ×201  #32080A ×185  #72230A ×143
```

Four values separated by ±1 per channel, occupying the top slots of a 32×32 icon, is generator
noise — not a shading ramp. This is the single clearest justification for the V-2 post-process.

### A.4 Category totals

| Folder | Files |
| --- | --- |
| `assets/backgrounds` | 12 |
| `assets/branding` (incl. `font/`, `media/`) | 22 |
| `assets/particles` | 12 |
| `assets/sprites` | 154 |
| `assets/tiles` | 91 |
| `assets/ui` | 124 |
| `assets/weather` | 7 |
| `assets/manifest.json` | 1 |
| **Total** | **423** |

---

## Appendix B — Verified fact sheet

Numbers that took work to establish and are worth not re-deriving. Every row was read from the code
or measured; **none is an estimate.**

### B.1 Simulation and time

| Fact | Value | Source |
| --- | --- | --- |
| Time base | **1 real hour = 1 game hour** | `simulation.service.ts:98`; `water.service.ts:73` |
| Offline cap | **24** game hours ("hours") | `game-config/src/index.ts:26`; clamped at `simulation.service.ts:101`, `water.service.ts:73` |
| Self-sustaining threshold | 72 h — **unreachable** (G-4) | `index.ts:27`; `simulation.service.ts:296–297` |
| Weather change interval | 6 game hours = 6 real hours (4/day) | `weather.ts:85` |
| Sim season length | 4 weeks × 7 d × 24 h = **672 h = 28 real days** (G-5) | `weather.ts:88–91` |
| Chapter length | **3 real months** (real calendar) | `chapters.ts:39–84` |
| Tank capacity / water price | 60 units / **P1.00 per unit** | `economy.ts:32–48` |
| Rain / storm credit | 2 / 5 units per hour | `economy.ts:46–47` |
| Kagiso | max 6; +1 per 240 min (6/day, full in 24 h); hotspot rest 60 min | `bushveld.ts:21–33` |

### B.2 Crops

| Fact | Value | Source |
| --- | --- | --- |
| Crops | 11, all unlocked from the start (D6) | `crops.ts:19–30, 335–337` |
| Growth | 18/24 h (1-day) or 40/48 h (2-day); **never 24 < h < 40** | `crops.ts:47–50` |
| Net per plot per day | P12.25 (sorghum) → P40.63 (morula) — a **3.3× spread** | `crops.ts:12–13`, `netPerPlotPerDay` |
| Sprite stages | 5 per crop; watermelon 6 | `crops.ts:61` |
| Water demand | 0.04 … higher per hour; `thirst` 1–3 | `crops.ts:51–53` |
| Co-op tax | 5% on every sale | `economy.ts:13` |
| Price band | raw 0.5–2.0×; crafted 0.9–1.1× | `economy.ts:15,23` |
| Price cycle | every 6 hours | `economy.ts:17` |

### B.3 Livestock (the broken leg)

| Fact | Value | Source |
| --- | --- | --- |
| Animals | chicken P50, goat P150, cow P400, pig P300 | `livestock.ts:40–105` |
| Production cycles | chicken 12 h (2 eggs), goat 24 h, cow 24 h (3 milk), pig 48 h | `livestock.ts:47,63,79,95` |
| Start state | hunger **0.8**, health 1.0, happiness 0.7 | `livestock.service.ts:131–133` |
| Feed gain | **+0.3** hunger, cap 1.0; **no cost charged** (G-3) | `livestock.service.ts:187` |
| Hunger decay | 0.10–0.15/h → a **6–10 h** feed cycle (G-10) | `livestock.ts:51,67,83,99` |
| Health decay | only while `hunger < 0.2`, at 0.06–0.10/h × full elapsed | `simulation.service.ts:307–309` |
| Sickness | `is_sick = health < 0.3`; **feeding then throws**; no heal path (G-2) | `simulation.service.ts:336`; `livestock.service.ts:182–184` |
| Production gate | `hunger > 0.5 && health > 0.5` | `simulation.service.ts:322` |
| Manure | +1 per collect, every animal | `livestock.ts:118` |

### B.4 Progression, land, storage

| Fact | Value | Source |
| --- | --- | --- |
| Starting Pula / Botho / Kagiso | P250 / 0 / 6 | `economy.ts:290–294` |
| Land ladder | 4 → 8 → 12 → **20**, total P37,200 (12→20 = P30,000) (G-9) | `economy.ts:97–105` |
| Storage tiers | 24 / 48 / 96 slots; Guild ×1.5 | `economy.ts:65–71` |
| Crafting slots | 1 → 3 (Workshop upgrades C22) | `buildings.ts:256–258` |
| Craft timers | 2–6 hours (F14 — never minutes) | `crafting.ts:52–110` |
| Batch fees | ×1 / ×2.5 / ×4 for 1 / 3 / 6 | `crafting.ts:120–126` |
| Bonus yield | 12% chance of a bonus unit — **variance, never failure** | `crafting.ts:135` |
| Botho gates | Bupi/Borotho 100; Deep Bushveld 300; Letsema 500; Prize 1,000 eligibility | `crafting.ts:100`; `bushveld.ts:112`; `MVP/05:212–213` |
| Botho catch-up | 25% of the daily cap × missed days, **max 3 days**, via `creditBothoCapped` | `farms.service.ts:107`; doc 24 §5 |
| Maintenance interval | 90 days; costs kraal 2 thapo, boundary 3 poleto, water 2 setena | `economy.ts:284–287` |

### B.5 Presentation

| Fact | Value | Source |
| --- | --- | --- |
| Screens | 10 (`Farm`, `Market`, `Crafting`, `Bushveld`, `Kgotla`, `Journal`, `Wallet`, `Store`, `Settings`, `Inventory`) | `apps/web/src/components/screens/` |
| `ui/icons/` call sites | **1** (`FarmScreen.tsx:65`) → 5 weather icons of 53 files | measured |
| Reachable asset files | **~225 / 423** | measured, §4.4 |
| Partial-alpha pixels | **0** across all sampled assets | measured, §A.2 |
| Palette adherence | **0.0%** on 11 sampled assets | measured, §4.2 |
| Custom pixel font | wired ✅ via `next/font/local` → `--font-molemisi-pixel` → Tailwind `font-headline` | `layout.tsx:2,7–9`; `tailwind.config.ts:103–115` |
| Unused font variant | `MolemisiPixel-Small.ttf` (served, never loaded) | `apps/web/public/fonts/` |
| Narrative pools | 9 `ELDER_RULES`; 6 `WATER_WHISPERS`; 13 Tsholofelo lines; 42 proverbs + `REACTIVE_PROVERBS` | `bushveld.ts`, `dialogue.ts` |
| Manifest | 287 file references, **0 missing** — internally consistent, but ids are Phaser-era and unread by the client | measured |

---

## Appendix C — Reusable audit scripts

These reproduce the measurements in §2 and Appendix A. They are written for the repo's Windows
PowerShell shell and use `System.Drawing` (no dependencies). Save as `.ps1` and run from the repo
root.

### C.1 Asset reachability (finds P0-3 regressions)

```powershell
# Every file under assets/ that no client source references.
$files = Get-ChildItem 'apps\web\src' -Recurse -Include *.tsx,*.ts,*.css
$src   = ($files | Get-Content) -join "`n"

Get-ChildItem 'assets' -Recurse -File |
  Where-Object { $_.Extension -eq '.png' } |
  ForEach-Object {
    $rel = ($_.FullName -replace [regex]::Escape((Get-Location).Path + '\assets\'), '') -replace '\\','/'
    if ($src -notmatch [regex]::Escape($rel) -and $src -notmatch "\$\{") { $rel }
  }
```

Note: this is a *conservative* heuristic. Dynamically-composed paths (`ui/icons/${view.icon}.png`,
`sprites/crops/${cropType}/stage_${i}.png`, and `/assets/${restorationAssetKey}`) must be expanded
against their config tables to get the exact counts in §4.4.

### C.2 Colour integrity (the noise + palette measurement)

```powershell
Add-Type -AssemblyName System.Drawing
function Measure-Asset([string]$Path) {
  $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Path))
  $c = @{}; $partial = 0; $total = 0
  for ($y = 0; $y -lt $img.Height; $y++) {
    for ($x = 0; $x -lt $img.Width; $x++) {
      $p = $img.GetPixel($x, $y)
      if ($p.A -eq 0) { continue }
      if ($p.A -lt 255) { $partial++ }
      $k = '{0:X2}{1:X2}{2:X2}' -f $p.R, $p.G, $p.B
      if ($c.ContainsKey($k)) { $c[$k]++ } else { $c[$k] = 1 }
      $total++
    }
  }
  $img.Dispose()
  $acc = 0; $i = 0; $n80 = 0
  foreach ($e in ($c.GetEnumerator() | Sort-Object Value -Descending)) {
    $i++; $acc += $e.Value
    if ($n80 -eq 0 -and $acc -ge $total * 0.8) { $n80 = $i }
  }
  '{0,-52} colours={1,4}  80%={2,4}  partial-alpha={3,4}' -f $Path, $c.Count, $n80, $partial
}

Get-ChildItem 'assets\ui\icons','assets\sprites\npcs' -File |
  Select-Object -First 10 | ForEach-Object { Measure-Asset $_.FullName }
```

**Reading the output:** `80%` is the number that matters. Clean pixel art needs **3–5**; anything
above **10** is noisy and should be quantised (Pass 2.1). `partial-alpha` should be **0**.

### C.3 Spec-vs-disk dimension check

```powershell
Add-Type -AssemblyName System.Drawing
'assets\tiles\ground\plot_empty.png','assets\sprites\crops\sorghum\stage_4.png',
'assets\sprites\animals\chicken\idle.png','assets\sprites\npcs\mogolo.png',
'assets\backgrounds\open_bush_stage_0.png','assets\tiles\sky\farm_day.png' |
  ForEach-Object {
    $i = [System.Drawing.Image]::FromFile((Resolve-Path $_))
    '{0,-52} {1}x{2}' -f $_, $i.Width, $i.Height
    $i.Dispose()
  }
```

### C.4 Dead-constant scan (finds declared-but-unread config)

```powershell
# Exported game-config constants with no non-test importer.
$api = (Get-ChildItem 'apps\api\src','apps\web\src' -Recurse -Include *.ts,*.tsx |
        Where-Object { $_.Name -notlike '*.spec.ts' } | Get-Content) -join "`n"

Select-String -Path 'packages\game-config\src\*.ts' -Pattern '^export const ([A-Z_0-9]+)' |
  ForEach-Object {
    $name = $_.Matches[0].Groups[1].Value
    if ($api -notmatch "\b$name\b") { "possibly unread: $name  ($($_.Filename):$($_.LineNumber))" }
  }
```

This is the scan that surfaces `feedPerDay`, `SELF_SUSTAINING_THRESHOLD_HOURS` and the Almanac
requirement kinds.

### C.5 Copy and emoji gates (proposed CI checks)

```powershell
# Non-Latin characters in player-facing strings.
Get-ChildItem 'apps\api\src','apps\web\src','packages\game-config\src' -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern '[^\x00-\x7F]' |
  Where-Object { $_.Line -match "'|`"" } |
  ForEach-Object { "$($_.Filename):$($_.LineNumber)  $($_.Line.Trim())" }

# Emoji in the scene layer (allow only inside an explicit fallback branch).
Get-ChildItem 'apps\web\src\components\screens' -Recurse -Include *.tsx |
  Select-String -Pattern '[\uD83C-\uDBFF][\uDC00-\uDFFF]|\u2726|\u273F' |
  ForEach-Object { "$($_.Filename):$($_.LineNumber)" } |
  Group-Object { ($_ -split ':')[0] } |
  Select-Object Count, Name
```

---

## Revision history

| Date | Author | Change |
| --- | --- | --- |
| 2026-09-28 | Cline | Initial review pass. Establishes P0-1 (livestock soft-lock), P0-2 (feed costs nothing), P0-3 (~198/423 assets unreachable); 13 gameplay findings (G-1…G-13), 14 visual findings (V-1…V-14), 10 narrative findings (N-1…N-10); a four-pass implementation plan; six progress measures; seven open rulings. |

**Cross-references to keep in step with this document:**

- `docs/24_Player_Experience_Analysis.md` — §7 "Remaining risks" should absorb G-2, G-3 and G-4.
- `docs/KNOWN_LIMITATIONS.md` — the three P0s are recorded there as as-built defects.
- `docs/03_UI_UX_Specification.md` §13 — the attention priority queue is not enforced (V-14).
- `docs/05_Art_Direction_and_Asset_Specification.md` §2/§4 — the 16 px table must be rewritten (V-1);
  §17's AI-asset review step must become a script assertion (V-2).
- `docs/09_Game_Simulation_Specification.md` §2:46 — the time-base comment is wrong (G-1); §9's
  livestock row describes an unreachable rule (G-4).
- `docs/01_Game_Design_Specification.md` §18 (Automation) and §6 (Progression) — both describe a
  level-gated system that D5/C12 retired (G-6, §8).
- `docs/DOCUMENTATION_AUDIT.md` — **done:** registered under the new *Review & reconciliation
  series (`docs/24`–`docs/30`)* table, status "Open".
