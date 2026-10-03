# 38 — Molemisi: The Consolidated Year-Loop Specification

**Date:** 2026-10-02
**Status:** Implementation-ready consolidation. Resolves the open rulings of `docs/37` to their documented defaults and adds the chapter-by-chapter / coherence-checklist / decisions-log structure required to hand the year loop to a build team. Where a line contradicts a shipped fact in `DEVELOPMENT_STATE.md`, the shipped fact wins and the conflict is logged in §4.
**Scope:** The single player year — one real calendar, four chapters, the farm, the Kgotla Year (12 Charges + 4 Council Projects) and the decided economy, bound so they reinforce each other.
**Authoritative sources:**
| Document | Governs |
| --- | --- |
| `docs/33` + `docs/34` + `docs/MVP/02` | Economy: currencies, caps, thresholds, store, land ladder, maintenance. **Decided, largely shipped — no number here changes a decided value.** |
| `docs/35` | Calendar, chapters, seed rotation, crops, recipes (detail). |
| `docs/36` | Kgotla cast, copy, lore, the 12 Charges + 4 Projects, returning years. |
| `docs/37` | The earlier consolidation; this file subsumes its joint statements and adopts all its defaults. |
| `docs/DEVELOPMENT_STATE.md` | As-built code/DB truth. Wins on any conflict with a design doc. |
| `README.md` | Monorepo + MVP status. |

---

## 0. Key constants (read once, build against these)

