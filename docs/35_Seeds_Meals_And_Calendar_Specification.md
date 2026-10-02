# Molemisi — Seeds, Meals & Calendar Specification

**Date:** 2026-09-28
**Status:** **Draft for ruling.** Nothing in this document is implemented. Four items in §7 need an explicit ruling; each carries a default so that work can proceed.
**Scope:** The annual calendar and its chapters; the eleven crops and the seasonal seed calendar; the meals (crafted food) and the profitability rules that govern every recipe.
**Authority:** On adoption, this document replaces every earlier statement on the calendar, seed stocking and recipes. It is written to stand alone: every figure it depends on is reproduced here.
**Consolidated 2026-10-02 → `docs/37_Consolidated_Playable_Year_Specification.md`:** joined with `docs/36` and the decided economy (`docs/33`/`docs/34`) into a single gameplay spec. On shared points — the chapter rename (R-1/§2.7), the Letsema declaration beat trigger, the Flour gate (R-4), festival placement, and season-stamp sinks — `docs/37` §2 governs; calendar, seed and recipe detail remains here.

---

## 0. Decisions at a glance

| ID | Decision | Status |
| --- | --- | --- |
| **D1** | The calendar is the **real-world year**, read in Botswana time. It loops by month lookup; no in-game clock, no stored year. | Adopted |
| **D2** | **One calendar only.** The four-chapter year is the sole season authority for weather, growth modifier, seed stocking, tokens and events. | Adopted |
| **D3** | Chapter **display names** change to *Pula, Letlhafula, Mariga, Dikgakologo*; internal identifiers become stable and are migrated once. | **Default — R-1** |
| **D4** | The **seed calendar is unchanged** (six seeds per chapter, 24 stockings, every crop in 2–3 chapters). | Adopted |
| **D5** | Seed **purchase** is season-gated; **planting** a carried seed is not. | **Default — R-3** |
| **D6** | **Flour** accepts **4 sorghum or 3 millet** (the old 4-millet branch was a loss-making trap). | Adopted (defect fix) |
| **D7** | Every recipe must clear the **floor test** in §4.1. | Adopted |
| **D8** | Five traditional dishes are added in **v1.1** (§4.3). The MVP keeps its five recipes. | Adopted |
| **D9** | The Mophane windows stay **April and December**, decoupled from chapters. | Adopted |

---

## 1. Principles

1. **The calendar is real.** Every player experiences the same weeks. The Setswana year is the game's most defensible asset; it is therefore held to a standard of cultural accuracy, and every claim in §5 is marked as *sourced* or *needs elder verification*.
2. **The frame need not nest neatly.** Chapters are a frame laid over the real year; real-calendar events (Mophane) may straddle chapter boundaries, deliberately.
3. **Water is the season.** A chapter's character is expressed through `rainCoverage`, not through decoration. An empty tank halts growth and never kills a crop.
4. **No punitive mechanics.** Nothing in this document may cause loss of a crop, an animal, or a recipe input by inaction.
5. **A craft is never a loss by accident.** Every recipe is profitable at the worst price the market can legally print.
6. **Cozy surprises go upward only.** Bonus units are permitted; failed crafts are not.

---

## 2. The calendar system

### 2.1 The yearly loop

The game year runs **1 November to 31 October**, so that the rains and planting open the loop.

```
Chapter 1 (Nov–Jan)  →  Chapter 2 (Feb–Apr)  →  Chapter 3 (May–Jul)  →  Chapter 4 (Aug–Oct)  →  Chapter 1 …
```

The active chapter is a **pure function of the calendar month** in the **Africa/Gaborone** time zone (UTC+2, no daylight saving). No year counter, chapter cursor or cron job is required; the loop is closed by the modulus of the month. Chapter transitions are computed on read, consistent with the rest of the simulation.

### 2.2 Months

| # | Setswana | English | Chapter | Note (sourced where stated) |
| --- | --- | --- | --- | --- |
| 11 | Ngwanatsele | November | 1 | — |
| 12 | Sedimonthole | December | 1 | **Mophane window** |
| 1 | Ferikgong | January | 1 | — |
| 2 | Tlhakole | February | 2 | — |
| 3 | Mopitlwe | March | 2 | — |
| 4 | Moranang | April | 2 | **Mophane window** |
| 5 | Motsheganong | May | 3 | — |
| 6 | Seetebosigo | June | 3 | — |
| 7 | Phukwe (also written *Phukwi*) | July | 3 | Named for new green leaves after winter |
| 8 | Phatwe | August | 4 | Named for the winds |
| 9 | Lwetse | September | 4 | — |
| 10 | Diphalane (also written *Phalane*) | October | 4 | Named for young impala, born in this month |

