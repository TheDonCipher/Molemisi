# 02 — Economy & Currencies

**This document holds every number in the game.** If a value exists, it lives here. Other documents describe behaviour; this one describes amounts.

---

## 1. Philosophy

1. **Pula is transparent and 1:1.** P5 spent buys P5 of Pula. No premium currency layer, no exchange rate, no multiplier.
2. **Money buys time and expression, never access.** A free player can reach every piece of content.
3. **The house never funds withdrawable rewards.** (The Withdrawal Funding Rule, §2.)
4. **Never surprise the player with a cost.** Every fee is shown before confirmation.
5. **Cultural authenticity.** Premium items are framed through Tswana spirituality and community, not a generic gem shop.

---

## 2. The Withdrawal Funding Rule

> **No thebe leaves the system that did not enter it from another player's deposit. The operator's revenue is fees — never the float, and never house-funded rewards.**

This single rule is what makes Molemisi a **marketplace** rather than a scheme, and it is why the design does not require a gambling licence in Botswana.

**Why it matters legally.** The Gambling Act's lottery concept turns on *contribution + chance + prize*; a bookmaker's licence turns on *betting on an outcome*. A player growing sorghum and selling it to another player, with the platform taking a fee, is neither. It's commerce. The moment the operator starts paying out its own money as rewards, that analysis collapses.

**Why it matters economically.** Every play-to-earn game that failed, failed here: rewards paid from a pool funded by new deposits is a structure that only works while inflow grows. Rewards funded by *another player buying something* works at any scale, forever.

**The one deliberate exception:** seasonal **Export Contracts**, funded from a capped monthly promotional budget. This exists to bootstrap liquidity when nobody has Madi yet, and to guarantee a demand floor in quiet months. It is a marketing cost, it is capped, it is declared, and it is ring-fenced.

**Corollary — the house never quotes a Pula ↔ Madi rate.** Players price their own listings. A fixed operator exchange rate would make this a currency business and an e-money question; a floating player-set rate keeps it a marketplace.

---

## 3. The three currencies

### 3.1 Pula (P) — soft

Earned by play. **Never purchasable with real money in v1**, never transferable between players, never withdrawable.

*Wait — top-up packs sell Pula (§7).* Purchasable, yes. Transferable and withdrawable, no. The distinction that matters for compliance: Pula only ever flows *in* from a player and *out* into sinks. It never comes back out as money.

**Buys:** seeds, water, crafting fees, buildings, maintenance, land, cosmetics.
**Earned from:** Co-op sales, Kgotla quests, community projects, the Almanac.

Pula inflates freely. That's correct — it's soft, and the sinks below are sized to absorb it.

### 3.2 Madi (M) — hard, withdrawable

**1 Madi = BWP 1.00**, two decimal places. Purchased via mobile money. Spent on the **Exchange** to buy goods other players listed. **Withdrawable** to the verified mobile number that funded the account.

Madi is **always 1:1 backed by player deposits in the system**. It cannot inflate, because none can be created except by a deposit.

> **Working name.** *Madi* needs confirmation with a Setswana speaker — it has been glossed to me as both "money" and "blood," and I won't assert it. Alternatives: **Kgwebo** (trade/business), **Madi ya Kgwebo**. Ruling needed.

**Enters by:** mobile money deposit, or being paid by another player on the Exchange.
**Leaves by:** withdrawal (2% fee), or buying someone's goods (10% fee, charged to the seller).

### 3.3 Chapter Token — seasonal, expiring

Earned and spendable **within a single 3-month chapter only**. At chapter end, **all balances go to zero**.

Themed per chapter (*Sekala sa Pula*, *Sekala sa Phane*, …). Buys seasonal cosmetics, chapter-only recipes, and entry to the seasonal prize draw.

**Never convertible to Madi. Never withdrawable.** Its entire job is to give players a reason to spend *now* rather than hoard — which is why it expires rather than persisting. This device is borrowed from Sunflower Land's chapter tokens, and it is the cheapest anti-inflation mechanism available.