| Constant | Value | Source |
| --- | --- | --- |
| Calendar | 1 Nov → 31 Oct, Africa/Gaborone (UTC+2, no DST) | 35 §2.1 |
| Chapters | ch1 Pula (Nov–Jan) · ch2 Letlhafula (Feb–Apr) · ch3 Mariga (May–Jul) · ch4 Dikgakologo (Aug–Oct) | 35 §2.3 / 37 C8 |
| `rainCoverage` | 0.80 / 0.50 / 0.05 / 0.15 | 35 §2.3 |
| Growth modifier | `0.85 + 0.3 × rainCoverage` | 37 §3 / DEV-STATE sim |
| Currencies | **Pula** (earned) · **Madi** (bought, 1 M = 1 BWP, spend-only) · **Botho** (meter) · **season stamps** (expire each chapter) | 33 §0 / 34 §2 |
| Botho cap | **50 / Botswana-day**, manual acts only, through `creditBothoCapped` | 33 §4 / 37 §5 |
| Botho prize floor | **monthly Botho delta ≥ 150** (top 3, split 4:2:1) — *not* lifetime 1000 | MVP/02 §6.7 / 37 C7 |
| Charge Pula faucet | **P915 / year** (exactly the Year's 12 Charges) | 36 §8.1 / 37 §6.1 |
| Charge Botho | **+10 each** (capped path); **+1 season stamp**; Almanac `quests` +1 | 36 §5.2 |
| Project thresholds / stamps | Reservoir **P100 / 5** · Festival **P150 / 8** · Water Store **P150 / 8** · School **P200 / 12** | 37 C6 |
| Land ladder | 4 → 8 (P1,200) → 12 (P6,000) → 16 (P8,000) → 20 (P15,000); total **P30,200** | 33 §3.2 / 37 §8 |
| First animal | day 2, **P50**; Workshop day 10, **P600** | 33 §3.2 |
| Offline windows | crops/weather **24 h** · livestock **72 h** · building construction absolute timer · building wear uncapped | DEV-STATE sim |
| Weather advance | every **6 h**, using `WEATHER_CHANGE_INTERVAL` (= `WEATHER_CHANGE_HOURS`) | 35 §2.6 / `weather.ts` |
| Mophane windows | real months **{4, 12}**, independent of chapters | 35 D9 |
| Letsema beat | once, on first Kgotla read on/after **1 Oct** | 35 §2.5 / 37 E-8 |

---

## 1. Narrative overview — the player's year in one breath

A new farmer arrives in **Pula** (Nov–Jan), when the Botswana rains open the loop: water is free from the sky, the Jojo tank fills itself, and the first weeks are about planting thirsty crops — sorghum, maize, tomatoes — and answering **Thabo's** call to lay straight rows. By January the same player has gone from four plots to a full twenty, bought their first goat, and helped **Mogolo** lay up millet "for the lean months." **Letlhafula** (Feb–Apr) is the green season: watermelon swells in the late rains, **Ntate Kabelo** asks for planks and rope for a kraal gate, and the ward gathers for the **Mophane Festival** — a Botho moment, not a market one, anchored to the real April phane window. **Mariga** (May–Jul) turns the world dry and cold; now water is the whole game, the player runs tank-watered garden plots of sorghum, cowpeas, herbs and morula, threshes with **Thabo**, brews **Refilwe's** cold-pot herbs, and keeps back **Mogolo's** long-promised morula while hauling stone for the **Water Store**. **Dikgakologo** (Aug–Oct) brings wind and preparation: pepper for **Mama Naledi's** stall, ropes and bricks for the ploughing, and the **School** wall the player helps raise — until October, when the kgosi declares the ploughing season, the player scatters sorghum and millet at the Kgotla, and the year turns with **Pula!** Every chapter teaches one lesson (Begin · Give · Keep · Leave), every Charge is obtainable that same chapter, and nothing is ever lost by absence.

---

## 2. Chapter-by-chapter breakdown

> **Water-pricing model (assumption, flagged in §4).** Water cost scales *inversely* with `rainCoverage`; the Jojo tank auto-refills from rainfall. Exact multipliers live in `game-config` (`WATER_PRICING`), not here. Tiers below are qualitative and must match the four chapters' `rainCoverage`.
> **Checkpoint framing.** Checkpoints describe a player who begins at the year's open (1 Nov) and plays the free loop. A mid-year starter enters the *same* chapter structure at their calendar entry point; the loop is non-punitive, so no milestone is ever "missed."

### 2.1 Chapter 1 — Pula · *Begin* — 1 Nov – 31 Jan

- **Calendar window:** Ngwanatsele (Nov) · Sedimonthole (Dec, **Mophane window**) · Ferikgong (Jan).
- **Weather:** `rainCoverage` **0.80**; growth modifier **1.09**. Water tier **Abundant** — tank fills from rainfall, cheapest purchase tier. ~90% of the year's rain falls now.
- **Farming focus:** Six seeds stocked: **Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet**. This is the *rain-fed* chapter — plant the thirsty crops (Maize 3 drops, Tomatoes 3, Groundnuts 2) because water is free. Lesson: *capital — plant thirsty, and start.* The cheapest crop, sorghum (P2 seed), is the beginner's on-ramp and the first Charge ask.
- **Kgotla activity:**
  - **Charge 1 · Straight Rows** (Thabo, Nov) — 10 Sorghum → P40 · Botho +10 · 1 stamp.
  - **Charge 2 · The First Phane** (Refilwe, Dec) — 3 Phane, gathered in the **December Mophane window** (Bushveld) → P40 · Botho +10 · 1 stamp. *Introduces the worm, the rain, the grandmother.*
  - **Charge 3 · Grain for the Lean Months** (Mogolo, Jan) — 12 Millet → P60 · Botho +10 · 1 stamp. *Plants the seed of Act III before anyone is thirsty.*
  - **Council Project — Water Reservoir** (whole chapter): contribute Pula to the borehole. Threshold **P100**, stamp reward **5** (once, when the farm's own bar first fills). Decay/regard: contributions are a Pula sink; Botho 1/Pula through the capped path, ≤P200/day.
- **Progression checkpoint (end of Jan):** Land is a *long-horizon* goal, not a month-1 achievement — the ladder rungs cost P1,200 / P6,000 / P8,000 / P15,000 (33 §3.2), and a starter earning 60–120 Pula/day cannot bank P1,200 by day 5. By end of Jan a diligent player should have their **first animal (P50)** and a **Workshop (P600)** and be working toward the first land expansion; reaching the **full 20-plot farm** is a *multi-month* arc. Daily Pula income **500–900** is realistic by month 2 for an active player. A casual mid-year starter is simply behind on land but faces the same chapter.
- **Economy snapshot (player hitting all 3 Charges):** Charge Pula this chapter **P140** (cumulative **P140**). Botho from Charges **+30** (cumulative 30). Stamps earned this chapter ≈ **58** (3 Charges + 5 project + ~50 Almanac free track) — **all expire at the 1 Feb boundary** with a countdown shown.

### 2.2 Chapter 2 — Letlhafula · *Give* — 1 Feb – 30 Apr

- **Calendar window:** Tlhakole (Feb) · Mopitlwe (Mar) · Moranang (Apr, **Mophane window**).
- **Weather:** `rainCoverage` **0.50**; growth modifier **1.00**. Water tier **Plentiful** — tank still fills from late rains, mid purchase tier. The "green season": long, even growth.
- **Farming focus:** Six seeds stocked: **Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper**. Stock the *thirsty* late-rain crops (Watermelon 3 drops, Pepper 2, Sesame 1) — they pay best here and the water is affordable. Lesson: *timing and generosity.* The April Mophane window closes the act and feeds the festival.
- **Kgotla activity:**
  - **Charge 4 · The Round Ones** (Mama Naledi, Feb) — 6 Watermelon → P85 · Botho +10 · 1 stamp.
  - **Charge 5 · The Kraal Gate** (Ntate Kabelo, Mar) — 4 Plank + 2 Rope (crafted, no station gate) → P70 · Botho +10 · 1 stamp. *Soft ground swallows a gatepost — build now.*
  - **Charge 6 · Something for the Pot** (Mogolo, Apr) — 5 Groundnuts + 2 Pepper (both stocked this chapter) → P110 · Botho +10 · 1 stamp. *Feeds the Mophane feast.*
  - **Council Project — The Mophane Festival** (whole chapter): "share the first rain's food." Threshold **P150**, stamp reward **8**. *The Botho moment of the year; the feast is the ward's, not the market's.*
- **Progression checkpoint (end of Apr):** Farm maturing and planted; animal holding expanding (kraal built via Charge 5's planks/rope, or a second animal). Steady **500–900 Pula/day**; contributing to the Festival. Player is now "settled" by the economy's definition (33 §3.1) — *if* they have kept pace with the income band; a slower starter is simply further down the land ladder.
- **Economy snapshot:** Charge Pula this chapter **P265** (cumulative **P405**). Botho from Charges **+30** (cumulative 60). Stamps earned ≈ **61** (3 + 8 + 50); year-earned-to-date ≈ **119**. Expiry at 1 May boundary.

### 2.3 Chapter 3 — Mariga · *Keep* — 1 May – 31 Jul

- **Calendar window:** Motsheganong (May) · Seetebosigo (Jun) · Phukwe/Phukwi (Jul).
- **Weather:** `rainCoverage` **0.05**; growth modifier **0.865**. Water tier **Scarce** — tank almost never fills from sky; highest purchase tier. The season of harvest and threshing; *water is the whole game*.
- **Farming focus:** Six seeds stocked: **Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula**. These are framed as **tank-watered garden plots** (35 §3.5): rain-fed fields belong to ch1/2; ch3/4 model the irrigated home garden. A 20-plot watermelon farm would need ~2 tank refills/day, so the only sensible ch3 choices are drought/low-thirst crops (Sorghum 1, Millet 1, Cowpeas 2, Sesame 1, Herbs 2, Morula 1). Lesson: *storage and restraint — choose whose drop of water it is.* Morula (top of the ladder, P46 base) matures here.
- **Kgotla activity:**
  - **Charge 7 · Threshing Day** (Thabo, May) — 8 Cowpeas → P60 · Botho +10 · 1 stamp.
  - **Charge 8 · The Cold Pot** (Refilwe, Jun) — 3 Herbs → P95 · Botho +10 · 1 stamp. *Every drop counts.*
  - **Charge 9 · The Long Promise** (Mogolo, Jul) — 2 Morula → P115 · Botho +10 · 1 stamp. *Kept back so it can be given later — patience, not hoarding.*
  - **Council Project — The Water Store** (whole chapter, led by Kabelo): haul stone/clay. Threshold **P150**, stamp reward **8**. *"When the sky is silent, this is what the ward drinks."*
- **Progression checkpoint (end of Jul):** Drought mastery demonstrated — tank-watered gardens sustained, Morula maturing, Water Store contributed. Land unchanged from whatever the player has reached by now (for most, short of the full 20 plots); the focus shifts to efficiency and the dry-season economy, not expansion. No punitive decay: empty tank *halts* growth, never kills a crop (35 Principle 3).
- **Economy snapshot:** Charge Pula this chapter **P270** (cumulative **P675**). Botho from Charges **+30** (cumulative 90). Stamps earned ≈ **61** (3 + 8 + 50); year-earned-to-date ≈ **180**. Expiry at 1 Aug boundary.

### 2.4 Chapter 4 — Dikgakologo · *Leave* — 1 Aug – 31 Oct

- **Calendar window:** Phatwe (Aug) · Lwetse (Sep) · Diphalane/Phalane (Oct).
- **Weather:** `rainCoverage` **0.15**; growth modifier **0.895**. Water tier **Dear** — sparse rain; tank-watered gardens still viable, rain-fed not. Wind and preparation; the ploughing season is declared.
- **Farming focus:** Six seeds stocked: **Millet · Sorghum · Watermelon · Pepper · Herbs · Morula**. The chapter mixes hardy staples (Millet/Sorghum, 1 drop) with a late watermelon/pepper window and the maturing Morula — a "leave something behind" harvest before the loop resets. Lesson: *selling, and leaving something behind.* The real ploughing declaration (Letsema beat) fires on/after 1 Oct.
- **Kgotla activity:**
  - **Charge 10 · Pepper for the Stall** (Mama Naledi, Aug) — 4 Pepper → P85 · Botho +10 · 1 stamp.
  - **Charge 11 · Ropes for the Ploughing** (Ntate Kabelo, Sep) — 3 Rope + 3 Brick (crafted) → P95 · Botho +10 · 1 stamp. *Bricks steady the yoke shed.*
  - **Charge 12 · Seed for the Scattering** (Mogolo, Oct) — 8 Sorghum + 6 Millet (equal value: 4 sorghum = 3 millet, the Flour rule) → P60 · Botho +10 · 1 stamp. *Fires the yearly declaration beat; "what falls here, falls for all."*
  - **Council Project — The School** (whole chapter): carry clay for the wall. Threshold **P200**, stamp reward **12** (largest). *"Leave something behind."*
  - **Reading of Names (1 Nov):** Mogolo reads, unranked and alphabetical, everyone who contributed to a project in the closing cycle. Recognition only — no reward, no comparison (36 §6, invented ritual, V-6).
- **Progression checkpoint (end of Oct):** Full progression realised; School contributed; the year closes and turns. A returning player sees returning-year offer lines (36 §7) and the unchanged rewards — the economy does not inflate with tenure.
- **Economy snapshot:** Charge Pula this chapter **P240** (cumulative **P915**). Botho from Charges **+30** (cumulative **120/year**). Stamps earned ≈ **65** (3 + 12 + 50); **year-earned total ≈ 245**, every stamp spendable before its chapter expiry (souvenir at 25 → ~10 souvenirs/year). Expiry at 1 Nov boundary; cycle key advances (2026/27 → 2027/28).

---

## 3. Coherence checklist

> Each box is confirmed against the four source documents and the as-built code. Items needing a build action are marked **[FLAG]**.

- [x] **No Charge request conflicts with crop availability.** Every ask is obtainable in its own chapter (verified, 37 §7):
  | # | Ask | Source | In-chapter? |
  | --- | --- | --- | --- |
  | 1 | 10 Sorghum | seed | ch1 stocked ✓ |
  | 2 | 3 Phane | Bushveld | Dec = Mophane month {12} ✓ |
  | 3 | 12 Millet | seed | ch1 stocked ✓ |
  | 4 | 6 Watermelon | seed | ch2 stocked ✓ |
  | 5 | 4 Plank + 2 Rope | craft (no gate) | any chapter ✓ |
  | 6 | 5 Groundnuts + 2 Pepper | seed | **both** ch2 stocked ✓ |
  | 7 | 8 Cowpeas | seed | ch3 stocked ✓ |
  | 8 | 3 Herbs | seed | ch3 stocked ✓ |
  | 9 | 2 Morula | seed | ch3 stocked ✓ |
  | 10 | 4 Pepper | seed | ch4 stocked ✓ |
  | 11 | 3 Rope + 3 Brick | craft | any chapter ✓ |
  | 12 | 8 Sorghum + 6 Millet | seed | **both** ch4 stocked ✓ |

- [x] **Water pricing aligns with crop choice.** Rainy chapters (Pula 0.80, Letlhafula 0.50) carry the *cheapest* water and stock the *thirsty* crops (Maize/Tomatoes/Watermelon/Pepper). Dry chapters (Mariga 0.05, Dikgakologo 0.15) carry the *dearest* water and stock only low-thirst / drought-tolerant crops plus **tank-watered garden** staples (35 §3.5). An empty tank *halts* growth; it never kills — so dry-season play is a capital/water decision, not a loss (33 §1 rule 2, 35 Principle 4). **[FLAG]** exact water multipliers are a `game-config` decision (see §4, Assumption A1).

- [x] **Monthly Botho (Charges + projects) sits inside the 50/day cap and is compatible with the 150/month prize threshold.** Charges grant Botho +10 each through the capped path; a **capped day still completes the Charge** (37 §6.2). Charges contribute **≤30 in any calendar month** (3/month), so *Charges alone can never reach the 150 prize floor* — by design, so a payment/automation cannot buy the prize (37 C7, legal control). The 150/month floor is reachable only by adding **ward errands** (≤30/day free, restored per 37 E-3) and **project contributions** (Botho 1/Pula, ≤P200/day, also through the capped path). Botho from all sources is bounded by the 50/day cap, so the cap is never breached.

- [x] **Year-total Pula and stamps align with documented progression.** Charge Pula = **P915/year** = 4.0% of a 4-plot farm's monthly baseline and 0.9% of a 20-plot farm's (36 §8.1). Over a year it is ~¾ of the first land rung (4→8 plots, P1,200) — a *help*, not a hand-out (37 §8). Land ladder totals P31,200; the Charge faucet is narrative + community first, economic second, and never substitutes for farming income. Stamps ≈ **245/year** fund ~10 season souvenirs (25 each) — full cosmetic coverage without inflation (37 §6.3). 20-plot farm "by month 3" (33 §3.2) coincides exactly with **end of Chapter 1** (Jan = month 3 of a 1-Nov start), so the progression curve and the calendar reinforce each other.

- [x] **Project thresholds (P100–200; 5–12 stamps) are reachable from monthly Charges + daily activity.** Each chapter's Charge Pula (P140 / P265 / P270 / P240) already covers its project threshold (P100 / P150 / P150 / P200) with farming income to spare; stamp rewards 5/8/8/12 are granted once when the farm's own bar first fills (AC-04). Projects are deliberately not grindable (per-day contribution cap) and never "all-farmer" shared (37 §4).

- [x] **Seasonal flavor reflects real Botswana agriculture.** Planting with the first rains (Sep/Oct ploughing declaration, seed scattered at the kgotla), ~90% rainfall Nov–Apr, harvest May–Jul — all echoed: sorghum/millet "for the lean months" (dry-season staples), cowpeas at threshing, morula (a real Botswana tree crop) kept back, phane tied to the **real April and December** Mophane windows (decoupled from chapters, D9). Two intentional abstractions are flagged honestly in §4 (A2): tank-watered gardens in ch3/4, and tomatoes in the hottest months (ch1/2).

- [x] **Calendar boundaries and transitions do not conflict with offline-time handling, weather cycles, or Mophane windows.** Chapter is a **pure function of the calendar month** (no cursor, no cron, no stored year) — so it is correct even after a long offline gap; the 24 h crop/weather caps and 72 h livestock cap bound *simulated progress*, never the chapter (DEV-STATE sim). Boundaries fall at **00:00 Africa/Gaborone** on 1 Nov/Feb/May/Aug (UTC 22:00 previous day); a player absent across a boundary simply sees the new chapter on return, no catch-up (35 §2.4). Weather re-derives from the new chapter's `rainCoverage` on read. Mophane ({4,12}) and the Letsema beat (on/after 1 Oct) are keyed to the **real month**, deliberately *outside* the chapter clock, so they straddle boundaries by design (35 D9, E-8). Stamps zero at the boundary with a countdown.

- [x] **No design decision requires changes to the deterministic simulation engine, nor introduces punitive loss / energy / pressure clocks.** The entire year loop uses mechanisms already present: `chapterForMonth` (pure), the cycle key (pure fn of date), Charge reveal-by-month, stamp expiry, the 50/day Botho cap, the offline windows, and weather advance every 6 h. No new sim math, no energy system, no "log in or lose it." Every Botho/Pula source is capped and manual; crops wait, animals recover (DEV-STATE livestock: 72 h decay, 12 h starvation window, self-sustaining beyond). All required work is **data + service wiring + the existing pure functions** (37 §9), not engine changes. **[FLAG]** the wiring tasks are unbuilt (see §4, Implementation tasks).

---

## 4. Design decisions log

### 4.1 Tensions between the source documents — and how each was resolved

| # | Tension | Resolution (normative) |
| --- | --- | --- |
| T-1 | `docs/36` K10 (default) **retires the five rotating charges**; `docs/33` §3.1/§4 says "three daily Kgotla charges" is how Pula **and** Botho are earned. Plain retirement starves free Botho (≈140–160/yr → Bupi 100 in ~7 months, vs ~4 days intended). | **Hybrid (37 C1/C2/E-3):** the five asks stay as **ward errands** (shared pool 3/day, same NPCs) but are stripped of Pula/stamps/Almanac — they pay **Botho +10 + regard only**. All quest Pula moves into the 12 Charges (faucet exactly **P915/yr**). Result: free-Botho pacing ≈30/day; both sources agree. |
| T-2 | Chapter rename (35 R-1): display *Letlhafula* = ch2, but shipped slug `letlhafula` = **ch4**. A string rename would corrupt both. | **Stable ids `ch1–ch4` (37 C8/E-7):** keys are data; names migrate by **month range, one transaction**, never by name. Map: ch1=pula · ch2=phane · ch3=moriti · ch4=letlhafula. Never leave a slug meaning two chapters. |
| T-3 | `docs/33` §5 calls Aug–Oct "festival time"; `docs/36` puts the festival in **Act II** (Feb–Apr), anchored to the real April phane window. | **Festival = Act II (37 C12/E-14).** Act IV's market event re-scopes to *ploughing preparation* (what Dikgakologo actually is). Copy-only; `MOPHANE_MONTHS` untouched. |
| T-4 | `docs/37` E-4 states the stamp-spend route "now exists in `chapter.controller.ts`," but `DEVELOPMENT_STATE.md` (same date) states **`ChapterController` exposes no spend route** and lists it under gaps. | **Shipped fact wins — and the code of record *is* the controller:** `POST /chapters/tokens/spend` **IS PRESENT** (`chapter.controller.ts:56`, backed by the ledger-recorded `spendTokens()` service and a passing spec in `chapter.service.spec.ts`). `docs/37` E-4 was correct; `DEVELOPMENT_STATE.md` was stale at that date. The build task I-7 is therefore **DONE, not open**. Sink design (souvenir, 25 stamps, cosmetic only) stands; the only remaining refinement is validating the 25-stamp SKU + cosmetic-only `purpose` (R-C3), which is content, not a route gap. |
| T-5 | Prize eligibility: code exposes `PRIZE_ELIGIBILITY = 1000` (lifetime); `MVP/02 §6.7` decided **monthly delta ≥150**. `docs/36` §8.1 argues against the wrong number. | **Monthly delta (37 C7/E-6).** Charges grant ≤30/month, so they can never confer eligibility; the 50/day cap bounds everything else. Cleanup: retire/re-label the 1000 constant. |
| T-6 | Shipped projects: Reservoir P100, Market Square P150, School P200. `docs/36` schedules 4 chapter projects (Reservoir, Festival, Water Store, School) — no slot for Market Square. | **Retire Market Square (37 C6/E-9).** Schedule = Reservoir 100/5 · Festival 150/8 · Water Store 150/8 · School 200/12. "Better prices" reward was never real (AC-04). One project per chapter. |
| T-7 | Almanac Pass track paid **Pula (60/100/150) + Botho (10)** and was subscription-gated; decided Village Pass benefit list is *helper · outfit · storage* only, and I4 forbids payment reaching `creditBothoCapped`. | **Scrub Pass track to stamps + cosmetics only (37 C5/E-5).** Declared a Village Pass benefit; internal key `guild` kept. No Pula, no Botho, no gameplay power. |
| T-8 | `docs/36` hard rules reference "Guild subscription" and "Auto-Collector"; the decided economy renamed these to **Village Pass** and **cut boosts** (ladder is Auto-Feeder 300 / Auto-Helper 500). | **Current names (37 C10/E-1/E-2):** Village Pass confers no Kgotla advantage; no automation may deliver a Charge, complete an errand, contribute, or credit Botho, directly or indirectly. Helper only removes taps. |
| T-9 | `docs/35` R-4: now that **Madila** is craftable from milk, should **Flour** keep its Botho-100 gate? | **Flour stays at Botho 100 (37 C11/E-12):** it is the ladder's first rung ("bake bread"). Madila/Dikgobe/Dried Phane stay ungated; Ting/Bogobe inherit Flour's gate. No unlock reads subscription. |
| T-10 | NPC copy: shipped Thabo is "competitive/ambitious" ("I will be watching"); `docs/36` makes him **never a rival**. Elder ids `elder_neo`/`oupa_kabelo` vs cast **Mogolo**/**Ntate Kabelo**. | **`docs/36` copy wins (37 E-13).** Display name/role/greeting change (Elder Neo → Mogolo, Oupa Kabelo → Ntate Kabelo); **ids unchanged**, no DB migration for names. |
| T-11 | `docs/36` K5 (no v1.1 items in asks) vs the v1.1 feast dishes in `docs/35` §4.3. | **Kept strict (37 E-16):** no Charge/errand/project may request a DIKUNO dish until v1.1 ships *and* K5 is amended. The Festival project may reference the feast in copy only. |

### 4.2 Assumptions made (flagged for sign-off)

- **A1 — Water tiers.** Water purchase cost scales inversely with `rainCoverage`; exact per-tier multipliers are a `game-config` (`WATER_PRICING`) decision, not pinned by this spec. The four qualitative tiers (Abundant / Plentiful / Scarce / Dear) must track `rainCoverage` 0.80/0.50/0.05/0.15. *Flag: confirm multipliers in `balance_verify.py` before ship.*
- **A2 — Tank-watered = drought-tolerant.** In ch3/4, sorghum/millet/cowpeas/sesame/herbs/morula are modelled as **tank-watered home gardens**; for water-pricing and "drought-tolerant" purposes they count as the dry-season crop set (35 §3.5). Rain-fed fields conceptually belong to ch1/2. **Tomatoes** remain stocked in ch1/2 (hottest months) because their thirst makes rainy play worthwhile; any change re-runs the balance verification (35 §3.5).
- **A3 — Botho per Pula donated.** `BOTHO_PER_PULA_DONATED = 1` (37 R-C4), capped at 50/day. Confirm it still reads as "helping," not "buying standing"; 2/Pula would let a funded player hit 50/day for P25.
- **A4 — Season-stamp sink.** One sink: the **season souvenir** at **25 stamps**, cosmetic only, via `spendTokens(purpose='cosmetic')` (37 R-C3). Chapter recipes / prize-draw entry from `MVP/02 §3.3` stay **out of v1** (37 R-C5).
- **A5 — Chapter Tokens = season stamps.** Internal slug `chapter_token` unchanged; player-facing "season stamp." **+1 per Charge** (37 R-Q2). Almanac free track grants ~50/chapter (10+20+20); Village Pass track adds 170/chapter once scrubbed (C5).
- **A6 — Mophane & Letsema are month-keyed, not chapter-keyed.** `MOPHANE_MONTHS = {4,12}`; Letsema beat fires once on/after 1 Oct. Both intentionally straddle chapter boundaries (35 D9, E-8).
- **A7 — Returning years.** Rewards unchanged on cycle 2+; only voice changes (36 §7). Economy does not inflate with tenure.

### 4.3 Implementation tasks flagged (MVP migration plan / future)

**Must ship for the year loop (all data + service wiring, no engine change):**

| ID | Where | What | Blocks? |
| --- | --- | --- | --- |
| I-1 | `game-config` (new charge-year module) | 12 Charges as data (month, npcId, asks, base) + 4-project schedule (C6). No numeric literal in app code. | No |
| I-2 | `kgotla.service.ts` + `year-charge.service.ts` | **Errand layer SHIPPED** (Botho + regard only; `pulaReward`/`chapterTokenReward` stripped; `elder_neo`-era Pula retired, NPC rename per I-4). **Year layer SHIPPED** — `YearChargeService` reveals/accepts/turns in the 12 monthly Charges from `chargeYear.ts`; persistence is `kgotla_charges` (unique `(farm, charge, cycle)`, atomic deduction) via migration `20261002000000` (**pushed live 2026-10-02**). Endpoints: `GET/POST farms/:farmId/kgotla/year-charge(/accept|/turn-in)`. | Done (live) |
| I-3 | `kgotla.service.ts` PROJECTS | Reservoir/Festival/Water Store/School = 100/150/150/200, 5/8/8/12; remove `market_square`; only active chapter accepts. | No |
| I-4 | NPC display data | Elder Neo → **Mogolo**, Oupa Kabelo → **Ntate Kabelo**; Thabo never a rival. Ids unchanged. | No |
| I-5 | `game-config/chapters.ts` | Stable ids `ch1–ch4` + display names (C8); migrate stored refs **by month range, one txn**. | Schema |
| I-6 | `almanac.ts` | Pass-track scrub (C5); rename UI "Village Pass track" (key `guild` kept). | No |
| **I-7** | `chapter.controller.ts` | **DONE** — `POST /chapters/tokens/spend` exists (route + `spendTokens()` service, ledger-recorded, spec green). Remaining: validate 25-stamp souvenir SKU + cosmetic-only `purpose` (R-C3) and add the UI affordance. *`docs/37` E-4 was right; `DEVELOPMENT_STATE.md` was stale — see T-4.* | **No (route built)** |
| I-8 | progression / `BOTHO_LADDER` | **DONE** — `PRIZE_ELIGIBILITY = 1000` retired from `BOTHO_LADDER` (progression.service.ts). The decided replacement (monthly Botho-delta gate, `PRIZE.minimumBothoInPeriod`) is **not yet wired** — flagged with a TODO. | No (rung retired) |
| I-9 | Almanac counters (`docs/32` 3.4) | `quests` = Charge deliveries + contracts (E-15). Contract repeat is also gated by a 24 h cooldown (`CONTRACT_RULES.repeatCooldownHours`). Blocked on schema sign-off. | Schema |
| I-10 | Market events + `docs/33` §5 copy | Ch4 event → ploughing prep (E-14). | No |
| I-11 | Simulator | Errand/Charge split; assert the **P915** faucet. | No |
| I-12 | Docs | Point `docs/33` §3.1/§4 "three daily charges" prose here (E-3); mark `docs/29` superseded. | No |

**Schema delta (from `DEVELOPMENT_STATE.md`):** all migrations through `20261002000000` are **pushed live** (**51 migration files total: 41 pushed live, 10 untracked / not yet pushed, 0 pending among the committed set**). The Kgotla charges/decay, deep-time/lore, economy metrics, anti-cheat, **Madi** third currency and Year-layer `kgotla_charges` tables are all on the remote DB.

**Deferred to v1.1 / future (explicitly out of scope):**
- Traditional dishes (Dikgobe, Bogobe jwa Lerotse, Ting, Madila, Dried Phane) — `docs/35` §4.3. No Charge may request them until shipped (E-16).
- Real-money payments (stub provider only today); automation-unlock persistence (Botho 300/500 config-only); wildlife raids + boost effects (deferred by ruling 2026-09-11).
- Extra stamp sinks (chapter recipes, prize-draw entry) — R-C5, out of v1.

**Engine-compatibility note:** none of I-1…I-12 touches `runSimulation` or `engine/time.ts`. The deterministic engine already computes chapter from read-time month and applies the offline windows; the year loop is fully expressible through the existing pure functions plus the data above. This satisfies checklist item 8.

---

## 5. Authority & sources

On adoption this file supersedes the **joint** year statements of `docs/35`, `docs/36` and `docs/37`; it does not replace their domain detail (calendar/seeds/recipes in 35, cast/copy/lore in 36). `docs/33`/`docs/34`/`docs/MVP/02` remain the economy authority — no number here changes a decided value. Where a design claim conflicts with `DEVELOPMENT_STATE.md` or `README.md`, the as-built truth wins (see T-4, T-5).

**Sources:** the six input documents named in §0; external sources reproduced in `docs/35` §8 and `docs/36` §11; code of record listed in `docs/37` §12 and `docs/DEVELOPMENT_STATE.md` §Runtime architecture / §Simulation.
