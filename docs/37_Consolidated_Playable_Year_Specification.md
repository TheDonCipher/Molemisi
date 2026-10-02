# Molemisi — The Playable Year: Consolidated Gameplay Specification

**Date:** 2026-10-02
**Status:** **Draft for ruling.** Nothing here is implemented unless a line says so. Every open item carries a default so work can proceed.
**Scope:** One gameplay, joined from three documents: the real-year calendar, seed rotation and meals (`docs/35`); the Kgotla Year of twelve Charges and four Council Projects (`docs/36`); and the decided economy (`docs/33` strategy → `docs/34` implementation, over `docs/MVP/02`).
**Working title:** *A Year at the Kgotla* (Setswana, provisional: *Ngwaga kwa Kgotleng* [S]).

**Authority and division of labour.**

| Document | Governs |
| --- | --- |
| `docs/33` + `docs/34` + `docs/MVP/02` | The economy: currencies, caps, thresholds, store, land, maintenance. **Decided 2026-10-01, largely shipped — nothing here changes a decided number.** |
| **This document (`docs/37`)** | Everything the three *share*: the reconciliation ledger (§2), the merged loop, the reward ledgers, the year's economy check, the joint checklist. Where `docs/35`/`docs/36` disagree with this file on a shared point, **this file governs.** |
| `docs/35` | Calendar, seeds, crops, recipes — detail unchanged here; its rulings R-1…R-4 are carried into §11. |
| `docs/36` | Quest copy, cast, lore, returning years, the Reading of Names — unchanged here except where §2 says otherwise; its rulings R-Q1…R-Q4 are carried into §11. |

On adoption this document supersedes the *joint* statements of `docs/29`, `docs/35` and `docs/36`; it does not replace their domain detail.

---

## 0. The game in one loop

```
           THE YEAR — one real calendar (Africa/Gaborone), four chapters
  Nov–Jan Pula·Begin  →  Feb–Apr Letlhafula·Give  →  May–Jul Mariga·Keep  →  Aug–Oct Dikgakologo·Leave
     |                        |                          |                        |
  seed stock 1            seed stock 2               seed stock 3             seed stock 4
  Charges 1–3             Charges 4–6                Charges 7–9              Charges 10–12
  Water Reservoir P100    Mophane Festival P150      Water Store P150          School P200
     \____________ one clock drives weather · growth · seeds · stamps · beats · Charges ____________

 EVERY DAY   plant → water → harvest → Co-op (5% tax) · craft (floor test) · contracts (≤1.19× base)
             └─ the Kgotla ─┐
                 · deliver the month's Charge  → Pula (§6.1) + Botho +10 + stamp +1 + Almanac quests +1
                 · ward errand (shared 3/day)  → Botho +10 + regard only        [no Pula, no stamp]
                 · contribute to the chapter's project → Pula sink · Botho 1/Pula · ≤P200/day
 BOTHO  (cap 50/day, manual only) → 100 Bupi · 300 Deep Bushveld + Auto-Feeder · 500 Letsema + Auto-Helper
                                     prize eligibility = Botho earned this month ≥150 (02 §6.7)
 PULA   (earned only)  → seeds · water · land (P30,200 ladder) · maintenance · Market décor P200–P1,500
 MADI   (bought, 1 M = BWP 1) → Festival décor M40–M300 · Village Pass M50/mo  [never Pula, never Botho]
 STAMPS (expire each chapter) → the season souvenir only (cosmetic)
```

**One sentence:** *the real Botswana year decides what grows; the Kgotla Year asks you to bring it; the decided economy pays for bringing it, caps what that can win, and sells only looks and saved taps.*

---

## 1. Decisions at a glance

| ID | Consolidated decision | Status |
| --- | --- | --- |
| **C1** | The Kgotla has **two layers**: the **Year** (12 monthly Charges + 4 chapter Council Projects — the only Pula-bearing quests) and the **ward errands** (the existing shared 3/day pool of five NPCs — **Botho + regard only**). Resolves `docs/36` R-Q1 against `docs/33` §3.1/§4. | Default for ruling (E-3) |
| **C2** | The **quest Pula faucet is exactly P915/year** — the Year's total. Ward errands grant **0 Pula**; their legacy P8–12 rewards are removed. | Default (E-3) |
| **C3** | **One Botho ledger** (§6.2): every source through `creditBothoCapped`, cap **50/day** unchanged. Errands (≤30/day, free) restore the free-Botho rhythm `docs/33` §4 assumes; Charges contribute ≤30 in any month. | Adopted (33 §4 + 36 K4/K6) |
| **C4** | **One season-stamp ledger** (§6.3): Charges +1 · projects 5/8/8/12 · Almanac free track 50/chapter. Sink = **season souvenir only**, default **25 stamps** (R-C3). Internal slug `chapter_token` unchanged. | Default (34 §3.4 + 36 R-Q2) |
| **C5** | The Almanac's subscriber track becomes the **Village Pass track**: a declared Pass benefit whose rewards are **stamps + cosmetics only** — its Pula and Botho are struck (I4). Internal key `guild` unchanged. | Default for ruling (E-5, R-C2) |
| **C6** | **Council Project schedule:** Water Reservoir **P100** (Ch 1) · Mophane Festival **P150** (Ch 2) · Water Store **P150** (Ch 3) · Community School **P200** (Ch 4); stamp rewards **5 / 8 / 8 / 12**. Market Square retired. | Default (36 R-Q4, E-9) |
| **C7** | **Prize eligibility = Botho earned during the month ≥ 150** (`MVP/02 §6.7`); the lifetime-1000 threshold is retired (code cleanup, E-6). Charges alone (≤30/month) can never qualify. | Decided; 36 §8.1 restated |
| **C8** | Chapter identity: stable ids `ch1–ch4`, display **Pula · Letlhafula · Mariga · Dikgakologo**; legacy slugs map `ch1=pula, ch2=phane, ch3=moriti, ch4=letlhafula`. Never match on display names. | 35 R-1 + §2.7 (E-7) |
| **C9** | Offer precedence: **Co-op (0.95× base neutral) < contract (≤1.19× base) < Charge (1.15–1.35× grown / 1.05–1.15× crafted)**, each Charge once per cycle. At the top of the market band (2.0×) the Co-op still wins — intended. | 35 §4.1 + 36 §5.1 + `CONTRACT_RULES` |
| **C10** | Naming: **Village Pass** (never "Guild"), **Auto-Feeder / Auto-Helper** (never "Auto-Collector"), **season stamp** player-facing. Internal `guild` / `chapter_token` keys are kept — UI-only renames, no migrations. | Decided 33/34 |
| **C11** | **Flour stays behind Botho 100**; Madila and the other v1.1 dishes stay ungated; no recipe unlock ever reads subscription status. | 33 §4 + 35 R-4 (E-12) |
| **C12** | The **festival belongs to Act II** (Feb–Apr, anchored to the real April Mophane window). Act IV's "festival" copy re-scopes to ploughing preparation. | D9 + 36 Act II vs 33 §5 (E-14) |

