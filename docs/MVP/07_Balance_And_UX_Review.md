# 07 — Balance & UX Review

**Date:** 2026-09-07. **Reviewer:** Belvedere. **Status:** findings applied to `01`–`06`.

This is the audit record. It explains **why** each number in the spec is what it is.
**Build from `01`–`06`; read this to understand them.** Where this document and `01`–`06` disagree, `01`–`06` have already been updated and win.

Every figure below was computed, not estimated. The two scripts that produced them are `scripts/balance_audit.py` (current spec) and `scripts/balance_final.py` (retune).

---

## 0. Verdict

The specification is **coherent and buildable**. Three classes of problem needed fixing:

| Class | Severity | Count |
|---|---|---|
| Arithmetic that is wrong or doesn't close | **Blocker** — an implementer would ship a contradiction | 4 |
| Design that produces a broken player experience | **Blocker** | 4 |
| Under-specified but load-bearing | **High** | 5 |
| Gaps in the financial model | **Medium** | 3 |

Nothing here requires re-architecting. All of it is number and flow work.

---

## 1. Blockers — arithmetic

### F1. Crop throughput collapses at 24 hours, and nobody noticed

With a once-daily check-in, a crop yields **1 harvest per visit if it finishes inside 24 h, and 1 harvest per *two* visits if it takes longer.** The old table puts watermelon, groundnuts, sesame, pepper, herbs and saffron at 26–48 h — silently halving their value.

| Crop | Old growth | Old net/day/plot | Problem |
|---|---|---|---|
| Watermelon | 30 h | **P5.70** | Costs *more* seed than sorghum, takes *twice* as long, earns **half** as much |
| Sesame | 30 h | P11.76 | P6 seed to earn less than a P2 crop |
| Pepper | 28 h | P29.00 | Fine, but only by accident |

**Fix applied:** no crop sits between 24 h and 40 h. Every crop is explicitly **1-day (16–24 h)** or **2-day (40–48 h)**, and 2-day crops are priced at ~2× a comparable 1-day crop per harvest. See `02 §6.1`.

### F2. An 8× spread with no tradeoff — tomatoes dominated everything

Old per-plot per-day: **Tomatoes P45.57 vs Watermelon P5.70.** Tomatoes beat the second-best crop (pepper, P29.00) by 57%. With seed availability previously unspecified, the correct play was "plant tomatoes forever."

**Fix applied:** spread reduced to **3.3×** (P12.25 sorghum → P40.60 morula), and the ordering now tracks seed cost and capital-at-risk, so paying more and waiting longer genuinely pays more. Two residual dominances were found and fixed by hand (maize and watermelon were each beaten by a cheaper, faster, drier crop).

### F3. `02 §6.8` claimed 20 plots of maize earns P340

Sorghum and maize had **identical** economics in `02 §6.1` (P2 seed, P4 base, 3–5 yield). The correct figure is **P264**, the same as sorghum. The P340 was unreachable under any reading of the table.

**Fix applied:** corrected, and maize is now genuinely differentiated (higher yield, much thirstier).

### F4. The crafting table doesn't add up horizontally

`02 §6.3` printed `Input cost P4 + Fee P1 = Total P5`, `Net after tax P6.65`, `Profit P1.85`. But 6.65 − 5 = **1.65, not 1.85**.

The cause: the `Input cost` column showed **base value**, while the `Profit` column was computed on **opportunity cost** (base × 0.95). Both are defensible; printing them in adjacent columns is not. A test written from that table fails.

**Fix applied:** `02 §6.3` now shows the opportunity-cost input value throughout, so every row closes. Profits are unchanged (P1.85 / P4.70 / P2.75 / P5.60 / P16.00) — it was a presentation bug, not a balance bug.

---

## 2. Blockers — experience

### F5. Water was too cheap to be a mechanic

At the implied price, water cost 3–17% of gross with barely any variation between crops. The Jojo tank — the single most Botswana-specific system in the game — was decorative.

**Fix applied:** water repriced to **P1.00/unit**, and crop water-hunger widened from a 0.04–0.30 range so it actually bites. Now:

