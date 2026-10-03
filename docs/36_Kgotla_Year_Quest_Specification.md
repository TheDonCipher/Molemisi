# Molemisi — The Kgotla Year: Quest Specification

**Date:** 2026-09-28
**Status:** **Draft for ruling.** Nothing here is implemented. Four items in §10 need a ruling; each carries a default so work can proceed.
**Scope:** A complete year of Kgotla quests: twelve monthly **Charges**, four chapter-long **Council Projects**, the lore that joins them, the reward rules, the yearly loop, and the tests that prove it.
**Working title:** *A Year at the Kgotla* (Setswana, provisional: *Ngwaga kwa Kgotleng*).
**Authority:** On adoption, this document replaces every earlier statement on Kgotla quests, the rotating charges and chapter project sequencing. It stands alone: every figure it relies on is reproduced here.

> **Hierarchy note:** this is a *domain* spec for the annual-year system. Where any statement here conflicts with the normative `docs/MVP/` set — in particular `MVP/02` (economy numbers of record), `MVP/05` (phase done-criteria) and `MVP/06` (verification rubric) — **`docs/MVP/` governs**. `scripts/balance_verify.py` remains the economy gate; resolved conflicts are recorded in `docs/37`.
**Consolidated 2026-10-02 → `docs/37_Consolidated_Playable_Year_Specification.md`:** this file is one of three inputs to the consolidated gameplay spec (with `docs/35` and the decided economy `docs/33`/`docs/34`). On shared points — K10/R-Q1 (rotating charges → ward errands), "Guild"/"Auto-Collector" wording, prize-eligibility math, project schedule, stamp sinks — `docs/37` §2 governs; cast, copy, lore and the Reading of Names remain here.

---

## 0. Decisions at a glance

| ID | Decision | Status |
| --- | --- | --- |
| **K1** | The Kgotla year is a **serial**: 12 Charges (one per real month) + 4 Council Projects (one per chapter). | Adopted |
| **K2** | The year has one story shape, four verbs: **Begin · Give · Keep · Leave.** One per chapter. | Adopted |
| **K3** | A Charge is **revealed by month** and stays deliverable until its chapter ends. It never expires with a penalty. | Adopted |
| **K4** | Reward = Pula by a fixed formula (§5.1) + **Botho +10** (capped) + **1 Chapter Token** + **Almanac `quests` +1**. | Adopted; token count is R-Q2 |
| **K5** | Every requested good is **obtainable in its own chapter** and is **ungated** (no Botho-gated, no v1.1 item). | Adopted |
| **K6** | Botho comes only from a **manual** delivery, through the **capped** credit path. No subscription or Auto-Collector effect. | Adopted (legal control) |
| **K7** | The year **loops**: every Charge repeats each game year, keyed by a per-cycle identifier. | Adopted |
| **K8** | One authoritative **cast of five** (§3), with one elder. | Adopted |
| **K9** | Council Projects follow the chapter arc (Reservoir → Mophane festival → Water store → School). | Adopted |
| **K10** | The year **replaces** the five rotating charges. | **Default — R-Q1** |

---

## 1. Purpose and fit

The Kgotla is the game's third screen: the place where contracts, shared works and reputation live. It is the one part of the design that a foreign studio cannot copy, and playtesting is expected to show a mid-game trough that is best filled with **more Kgotla content, not more farm taps.** This document supplies that content as a year with a beginning, a middle, and a turning.

**Why the frame is credible.** A kgotla is a public meeting, community council and traditional court in which decisions are reached by consensus and no one may interrupt another who is speaking. Villages are divided into wards (*dikgotla*), each overseen by a headman. The assembly decides matters as practical as when to harvest. The game borrows this structure: each Charge is a small request from a named neighbour, made in public, answered by the ward.

**What the year teaches.** Each chapter's numbers already teach a lesson; the Charges say it aloud once.