---

## 2. Reconciliation ledger

Every conflict found between `docs/35`, `docs/36` and the decided economy (`docs/33`/`docs/34`/`MVP/02`/shipped code). Resolution text is normative.

| # | Conflict | Resolution |
| --- | --- | --- |
| **E-1** | `docs/36` hard rule 3 and K6 guard against the **"Guild subscription"**; the decided economy replaced it with the **Village Pass** (M50/mo, `VILLAGE_PASS`). | Rule 3 restated (§5): the **Village Pass** confers no advantage on any Charge, errand, project, Almanac free track, reveal time, reward or Botho. Same control, current name. |
| **E-2** | `docs/36` hard rule 2 bars the **"Auto-Collector"**, which no longer exists; boosts are **cut** and the ladder is **Auto-Feeder (300) / Auto-Helper (500)**, with the same helper sold by the Village Pass. | Rule 2 restated (§5): **no automation** — earned (`AUTOMATION_LADDER`) or paid (Village Pass helper) — may deliver a Charge, complete an errand, contribute to a project, or call `creditBothoCapped`, directly or indirectly. The helper only removes taps; it never multiplies yield, which bounds the indirect path. |
| **E-3** | `docs/36` K10 (default) **retires the five rotating charges**; `docs/33` §3.1/§4 says **"three daily Kgotla charges"** is how Pula and Botho are earned. Direct contradiction — and full retirement starves free Botho: Charges + Almanac + catch-up ≈ **140–160 Botho/year**, so Bupi 100 would take ~7 months instead of the ~4 days `docs/33` intends. | **C1/C2 hybrid adopted:** the five rotating asks **stay as daily ward errands** (shared `KGOTLA_DAILY_CHARGE_POOL = 3`, same NPCs, same asks — they keep feeding the Co-op tax, the project sink and regard) but are **stripped of Pula, stamps and Almanac credit**. All quest Pula moves into the Year's 12 Charges. Result: free-Botho pacing ≈ 30/day (100 in ~4 days, 300 in ~10, 500 in ~17), while the quest Pula faucet falls from a theoretical ~P10,950/yr to the Year's **P915/yr**. Plain full retirement (R-Q1 = yes) stays available at the cost of that pacing. |
| **E-4** | Chapter Tokens are called **season stamps** player-facing (`docs/34 §3.4`, `MVP/02 §3.3`), and their sink — the season souvenir — needs `POST /chapters/tokens/spend`. | The route **now exists** in `chapter.controller.ts` (service + test already present). Stamps: **+1 per Charge**; sink = **souvenir only** at **25 stamps** (R-C3); `spendTokens(purpose='cosmetic')` only — never seeds, Pula, Botho, water. `KNOWN_LIMITATIONS W4-c` and roadmap 5.9 rows are stale and should be updated. |
| **E-5** | The Almanac's second track is gated on a **subscription** and pays **Pula (60/100/150) + Botho (10)** — while the decided Village Pass benefit list is *helper · outfit · storage* only, and I4 says a payment must be structurally unable to reach `creditBothoCapped`. Paying would confer Pula and Botho indirectly. | **C5 (R-C2):** the track is re-scoped as the **Village Pass track** and **declared** as a Pass benefit; its rewards become **stamps + cosmetics only** (proposed: 20 · 30 · 20 · 50 + cosmetic · 50 = 170 stamps/chapter). The free track is unchanged (P160 + Botho 5 + 50 stamps per chapter). The internal key `guild` stays, exactly as `chapter_token` stays. |
| **E-6** | Prize eligibility: code still exposes `BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY = 1000` (lifetime) while `MVP/02 §6.7` **decided** a **monthly Botho delta ≥ 150** (top 3, split 4:2:1). `docs/36 §8.1` argues against the wrong number ("well under the 500 for Letsema"). | **C7:** eligibility is the **monthly delta ≥150**; Letsema (500) is an unlock, not the prize gate. Restated legal line: **a Charge grants ≤30 Botho in any calendar month, so Charges alone can never confer eligibility**; the 50/day cap bounds every other source. Cleanup item: retire or re-label the 1000 threshold in `BOTHO_LADDER`/progression. |
| **E-7** | `docs/35` R-1 renames chapters to **Pula · Letlhafula · Mariga · Dikgakologo**, but the shipped slugs are `pula · phane · moriti · letlhafula` — and slug `letlhafula` is **Chapter 4**, while display name *Letlhafula* is **Chapter 2**. A string-rename would corrupt both. | **C8:** stable ids `ch1–ch4` become the keys for stocking, stamps, Almanac rows and events; names are data. Mapping (by month range, one transaction, never by name): `ch1=Nov–Jan=slug pula` · `ch2=Feb–Apr=slug phane` · `ch3=May–Jul=slug moriti` · `ch4=Aug–Oct=slug letlhafula`. Per `docs/35 §2.7`: never leave a state where one slug means two chapters. |
| **E-8** | The Letsema declaration beat: `docs/35 §2.5` fires it **on the first Kgotla read on/after 1 October**; `docs/36` Charge 12 says it **fires the beat**. | One rule: the beat fires **once, on the first Kgotla read on or after 1 October** (35 §2.5). Charge 12 (*Seed for the Scattering*, October) is the player's **act** of the declaration — its Done line shows with the beat when both coincide, never twice, never on every load. |