---

## 4. The Market

### 4.1 Co-op (Pula side)

An NPC buyer. Always available. Buys standard goods for Pula at a dynamically-moving price within a bounded band.

- **5% tax** on every Co-op sale, server-side. The client never supplies the price.
- **Price band** 0.5×–2.0× base value, drifting on a 6-hour cycle.
- **Crafted and processed goods are exempt from the band** and sell at a stable 1.0× (±10%).

That exemption is deliberate and load-bearing. Without it, a crafted good could sell at 0.5× and **every recipe would lose money at random** — which would make the crafting margins in §6 a lie. With it, the player gets a real choice: **gathering is speculative, crafting is reliable.** That's a genuine risk/reward decision, and it's also thematically true — commodities fluctuate, contracted processed goods don't.

### 4.2 Exchange (Madi side) — v1.1

Player-to-player. Players list goods, players buy them.

| Rule | Value | Why |
|---|---|---|
| House fee | **10% of sale, charged to seller** | Revenue engine, and the anti-wash-trade mechanism |
| Withdrawal fee | **max(P5, 2%)**, cap P20 *(under review)* | Must exceed disbursement cost — see below |
| Minimum withdrawal | **P100** | Below this the fixed gateway cost exceeds any fee |
| Pricing | **Player-set. House never quotes a rate.** | Keeps this a marketplace, not a currency business |
| Listing slots | Limited by Storage tier (24 → 5 slots, 48 → 10, 96 → 20) | Listing space is itself scarce, which keeps fees meaningful |
| Eligible goods | Crafted goods, Bushveld materials, seasonal items, livestock products | Basic crops go to the Co-op, so the Pula economy isn't bypassed |
| Wash trading | Structurally unprofitable — 10% + 2% round trip | Fees *are* the anti-fraud control |

A deposit→withdraw round trip costs 2%, and a self-dealing sale costs 12%. **No arbitrage exists.** That's the point.

#### Two things the fee table hides

**1. Small withdrawals used to lose money.** Disbursement carries a fixed cost (roughly P5 + 1.5%). At the old "2%, min P2", a P100 withdrawal took P2 against P6.50 of cost. Every band up to ~P150 was a loss. Hence: minimum withdrawal P100, fee `max(P5, 2%)`.

**2. The Exchange only earns on velocity.** Deposit P100 (cash-in 3% = P3), let it change hands, then withdraw the remainder (P5 + 1.5%):

| Trades before withdrawal | Fee revenue | Gateway | Margin |
|---|---|---|---|
| 1 | P10.00 | P9.35 | **P0.65** |
| 2 | P20.00 | P9.21 | **P10.79** |
| 3 | P30.00 | P9.09 | **P20.91** |

**A single trade before cashing out is break-even.** The Exchange earns once deposited Madi circulates twice or more. That makes **velocity — not volume, not MAU — the KPI to instrument from day one**, and it makes player contracts and Export Contracts revenue-critical: they create reasons to *spend* Madi rather than withdraw it.

Both figures assume 3% cash-in and P5 + 1.5% disbursement. **Get real quotes before trusting either.**

---

## 5. The Kgotla economy

### 5.1 Player contracts (primary Madi path)

A player posts: *"50 sorghum by Friday — paying 20 Madi."* Another player fulfils it. **Player-funded**, so it satisfies the Withdrawal Funding Rule outright. This is the main honest route to earning Madi and it should carry the majority of Exchange volume.

### 5.2 Seasonal Export Contracts (the capped exception)

House-posted, Madi-denominated, available during a chapter, funded from the **capped monthly promotional budget**. Needed to bootstrap liquidity and to guarantee a demand floor.

Hard rule: **monthly spend on Export Contracts + prize pool ≤ the declared promotional budget.** Tracked, logged, and capped in configuration — not in someone's head.