| Act | Chapter | Verb | Lesson the mechanics already deliver |
| --- | --- | --- | --- |
| I | Pula (Nov–Jan) | **Begin** | Water you did not pay for: plant thirsty, and start. |
| II | Letlhafula (Feb–Apr) | **Give** | Timing and generosity: the Mophane gathering is a Botho moment, not a market one. |
| III | Mariga (May–Jul) | **Keep** | Storage and restraint: water is the whole game. |
| IV | Dikgakologo (Aug–Oct) | **Leave** | Selling, and leaving something behind. |

Chapter names follow ruling R-1 of the calendar specification (Pula, Letlhafula, Mariga, Dikgakologo). The legacy names are *Sekala sa Pula*, *Sekala sa Phane*, *Sekala sa Moriti* and *Sekala sa Letlhafula*, in that order; only display strings differ.

---

## 2. Hard rules

1. **Botho accrues only from explicit, manual, deliberate acts** and is **capped per player per day.** Every Botho grant in this document passes through the capped credit path. This is a **legal control**, not a balance decision: Botho gates a real-money prize, so nothing that a payment can buy or automate may reach it.
2. **The Auto-Collector can never deliver a Charge, contribute to a project, or call the Botho increment**, directly or indirectly.
3. **The Guild subscription confers no advantage** on any Charge: not in eligibility, reward, Botho, reveal time or slots.
4. **No failure states.** A Charge consumes goods only when the player delivers them. Lapsing costs nothing.
5. **No competitive framing.** No Charge, project or reading is ranked. Recognition is by name, never by position.
6. **Everything requested is obtainable in the same chapter**, from a seed that is stocked that chapter or from a non-seed source, and is neither Botho-gated nor v1.1 content.
7. **The server decides reward, eligibility and completion.** The client sends only an intent. Delivery is idempotent under concurrent requests (§5.6).
8. **Copy is Latin script only.** Every Setswana line receives a native-speaker pass before shipping (§9).

---

## 3. The cast

One authoritative list, held in shared configuration (not in a service file). The former second elder (`elder_neo`) is merged into Mogolo.

| NPC | Role | Voice | Charges |
| --- | --- | --- | --- |
| **Mogolo** | The Elder; the only elder in the cast | Dry, gentle, sparing. Speaks in proverbs; goes quiet on rare things. | Jan, Apr, Jul, Oct (the finale of each act) |
| **Thabo** | Peer farmer | Proud of his rows, generous with knowledge. *"My rows are straighter than yours. Come — I will show you how."* Never a rival. | Nov, May |
| **Refilwe** | Herbalist; keeper of the Mophane story | Quiet, practical; speaks of her grandmother. | Dec, Jun |
| **Mama Naledi** | Market stall-keeper | Warm, exact, proud of an honest scale. | Feb, Aug |
| **Ntate Kabelo** | Builder of kraals, ropes and walls; leads the Water Store | Slow, careful, few words. (Formerly written with an Afrikaans-derived title; corrected.) | Mar, Sep |

Kabelo's role is assigned by this document; the other four roles come from existing material.

---

## 4. The year at a glance

| # | Month | Chapter | NPC | Charge | Ask |
| --- | --- | --- | --- | --- | --- |
| 1 | Nov | Pula | Thabo | **Straight Rows** | 10 Sorghum |
| 2 | Dec | Pula | Refilwe | **The First Phane** | 3 Phane |
| 3 | Jan | Pula | Mogolo | **Grain for the Lean Months** | 12 Millet |
| — | Nov–Jan | Pula | Council | **Water Reservoir** (project) | contributions |
| 4 | Feb | Letlhafula | Mama Naledi | **The Round Ones** | 6 Watermelon |
| 5 | Mar | Letlhafula | Kabelo | **The Kraal Gate** | 4 Plank + 2 Rope |
| 6 | Apr | Letlhafula | Mogolo | **Something for the Pot** | 5 Groundnuts + 2 Pepper |
| — | Feb–Apr | Letlhafula | Council | **The Mophane Festival** (project) | contributions |
| 7 | May | Mariga | Thabo | **Threshing Day** | 8 Cowpeas |
| 8 | Jun | Mariga | Refilwe | **The Cold Pot** | 3 Herbs |
| 9 | Jul | Mariga | Mogolo | **The Long Promise** | 2 Morula |
| — | May–Jul | Mariga | Council | **The Water Store** (project) | contributions |
| 10 | Aug | Dikgakologo | Mama Naledi | **Pepper for the Stall** | 4 Pepper |
| 11 | Sep | Dikgakologo | Kabelo | **Ropes for the Ploughing** | 3 Rope + 3 Brick |
| 12 | Oct | Dikgakologo | Mogolo | **Seed for the Scattering** | 8 Sorghum + 6 Millet |
| — | Aug–Oct | Dikgakologo | Council | **The School** (project) | contributions |