Each month shows a one-line seasonal note beside the daily proverb. Only three notes above are sourced; the remaining nine are to be supplied through elder review (§5).

### 2.3 Chapters

| Ch | Months | **Display name (D3)** | Legacy name | `rainCoverage` | Character (intent, not final copy) |
| --- | --- | --- | --- | --- | --- |
| 1 | Nov–Jan | **Pula** | Sekala sa Pula | **0.80** | Rains, ploughing and planting. The tank fills itself. *Lesson: capital — plant thirsty.* |
| 2 | Feb–Apr | **Letlhafula** | Sekala sa Phane | **0.50** | Late rains, long growth, the green season. The April Mophane window closes it. *Lesson: timing and generosity.* |
| 3 | May–Jul | **Mariga** | Sekala sa Moriti | **0.05** | Dry and cold; the season of harvest and threshing. *Lesson: storage and restraint — water is the whole game.* |
| 4 | Aug–Oct | **Dikgakologo** | Sekala sa Letlhafula | **0.15** | Wind and preparation; the ploughing season is declared. *Lesson: selling, and leaving something behind.* |

The `Sekala sa …` prefix is dropped by default: its use as a word for "season" could not be confirmed (§5, V-3).

### 2.4 Boundary behaviour

1. A boundary falls at **00:00 Africa/Gaborone on 1 November, 1 February, 1 May and 1 August.** Expressed in UTC, these are 22:00 on 31 October, 31 January, 30 April and 31 July.
2. **Chapter Tokens expire to zero** at the boundary; the Almanac shows a days-to-expiry countdown.
3. **Seed stock rotates** at the boundary (§3.2).
4. **One chapter beat** fires per player per boundary: one Mogolo line, shown once, never on every load.
5. A player absent across a boundary sees the new chapter on return; no catch-up is granted or forfeited beyond existing rules.

### 2.5 Calendar-keyed events

| Event | Rule | Status |
| --- | --- | --- |
| **Mophane windows** | `month ∈ {4, 12}`. A plain comparison against the real month, **independent of the chapter clock**. The December window falls in Chapter 1, the April window in Chapter 2; this is intentional and must be preserved. | Adopted (D9) |
| **Letsema declaration beat** | Once per year, on the first read on or after 1 October, a cosmetic beat at the Kgotla: Mogolo announces the ploughing season and seeds are scattered. It carries **no economic payload** by default. | Proposed (R-2) |
| **Chapter beat** | See §2.4(4). | Proposed |

The real practice is that the Kgosi declares the ploughing season, commonly late September or October, and seeds are scattered at the main kgotla as a symbol of the beginning of the season. Exact dates vary by kgotla; the fixed game date is an abstraction.

### 2.6 One-calendar rule (D2)

Weather probabilities and the growth modifier are driven **only** by the active chapter's `rainCoverage`. Any second season concept (for example a four-week simulated season) is deleted. All world events and market events key to the four chapters or to the real month (Mophane); none key to a simulated season. Western seasonal markers (solstice, frost warning) are excluded: Botswana's winter is dry, and crop loss is prohibited by Principle 4.

### 2.7 Migration of chapter identifiers

Because display names move between chapters (the name *Letlhafula* moves from Chapter 4 to Chapter 2), a rename by string replacement is unsafe.

1. Introduce **stable identifiers** `ch1`–`ch4` as the keys used by seed stocking, tokens, Almanac rows and events; names become data.
2. Migrate any stored references in **one transaction**, mapping by month range, never by name.
3. Never leave a state in which the slug `letlhafula` refers to two different chapters.
4. If R-1 is ruled against renaming, only the display strings revert; identifiers are unaffected.

---

## 3. Seeds

### 3.1 The crops

All eleven crops are available from the start; **nothing is level-gated.** The only variable is which seeds are stocked in a given chapter. Values are in Pula (P).