### 5.3 Everything else at the Kgotla

Quests (Pula + Botho), community projects (Botho), the Elder's guidance, the Almanac. Community projects are deliberately **not grindable** — see §9.

---

## 6. Numbers of record

Every *economic* number lives here. The one exception is **Bushveld scene tuning** — Kagiso, tap costs, rest, yields, rarity weights — which lives in `04 §4.2`, because it is a gathering-pace knob rather than a price. Everything a Bushveld find is *worth* is here.

### 6.1 Crops

All 11 unlocked from the start (D6). **What changes with the season is which seeds are stocked** — see the calendar below. That is the discovery mechanism, replacing the retired level gate.

| Crop | Setswana | Seed | Base | Yield | Growth | Cadence | Water/hr | Thirst |
|---|---|---|---|---|---|---|---|---|
| Sorghum | Mabele | P2 | P3 | 4–6 | 18 h | 1 day | 0.04 | 💧 |
| Millet | Lebelebele | P2 | P4 | 3–5 | 16 h | 1 day | 0.06 | 💧 |
| Maize | Mmidi | P3 | P5 | 4–6 | 22 h | 1 day | 0.20 | 💧💧💧 |
| Cowpeas | Dinawa | P3 | P6 | 3–5 | 20 h | 1 day | 0.10 | 💧💧 |
| Tomatoes | Tamati | P5 | P10 | 2–4 | 24 h | 1 day | 0.26 | 💧💧💧 |
| Watermelon | Legapu | P6 | P11 | 4–6 | 44 h | 2 days | 0.30 | 💧💧💧 |
| Groundnuts | Manoko | P8 | P11 | 4–6 | 40 h | 2 days | 0.10 | 💧💧 |
| Sesame | Sesame | P10 | P15 | 3–5 | 46 h | 2 days | 0.12 | 💧 |
| Pepper | Pepere | P12 | P17 | 3–5 | 44 h | 2 days | 0.18 | 💧💧 |
| Herbs | Ditlhare tsa Setso | P16 | P25 | 2–4 | 48 h | 2 days | 0.14 | 💧💧 |
| Morula | Morula | P28 | P46 | 2–3 | 48 h | 2 days | 0.04 | 💧 |

**Three rules govern this table, and all three are hard:**

1. **No crop's growth sits between 24 h and 40 h.** With a once-daily check-in, a crop yields one harvest per visit if it finishes inside 24 h, and one per *two* visits otherwise. The old table had six crops at 26–36 h, silently halving their value and making watermelon (P6 seed, 30 h) earn *half* what sorghum (P2 seed, 18 h) did. Every crop is now explicitly **1-day** or **2-day**.
2. **A 2-day crop pays ~2× a comparable 1-day crop per harvest**, so waiting is a real trade against capital tied up, not a penalty.
3. **Water hunger, not price, is what differentiates crops.** Thirst is shown as drops on every seed packet, so the mechanic is learnable without a tutorial.

Net per plot per day (after 5% tax, before water): **P12.25 sorghum → P40.63 morula** — a **3.3×** spread, ordered by seed cost and capital at risk. The previous table's spread was 8× and unordered, which made tomatoes dominant and watermelon a trap.

> **Morula replaces Saffron** (F18). Saffron is not a Botswana crop. Morula is, it already appears as a Riverbank Discovery in `04 §6.2`, and a tree's near-zero water profile gives the ladder a top end with character.

#### The seed calendar

Six seeds stocked per chapter. Thirsty crops cluster in the rainy chapters, drought crops in the dry ones — so **the calendar forces rotation**, water becomes a seasonal decision, and no single crop can be planted year-round.

| Chapter | Seeds stocked |
|---|---|
| **Pula** (Nov–Jan, rains) | Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet |
| **Phane** (Feb–Apr, late rain) | Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper |
| **Moriti** (May–Jul, dry) | Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula |
| **Letlhafula** (Aug–Oct, wind) | Millet · Sorghum · Watermelon · Pepper · Herbs · Morula |