Item names: Plank = Poleto, Rope = Thapo, Brick = Setena (all crafted, none gated). Phane is gathered in the Bushveld; the crops are grown from in-season seed.

---

## 5. Rules of the Charge

### 5.1 The reward formula

**Pula reward = round-to-nearest-P5 of Σ (base value × premium)**, where the premium is **1.25** for grown or gathered goods and **1.10** for crafted goods (their crafting margin already carries value). Base values used:

| Good | Base | Good | Base |
| --- | --- | --- | --- |
| Sorghum | P3 | Groundnuts | P11 |
| Millet | P4 | Pepper | P17 |
| Cowpeas | P6 | Herbs | P25 |
| Watermelon | P11 | Morula | P46 |
| Phane | P10 | Plank / Rope / Brick | P7 / P18 / P11 |

A Charge must pay **more than the market** (or it is not a choice) and **not much more** (or it is not a faucet). The admissible ratio of reward to base value is **1.05–1.15 for crafted goods** and **1.15–1.35 for grown or gathered goods.**

### 5.2 Everything a Charge gives

| Reward | Amount | Notes |
| --- | --- | --- |
| **Pula** | by §5.1 | Server-computed from configuration. |
| **Botho** | **+10** | Through the capped credit path; the Charge completes even if the day's cap absorbs part or all of it. |
| **Chapter Token** | **+1** | Expires with the chapter, like every token. Amount tunable (R-Q2). |
| **Almanac** | `quests` counter **+1** | Feeds the season track. |
| **Voice** | Completion line | From the NPC; Mogolo adds a line on the act-finale Charges. |

### 5.3 Reveal, hold, rest

1. Charge *n* is **revealed at 00:00 Africa/Gaborone on the first day of its month.**
2. It stays **deliverable until the chapter ends.** A late joiner sees every Charge of the current chapter up to the current month.
3. A Charge undelivered at chapter end **rests**: nothing is lost, nothing is owed, and it returns next cycle.
4. Delivery is **manual**, in one action, from the Kgotla screen.

### 5.4 Progression

There is **no sequencing gate**: a player may deliver Charges in any order within a chapter. The serial nature is carried by the calendar, not by locks. This keeps the year free of dead ends.

### 5.5 The loop (K7)

The year turns on 1 November. Each Charge and project is keyed by a **cycle key** derived from the Gaborone date: **the calendar year in which the game year began.** November 2026 through October 2027 is **cycle 2026/27**; January 2027 belongs to it. A Charge may be delivered **once per cycle.** On 1 November the cycle key advances and every Charge is available again, with unchanged rewards. Nothing about the year is stored; the key is a pure function of the date.

### 5.6 Server authority and idempotence

Delivery is protected by a unique constraint on **(farm, Charge, cycle)**, plus an atomic deduction of goods, so that concurrent duplicate requests yield **exactly one** reward. This is the highest-value anti-cheat check on the Kgotla and is tested (§8).

### 5.7 Returning years

From the second cycle each Charge shows a **returning-year offer line** in place of the first-year line, spoken by the same NPC. Rewards are unchanged; the economy does not inflate with tenure. Sample lines appear in §7.