| Crop | Setswana | Seed | Base | Yield | Growth | Cadence | Water/hr | Thirst |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sorghum | Mabele | P2 | P3 | 4–6 | 18 h | 1 day | 0.04 | 1 drop |
| Millet | Lebelebele | P2 | P4 | 3–5 | 16 h | 1 day | 0.06 | 1 drop |
| Maize | Mmidi | P3 | P5 | 4–6 | 22 h | 1 day | 0.20 | 3 drops |
| Cowpeas | Dinawa | P3 | P6 | 3–5 | 20 h | 1 day | 0.10 | 2 drops |
| Tomatoes | Tamati | P5 | P10 | 2–4 | 24 h | 1 day | 0.26 | 3 drops |
| Watermelon | Legapu | P6 | P11 | 4–6 | 44 h | 2 days | 0.30 | 3 drops |
| Groundnuts | Manoko | P8 | P11 | 4–6 | 40 h | 2 days | 0.10 | 2 drops |
| Sesame | Sesame | P10 | P15 | 3–5 | 46 h | 2 days | 0.12 | 1 drop |
| Pepper | Pepere | P12 | P17 | 3–5 | 44 h | 2 days | 0.18 | 2 drops |
| Herbs | Ditlhare tsa Setso | P16 | P25 | 2–4 | 48 h | 2 days | 0.14 | 2 drops |
| Morula | Morula | P28 | P46 | 2–3 | 48 h | 2 days | 0.04 | 1 drop |

Governing rules, all hard:

1. **No crop's growth lies between 24 h and 40 h.** With one check-in per day a crop yields one harvest per visit if it finishes within 24 h, otherwise one per two visits. Every crop is explicitly 1-day or 2-day.
2. **No growth timer is under 12 h.**
3. **A 2-day crop pays roughly twice a comparable 1-day crop per harvest**, so waiting is a trade against capital, not a penalty.
4. **Water hunger, not price, differentiates crops.** Thirst (1–3 drops) is shown on every seed packet.
5. **Morula is the top-of-ladder crop.** Net per plot per day, after 5% tax and before water, runs from P12.25 (sorghum) to P40.63 (morula): a 3.3× spread, ordered by seed cost and capital at risk.

### 3.2 The seed calendar (D4)

Six seeds are stocked per chapter. Thirsty crops cluster in the rainy chapters and drought-tolerant crops in the dry ones, so the calendar forces rotation and makes water a seasonal decision.

| Chapter | Seeds stocked |
| --- | --- |
| **1 · Pula** (Nov–Jan) | Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet |
| **2 · Letlhafula** (Feb–Apr) | Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper |
| **3 · Mariga** (May–Jul) | Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula |
| **4 · Dikgakologo** (Aug–Oct) | Millet · Sorghum · Watermelon · Pepper · Herbs · Morula |

### 3.3 Coverage matrix

| Crop | Ch 1 | Ch 2 | Ch 3 | Ch 4 | Chapters |
| --- | :-: | :-: | :-: | :-: | :-: |
| Sorghum | ● | | ● | ● | 3 |
| Millet | ● | | ● | ● | 3 |
| Maize | ● | ● | | | 2 |
| Cowpeas | ● | | ● | | 2 |
| Tomatoes | ● | ● | | | 2 |
| Watermelon | | ● | | ● | 2 |
| Groundnuts | ● | ● | | | 2 |
| Sesame | | ● | ● | | 2 |
| Pepper | | ● | | ● | 2 |
| Herbs | | | ● | ● | 2 |
| Morula | | | ● | ● | 2 |

Total stockings: 24 (3 + 3 + 9 × 2). Best crop per chapter rotates **Tomatoes → Pepper → Morula → Morula**. In Chapter 3 a 20-plot watermelon farm would need two tank refills a day, so the only sensible choices are drought crops.

### 3.4 Availability rules

1. Exactly six seeds are stocked per chapter; **an out-of-season seed cannot be purchased**, enforced server-side.
2. **Purchase is gated; planting is not (D5, R-3).** A carried seed may be planted in any chapter. Seeds stack to 99, seed cost ties up capital, and water remains the binding constraint, so hoarding does not defeat rotation.
3. The seed calendar is data, seeded from configuration, idempotently. No numeric literal from §3 appears in application code.
4. The store response exposes each seed's thirst rating.

### 3.5 Agronomy framing (why the calendar is defensible)

Observed rain-fed practice in Botswana is to plough with the first rains (September/October), plant by December, weed from January and harvest from late May through July. About 90% of rainfall arrives between November and April. The seed calendar departs from this in two places, and the departure is a deliberate game abstraction:

- **Sorghum, millet and cowpeas in Chapters 3 and 4.** These stockings represent **tank-watered garden plots**, which is precisely what the water mechanic models. Rain-fed fields belong to Chapters 1 and 2; tank-fed gardens to Chapters 3 and 4. This framing is to be used in the tutorial and the chapter beats.
- **Tomatoes in Chapters 1 and 2**, the hottest months. This is retained because tomato thirst is what makes Chapter 1 and 2 water-rich play worthwhile; growers may nonetheless remark on it. Any change requires re-running the balance verification (§6).

---

## 4. Meals and recipes

### 4.1 Pricing conventions and the floor test (D7)

- **Tax:** 5% on every sale.
- **Opportunity cost of an input** = base value × 0.95 (what the player forgoes by not selling it net of tax).
- **Crafted goods are exempt from the raw-goods price band** and sell at 1.0× base, ±10%. The **floor price is 0.9× base.**
- **Total cost** = Σ inputs at opportunity cost + fee.
- **Profit at base** = 0.95 × sale − total cost. **Profit at floor** = 0.95 × 0.9 × sale − total cost.
- **Every row must close horizontally:** total cost + profit = net.

**The floor test.** A recipe is admissible only if (a) profit at floor is **positive**, and (b) floor ROI is **at least 20%**. Target ROI at base is 35–42%. The recipe card prints the **floor** margin, so the printed figure is a true worst case. Figures are rounded half-up to two decimals.

**Batching.** A player may craft 1, 3 or 6 at once; the fee scales 1× / 2.5× / 4×. Fee per unit therefore falls with batch size, so **a batch of one is the worst case** and the floor test is evaluated there.

**Substitution.** Substitutes must be close in value, or one branch is a trap: alternative inputs must have equal base value in total.

### 4.2 MVP recipes (five)

Available from the crafting menu; **no station gating.**

| Recipe | Setswana | Input | Fee | Sale | Profit @ base | ROI @ base | Profit @ floor | ROI @ floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plank | Poleto | 2 Wood | P1 | P7 | P1.85 | 38.5% | P1.19 | 24.7% |
| Rope | Thapo | 3 Palm Fiber | P1 | P18 | P4.70 | 37.9% | P2.99 | 24.1% |
| Brick | Setena | any 2 of Clay / Stone | P2 | P11 | P2.75 | 35.7% | P1.71 | 22.1% |
| Flour | Bupi | **4 Sorghum or 3 Millet** | P2 | P20 | P5.60 | 41.8% | P3.70 | 27.6% |
| Bread | Borotho | 2 Flour | P3 | P60 | P16.00 | 39.0% | P10.30 | 25.1% |

**Defect corrected (D6).** The former Flour input of "4 Sorghum or Millet" priced the millet branch at 4 × P4 = P16 base against sorghum's P12. At the floor the millet branch returned **−P0.10** (−0.6%), and only P1.80 at base against P5.60. It violated both the substitution rule and the floor test. Three millet equals four sorghum at base value P12; both branches now return identical margins.

**Note on Bread.** Bread flour is not part of the traditional basic diet and was imported, although bread is now part of national fare. Bread is retained in the MVP because its economics are verified; it should not carry the food identity of the game. The traditional dishes of §4.3 do.

### 4.3 Traditional dishes, v1.1 (D8)

All inputs already exist in the item catalogue. Outputs are food (category DIKUNO, stack 20).

| Dish | Tradition | Input | Fee | Sale | Cost | Profit @ base | ROI @ base | Profit @ floor | ROI @ floor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Dikgobe** | Peas and beans cooked with maize meal or samp; a seasonal staple | 2 Cowpeas + 2 Maize | P3 | P35 | P23.90 | P9.35 | 39.1% | P6.03 | 25.2% |
| **Bogobe jwa Lerotse** | Sorghum porridge with cooking melon and sour milk; a wedding dish (watermelon stands in for lerotse) | 1 Flour + 1 Watermelon + 1 Milk | P3 | P54 | P37.20 | P14.10 | 37.9% | P8.97 | 24.1% |
| **Ting** | Sorghum fermented for some days until sour, then cooked as porridge | 1 Flour; **long craft timer** (fermentation) | P2 | P30 | P21.00 | P7.50 | 35.7% | P4.65 | 22.1% |
| **Madila** | Fermented (soured) milk | 3 Milk | P1 | P22 | P15.25 | P5.65 | 37.0% | P3.56 | 23.3% |
| **Dried Phane** | Preserved mophane worms; craftable only from gathered Phane, hence rare | 3 Phane | P3 | P46 | P31.50 | P12.20 | 38.7% | P7.83 | 24.9% |