Best crop per season rotates **Tomatoes → Pepper → Morula → Morula**. In Moriti the only sane choices are drought crops, because a 20-plot watermelon farm in the dry season needs **two tank refills a day**.

This table is load-bearing: it replaces the level gate, prevents monoculture, makes water matter, and delivers the real Botswana calendar. Do not ship without it.

### 6.2 Items

| Item | Setswana | Category | Stack | Base value | Source |
|---|---|---|---|---|---|
| *(all seeds)* | Peo ya *<crop>* | DIPEO | 99 | *= the crop's seed cost in §6.1* | Market / Kgotla, in season |
| Sorghum | Mabele | DIJALO | 50 | 3 | Farm |
| Millet | Lebelebele | DIJALO | 50 | 4 | Farm |
| Maize | Mmidi | DIJALO | 50 | 5 | Farm |
| Cowpeas | Dinawa | DIJALO | 50 | 6 | Farm |
| Tomatoes | Tamati | DIJALO | 50 | 10 | Farm |
| Watermelon | Legapu | DIJALO | 50 | 11 | Farm |
| Groundnuts | Manoko | DIJALO | 50 | 11 | Farm |
| Sesame | Sesame | DIJALO | 50 | 15 | Farm |
| Pepper | Pepere | DIJALO | 50 | 17 | Farm |
| Herbs | Ditlhare tsa Setso | DIJALO | 50 | 25 | Farm |
| Morula | Morula | DIJALO | 50 | 46 | Farm |
| Eggs | Mae | DIPHOLOGOLO | 30 | 3 | Farm |
| Milk | Mashi | DIPHOLOGOLO | 30 | 5 | Farm |
| Manure | Manyoro | DIPHOLOGOLO | 30 | 1 | Farm |
| Wood | Dikgong | DITSHIMOLOGO TSA NAGENG | 50 | 2 | Open Bush |
| Stone | Matlapa | DITSHIMOLOGO TSA NAGENG | 50 | 3 | Rocky Outcrop — **Setena input** |
| Clay | Letsopa | DITSHIMOLOGO TSA NAGENG | 50 | 3 | Riverbank |
| Palm Fiber | Mokolwane | DITSHIMOLOGO TSA NAGENG | 50 | 4 | Riverbank |
| Thatch / Reeds | Lotlhaka | DITSHIMOLOGO TSA NAGENG | 50 | 3 | Riverbank |
| Mophane Worms | Phane | DITSHIMOLOGO TSA NAGENG | 50 | 10 | Open Bush, seasonal |
| Plank | Poleto | DITSALO | 99 | 7 | Crafting |
| Rope | Thapo | DITSALO | 99 | 18 | Crafting |
| Brick | Setena | DITSALO | 99 | 11 | Crafting |
| Flour | Bupi | DIKUNO | 20 | 20 | Crafting |
| Bread | Borotho | DIKUNO | 20 | 60 | Crafting |

Tools (Mogoma, Selepe, Watering Can, Pickaxe): owned, unstacked, no durability in v1.
**The `Special` inventory category is dropped** — rare finds are journal Discoveries only (R3).

### 6.3 Crafting

| Recipe | Input | Input @ opp. cost | Fee | Total | Sale | Net after 5% tax | Profit | ROI |
|---|---|---|---|---|---|---|---|---|
| Poleto (Plank) | 2× Wood | P3.80 | P1 | P4.80 | P7 | P6.65 | **P1.85** | 38.5% |
| Thapo (Rope) | 3× Palm Fiber | P11.40 | P1 | P12.40 | P18 | P17.10 | **P4.70** | 37.9% |
| Setena (Brick) | any 2 of Clay / Stone | P5.70 | P2 | P7.70 | P11 | P10.45 | **P2.75** | 35.7% |
| Bupi (Flour) | 4× Sorghum or Millet | P11.40 | P2 | P13.40 | P20 | P19.00 | **P5.60** | 41.8% |
| Borotho (Bread) | 2× Bupi | P38.00 | P3 | P41.00 | P60 | P57.00 | **P16.00** | 39.0% |