---

## 6. The year, act by act

Copy is English intent, not final. Setswana marked **[S]** requires a native-speaker pass.

### Act I — Pula · *Begin* · 1 Nov – 31 Jan

**Frame.** The rain has come and the ward is planting. `rainCoverage` is 0.80; the tank fills itself. Seeds in stock: Sorghum, Maize, Tomatoes, Cowpeas, Groundnuts, Millet. The ploughing season was declared at the Kgotla in the last weeks of the old year, and seed was scattered. The player is new to the ward's rows.

**1 · Straight Rows** — *Thabo*
- **Ask:** 10 Sorghum (base P30). **Reward:** P40 · Botho +10 · 1 token.
- **Offer:** *"My rows are straighter than yours. Come — I will show you how. Begin with sorghum: it asks little of the rain, and it forgives a beginner."*
- **Done:** *"Crooked. But it will feed someone, and that is the point of a row."*
- **Why:** teaches the cheapest, most forgiving crop first.

**2 · The First Phane** — *Refilwe*
- **Ask:** 3 Phane, gathered in the Bushveld during the December Mophane window (base P30). **Reward:** P40 · Botho +10 · 1 token.
- **Offer:** *"The branch is stripped bare before the sun is high. My grandmother picked before dawn, so the worms never knew they were being chosen."*
- **Done:** *"One pot's worth. That is the right amount. The rest is for waiting."*
- **Why:** introduces the worm, the rain and the grandmother, and the year's first Bushveld errand.

**3 · Grain for the Lean Months** — *Mogolo*
- **Ask:** 12 Millet (base P48). **Reward:** P60 · Botho +10 · 1 token.
- **Offer:** *"The rain is generous, and generosity makes people forget. Put some grain where the dry season cannot find it."*
- **Done:** *"Now the rain can leave whenever it likes. **Motho ke motho ka batho** [S]: someone will eat this who never learns your name."*
- **Why:** plants the seed of Act III before anyone is thirsty.

**Council Project — Water Reservoir** ("the first spadeful")
- **Description:** *"Dig your share of the council's borehole. The poles, the cement, the sweat: yours."*
- **Completion (Mogolo):** *"**Metsi a teng** [S]. The water is there. Your name was read at the Kgotla."*

**Act close (1 Feb, Mogolo):** *"The rain was the easy part. Now the green season asks what you will do with plenty."*

### Act II — Letlhafula · *Give* · 1 Feb – 30 Apr

**Frame.** The late rains and the green season; `rainCoverage` 0.50. Seeds: Maize, Watermelon, Tomatoes, Groundnuts, Sesame, Pepper. The April Mophane window closes the act. This is the Botho moment of the year: the festival is about sharing, not selling.

**4 · The Round Ones** — *Mama Naledi*
- **Ask:** 6 Watermelon (base P66). **Reward:** P85 · Botho +10 · 1 token.
- **Offer:** *"Bring the round ones. The children have been asking at my stall since the first flower."*
- **Done:** *"The scale is honest, and so are these. **Ke a leboga** [S]."*

**5 · The Kraal Gate** — *Ntate Kabelo*
- **Ask:** 4 Plank + 2 Rope (base P64, crafted). **Reward:** P70 · Botho +10 · 1 token.
- **Offer:** *"The late rains soften the ground, and soft ground swallows a gatepost. Planks for the fence, rope for the gate."*
- **Done:** *"A kraal that stays shut is a kraal at peace. **Tsamaya sentle** [S]."*

**6 · Something for the Pot** — *Mogolo*
- **Ask:** 5 Groundnuts + 2 Pepper (base P89). **Reward:** P110 · Botho +10 · 1 token.
- **Offer:** *"The Mophane festival is at the fire. Refilwe brings the worms. I am told a pot wants something rich and something sharp."*
- **Done:** *"A feast is only a meal until someone shares it. Then it is a memory."*