| Crop | Water | 20 plots/day | Full tank lasts | Cost/day in drought |
|---|---|---|---|---|
| Watermelon | 💧💧💧 | 132 units | **0.45 days** | P125 |
| Tomatoes | 💧💧💧 | 125 units | 0.48 days | P119 |
| Sorghum | 💧 | 14 units | 4.2 days | P14 |

A player running 20 plots of watermelon must refill **twice a day**. A player running sorghum refills every four days. **That is the decision the game is about.**

Every seed packet now shows a **1–3 drop rating**, so the mechanic is learnable without a tutorial — which matters, because the failure mode (plant thirsty crops in the dry season) is otherwise a silent tax on the least knowledgeable players.

### F6. Seed seasonality was load-bearing and unspecified

`02 §6.1` said "seed availability rotates by season" and gave no table. That mechanic was doing four jobs:
1. Replacing the retired level gate as the crop discovery mechanism (C12/D6)
2. Preventing tomato monoculture (F2)
3. Making water matter (F5)
4. Making the real Botswana calendar felt

**Fix applied:** a full seed calendar in `02 §6.1`. Thirsty crops cluster in the rainy chapters; drought crops in the dry ones.

| Chapter | Seeds stocked |
|---|---|
| **Pula** (Nov–Jan, rains) | Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet |
| **Phane** (Feb–Apr, late rain) | Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper |
| **Moriti** (May–Jul, dry) | Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula |
| **Letlhafula** (Aug–Oct, wind) | Millet · Sorghum · Watermelon · Pepper · Herbs · Morula |

Best crop per season now rotates: **Tomatoes → Pepper → Morula → Morula**, with drought crops the only sane choice in Moriti. The calendar forces rotation.

### F7. The endgame had nowhere to put Pula

Computed monthly accumulation after all costs: **P1,913 at 4 plots, P5,288 at 12, P8,814 at 20.** Once land is maxed, `02 §7` contained **no unbounded sink** — only seeds, water and one-time purchases.

**Fix applied:** two unbounded sinks added to `02 §7`:
- **Cosmetics, priced in Pula** — hut colours, kraal patterns, livestock coats, Mogolo's hat, scene frames. Seasonal rotation makes it effectively infinite.
- **The Letsema fund** — contribute Pula to community projects. Botho stays *capped*, so this is a pure sink and cannot buy prize eligibility (I4 holds).

### F8. Stone had no use

`02 §6.2` lists Stone at P2 from Rocky Outcrop. **No recipe consumed it.** A third of a scene's output was dead content, and Rocky Outcrop had no economic reason to exist.

**Fix applied:** Setena now accepts **2× Clay, or 1× Clay + 1× Stone**, using the substitution pattern `03 §3.3` already establishes.

---

## 3. Blockers — finance

### F9. Every withdrawal under P150 loses money

`02 §4.2` set a **2% fee, min P2**. Mobile money disbursement carries a fixed cost (roughly P5 + 1.5%).

| Withdrawal | Fee | Gateway cost | Margin |
|---|---|---|---|
| P20 | P2.00 | P5.30 | **−P3.30** |
| P100 | P2.00 | P6.50 | **−P4.50** |
| P500 | P10.00 | P12.50 | **−P2.50** |
| P2,000 | P20.00 (capped) | P35.00 | **−P15.00** |

Every band loses money. **Fix applied:** minimum withdrawal **P100**, fee **max(P5, 2%)**, cap **P20**. The cap is what creates the P2,000 loss — it should be reviewed once real disbursement pricing is known; a 2% uncapped fee is the safer default.

### F10. The Exchange's profitability depends on velocity, not volume

This is the single most important commercial finding, and it wasn't modelled at all.

Deposit P100 (cash-in 3% = P3). Madi changes hands. Seller withdraws the remainder (P5 + 1.5%).