The Setswana name for Dried Phane is provisional (§5, V-4). **Seswaa** is deliberately excluded: the game has no meat item, and a cozy farm should not require slaughter. **Morula-based recipes are held back** until the dominance check (§6) confirms they do not lift the top of the ladder past the permitted spread.

### 4.4 Where each dish's inputs come into season

Seasonality is *soft*: harvested crops do not spoil in the MVP, so a player may stock ingredients in any chapter. The table shows the chapters in which every seed-grown input can be **bought as seed**.

| Dish | Seed-grown inputs | Natural chapter |
| --- | --- | --- |
| Dikgobe | Cowpeas {1, 3} ∩ Maize {1, 2} | **Ch 1 only** |
| Bogobe jwa Lerotse | Sorghum or Millet {1, 3, 4} ∩ Watermelon {2, 4} | **Ch 4 only** |
| Ting | Sorghum or Millet {1, 3, 4} | Ch 1, 3, 4 |
| Madila | none (livestock milk) | year-round |
| Dried Phane | none (gathered) | Apr and Dec windows |

Seasonal identity therefore rests on seed stocking and calendar events until freshness decay ships.

### 4.5 Unlocks (R-4)

- **No recipe is station-gated.**
- **Flour unlocks at Botho 100** (unchanged).
- Ting and Bogobe jwa Lerotse require Flour, so they inherit that gate. Dikgobe, Madila and Dried Phane are ungated by default.
- **No recipe unlock may depend on subscription status.** Botho accrues independently of the Guild subscription, and no path allows Pula spending to confer Botho; unlocks therefore cannot be purchased.

### 4.6 Craft behaviour

1. A craft is rejected on missing inputs **or** an unaffordable fee.
2. A batch may occasionally yield one bonus unit, accompanied by a Mogolo line. A craft never fails.
3. The recipe card shows input value against output value and states plainly if the current market has made a recipe underwater; under §4.1 this cannot occur for crafted goods, so the message exists only as a guard.
4. Recipe screens lead with **"What can I make?"** and **"What am I short of?"**, and substitutions are shown as a visible choice defaulting to whichever input the player holds more of.

### 4.7 Items added in v1.1

| Item | Category | Stack | Base value |
| --- | --- | --- | --- |
| Dikgobe | DIKUNO | 20 | P35 |
| Bogobe jwa Lerotse | DIKUNO | 20 | P54 |
| Ting | DIKUNO | 20 | P30 |
| Madila | DIKUNO | 20 | P22 |
| Dried Phane (name provisional) | DIKUNO | 20 | P46 |

Market price seed data is regenerated from this catalogue as the single canonical source.

---

## 5. Cultural authenticity register

| ID | Item | Status |
| --- | --- | --- |
| V-1 | Month names and their order | **Sourced** (two independent Setswana word lists agree; spellings *Phukwe/Phukwi* and *Diphalane/Phalane* vary) |
| V-2 | Season vocabulary: Mariga (winter), Letlhafula (autumn), Dikgakologo (spring), Selemo (summer) | **Sourced from one course**; regional variation is likely; **needs elder verification** |
| V-3 | The `Sekala sa …` prefix as a word for "season" | **Unconfirmed**; dropped by default |
| V-4 | *Phane e e omisitsweng* (dried phane) | **Provisional**; needs verification |
| V-5 | Nine of twelve month notes | **Not yet supplied**; elder review |
| V-6 | Whether four named seasons are a traditional Setswana division | **Open.** Sesotho sources report only two traditional seasons, with four names as a borrowed frame; the same may hold for Setswana. The four chapters are therefore presented as *the game's chapters*, not as "the four traditional seasons". |
| V-7 | Agricultural rhythm (plough Sep/Oct, plant by Dec, weed Jan, harvest late May–Jul) | **Sourced** from one north-eastern village interview and national sources; varies by region |
| V-8 | Dish descriptions in §4.3 | **Sourced** from general Botswana cuisine references |

The V-2 renaming rests on a single source and must not be considered final until V-2 and V-6 are settled by a fluent speaker or a lexicographer.

---

## 6. Verification checklist