**Every row closes horizontally: `Total + Profit == Net`.** The previous version printed the input at *base* value in one column and computed profit on *opportunity* cost in another, so the table didn't add up (Poleto read as 5 → 6.65 → 1.85, but 6.65 − 5 = 1.65). A test written from that table would have failed.

*Opportunity cost* = what you'd net from selling the input (base × 0.95). That's the real alternative, and it's the correct basis for "should I craft this or just sell the material?"

Timers: **Poleto 2 h, Thapo 2 h, Setena 3 h, Bupi 4 h, Borotho 6 h.**
Unlocks: Poleto / Thapo / Setena from start; **Bupi at Botho ≥ 100**; Borotho follows from Bupi.

> **Why the timers are hours, not minutes.** They were 10–30 minutes. That pressures a player to sit in the app waiting — which contradicts the 5–15 minute daily session and the no-babysitting accessibility goal. At 2–6 hours, crafting is *start it now, collect it tomorrow*, which is the same rhythm as the crops.
>
> Note the consequence: once a timer is shorter than the visit interval, **slots are the binding constraint, not timers.** One slot means roughly one craft per day; three slots mean three. That is exactly the progression C22 intended.

Borotho is deliberately a **two-day good** in practice: Bupi 4 h then Borotho 6 h means a once-daily player finishes it the following day. That's what makes it feel premium.

### 6.4 Progression thresholds

| Botho | Unlocks |
|---|---|
| 100 | Bupi (Flour) recipe |
| 300 | Deep Bushveld — row exists, shows "coming soon", zero hotspots |
| 500 | Letsema — one free instant full-harvest per 7 days |
| 1000 | Eligibility for the monthly community prize |

No levels, no XP. Any existing level/XP field is **deleted**, not extended.

### 6.5 Storage and land

| Tier | Name | Slots | Listing slots (v1.1) |
|---|---|---|---|
| 1 | Storage Basket | 24 | 5 |
| 2 | Storage Shed | 48 | 10 |
| 3 | Storehouse | 96 | 20 |

Guild subscribers: **+50%, stacking** (24→36, 48→72, 96→144).

| Land tier | Plots | Cost | Cost per plot |
|---|---|---|---|
| Start | 4 | — | — |
| Basket | 8 | P1,200 | P300 |
| Shed | 12 | P6,000 | P1,500 |
| Storehouse | 20 | P30,000 | P3,750 |

Total to max: **P37,200**. Payback on the full ladder: **58 days** playing the best available crop, **114 days** at the median, **205 days** at the worst.

> These costs rose from P15,800 because the crop retune roughly doubled farm income; holding them flat would have made max land a two-week formality. Pacing is the target, not the absolute number.

Also fixed: **water P1.00 per unit, Jojo tank capacity 60, full refill P60.** Water is charged only while a crop is *growing* — never while it sits ready. At 20 plots that runs **P18/day for sorghum to P137/day for watermelon in a drought** — a **7.5×** spread, so the tank is the difference between a farm that runs and one that stalls. A 20-plot watermelon field drains a full tank in **under half a day** and needs **~2.4 refills**; the same field in sorghum lasts **3.1 days**.

### 6.6 Monetisation

| Item | Price | Grants / effect |
|---|---|---|
| Starter pack | P5 | 5 Pula |
| Farmer pack | P50 | 50 Pula |
| Harvest pack | P100 | 105 Pula |
| Cattle pack | P250 | 265 Pula |
| Export pack | P500 | 540 Pula |
| **Daily cap** | **P500/player/day** | Server-side, **Botswana time (UTC+2)** |
| Guild subscription | P49/mo | Auto-Collector, +50% storage, cosmetics, weekly Pula Stone, ad-free |
| Pula Stone | P20 | Refill Jojo tank 50%, or guarantee rain within 24 h |
| Ancestral Ward | P25 | 3-day shield against wildlife damage |
| Breath of the Land | P15 | Instantly completes an active crafting or building timer |
| ~~Fertility Shell~~ | — | **Removed (R8)** |