| **E-9** | Shipped projects: Water Reservoir **P100→5 stamps**, Market Square **P150→8**, School **P200→12**. `docs/36` schedules four chapter projects (Reservoir, Festival, Water Store, School) — Market Square has no slot. | **C6:** schedule = Reservoir **100** (Ch 1) · Festival **150** (Ch 2, new) · Water Store **150** (Ch 3, new) · School **200** (Ch 4); stamp rewards **5/8/8/12** (the shipped 100→5, 150→8, 200→12 mapping extended). **Market Square is retired** (its "better prices" reward was never real — AC-04 already replaced effects with stamps). Only the active chapter's project accepts contributions; threshold 150 = `docs/36` R-Q4 default, matching the existing 150 tier. |
| **E-10** | Three Pula offers compete for the same goods: Co-op (band 0.5–2.0×, 5% tax), contracts (`rewardMarketMultiple 1.25`), Charges (premium 1.25/1.10). `docs/36` requires Charges to beat the market "but not much more". | **C9 precedence, verified:** at neutral price the Co-op returns **0.95× base**; a contract caps at **1.25 × 0.95 = 1.19× base**; a Charge pays **1.15–1.35× base** grown/gathered and **1.05–1.15×** crafted, **once per cycle**. Charge > contract > Co-op for grown goods; crafted Charges deliberately sit under the contract ceiling. A Co-op price spike to 2.0× (1.9× base) beats every Charge — intended: that is the choice the band exists to create. |
| **E-11** | Legacy errand rewards (P8–12, botho 10, 0–2 stamps) vs `docs/36` K4. | **Confirmed alignment:** `BOTHO_PER_QUEST = 10` matches K4's Botho +10. Pula and stamps are removed from errands per E-3; regard stays (`REGARD_PER_CHARGE = 10`, decay −2/7 days, 24 h warning). |
| **E-12** | `docs/35` R-4 knock-on question: does Flour keep its **Botho 100** gate now that Madila is craftable? | **C11:** Flour **stays at Botho 100** — it is the ladder's first rung ("bake bread", `docs/33 §4`, `BOTHO_THRESHOLDS.BUPI_RECIPE`). Madila, Dikgobe and Dried Phane stay ungated; Ting and Bogobe jwa Lerotse inherit Flour's gate. No unlock reads subscription status. |

| **E-13** | Shipped NPC copy: Thabo is `"Competitive, ambitious"` who says *"I will be watching"* — `docs/36` §3 makes him **never a rival**. Elder ids `elder_neo` / `oupa_kabelo` vs cast **Mogolo** / **Ntate Kabelo**. | `docs/36` copy wins. **Ids stay** (`elder_neo`, `oupa_kabelo`, …) exactly like `chapter_token`; display name, role and greeting change (Elder Neo → **Mogolo**, Oupa Kabelo → **Ntate Kabelo**). No DB migration for names. |
| **E-14** | `docs/33` §5 says *Harvest (Aug–Oct) = "festival time"* and the shipped Ch 4 market event is *"Letlhafula Festival"* — but the Year's festival is Act II (Feb–Apr), anchored to the **real April Mophane window** (D9: months {4, 12} decoupled from chapters). | **C12:** the ward festival belongs to **Act II**; the April window closes it. Act IV's market event and `docs/33` §5's shorthand line re-scope to **ploughing preparation** (*"the ploughing will be declared"*), which is what Dikgakologo actually is. Copy-only change; `MOPHANE_MONTHS` untouched. |
| **E-15** | The Almanac's `quests` requirement (2 free / 4 subscriber) vs **3 Charges per chapter** — the subscriber tier is unreachable from Charges alone. | Counters count **Charge deliveries and completed contracts** (not errands — those are free-Botho acts). 3 Charges + ≥1 contract clears 4. Wiring depends on `docs/32` 3.4 (progress counters, schema sign-off) — listed in §9. |
| **E-16** | `docs/36` hard rule 6 / K5 (no v1.1 items in asks) vs the v1.1 feast dishes in `docs/35` §4.3. | **Kept strict:** no Charge, errand or project may request a DIKUNO dish until v1.1 ships *and* K5 is amended. The Mophane Festival project may reference the feast in copy only. |

---

## 3. One calendar (carried from `docs/35`)

**Rule D1/D2 stands:** the calendar is the real year, read in Botswana time (UTC+2, no DST), a pure function of the month. It is the only season authority: weather (`rainCoverage` → `rainChance`, `growthModifier = 0.85 + 0.3·rainCoverage`), seed stocking, chapter stamps and their expiry, chapter beats, world/market events, and now **Charge reveals and cycle keys**.

| Ch | Months | Display (C8) | Legacy slug | `rainCoverage` | Seeds stocked | Act (36) |
| --- | --- | --- | --- | --- | --- | --- |
| ch1 | Nov–Jan | **Pula** | `pula` | 0.80 | Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet | I · Begin |
| ch2 | Feb–Apr | **Letlhafula** | `phane` | 0.50 | Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper | II · Give |
| ch3 | May–Jul | **Mariga** | `moriti` | 0.05 | Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula | III · Keep |
| ch4 | Aug–Oct | **Dikgakologo** | `letlhafula` | 0.15 | Millet · Sorghum · Watermelon · Pepper · Herbs · Morula | IV · Leave |