**Council Project — The Mophane Festival** ("share the first rain's food")
- **Description:** *"Bring what you can to the fire. The worms are Refilwe's; the feast is the ward's."*
- **Completion (Mogolo):** *"**Kgosi ke kgosi ka batho** [S]. The fire is the ward's, and so is the pot."*
- **Note:** This project is new (the existing set has no festival); its threshold is R-Q4.

**Act close (1 May, Mogolo):** *"The green season is a loan. The dry one comes to collect."*

### Act III — Mariga · *Keep* · 1 May – 31 Jul

**Frame.** Dry and cold; `rainCoverage` 0.05, the season of harvest and threshing. Seeds: Sorghum, Millet, Cowpeas, Sesame, Herbs, Morula. Water is the whole game; the drought line finds its season here. The lesson is restraint: choose whose drop of water it is.

**7 · Threshing Day** — *Thabo*
- **Ask:** 8 Cowpeas (base P48). **Reward:** P60 · Botho +10 · 1 token.
- **Offer:** *"Harvest is a week of noise and dust. Bring your dinawa and your back."*
- **Done:** *"Many hands make the pile smaller. That is the only trick I know."*

**8 · The Cold Pot** — *Refilwe*
- **Ask:** 3 Herbs (base P75). **Reward:** P95 · Botho +10 · 1 token.
- **Offer:** *"The cold brings coughs, and the herbs will not water themselves. Every drop counts. Choose whose."*
- **Done:** *"A little of this and the whole ward breathes easier."*

**9 · The Long Promise** — *Mogolo*
- **Ask:** 2 Morula (base P92). **Reward:** P115 · Botho +10 · 1 token.
- **Offer:** *"A morula is a promise made in one generation and kept in the next. Bring me the fruit of one."*
- **Done:** *"Some things are kept back so they can be given later. That is not hoarding. That is patience."*

**Council Project — The Water Store** (led by Kabelo)
- **Description:** *"Haul stone and clay for the ward's water store. When the sky is silent, this is what the ward drinks."*
- **Completion (Mogolo):** *"The sky is silent. The store is not."*
- **Note:** New project; threshold is R-Q4.

**Act close (1 Aug, Mogolo):** *"You kept something back. Now let the wind teach you to let go."*

### Act IV — Dikgakologo · *Leave* · 1 Aug – 31 Oct

**Frame.** Wind and preparation; `rainCoverage` 0.15. Seeds: Millet, Sorghum, Watermelon, Pepper, Herbs, Morula. Late in the act the ploughing season is declared and seed is scattered at the Kgotla, which closes the loop. The lesson is to leave something behind.

**10 · Pepper for the Stall** — *Mama Naledi*
- **Ask:** 4 Pepper (base P68). **Reward:** P85 · Botho +10 · 1 token.
- **Offer:** *"The wind dries everything except opinions. Bring pepper; the town is tired of plain food."*
- **Done:** *"Come back with something in your hands, and we will always talk."*

**11 · Ropes for the Ploughing** — *Ntate Kabelo*
- **Ask:** 3 Rope + 3 Brick (base P87, crafted). **Reward:** P95 · Botho +10 · 1 token.
- **Offer:** *"The ploughing will be declared soon, and the ropes will be asked to pull more than they were made for. Bricks to steady the yoke shed."*
- **Done:** *"Now the ground can start whenever it likes."*

**12 · Seed for the Scattering** — *Mogolo*
- **Ask:** 8 Sorghum + 6 Millet (base P48; the two are equal in value, 4 sorghum = 3 millet). **Reward:** P60 · Botho +10 · 1 token.
- **Offer:** *"The kgosi declares the ploughing season and the seed is scattered at the Kgotla. Bring grain for the scattering. What falls here, falls for all."*
- **Done:** *"The year turns. **Pula!** [S] Your name was read."*
- **Note:** Fires the yearly declaration beat (calendar specification §2.5).