| Trades before withdrawal | Fee revenue | Gateway | **Margin** |
|---|---|---|---|
| 1 | P10.00 | P9.35 | **P0.65** |
| 2 | P20.00 | P9.21 | **P10.79** |
| 3 | P30.00 | P9.09 | **P20.91** |
| 4 | P40.00 | P8.98 | **P31.02** |

**A single trade before cashing out is break-even.** The Exchange only earns once deposited Madi circulates 2+ times. That makes **velocity — not volume, not MAU — the KPI to instrument from day one**, and it means Export Contracts and player contracts (which create reasons to spend rather than withdraw) are revenue-critical, not flavour.

### F11. The cost base had no composition

`02 §8.3` gave break-even at three cost levels but never said what a cost base *is*. **Fix applied** — `02 §8.5` now breaks it down: infrastructure, art, support, legal amortisation, marketing, promotional budget. Indicative totals: **P8,000–15,000/mo** solo with self-produced art, **P20,000–30,000** with contracted art.

At P10,000/mo, break-even is ~4,600 MAU — roughly **0.3% of Botswana's internet users**. Ambitious but not fantasy, which is exactly why the Kgotla's community-driven design has to carry acquisition.

---

## 4. Other changes applied

| # | Change | Where | Reason |
|---|---|---|---|
| F12 | Kagiso regen **6 h → 4 h** (full settle in 24 h) | `04 §4.2` | At 6 h a twice-daily player got 1–2 pips on the second visit — too stingy for a "sweep". 24 h to full is also legible where 36 h wasn't. |
| F13 | Feel target restated to **2–4 hotspots per scene per visit, 6–12 across the Bushveld** | `04 §4.3` | The old "2–3 per scene" was derived from the model that couldn't produce it, and the new number was mis-scaled. |
| F14 | Crafting timers **10–30 min → 2–6 h** | `03 §3` | 10-minute timers pressure a player to sit in the app, which contradicts the 5–15 min session and the no-babysitting goal. |
| F15 | **Tools no longer consume storage slots** | `03 §2` | Four unstacked tools ate 17% of a starting 24-slot basket, permanently. They're equipment, not inventory. |
| F16 | Prize eligibility: **monthly Botho earned, not lifetime** | `02 §6.7` | Botho is capped per day, so lifetime totals converge and ties would be endemic after ~2 months. Monthly delta makes it a contest with a tiebreak (earliest reached). |
| F17 | Land costs **P1,200 / P6,000 / P30,000** (total P37,200) | `02 §6.5` | Income roughly doubled under the crop retune; land had to rise to hold pacing. Ladder payback is now **58–205 days** (114 median). |
| F18 | Saffron → **Morula** | `02 §6.1` | Saffron isn't Botswana. Morula is, it's already a Riverbank Discovery in `04 §6.2`, and it gives the ladder a top end with a real tree's water profile. |
| F19 | **The spec and its own tuning model had drifted apart** | `02 §6.5`, `§6.8`, `§7.1` | Found during the final coherence sweep. `02 §6.1` had been written from one tuning pass while §6.5/§6.8/§7.1 quoted figures from a *different* one — so the doc contradicted itself on land payback (41 vs 58 days), median income (P598 vs P408) and endgame accumulation (P14,178 vs P8,814). All three now quote §6.1's own numbers. Fixed by adding `scripts/balance_verify.py`, which reads the table **as written** and fails loudly on any drift. |

---

## 5. Things I checked and found sound

Not everything is broken, and it's worth recording what isn't:

- **`02 §8` arithmetic is correct.** ARPU P2.27, ARPPU P75.80, net P22,058 after gateway, P21,708 after prize, break-even 4,607 / 11,517 / 23,033 MAU — all reproduce exactly.
- **The opportunity-cost crafting method is right**, and all five recipes are more profitable than the old spec claimed (35.7–41.8% vs 31–36%). Only the presentation was wrong (F4).
- **The Withdrawal Funding Rule holds.** No path in the design has the house funding a withdrawable reward. I1 is sound.
- **The three-currency split is sound.** Pula non-transferable, Madi withdrawable, Chapter Token expiring — each has a distinct job and none of them leak into each other.
- **I4's three controls are sufficient** for the Botho/prize decoupling, provided all three ship together.
- **Break-even is achievable** at a realistic solo cost base.