Legacy *Sekala sa …* names are display-only (V-3 unconfirmed, prefix dropped by default). Mophane windows stay **real months {4, 12}**, decoupled from chapters (D9). Boundaries fall at **00:00 Africa/Gaborone** on 1 Nov / 1 Feb / 1 May / 1 Aug — in UTC: 31 Oct 22:00, 31 Jan 22:00, 30 Apr 22:00, 31 Jul 22:00. At the boundary: stamps zero (countdown shown), seed stock rotates, one chapter beat fires per player.

**What keys off the clock** (nothing else may invent a season):

| Thing | Keys to | Note |
| --- | --- | --- |
| Weather, growth modifier | active chapter | `chapterWeather()` |
| Seed purchase gating | active chapter (planting ungated, D5) | server-side |
| Chapter stamps expiry · chapter beat | chapter boundary | one-shot beat |
| **Charge reveal (monthly) · cycle key** | real month / cycle year | §4, §6 |
| Council Project availability | its chapter | only the active one accepts |
| Mophane windows · Letsema declaration beat | real months {4,12} / on-or-after 1 Oct | deliberately not chapter-keyed |
| Chapter market events | chapter slug (migrate per C8) | copy change per E-14 |

---

## 4. The Kgotla Year (carried from `docs/36`)

Twelve monthly **Charges** + four chapter-long **Council Projects**. Cast, copy, offer/done lines, returning-year lines and the Reading of Names are unchanged from `docs/36` §3/§6/§7 — what follows is the joint mechanics layer.

**Reveal, hold, loop, idempotence (36 §5.3–5.6, unchanged except where noted):**

1. Charge *n* reveals at **00:00 Africa/Gaborone on the first day of its month**; it stays deliverable **until its chapter ends**; lapsing costs nothing and returns next cycle.
2. Delivery is **manual**, one action, from the Kgotla screen. No sequencing gate — any order within a chapter.
3. **Cycle key** = the calendar year in which the game year began (1 Nov). `2026-11-01 → 2026/27`; `2027-01-15 → 2026/27`; `2027-11-01 → 2027/28`. One delivery per (farm, Charge, cycle); a pure function of the date, nothing stored.
4. Server authority: unique constraint on **(farm, Charge, cycle)** + atomic goods deduction → 20 concurrent requests yield exactly one reward.
5. **Errands (the other layer, C1)** run on the existing per-Botswana-day clock and `KGOTLA_DAILY_CHARGE_POOL = 3`; they consume goods/donations on delivery exactly as today, but pay **Botho +10 and regard only** (E-3/E-11).

| # | Month | Ch | NPC | Charge | Ask (base value) | Pula |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Nov | 1 | Thabo | **Straight Rows** | 10 Sorghum (P30) | **P40** |
| 2 | Dec | 1 | Refilwe | **The First Phane** | 3 Phane, Dec window (P30) | **P40** |
| 3 | Jan | 1 | Mogolo | **Grain for the Lean Months** | 12 Millet (P48) | **P60** |
| 4 | Feb | 2 | Mama Naledi | **The Round Ones** | 6 Watermelon (P66) | **P85** |
| 5 | Mar | 2 | Ntate Kabelo | **The Kraal Gate** | 4 Plank + 2 Rope (P64, crafted) | **P70** |
| 6 | Apr | 2 | Mogolo | **Something for the Pot** | 5 Groundnuts + 2 Pepper (P89) | **P110** |
| 7 | May | 3 | Thabo | **Threshing Day** | 8 Cowpeas (P48) | **P60** |
| 8 | Jun | 3 | Refilwe | **The Cold Pot** | 3 Herbs (P75) | **P95** |
| 9 | Jul | 3 | Mogolo | **The Long Promise** | 2 Morula (P92) | **P115** |
| 10 | Aug | 4 | Mama Naledi | **Pepper for the Stall** | 4 Pepper (P68) | **P85** |
| 11 | Sep | 4 | Ntate Kabelo | **Ropes for the Ploughing** | 3 Rope + 3 Brick (P87, crafted) | **P95** |
| 12 | Oct | 4 | Mogolo | **Seed for the Scattering** | 8 Sorghum + 6 Millet (P48) | **P60** |
| | | | | **Year** | **P745** | **P915** |