**Council Project — The School** ("leave something behind")
- **Description:** *"Carry clay for the school wall. Your grandchildren will not know your hands were in it."*
- **Completion (Mogolo):** *"The wall stands. Children will lean on it and never ask whose hands. That is how you know it is well built."*

### The Reading of Names (1 November)

When the year turns, Mogolo reads the names of everyone who contributed to a Council Project in the closing cycle. The reading is **unranked and alphabetical**, appears once, and is a recognition beat only: it carries no reward and no comparison.

The reading is a **game ritual**, not a claimed tradition (§9, V-6).

---

## 7. Returning years

Rewards are unchanged; the voice changes. One sample line per act, in Mogolo's voice, shown in place of the first-year offer from the second cycle:

| Act | Returning line |
| --- | --- |
| I | *"You know the rain by now. Begin anyway."* |
| II | *"Last year you gave. Someone remembers."* |
| III | *"The dry season knows you. It still asks."* |
| IV | *"You have left something behind before. Leave something better."* |

A returning-year variant is one short line per Charge, authored in the same pass as the first year.

---

## 8. Economy check and verification

### 8.1 Faucet size

| # | Charge | Base value | Reward | Ratio |
| --- | --- | --- | --- | --- |
| 1 | Straight Rows | P30 | P40 | 1.33 |
| 2 | The First Phane | P30 | P40 | 1.33 |
| 3 | Grain for the Lean Months | P48 | P60 | 1.25 |
| 4 | The Round Ones | P66 | P85 | 1.29 |
| 5 | The Kraal Gate | P64 | P70 | 1.09 |
| 6 | Something for the Pot | P89 | P110 | 1.24 |
| 7 | Threshing Day | P48 | P60 | 1.25 |
| 8 | The Cold Pot | P75 | P95 | 1.27 |
| 9 | The Long Promise | P92 | P115 | 1.25 |
| 10 | Pepper for the Stall | P68 | P85 | 1.25 |
| 11 | Ropes for the Ploughing | P87 | P95 | 1.09 |
| 12 | Seed for the Scattering | P48 | P60 | 1.25 |
| | **Year** | **P745** | **P915** | **1.23** |

**P915 a year is about 4.0% of a 4-plot farm's annual baseline** (P1,913 a month) **and 0.9% of a 20-plot farm's** (P8,814 a month). Charges are a narrative and community pillar first and a faucet second. **Botho from Charges is 120 a year**, well under the 500 for Letsema, so the Kgotla cannot be farmed for the prize. Council Project contributions and their per-day caps are unchanged.

### 8.2 Feasibility

Each ask fits inside its chapter: the seed is stocked that chapter, or the source is gathered or crafted without a gate. The largest ask (12 Millet, 16 h growth, 3–5 per plot) needs about three plot-harvests. The heaviest craft ask (4 Plank + 2 Rope, 2 h timers, one slot, batches of 1/3/6) needs about three to four days. Phane depends on the Kagiso-limited December window.

### 8.3 Checklist

**Calendar and loop**
- [ ] A Charge reveals at 00:00 Africa/Gaborone on the first of its month; UTC test instants land on the 22:00 boundary of the previous day.
- [ ] Cycle key: 2026-11-01 → 2026/27; 2027-01-15 → 2026/27; 2027-10-31 → 2026/27; 2027-11-01 → 2027/28.
- [ ] A Charge is deliverable once per cycle and again in the next; a second delivery in the same cycle is rejected.
- [ ] An undelivered Charge rests at chapter end with no debit; a late joiner sees the current chapter's Charges up to the current month.

**Rewards and economy**
- [ ] Every reward equals the §5.1 formula recomputed from item base values; ratios lie in the §5.1 bands.
- [ ] Each requested crop's seed is stocked in that Charge's chapter; no requested item is Botho-gated or v1.1.
- [ ] Botho is +10 through the capped path; a capped day still completes the Charge.
- [ ] The Almanac `quests` counter rises by exactly 1 per delivery.
- [ ] The balance verification script passes with the Charge faucet included.