---

## 6. The daily session — what a player actually does

This is the part of the spec that was thinnest, and it's the part that decides retention.

### 6.1 The honest problem

At 4 plots with ~1-day crops, the core loop is: **harvest, replant, done.** That's about **90 seconds**. Add a Bushveld sweep and a craft, and the session is 4–6 minutes. The spec's target was 5–15.

The wrong fix is more taps. The right fix is **more meaning per tap** — which is also the only fix compatible with "accessible to non-gamers."

### 6.2 Session anatomy

**Visit 1 — morning (2–3 min)**
1. Open → FARM. The plots tell you what's ready before you read anything.
2. Harvest ready plots (one tap each, quantity flies to the basket).
3. Replant (seed sheet is pre-filtered to what's in season and affordable).
4. Glance at the tank. If it's low, top it up or note it.

**Visit 2 — evening (5–8 min)**
1. BUSHVELD — sweep 2–4 hotspots per scene until Kagiso runs out.
2. FARM → Craft — collect finished jobs, start new ones.
3. MARKET — sell. Check whether the price band is up or down today.
4. KGOTLA — quest, project contribution, Elder's line, Almanac.

Kagiso regenerating at +1/4 h is what makes **two visits a day** worth it: a morning sweep and an evening sweep each get ~3 pips per scene. That's the retention hook, and it costs nothing to run.

### 6.3 What makes them come back tomorrow

Five hooks, in order of strength:

1. **A number about to go up.** A crop at 90% is a reason to check back.
2. **Kagiso pips filling.** Visible, always moving, always almost-full.
3. **Something new.** A Journal Discovery — RNG-gated, so every tap might be one.
4. **A goal in reach.** Land tier, Botho threshold, restoration stage.
5. **The season changing.** Chapters, the seed calendar, rain.

### 6.4 The mid-game trough

Between "4 plots, sorghum" and "12 plots, crop rotation" there's a stretch where the game is thin. Three mitigations, all already in `01 §6`:

- **Livestock** — the lowest-effort reliable income, a floor under the economy
- **Kgotla** — quests, projects, the Elder, the Almanac
- **Restoration art** — the Journal's payoff is intrinsic, not a number

If playtesting shows the trough is real, the fix is **more Kgotla content, not more farm taps.**

---

## 7. UI flows

The existing build (`apps/web`) is React with six footer nav items. These flows are written against it.

### 7.1 Cross-cutting rules

1. **Every screen answers "what can I do right now?" in under 3 seconds.** Badge counts on the nav; a "ready" state that's visually obvious without reading.
2. **One primary action per screen**, visually dominant. Everything else is secondary.
3. **Show every cost before confirmation.** Never after. Tax, fee and net are on the same line.
4. **Maximum one sheet deep.** No modals within modals.
5. **48 dp minimum touch target, 56 dp for primary actions.**
6. **Optimistic but honest.** Animate immediately, reconcile on response, roll back gently on failure.
7. **Setswana first, English secondary, icon-led.**
8. **Offline shows last-known state and says so.** Queue nothing that touches value.
9. **Never block on a spinner past 2 s** — skeleton states instead.
10. **Never lose a tap.** If the server rejects, say why in words ("The bush is still settling"), not a code.

### 7.2 Navigation — reduce six to four

Six footer columns on a 360 px screen is 60 px each. **Move Inventory and Settings to the header; keep FARM · KGOTLA · BUSHVELD · MARKET in the footer** at 90 px each. This also restores `01 §3`'s four screens as the actual navigation model, which the current build contradicts.

Inventory stays one tap away as a persistent bag icon in the header, with a badge when something is ready to collect.

### 7.3 FARM

```
┌─────────────────────────────────┐
│ [bag 3]  P 1,240        ⚙       │  ← header: inventory badge, Pula, settings
├─────────────────────────────────┤
│ 🛢 ▓▓▓▓▓▓░░░░ 42%   ☀ Pula      │  ← tank gauge + weather + chapter
│    ~1.8 days left               │
├─────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ 🌱 │ │ 🌾 │ │ ✨ │ │ 🌱 │    │  ← plot grid: growing / ready / empty
│  │ 4h │ │READY│ │    │ │12h│    │     READY pulses
│  └────┘ └────┘ └────┘ └────┘    │
├─────────────────────────────────┤
│  [ 🐄 Livestock ] [ 🔨 Craft ]  │  ← secondary panels
│  [ 🏠 Buildings ] [ 🚜 Land  ]  │
├─────────────────────────────────┤
│  FARM    KGOTLA   BUSHVELD  MKT │  ← 4-column footer
└─────────────────────────────────┘
```

**Plot states are the whole screen:** `empty` (tap to plant) · `growing` (progress ring + hours) · `ready` (pulsing, tap to harvest) · `thirsty` (growth paused, tank empty).

- **Tap empty →** seed sheet: in-season seeds first, out-of-season greyed with "available in Moriti". Each row shows seed cost, **water drops 💧💧💧**, growth time, expected value. Sorted by affordability.
- **Tap ready →** harvest. One tap. Quantity animates into the bag.
- **Tap thirsty →** "Your tank is empty — growth has paused." with a direct **Fill tank** action.

### 7.4 BUSHVELD

```
│ ← Naga e Bulegileng │ Fa Nokeng │ Matlapa │   ← scene tabs
│ Kagiso  ●●●●○○   next pip in 2h 10m          ← always visible
│
│   (illustrated scene; hotspots breathe)
│        ✦                                      ← daily sparkle
│   ~~~        ●        ✧
│
│   [ 📖 Journal 3/14 ]                         ← restoration progress
```

- **Kagiso pips are the header element.** Six dots, with a live "next pip in…" countdown. It is a progress bar that fills — that reads as reward, not restriction.
- **Hotspots** show cost implicitly: a rare tell looks more valuable and dims first when Kagiso is low.
- **Tap →** card flips up: find, quantity, Mogolo's line. **Tap anywhere to dismiss.** No OK button.
- **Blocked tap →** the hotspot visibly settles (dust, a bird returning) and the Elder says *"The bush needs to settle. Come back later."* **Never a 409 toast.**
- **Journal** → one page per scene, greyed silhouettes until found, restoration progress bar, and the scene art at its current stage.

### 7.5 MARKET

Two tabs: **Sell** (Co-op) and **Buy** (seeds).

- **Sell:** list of sellable stacks. Each row: icon, Setswana name, quantity stepper, current price with **trend arrow ↑↓** so players learn to hold for a good day.
- **Confirm sheet is the important screen:**
  ```
  Mabele × 12
  Price today          P 4.20  ↑
  Gross                P 50.40
  Co-op tax (5%)      −P  2.52
  ─────────────────────────────
  You receive          P 47.88
       [ Sell ]   [ Hold for a better price ]
  ```
  The tax is **on the sheet, before the button**, and the "hold" option teaches the band mechanic.
- **Buy:** in-season seeds, with the same water-drop rating as the planting sheet.

### 7.6 KGOTLA

The screen most unlike anything else on the store — and the one that most needs to not look like a menu.

- **Elder's card at the top**, reading real state: tank level, weather, season, Botho. Not a rotating quote.
- **Contracts** — available, active, delivered.
- **Community projects** — shared progress bars, your contribution, a **Letsema fund** button (the Pula sink from F7).
- **Botho** — current, next threshold, what it unlocks, **daily cap remaining**.
- **Almanac** — chapter, chapter tokens, seasonal goals, countdown to chapter end.

### 7.7 Inventory & crafting — farmer sensibility

This is where a game made by gamers usually loses non-gamers. Rules:

1. **Group by what you do with it, not by taxonomy.** "Plant · Sell · Craft · Build" beats all-caps Setswana category headers for a semi-literate player. Keep the Setswana names on the *items*; make the *grouping* functional.
2. **Every item states its use in one line.** "Letsopa — for bricks." Not just a name and a number.
3. **Crafting is need-driven, not list-driven.** A farmer doesn't browse recipes; they want to build a kraal. So: **"What can I make?"** (affordable now) and **"What am I short of?"** — plus a direct path from a building's missing material → craft that material.
4. **Substitution is a visible choice.** Bupi takes sorghum *or* maize; Setena takes clay *or* clay+stone. Show the choice, default to whatever the player has more of.
5. **Default batch to the max affordable**, with 1 / 3 / 6 as a segmented control.
6. **Show stack caps** as `47/50`, and explain overflow in words rather than silently rejecting.
7. **Never let a craft be a loss by accident.** Show input value vs output value on the recipe card.
8. **Tools live in an Equipment section, not inventory** (F15).

---

## 8. Coherence findings

| # | Finding | Resolution |
|---|---|---|
| G1 | `01 §3` says four screens; `apps/web` has **six** nav items including Inventory and Settings | Nav reduced to four + header icons (§7.2) |
| G2 | `apps/game` is Phaser: `BushveldScene`, `KgotlaScene`, `MarketScene` exist but **only `FarmScene` is registered** in `main.ts` | Dead code. `01` D3 says React only — confirm and delete `apps/game`, or it will confuse every future contributor |
| G3 | `02 §6.2` stack caps vs `03 §2` — consistent, but `Special` was listed in the old rubric and is correctly gone | No action |
| G4 | Storage: 24 starting slots vs 11 crops + 11 seed types | Fine in practice (distinct *stacks*, not items), and tools freed 4 slots (F15) |
| G5 | `04 §9.3` Mophane windows (Apr, Dec) fall in **different** chapters | Intentional and documented — the calendar is real, chapters are a frame |
| G6 | Quartz Shard is a Discovery with no item — correct per R3, but it's the only "rare" with no economic echo | Acceptable; it's the restoration/Journal payoff |

---

## 9. What still needs a ruling

1. **Real gateway pricing.** Everything in F9/F10 rests on assumed 3% cash-in and P5 + 1.5% disbursement. Get quotes from Orange Money and MyZaka — this is the highest-value phone call available.
2. **Your actual monthly cost base.** `02 §8.5` now has a composition; replace the indicative figures with real ones.
3. **Morula as the Saffron replacement** — confirm it's the right plant for the top of the ladder.
4. **The P2,000 withdrawal fee cap** — recommend removing it once real disbursement pricing is known.
5. **Deleting `apps/game`** (G2).

---

## 10. Open questions for the simulator

*Sequencing note, 2026-09-07: the sandbox is deferred until **P6 is complete** — see `06 §5.1` and `05` "Deferred". Implement first; simulate against the real thing. Items below are tagged by what actually answers them.*

1. **Does the Bushveld stay a supplement?** At 4 plots, Kagiso-funded crafting is ~35% of farm income; at 20 plots it's ~7%. Is that the intended arc, or should crafting scale? → **sandbox, post-P6.** (The 7% figure at scale is encouraging: it suggests the arc already bends the right way.)
2. **Is the 58–205 day land ladder right** for a live service? → **judgement + telemetry.** The arithmetic is settled (114 d median); whether that *feels* like pacing is a player question.
3. **Does the seed calendar actually force rotation**, or do players just plant the best available crop every time? → **telemetry.** Cannot be simulated honestly before real players choose.
4. **Water pressure at 20 plots of thirsty crops** — engaging tension or punishing chore? This is the highest risk in the retune. → **playtest the build.** Simulating it tells you the cost, never the feeling.
5. **30-day Pula accumulation** with cosmetics and the Letsema fund — do the sinks hold? → **headless.** Baseline P1,913 / P5,288 / P8,814 per month at 4 / 12 / 20 plots; fold the sinks into `balance_verify.py`.
6. **Madi velocity** — how many trades before withdrawal under realistic play? (F10 says this is the revenue question.) → **v1.1 telemetry.** Needs real traders; gated behind B1/B2 regardless.