**Calendar**
- [ ] `chapterForMonth` returns the §2.3 chapter for all twelve months; month 10 → Ch 4 and month 11 → Ch 1 (the loop closes).
- [ ] Boundary tests at the UTC instants in §2.4: `2026-10-31T21:59:59Z` → Ch 4; `2026-10-31T22:00:00Z` → Ch 1; likewise for 1 Feb, 1 May and 1 Aug.
- [ ] Exactly **one** season concept exists in configuration; weather and growth modifier read `rainCoverage`; Ch 3 yields measurably fewer rain hours than Ch 1 over a fixed seed.
- [ ] Mophane is active only when the real month is 4 or 12, verified with a mocked clock; a false negative is asserted outside the window.
- [ ] No event, contract or market row references a simulated season, `xp` or `energy`.
- [ ] Chapter Tokens read zero after a boundary; the chapter beat shows once per boundary.
- [ ] The migration leaves no stored reference keyed by a legacy chapter name.

**Seeds**
- [ ] Six seeds are seeded per chapter; the total is 24; every crop appears in 2 or 3 chapters (§3.3).
- [ ] Purchasing an out-of-season seed is rejected server-side; planting a carried seed is accepted (D5).
- [ ] Every seed exposes a thirst rating of 1–3.
- [ ] No growth timer is under 12 h or between 24 h and 40 h.
- [ ] Morula is the top-of-ladder crop; no non-Botswana placeholder crop exists in seed data.
- [ ] Seeding is idempotent: a second run changes nothing.

**Recipes**
- [ ] For every recipe, profit at floor is positive and floor ROI ≥ 20% at batch size 1.
- [ ] Every row closes: total cost + profit = net.
- [ ] Alternative inputs are equal in base value (4 sorghum = 3 millet = 12).
- [ ] The balance verification script passes with the new recipes: dead-zone 0, dominance ≤ 3, crop value spread ≈ 3.3×.
- [ ] No recipe unlock reads subscription status; a CI test asserts subscription confers no advantage in Botho accrual or in the community prize.
- [ ] The grain category used by market events contains sorghum and millet only; maize is excluded.

---

## 7. Open rulings

| # | Question | Default adopted | Consequence of the alternative |
| --- | --- | --- | --- |
| **R-1** | Rename the chapters to Pula, Letlhafula, Mariga, Dikgakologo? | **Yes**, pending elder verification (V-2, V-6). | Reverting changes display strings only (§2.7). |
| **R-2** | Should the Letsema declaration carry a small free-seed gift? | **No**; cosmetic beat only. | A gift adds a new income source and must be run through the balance verification. |
| **R-3** | Gate planting as well as purchasing? | **No**; purchase-gated only (D5). | Gating planting adds a rule to explain and a failure state to design, and may read as punitive. |
| **R-4** | How do v1.1 dishes unlock? | Flour-based dishes inherit the Flour gate; the other three are ungated (§4.5). | Botho-gating all five would give Botho a further sink but slows early crafting. |

One knock-on decision: the Flour recipe was placed behind Botho 100 as a substitute for dairy content that did not yet exist. With Madila craftable from milk the game already produces, confirm whether the Flour gate stays at Botho 100 or dairy recipes should assume that role.

---

## 8. Sources

- Months of the year (Setswana): https://humanities.nwu.ac.za/sites/humanities.nwu.ac.za/files/files/music/Terminologies/Setswana-Months-year.pdf
- Setswana seasons vocabulary, UNISA: https://www.unisa.ac.za/static/corporate_web/Content/UnisaOpen/freeOnlineCourse/PDF/Setswana/Learn%20online%20Setswana%20-%20Theme%204.pdf
- Month-name meanings, UNISA: https://www.unisa.ac.za/static/corporate_web/Content/UnisaOpen/freeOnlineCourse/Setswana/Setswana3.html
- Sotho calendar (two traditional seasons): https://en.wikipedia.org/wiki/Sotho_calendar
- Agropastoralist interviews, north-eastern Botswana (Wits): https://wiredspace.wits.ac.za/bitstreams/36bb3c34-9a03-499c-bfd6-18cbf0b18c58/download
- Botswana country report, FAO: https://www.fao.org/fileadmin/templates/agphome/documents/PGR/SoW1/africa/BOTSWANA.pdf
- Climate of Botswana, Britannica: https://www.britannica.com/place/Botswana/Climate
- Ploughing-season declaration and seed scattering at the kgotla, Botswana Daily News: https://dailynews.gov.bw/news-detail/58771 and https://dailynews.gov.bw/news-detail/75478
- Botswana cuisine: https://en.wikipedia.org/wiki/Botswana_cuisine ; https://www.ciee.org/go-abroad/college-study-abroad/blog/delicately-flavored-dijo-tsa-setswana-setswana-traditonal-food