### 6.7 Community prize

- **Pool:** `clamp(10% × trailing-month Guild subscription revenue, floor P350, ceiling P1,500)`
- **Split:** 4 : 2 : 1 → P200 / P100 / P50 at the floor
- **Eligibility:** **top 3 by Botho earned during the month**, minimum 150 in the period
- **Tiebreak:** earliest to reach the qualifying total
- **KYC required before payout**, always

> **Eligibility changed from lifetime Botho ≥ 1000 to a monthly delta.** Botho accrual is capped per day (I4), so lifetime totals converge — after roughly two months of dedicated play, dozens of players sit at the same number and "top 3" becomes a tiebreak lottery. A monthly delta makes it an actual monthly contest, gives long-term players a reason to keep going, and still cannot be bought, because the cap holds.
- **Permissioned as a promotional competition under s.67.** Ring-fence it — this is the one part of the product that is genuinely a prize distribution, and it must not drag the rest into gambling territory.

At the illustrative scale in §8, 10% of subscription revenue (P294) sits *below* the P350 floor, so **the floor governs**. The formula only starts to bite past **72 subscribers**. In other words: for the foreseeable future the prize is a fixed P350/month marketing line. That's fine — just don't model it as scaling, because it won't.

### 6.8 Income curve

After the 5% Co-op tax, before water and maintenance:

| Farm size | Net Pula/day |
|---|---|
| 4 plots, starter crops (sorghum / millet) | ≈ **P49** |
| 20 plots, starter crops | ≈ **P245** |
| 20 plots, median in-season crop | ≈ **P408** |
| 20 plots, best in-season crop (Morula) | ≈ **P813** |

> The previous table's "20 plots maize ≈ P340" was unreachable — maize and sorghum had identical economics in §6.1, so both were P264. Corrected.

Water and maintenance come off these. Water at 20 plots runs **P18/day on sorghum to P137/day on watermelon in a drought** — the spread is the point.

For reference: a **P100 Harvest pack (105 Pula)** is about **two days** of starting-farm income and **a quarter of a day** at a maxed farm. That's the correct shape — a meaningful shortcut, never a requirement.

---

## 7. Sinks and faucets

**Faucets:** Co-op sales, quests, community projects, Almanac, Exchange sales (v1.1).

**Sinks, in order of real magnitude:**

1. **Seeds** — the largest sink by far
2. **Water** — the Jojo tank; a recurring, unavoidable, thematically perfect sink
3. **Land** — exponential, one-time
4. **Building maintenance** — seasonal, recurring; gives Poleto/Thapo/Setena permanent demand
5. **5% Co-op tax**
6. **Crafting fees** — small, and honestly more flavour than sink

> Say it plainly: **crafting fees are not a meaningful sink.** At P1–P3 and a handful of crafts a day, that's ~P10/day against P40/day of seed spend. They're there to make crafting feel like it costs something. Don't model them as economic ballast.

### 7.1 The endgame problem, and the two sinks that fix it

Computed accumulation after **all** costs (seeds, water, maintenance):

| Farm size | Unspent Pula/month |
|---|---|
| 4 plots | ≈ **P1,913** |
| 12 plots | ≈ **P5,288** |
| 20 plots | ≈ **P8,814** |

Once land is maxed, every sink above is either fixed or scales slower than income. **Pula accumulates without bound and there is nothing to buy.** That is the standard endgame failure, and it needed two sinks the original list didn't have:

1. **Cosmetics, priced in Pula — the only truly unbounded sink.** Hut colours, kraal patterns, livestock coats, Mogolo's hat, scene frames, seasonal Chapter cosmetics. Seasonal rotation makes it effectively infinite. Indicative prices **P200–P2,000**; some Chapter-Token-only.
2. **The Letsema fund — donate Pula to community projects.** Voluntary, uncapped, socially visible, and thematically perfect. **Botho from it stays capped per day**, so it is a pure sink and cannot buy prize eligibility. I4 holds.

Both are required. Without at least one unbounded sink, the soft currency is meaningless by month three and so is every top-up pack.

---

## 8. Financial model

Every figure below is a worked illustration on stated assumptions, not a forecast. **The assumptions are placeholders; the formulas are the reusable part.**

### 8.1 Illustrative revenue — 10,000 MAU

Assumes 3% of MAU make any purchase in a month (mid-range for casual mobile; Molemisi's P5 entry point should help toward the upper end, but this needs real cohort data before it drives any spending decision).

| Segment | % of payers | Players | Avg monthly spend | Revenue |
|---|---|---|---|---|
| One-time small buyers | 70% | 210 | P60 | P12,600 |
| Guild subscribers | 20% | 60 | P49 | P2,940 |
| Mid spenders | 8% | 24 | P150 | P3,600 |
| High spenders | 2% | 6 | P600 | P3,600 |
| **Total** | **100%** | **300** | — | **P22,740** |

- Blended ARPU **P2.27** · ARPPU **P75.80**
- Net at a 3% gateway fee: **≈ P22,058**
- Net after the prize pool: **≈ P21,708**

### 8.2 Exchange revenue (v1.1, additional)

Illustrative: if 5% of MAU (500 players) trade P100/month of goods at a 10% fee → **P5,000/month**, roughly a 22% uplift. This is why the marketplace matters commercially as well as for retention: **it monetises the players who would never buy a top-up, by taking a cut of the ones who do.**

### 8.3 Break-even — read this before anything else in §8

`Required MAU = (Fixed monthly costs + target profit) ÷ net ARPU`

At ≈P2.17 net ARPU (after fees and prize):

| Monthly cost base | Break-even MAU |
|---|---|
| P10,000 (solo / near-zero overhead) | **≈ 4,600** |
| P25,000 (small team) | **≈ 11,500** |
| P50,000 (funded studio) | **≈ 23,000** |

**This is the most important table in the specification.** Botswana's population is roughly 2.6 million, so 23,000 MAU is about 1% of the entire country, monthly. At P10,000/month the model is comfortable; at P50,000 it requires either total domestic dominance or export.

**The P50,000 in the original model was a placeholder. Replace it with your actual cost base before drawing any conclusion.** The entire viability question turns on that one number.

### 8.4 Assumptions to replace with real data

- **3% gateway fee** — plausible but unverified. Sensitivity: 5% → P21,603/mo; 8% → P20,921/mo. Get a real quote from Orange Money / MyZaka.
- **3% conversion**, **5-month blended lifetime**, **7-month payer lifetime** — all standard-range guesses. Blended LTV ≈ P11.35, payer LTV ≈ P530.60, sustainable CAC at 3:1 ≈ **P3.78/install**. Low enough that organic and community growth must carry v1, which is fine given the Kgotla's whole design is community-driven.

### 8.5 What a monthly cost base is actually made of

§8.3 gave break-even at three cost levels without ever saying what goes into one. It does now. **Indicative — replace every line with a real quote.**

| Line | Solo, self-produced art | With contracted art |
|---|---|---|
| Infrastructure (Supabase, hosting, domain, monitoring) | P700 | P1,500 |
| Payment rails (gateway fixed fees, reconciliation tooling) | P500 | P1,000 |
| **Art & content** (sprites, scenes, restoration art, seasonal chapters) | P0 — *your time* | **P8,000–15,000** |
| Support (mobile money disputes are frequent in this market) | P2,000 | P4,000 |
| Legal & compliance (amortised retainer, filings) | P1,500 | P2,000 |
| Marketing / community | P1,000 | P4,000 |
| Promotional budget (Export Contracts + prize) | P350–1,500 | P350–1,500 |
| **Total** | **≈ P8,000–15,000** | **≈ P20,000–30,000** |

Two things jump out:

- **Art is the whole difference.** A live service shipping four chapters a year needs new sprites, new scene art and new restoration stages continuously. It is the single largest controllable cost and the most likely to be underestimated.
- **Support is not optional.** Mobile money disputes — "I deposited and got nothing" — are frequent, slow, and reputational. Budget for them before launch, not after.

At a P10,000 cost base, break-even is ~4,600 MAU. Botswana has roughly 1.5 M internet users, so that is about **0.3% of the online population**. Ambitious but not fantasy — and it is exactly why the Kgotla's community-driven design has to carry acquisition, because P3.78 sustainable CAC will not buy 4,600 MAU.

---

## 9. The reward function determines the culture

This is not a footnote; it's the difference between the game you want and the game this genre usually produces.

**Reward throughput and you get spreadsheets, bots, and grinders — and loyal players lose to efficient ones.** That is what happened to most of play-to-earn.

So the design deliberately pays best for the things that **cannot be multiplied by grinding**:

- **Community projects** — contribution is capped per day
- **Botho** — accrues from explicit, manual, deliberate acts; capped per day
- **Journal discovery** — gated by the Bushveld's own recovery, not by effort
- **Seasonal participation** — gated by the calendar

A player who shows up daily and contributes should out-earn a player who optimises a spreadsheet, **because the design says so**. That is how "ROI for *loyal* players" becomes true rather than aspirational — and it means Molemisi's most Botswana-specific mechanics are simultaneously its anti-farm mechanics.

---

## 10. Payments, KYC and anti-abuse (v1.1)

### Rails
**Orange Money** and **Mascom MyZaka** at launch. **BTC Smega** for South Africa in v2 — the same cross-border rail Betway already demonstrates.

### Controls, in priority order

1. **One verified mobile number = one account.** Botswana mobile money is KYC'd at the SIM. This is the single biggest advantage mobile money has over crypto — Web3 must charge an entry fee or fight sybil farms forever; you get SIM-level identity for free.
2. **Closed-loop withdrawal.** Withdraw only to the number that funded the account. Betway's exact rule.
3. **KYC before first withdrawal.** Omang or passport matching the account name, plus proof the number is yours (a recent mobile money statement or screenshot). Betway's exact requirement.
4. **No house-funded Madi rewards, ever** (§2).
5. **Fees make wash trading unprofitable** (§4.2).
6. **Caps:** P2,000/day, P10,000/month. Standard operator practice; limits fraud blast radius and keeps cash flow sane.
7. **New-account holding period:** withdrawals locked for 30 days on a new account. Kills nearly all bot-and-dash behaviour. Explain it in the UI and players accept it.
8. **Device/IP clustering** on accounts that transact with each other.

### Do not custody the float

Holding BWP balances redeemable on demand may be **e-money / deposit-taking**, which is **Bank of Botswana** territory, not the Gambling Authority's.

**Mitigation: use a licensed PSP as the money handler.** Your systems track *entitlements* — how much Madi an account holds — while a licensed processor holds the BWP. You never custody customer money, which takes the question off the table.

If that isn't achievable at your scale, the fallback is transient settlement on a short cycle rather than indefinite storage.

> **Decide this before building the wallet schema.** It changes the data model. See `05` and `06`.

---

## 11. Open decisions

1. Legal brief to a Gaborone gaming/payments lawyer.
2. Licensed PSP vs self-custody.
3. Hard-currency name (Madi / Kgwebo / other).
4. Monthly promotional budget (Export Contracts + prize).

*Resolved 2026-09-07:* ~~Replacement crop for the Saffron placeholder~~ → **Morula** (§6.1, F18).