**Integrity**
- [ ] 20 concurrent delivery requests produce exactly one reward and one deduction.
- [ ] The Auto-Collector test (I4) asserts it cannot deliver a Charge or contribute to a project.
- [ ] A CI test asserts Guild status changes no Charge reveal, cost, reward or Botho.
- [ ] No ranking field or leaderboard exists on Charges, projects or the reading.
- [ ] Copy contains no non-Latin characters; each Charge names the right NPC.

---

## 9. Cultural authenticity register

| ID | Item | Status |
| --- | --- | --- |
| V-1 | The kgotla as assembly and court: consensus, everyone may speak, headman and ward, decisions on matters such as harvest | **Sourced** |
| V-2 | *Motho ke motho ka batho*; *Kgosi ke kgosi ka batho* | **Sourced** (the first is already in the project; the second is the subject of a peer-reviewed article) |
| V-3 | The ploughing declaration and seed-scattering at the kgotla | **Sourced** |
| V-4 | Setswana phrases marked [S] (*Metsi a teng, Ke a leboga, Tsamaya sentle, Pula!*) and the title *Ngwaga kwa Kgotleng* | **Needs native-speaker pass** |
| V-5 | Kabelo as builder of kraals, ropes and walls; Refilwe's grandmother | **Assigned by this document / suggested in review**; confirm with the cast owner |
| V-6 | **The Reading of Names** | **Invented.** It is a game ritual. It must never be marketed or written as a Tswana tradition. |
| V-7 | The Mophane festival as a ward gathering | **Game construct** built on a real seasonal harvest; label it accordingly |
| V-8 | Dialogue lines | **English intent only**; all Setswana and proverb use are for elder review before shipping |

The principle behind V-6 and V-7: where the game invents, it says so; where it borrows, it shows the source.

---

## 10. Open rulings

| # | Question | Default adopted | Consequence of the alternative |
| --- | --- | --- | --- |
| **R-Q1** | Retire the five rotating charges in favour of the year? | **Yes** (K10). | Keeping them as evergreen "errands" gives more daily content but reopens the unordered-list problem, and any Botho from them must stay inside the same daily cap. |
| **R-Q2** | How many Chapter Tokens per Charge? | **1** (tunable). | Needs calibration against Almanac tier costs, which this document does not fix. |
| **R-Q3** | Should completing a full year earn a small cosmetic marker? | **No.** Recognition is the reading only. | A marker adds a Pula-adjacent reward and a tenure comparison, which cuts against K-rule 5. |
| **R-Q4** | Contribution thresholds for the two new projects (Mophane Festival, Water Store)? | **150 each**, the median of the current 100 / 200 / 150, in the existing unit. | Must be run through the simulator: projects are deliberately not grindable and are limited by a per-day contribution cap. |

---

## 11. Sources

- Kgotla, definition, consensus and Setswana origin: https://en.wikipedia.org/wiki/Kgotla
- Kgotla and bogosi in Tswana traditional rule, public assemblies (*pitso*, *phuthego*), the kgosi's role: https://sk.sagepub.com/ency/edvol/embed/intlpoliticalscience/chpt/traditional-rule
- Wards (*dikgotla*), headman, decisions from harvest to hunting, the right of all to speak: https://www.chaloafrica.com/diary/social-structure-and-family-in-botswana-life-around-the-kgotla/
- "Kgosi ke kgosi ka batho", Scriptura article: https://scriptura.journals.ac.za/pub/article/view/2119
- Ploughing-season declaration and seed-scattering at the kgotla, Botswana Daily News: https://dailynews.gov.bw/news-detail/58771 and https://dailynews.gov.bw/news-detail/75478
- Month names: https://humanities.nwu.ac.za/sites/humanities.nwu.ac.za/files/files/music/Terminologies/Setswana-Months-year.pdf
- Agricultural rhythm, north-eastern Botswana (Wits): https://wiredspace.wits.ac.za/bitstreams/36bb3c34-9a03-499c-bfd6-18cbf0b18c58/download