Every Charge additionally pays **Botho +10** (capped path) · **+1 season stamp** · **Almanac `quests` +1** · completion voice. Council Projects (only the active chapter's accepts):

| Chapter | Project | Threshold | Stamp reward | Note |
| --- | --- | --- | --- | --- |
| 1 · Pula | **Water Reservoir** | P100 | 5 | shipped (`water_reservoir`) |
| 2 · Letlhafula | **Mophane Festival** | P150 | 8 | new (R-Q4 default) |
| 3 · Mariga | **The Water Store** | P150 | 8 | new (R-Q4 default), led by Kabelo |
| 4 · Dikgakologo | **The School** | P200 | 12 | shipped (`school`) |

Market Square retired (E-9). Contributions: Pula in, **≤P200/day** (`KGOTLA_DAILY_CONTRIBUTION_CAP`), **Botho 1/Pula** through the capped path, stamps granted **once** when the farm's own bar first fills (AC-04). Project rewards stay honest — per-farm, never "all farmers" (AC-04).

---

## 5. Hard rules (merged, current names)

1. **Botho accrues only from explicit, manual, deliberate acts and is capped at 50 per player per Botswana day** (`BOTHO_DAILY_CAP`), through `creditBothoCapped`. *Legal control:* prize eligibility is monthly Botho ≥150 (`MVP/02 §6.7`), so nothing a payment can buy or automate may reach the increment.
2. **No automation may play the Kgotla.** The Auto-Feeder (Botho 300), the Auto-Helper (Botho 500) and the Village Pass helper can never deliver a Charge, complete an errand, contribute to a project, or call `creditBothoCapped`, directly or indirectly. They save taps; they never multiply yield. (Boosts are cut from the catalogue entirely — `docs/34 §3.3`.)
3. **The Village Pass confers no advantage** on any Charge or errand: not in eligibility, reward, Botho, reveal time or slots. No recipe unlock, Almanac free-track tier, or quest reward reads subscription status.
4. **No failure states.** A Charge or errand consumes goods only on delivery. Lapsing costs nothing; nothing is lost by absence.
5. **No competitive framing on the Kgotla.** Charges, errands, projects and the Reading of Names are unranked; recognition is by name, never by position. The **monthly community prize is the game's only ranked element** and is governed by `MVP/02 §6.7`.
6. **Everything requested is obtainable in its own chapter** (seed stocked that chapter, or gathered/crafted ungated), is neither Botho-gated nor v1.1 content (E-16), and never a Madi-locked item.
7. **The server decides reward, eligibility and completion.** The client sends intent only; delivery is idempotent under concurrency (§4).
8. **Currencies never cross.** Madi → Pula is impossible; Pula and Botho are never sold; stamps buy only the souvenir and are never convertible to Madi; no Charge, errand or project ever grants Madi (`MVP/02 §2`, `docs/34 §6`).
9. **Copy is Latin script only**; every Setswana line marked [S] gets a native-speaker pass before shipping (`docs/36` §9).

---

## 6. The reward ledgers

### 6.1 Pula — the Year is the quest faucet

**Formula (36 §5.1, unchanged):** `Pula = round-to-nearest-P5 of Σ(base × premium)`, premium **1.25** grown/gathered, **1.10** crafted. Bands: **1.15–1.35** grown, **1.05–1.15** crafted, measured against base value. Base values come from the shipped catalogue (`items.ts` / `crafting.ts`: Sorghum P3 · Millet P4 · Cowpeas P6 · Phane P10 · Watermelon P11 · Groundnuts P11 · Pepper P17 · Herbs P25 · Morula P46 · Plank P7 · Rope P18 · Brick P11). All twelve rewards re-verify against the formula (checked 2026-10-02): ratios 1.09–1.33, year ratio **1.23**.

**Faucet size:**

| Basis | Monthly gross | P915/yr = P76/mo share |
| --- | --- | --- |
| 4-plot farm, unspent/month (`MVP/02 §7.1`) | P1,913 | **4.0%** |
| 20-plot farm, unspent/month | P8,814 | **0.9%** |
| 4-plot net (`MVP/02 §6.8`, ≈P49/day) | ≈P1,470 | **5.2%** |
| 20-plot median net (≈P408/day) | ≈P12,240 | **0.6%** |

Ward errands contribute **0** (C2); contracts are unchanged, capped at 1.19× base (C9), and gated by a **24 h repeat cooldown** (`CONTRACT_RULES.repeatCooldownHours`) that bounds repeat farming. Charges consume **P745/yr of goods** — a small goods sink as well. Charges are a narrative and community pillar first and a faucet second.

### 6.2 Botho — one ledger, one cap

Every source below goes through `creditBothoCapped`; the **50/day** cap is the pacing governor, not the source mix.

| Source | Quantum | Local limit | Note |
| --- | --- | --- | --- |
| Charge delivery | +10 | ≤3 per chapter-day → **≤30 in any calendar month** | never enough for the 150/month prize floor alone |
| Ward errand | +10 | `KGOTLA_DAILY_CHARGE_POOL = 3` → ≤30/day | the free daily rhythm `docs/33` §4 assumes |
| Project contribution | +1/Pula | ≤P200/day requested | Pula sink; botho still capped at 50/day |
| Almanac free tier 3 | +5 | once/chapter | unchanged |
| Returner catch-up | 25% of cap × missed days | ≤50 (and bounded to **3 missed days**, per 31 §6.4) | existing `botho_catchup` |
| Contract completion | `max(2, round(Pula/10))` | ≤50/day (shared cap) | `contracts.service.ts` `bothoRewardFor`, via `creditBothoCapped` (commit 53285f6) — added after 37 was written |
| Village Pass · Auto-Feeder · Auto-Helper · boosts · top-ups | **never** | — | structurally unreachable (I4, hard rule 2/3) |

**Ladder pacing (free errands alone, 30/day):** Bupi **100 ≈ 4 days** · Deep Bushveld + Auto-Feeder **300 ≈ 10 days** · Letsema + Auto-Helper **500 ≈ 17 days**. With contributions in the mix (up to the 50/day cap): **≈ 2 / 6 / 10 days**. Prize floor (150/month) needs ~5 active days. Full retirement of errands would push Bupi 100 to ~7 months — the reason E-3 adopts the hybrid. The **1:1 donation rate** (`BOTHO_PER_PULA_DONATED = 1`, still flagged for sign-off in code) is the one number here that is not yet ruled — see R-C4.

### 6.3 Season stamps (internal `chapter_token`)

**Earn** (per chapter, free path): Charges **+1 each (3)** · the chapter's Council Project **5 / 8 / 8 / 12** (once) · Almanac free track **10 + 20 + 20 = 50** → **≈ 58–65 stamps/chapter**, **≈ 245/year**, all expiring to zero at the chapter boundary (countdown shown). The Village Pass track adds **170/chapter** once scrubbed to stamps + cosmetics (C5). Errands grant **none** (E-3) — keeps the currency legible.

**Spend — one sink:** the **season souvenir**, a cosmetic, via `POST /chapters/tokens/spend` (`purpose='cosmetic'`), default price **25 stamps** (R-C3) — roughly half a free-path chapter, so an engaged player buys one every chapter and a completionist must choose. Never seeds, Pula, Botho, water, or anything gameplay-affecting (`docs/34 §3.4`). `MVP/02 §3.3` also mentions "chapter-only recipes and entry to the seasonal prize draw" as possible sinks; **both stay open** — the default is souvenir-only (R-C3 covers price, R-C5 covers any future sink). Stamps are never convertible to Madi and never sold.

**Year totals (free path):** 12 Charge stamps + 33 project stamps + ~200 Almanac stamps ≈ **245 earned, all spendable before each expiry** — the cheapest anti-inflation device in the game (`MVP/02 §3.3`).

### 6.4 The Almanac

- `quests` counter **+1 per Charge delivery**; counters also count **completed contracts**, not errands (E-15). Free tier 2 needs 2 (one chapter's Charges suffice); Pass tier 2 needs 4 (3 Charges + ≥1 contract).
- Free track unchanged: P30 · 10 stamps · P50+Botho 5 · 20 stamps · P80+20 stamps.
- **Pass track (C5):** declared benefit, **stamps + cosmetic only** (proposed 20 · 30 · 20 · 50+cosmetic · 50). No Pula, no Botho, no gameplay power.
- Counter wiring depends on `docs/32` 3.4 (schema sign-off) — until then tiers claim sequentially as today, and the `quests` requirement is documentation, not a gate.

---

## 7. Feasibility cross-check — every ask inside its own chapter

Verified against the shipped seed calendar and the bushveld/crafting sources (D4, K5):

| # | Ask | Source | Chapter stock / window | OK |
| --- | --- | --- | --- | :-: |
| 1 | 10 Sorghum | seed | ch1 stocked (also ch3/4) | ✓ |
| 2 | 3 Phane | gather, Bushveld | Dec = Mophane month {4,12} | ✓ |
| 3 | 12 Millet | seed | ch1 stocked (≈3 plot-harvests @3–5) | ✓ |
| 4 | 6 Watermelon | seed | ch2 stocked (44 h growth, chapter is 3 months) | ✓ |
| 5 | 4 Plank + 2 Rope | craft (2 h, batches 1/3/6) | no station gate; ≈3–4 days of slots | ✓ |
| 6 | 5 Groundnuts + 2 Pepper | seed | **both** ch2 stocked | ✓ |
| 7 | 8 Cowpeas | seed | ch3 stocked | ✓ |
| 8 | 3 Herbs | seed | ch3 stocked | ✓ |
| 9 | 2 Morula | seed | ch3 stocked | ✓ |
| 10 | 4 Pepper | seed | ch4 stocked | ✓ |
| 11 | 3 Rope + 3 Brick | craft | Brick = any 2 of Clay/Stone; Rope = Palm Fiber | ✓ |
| 12 | 8 Sorghum + 6 Millet | seed | **both** ch4 stocked (4×sorghum = 3×millet, = Flour rule D6) | ✓ |

**Meals (35 §4):** all five MVP recipes keep the floor test (profit at floor > 0, ROI ≥ 20% at batch 1, rows close horizontally); the Flour substitution is 4 Sorghum = 3 Millet = P12 on both branches (D6). **No Charge requests a dish** (E-16); when v1.1 ships, Dikgobe (ch1-only inputs) and Dried Phane (the two Mophane windows) are the dishes the year's calendar already seasons — the Festival project and Act II copy are their natural home, copy-only until then.

---

## 8. What money buys, and what the year earns (the decided store)

| Currency | Earned by | Buys | Never |
| --- | --- | --- | --- |
| **Pula (P)** | Co-op sales (5% tax), contracts, the Year's Charges (P915/yr), Almanac free track | seeds · water · land (P30,200 ladder) · maintenance (30-day rhythm) · crafting fees · **Market décor P200 / P600 / P1,500** · project contributions (sink) | never sold, never convertible |
| **Madi (M)** — 1 M = BWP 1 | top-ups only (5 / 20 / 55 / 110 / 275; cap BWP 500/day, Botswana time) | **Festival décor M40 / M80 / M150 / M300 · Village Pass M50/mo** | never grants Pula, Botho, stamps, seeds, land or water |
| **Botho (B)** | Charges, ward errands, contributions, Almanac, catch-up — cap 50/day, manual only | nothing (a meter: 100 Bupi · 300 Deep Bushveld + Auto-Feeder · 500 Letsema + Auto-Helper) | never sold; never granted by any payment, subscription or automation |
| **Season stamp** | Charges, one project, Almanac — expires each chapter | the season souvenir (cosmetic, 25 stamps) | never sold, never Madi, never a gameplay effect |

**Village Pass (M50/mo)** = `auto_helper` + `storage_bonus_50` + `monthly_festival_outfit` + `ad_free` (declared list is exhaustive — adding the Almanac track under C5 is the one amendment, and it carries no Pula/Botho). Every Festival SKU keeps a Market-shelf cousin in the same slot: *nobody's farm looks poorer because they didn't pay.* Boosts are cut. The helper is the same chore-remover the Botho-500 ladder grants free — paying gets it early, playing gets it forever.

**Where the year's Pula goes:** a chapter's three Charges pay **P140–P270** — about one small Market décor (P200) per chapter; over a year the **P915** is roughly three-quarters of the first land rung (4→8 plots, P1,200), a help rather than a hand-out. It feeds the same sinks as everything else (seeds first, then land, then décor). Nothing about the year touches Madi, so the cozy promise and the compliance hinge (`MVP/02 §2`) are untouched by quest design.

---

## 9. Implementation map

Nothing below is done; each row is a task with an acceptance test in §10.

| # | Where | What |
| --- | --- | --- |
| I-1 | `game-config` (new charge-year module) | 12 Charges as data (month, npcId, asks, base values) + 4-project schedule (C6); no numeric literal in application code (`docs/35 §3.4` pattern). |
| I-2 | `kgotla.service.ts` + `year-charge.service.ts` | Split the board: **Year layer SHIPPED** (`YearChargeService` — cycle-keyed reveal/deliver, unique `(farm, charge, cycle)`, atomic deduction; table `kgotla_charges` via `20261002000000`) and **errand layer SHIPPED** (existing accept/turn-in; `pulaReward`/`chapterTokenReward` stripped, `bothoReward 10` + regard kept). `elder_neo`-era Pula retired. |
| I-3 | `kgotla.service.ts` PROJECTS | Reservoir/Festival/Water Store/School with 100/150/150/200 and 5/8/8/12; remove `market_square`; only the active chapter's project accepts. |
| I-4 | NPC display data | Elder Neo → **Mogolo**, Oupa Kabelo → **Ntate Kabelo**; Thabo's personality/greeting to `docs/36` §3 (never a rival). Ids unchanged (E-13). |
| I-5 | `game-config/chapters.ts` | Stable ids `ch1–ch4` + display names (C8); migrate stored references **by month range, one transaction** (`docs/35 §2.7`); keep legacy slugs as data until migrated. |
| I-6 | `almanac.ts` | Pass-track scrub (C5); rename UI copy "Village Pass track" (key `guild` kept). |
| I-7 | `chapter.controller.ts` | `POST /chapters/tokens/spend` **already exists** — add the souvenir SKU + price (R-C3) and the UI affordance; fix stale `KNOWN_LIMITATIONS W4-c` / roadmap 5.9 rows. |
| I-8 | progression / `BOTHO_LADDER` | Retire or re-label `PRIZE_ELIGIBILITY = 1000`; prize eligibility reads the monthly delta (E-6, `MVP/02 §6.7`). |
| I-9 | Almanac counters (`docs/32` 3.4) | Wire `quests` = Charge deliveries + contracts (E-15); blocked on schema sign-off. |
| I-10 | Market events + `docs/33` §5 copy | Ch4 event → ploughing preparation (E-14). |
| I-11 | Simulator | Errand/Charge split in `actors.ts`/`reports.ts`; `KGOTLA_DAILY_CHARGE_POOL` still guards errands; assert the P915 faucet. |
| I-12 | Docs | `docs/33` §3.1/§4 "three daily charges" prose → point at this file (E-3); `docs/35`/`docs/36` headers point here; `docs/29` marked superseded on adoption. |

---

## 10. Verification checklist (merged)

Run `pnpm typecheck` · `pnpm test` · `python scripts/balance_verify.py` — all green, plus:

**Calendar, chapters, loop**
- [ ] `chapterForMonth` returns §3's chapter for all twelve months; month 10 → ch4, month 11 → ch1.
- [ ] Boundary instants: `2026-10-31T21:59:59Z` → ch4; `2026-10-31T22:00:00Z` → ch1; likewise 1 Feb, 1 May, 1 Aug.
- [ ] Charge reveal at 00:00 Africa/Gaborone on the 1st (UTC tests land on the 22:00 boundary of the previous day).
- [ ] Cycle keys: 2026-11-01 → 2026/27 · 2027-01-15 → 2026/27 · 2027-10-31 → 2026/27 · 2027-11-01 → 2027/28.
- [ ] One delivery per (farm, Charge, cycle); a second in the same cycle is rejected; an undelivered Charge rests with no debit.
- [ ] Mophane active only in real months {4,12} (mocked clock); the Letsema beat fires **once** on/after 1 Oct and never twice.
- [ ] Migration leaves no stored reference keyed by a legacy chapter name or slug meaning two chapters (C8).

**Seeds, crops, recipes** (carry `docs/35 §6`)
- [ ] Six seeds per chapter (24 total); every crop in 2–3 chapters; out-of-season purchase rejected, carried-seed planting accepted.
- [ ] No growth timer under 12 h or between 24–40 h; thirst 1–3 on every packet; Morula top of ladder (spread ≈3.3×).
- [ ] Every recipe: profit at floor > 0, floor ROI ≥ 20% at batch 1; rows close; 4 Sorghum = 3 Millet = P12.
- [ ] `balance_verify.py` PASS (run 2026-10-02: dead-zone 0, dominance 1, spread 3.32×, 5 recipes close).

**Charges and errands**
- [ ] Every Charge reward equals the §6.1 formula recomputed from item base values; ratios in band; **year faucet = P915**.
- [ ] Every ask passes the §7 in-chapter check; no ask is Botho-gated, Madi-locked, or v1.1 (E-16).
- [ ] **Errands pay 0 Pula and 0 stamps** but Botho +10 + regard; the pool still refuses a 4th (E-3/C2).
- [ ] 20 concurrent Charge deliveries → exactly one reward, one deduction.
- [ ] Almanac `quests` rises by exactly 1 per Charge delivery; contracts increment it too; errands do not (E-15).

**Botho / I4 / money**
- [ ] Every Botho grant flows through `creditBothoCapped`; a capped day still completes the act.
- [ ] No ledger row `('botho', +, …)` from any payments/subscription path; no ledger row `('pula', +, 'madi_topup')` (`docs/34 §2.2`).
- [ ] Tests assert the **Auto-Feeder/Auto-Helper/Village Pass helper** cannot deliver a Charge, complete an errand, contribute, or credit Botho (I4/E-2).
- [ ] A CI test asserts **Village Pass** status changes no Charge reveal, cost, reward or Botho (E-1).
- [ ] **Pass track grants no Pula and no Botho** (C5); free-track payouts unchanged.
- [ ] Prize eligibility reads **monthly Botho delta ≥150**, not lifetime 1000 (E-6).
- [ ] No top-up credits Pula; pack bonus 0–10%; every Festival SKU has a Market cousin (carried `docs/34 §5`).

**Stamps**
- [ ] Charge +1 · project 5/8/8/12 once · free-track 50/chapter; balances zero at the boundary with a countdown.
- [ ] `POST /chapters/tokens/spend` accepts **cosmetic only**; the souvenir debits 25; no gameplay sink exists (R-C3).

**Integrity and copy**
- [ ] No ranking field or leaderboard on Charges, errands, projects or the Reading of Names (hard rule 5; the prize is the sole exception).
- [ ] Copy contains no non-Latin characters; each Charge names the right NPC; Thabo is never written as a rival (E-13); no "Guild"/"Auto-Collector" strings remain (C10).
- [ ] Setswana lines carry the [S] marker pending the native-speaker pass.

---

## 11. Consolidated rulings (all defaults, for ruling)

| # | Question | Default adopted | Consequence of the alternative |
| --- | --- | --- | --- |
| **R-1** (35) | Rename chapters to Pula · Letlhafula · Mariga · Dikgakologo? | **Yes**, as display names over stable ids `ch1–ch4` (C8), pending elder verification (V-2/V-6). | Reverting changes display strings only. |
| **R-2** (35) | Free-seed gift at the Letsema declaration? | **No** — cosmetic beat only. | A gift adds a faucet; rerun `balance_verify.py`. |
| **R-3** (35) | Gate planting as well as purchasing? | **No** — purchase-gated only. | Gating planting adds a rule and a failure state. |
| **R-4** (35) | How do v1.1 dishes unlock? | Flour-based inherit **Botho 100**; Dikgobe/Madila/Dried Phane ungated; **Flour stays at 100** (E-12/C11). | Gating all five slows early crafting for no gain. |
| **R-Q1** (36) | Retire the five rotating charges? | **Resolved by C1 (hybrid):** retired as *Pula* quests, retained as *ward errands* (Botho + regard, ≤3/day). | Plain retirement cuts free Botho to ~140–160/yr (Bupi 100 ≈ 7 months); plain retention keeps a ~P10,950/yr quest faucet. Both priced in E-3. |
| **R-Q2** (36) | Season stamps per Charge? | **1** — calibrated: ≈58–65/chapter against a 25-stamp souvenir (§6.3). | More stamps make the souvenir free; fewer strand it. |
| **R-Q3** (36) | Cosmetic marker for a full year? | **No** — recognition is the Reading of Names only. | A marker adds tenure comparison (hard rule 5). |
| **R-Q4** (36) | Thresholds for the two new projects? | **150 each** (C6), matching the shipped 150 tier; stamp reward 8. | Must pass the simulator: projects are capped and non-grindable. |
| **R-C1** (new) | Board presentation of the two layers? | One Kgotla screen: the month's **Charge card** (marquee) above a compact **ward errands** row (3 slots/day). | Reverting to one list reopens the unordered-list problem `docs/36` R-Q1 warned of. |
| **R-C2** (new) | The Almanac Pass track (C5)? | Scrub to **stamps + cosmetics**, declare it a Village Pass benefit, keep the `guild` key. | Ungating pays everyone P310/chapter (faucet); leaving it pays subscribers Pula/Botho (I4 breach). |
| **R-C3** (new) | Season souvenir price? | **25 stamps**, cosmetic only. | Tiered souvenirs (e.g. 10/25/50) allowed later; any gameplay sink is not (`docs/34 §3.4`). |
| **R-C4** (new) | Botho per Pula donated (code flag `BOTHO_PER_PULA_DONATED`)? | **1** (unchanged, capped) — but with errands restored it now shares the stage; confirm the rate still reads as "helping", not "buying standing". | 2/Pula would let a funded player hit 50/day for P25; 0.5 slows the free+donation blend. |
| **R-C5** (new) | Extra stamp sinks from `MVP/02 §3.3` (chapter recipes, prize-draw entry)? | **None in v1** — souvenir only. | Chapter recipes are a gameplay sink and need their own ruling; draw entry touches the prize's ring-fence (02 §6.7). |
| **R-C6** (new) | Retire Market Square? | **Yes** (C6/E-9) — four chapters, four projects. | Keeping it as a fifth evergreen project breaks the one-project-per-chapter year. |

---

## 12. Sources

- **Economy (decided):** `docs/33_Economy_and_Monetization_Strategy.md` · `docs/34_Economy_Monetization_Implementation.md` · `docs/MVP/02_Economy_And_Currencies.md` §2/§3.3/§4/§6.4–6.8/§7/§9.
- **Consolidated inputs:** `docs/35_Seeds_Meals_And_Calendar_Specification.md` (calendar, seeds, meals; external sources in its §8) · `docs/36_Kgotla_Year_Quest_Specification.md` (cast, copy, lore; external sources in its §11).
- **Code of record:** `packages/game-config/src/economy.ts` (caps, thresholds, packs, `VILLAGE_PASS`, `AUTOMATION_LADDER`, `CONTRACT_RULES`, `KGOTLA_*`) · `chapters.ts` (chapters, `MOPHANE_MONTHS`) · `almanac.ts` · `store.ts` · `apps/api/src/kgotla/kgotla.service.ts` (errands, projects) · `apps/api/src/chapters/chapter.controller.ts` (stamp spend route) · `apps/api/src/wallet/wallet.service.ts` (`creditBothoCapped`) · `scripts/balance_verify.py` (the economy gate — PASS, re-run 2026-10-02).
- **Superseded on adoption:** `docs/29_Kgotla_Reconciliation.md` (quest mechanics), and the joint statements of `docs/35`/`docs/36` listed in §2.
