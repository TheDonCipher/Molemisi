# 13 — Economy & Balance Engine

> Companion to `09`. **Normative owner of every number: `02 §6`.** Scene tuning: `04 §4.2`. This document specifies *how the numbers behave*, not new numbers.
> **Rule:** every value below is externalised into `packages/game-config/` and seeded from there. Application code contains no numeric literal that appears in `02 §6`.

---

## 1. The economic frame

Three principles from `02 §2`, restated because every rule below derives from them:

1. **Pula is earned-only — never sold.** No path converts money to Pula.
2. **Money buys time and expression, never access.** Every piece of content is reachable free.
3. **The house never funds withdrawable rewards (the Withdrawal Funding Rule).** In v1 there is no Madi outflow at all, so this is trivially satisfied; it becomes load-bearing in v1.1.

**The reward function determines the culture (`02 §9`).** The economy pays best for what **cannot be ground**: community projects (capped), Botho (manual, capped), Journal discovery (gated by the world's recovery), seasonal participation (gated by the calendar). A loyal player out-earns an optimiser because the design says so. Every cap in this document exists to keep that true.

---

## 2. Currency model

| Currency | Type | Earned by | Spent on | Convertible? | v1 status |
|---|---|---|---|---|---|
| **Pula** | soft | Co-op sales, quests, projects, Almanac | seeds, water, fees, buildings, maintenance, land, cosmetics | **No** — never transferable, never withdrawable | live |
| **Madi** | hard (1 M = BWP 1) | **v1: top-up only**; v1.1 also P2P payment | festival cosmetics, Village Pass | v1: **never converts, never withdraws, never transfers** | spend-only |
| **Chapter Token** | seasonal | Events live service, achievements, Almanac | seasonal cosmetics, prize-draw entry | never convertible, never withdrawable | **expires to zero at chapter end** |

**Madi is always 1:1 backed by deposits.** It cannot inflate — none is created except by a deposit (I1). The v1 Madi name is provisional; a different name is needed when the withdrawable layer ships (`02 §3.2`).

---

## 3. Wallet operations (the only balance writers)

```ts
// 10 §3.1 — WalletService is the sole writer.
credit(playerId, currency, amount, source, refId?): WalletSnapshot
debit (playerId, currency, amount, source, refId?): WalletSnapshot
```

**Contract:**

| Rule | Enforcement |
|---|---|
| Only these two functions change a balance | `launch-readiness.spec.ts` static check |
| Both are transactional; each writes exactly one `ledger_entries` row in the same transaction | code review + test |
| Neither accepts two distinct player IDs | **signature** (I2) |
| Idempotent given `(source, refId)` | unique index on `ledger_entries(source, ref_id)` where both non-null |
| A debit that would go negative is rejected | `m3_non_negative_checks` DB constraint + service guard |
| Botho credits go through `botho_credit_capped`, never `credit` directly | RPC path (`§6`) |

**Ledger row shape:** `{ player_id, currency, amount, balance_after, source, ref_id, created_at }`. The ledger is **append-only**; there is no update or delete path.

---

## 4. Crop timers — the dead-zone rule

`02 §6.1`. Eleven crops, all unlocked from the start (D6). **What changes with the season is which seeds are stocked**, not which seeds are legal.

**Hard rule (F1): no crop grows between 24 h and 40 h.** Every crop is explicitly **1-day (16–24 h)** or **2-day (40–48 h)**. Rationale: with a once-daily check-in, a crop finishing just after 24 h yields one harvest per *two* visits — silently halving its value. The old table had six crops at 26–36 h.

| Crop | Setswana | Seed | Base | Yield | Growth | Cadence |
|---|---|---|---|---|---|---|
| Sorghum | Mabele | P2 | P3 | 4–6 | 18 h | 1 day |
| Millet | Lebelebele | P2 | P4 | 3–5 | 16 h | 1 day |
| Maize | Mmidi | P3 | P5 | 4–6 | 22 h | 1 day |
| Cowpeas | Dinawa | P3 | P6 | 3–5 | 20 h | 1 day |
| Tomatoes | Tamati | P5 | P10 | 2–4 | 24 h | 1 day |
| Watermelon | Legapu | P6 | P11 | 4–6 | 44 h | 2 days |
| Groundnuts | Manoko | P8 | P11 | 4–6 | 40 h | 2 days |
| Sesame | Sesame | P10 | P15 | 3–5 | 46 h | 2 days |
| Pepper | Pepere | P12 | P17 | 3–5 | 44 h | 2 days |
| Herbs | Ditlhare tsa Setso | P16 | P25 | 2–4 | 48 h | 2 days |
| Morula | Morula | P28 | P46 | 2–3 | 48 h | 2 days |

**Three rules govern the table (`02 §6.1`):**
1. No growth between 24 h and 40 h (above).
2. A 2-day crop pays ~2× a comparable 1-day crop per harvest — waiting is a real trade against tied-up capital, not a penalty.
3. **Thirst, not price, differentiates crops.** Shown as 1–3 drops on every seed packet.

**Net per plot per day** (after 5% tax, before water): **P12.25 sorghum → P40.63 morula** = a **3.3× spread**, ordered by seed cost and capital at risk.

> Morula replaces Saffron (F18) — a tree's near-zero water profile gives the ladder a top end with character.

### 4.1 The seed calendar (forces rotation)

Six seeds stocked per chapter. Thirsty crops cluster in the rainy chapters. **An out-of-season seed is not purchasable** (F6).

| Chapter | Months | Seeds stocked |
|---|---|---|
| **Pula** | Nov–Jan | Sorghum · Maize · Tomatoes · Cowpeas · Groundnuts · Millet |
| **Phane** | Feb–Apr | Maize · Watermelon · Tomatoes · Groundnuts · Sesame · Pepper |
| **Moriti** | May–Jul | Sorghum · Millet · Cowpeas · Sesame · Herbs · Morula |
| **Letlhafula** | Aug–Oct | Millet · Sorghum · Watermelon · Pepper · Herbs · Morula |

Best crop per season rotates **Tomatoes → Pepper → Morula → Morula**. This table replaces the retired level gate, prevents monoculture, and makes water a seasonal decision (`02 §6.1`).

---

## 5. Water — the central tension

`03 §1.2`, `02 §6.5`. **An empty Jojo tank halts growth server-side. It never kills a crop.**

| Value | Amount |
|---|---|
| `unitPricePula` (Chapter 1 base) | **P1.00** |
| `tankCapacity` | **60** |
| `fullRefillPula` | **P60** |
| Charged while state | **`GROWING` only** — never while `READY` (F5) |
| `rainRatePerHour` | 2 units/h |
| `stormRatePerHour` | 5 units/h |

**Water cost scales inversely with `rainCoverage`** (per-chapter purchase multiplier): Pula 1.0× · Phane 1.4× · Letlhafula 2.2× · Moriti 2.5×. Ordering follows `rainCoverage` (0.80 / 0.50 / 0.15 / 0.05), not chapter index — ch4 is cheaper than ch3 because it is the less dry chapter.

**Spread:** at 20 plots, water runs **P18/day on sorghum to P137/day on watermelon in a drought** — a **7.5×** spread. A 20-plot watermelon field drains a full tank in under half a day; the same field in sorghum lasts 3.1 days (`02 §6.5`).

---

## 6. Botho — community standing

`02 §6.4`, `03 §6.2`, I4/I9/I10.

**Canonical number:** `player_wallets.botho_points`. There is **no second counter anywhere** (I10). The old Kgotla standing score is migrated into it and deleted.

### 6.1 Accrual rules (hard)

| Rule | Value | Why |
|---|---|---|
| Source | **explicit, manual, deliberate acts only** — deliver a quest, contribute to a project | C20 |
| `BOTHO_DAILY_CAP` | **50 /player/day** | legal control — keeps the prize a loyalty programme, not a purchase-linked sweepstakes |
| `BOTHO_PER_PULA_DONATED` | **1** | at 2/Pula a funded player hits the 50/day cap for P25 — "buying standing" |
| Charge regard | `REGARD_PER_CHARGE = 10` (regard is **not** Botho — separate per-NPC meter) | — |
| Letsema fund donations | Botho from them **stays inside the daily cap** | I4 — pure sink, cannot buy prize eligibility |

**Accrual path (the only one):**

```
botho_credit_capped(playerId, amount) → granted:
  used = SUM(botho granted to playerId today, Botswana time UTC+2)
  granted = min(amount, BOTHO_DAILY_CAP − used)
  if granted > 0: WalletService.credit(playerId, 'botho', granted, source)
  return granted
```

**The Auto-Collector (and Auto-Helper / Auto-Feeder) must be provably incapable of delivering a quest or donating (I4).** They are chore-removers, never yield multipliers — that is what lets the same behaviour also be a paid convenience without becoming pay-to-win.

### 6.2 Thresholds (enforced server-side, I9)

| Botho | Unlocks |
|---|---|
| **100** | Bupi (Flour) recipe |
| **300** | Deep Bushveld + Auto-Feeder |
| **500** | Letsema (1 free full-harvest / 7 days) + Auto-Helper |
| monthly delta ≥ 150 | Community-prize eligibility |

> `PRIZE_ELIGIBILITY: 1000` (lifetime) is **deprecated** — retained for compatibility only. The real gate is a **monthly Botho delta ≥ 150** (`02 §6.7`), because lifetime totals converge under the daily cap and "top 3" becomes a tiebreak lottery. The monthly delta cannot be bought, because the cap holds.

**A direct API call below a threshold must fail** — not merely hide the button in the UI (`06` P5, I9).

---

## 7. Inventory, storage, land

### 7.1 Stack caps (server-enforced)

| Category | Stack |
|---|---|
| Seeds (`DIPEO`) | 99 |
| Crops (`DIJALO`) | 50 |
| Forage / materials (`DITSHIMOLOGO TSA NAGENG`) | 50 |
| Livestock (`DIPHOLOGOLO`) | 30 |
| Crafted (`DITSALO`) | 99 |
| Processed (`DIKUNO`) | 20 |
| Tools | 1 (unstacked) |

**Tools never occupy a storage slot.** Mogoma, Selepe, Watering Can, Pickaxe are equipment. Equipping all tools must leave the storage count unchanged (F15).

### 7.2 Storage tiers

| Tier | Name | Slots | Listing slots (v1.1) |
|---|---|---|---|
| 1 | Storage Basket | 24 | 5 |
| 2 | Storage Shed | 48 | 10 |
| 3 | Storehouse | 96 | 20 |

**Village Pass: +50%, stacking** (24→36, 48→72, 96→144), vanishing the instant the subscription lapses (C8/R7). Writes are rejected **at** cap.

### 7.3 Land ladder

| Tier | Plots | Cost | Cost/plot |
|---|---|---|---|
| Start | 4 | — | — |
| Basket | 8 | P1,200 | P300 |
| Shed | 12 | P6,000 | P1,500 |
| Co-op | 16 | P8,000 | P500 |
| Export | 20 | P15,000 | P750 |

**`LAND_LADDER_TOTAL = 30,200`.** Payback: ~49 days best / ~96 median / ~173 worst. **Rule: no rung may exceed ~60 days of marginal payback** (`02 §6.5`). The 20-plot rung is the longest at ~92 days (`landRungPaybackDays`).

### 7.4 Income curve (after 5% tax, before water/maintenance)

| Farm size | Net Pula/day |
|---|---|
| 4 plots, starter crops | ≈ P49 |
| 20 plots, starter crops | ≈ P245 |
| 20 plots, median in-season | ≈ P408 |
| 20 plots, best in-season (Morula) | ≈ P813 |

---

## 8. Maintenance (the recurring sink)

`03 §3.5`, C21. **Seasonal/recurring maintenance** on Water Source, Kraal and Farm Boundary gives Poleto/Thapo/Setena **permanent demand** and is a real recurring sink.

| Value | Amount |
|---|---|
| Cadence | **30-day bill** |
| `MAINTENANCE_SCALE_PER_BUILDING` | 0.05 (each additional building scales the bill) |
| `warningLeadHours` | 24 |

- A building in `MAINTENANCE` has cracks; paying the bill triggers a repair flourish and returns it to `ACTIVE`.
- **A maintenance cycle must fall due and create real demand for a crafted material** (`06` P4).

**Wildlife raids are DEFERRED (ruling 2026-09-11).** No raid mechanic exists. `RAID_SYSTEM_IMPLEMENTED = false`. No building `benefit` string may mention a raid/wildlife/predator/overnight threat, and no store SKU may advertise one — the Ancestral Ward was withdrawn rather than sold inert. `store.spec.ts` asserts this from both directions. Restore the copy only in the same commit that implements the raid tick.

---

## 9. The economy gate — `balance_verify.py`

**This is the CI gate from P1 onward.** It reads `02 §6.1` **as written** and asserts the balance invariants. **If it prints `FAIL`, the spec is wrong — fix `02`, never the script** (`README.md`, F19).

| Assertion | Target |
|---|---|
| **Dead-zone rule** | 0 crops with growth in (24 h, 40 h) |
| **Within-season dominance** | dominance count ≤ 3 |
| **Value spread** | 3.32× (sorghum → morula net/plot/day) |
| **Thirst spread** | 7.5× |
| **Land payback** | no rung > ~60 days marginal |
| **Crafting closes horizontally** | every row `Total + Profit == Net` |
| **Bushveld vs Farm (§8)** | reports the inversion; **reported, not asserted** — the Princess ruled live telemetry answers this post-launch |

Run: `python scripts/balance_verify.py`. Expected: `PASS` on the 4-scene model.

> The Bushveld §8 inversion is a **recorded, accepted state**, not an unresolved bug. With all four scenes modelled, Bushveld base net is **P245.10/day** against a 4-plot starter farm's P49/day — an inversion spanning 4–20 plots on the starter basis. The structural half (Kagiso caps at ≤6 taps/scene/day and cannot be bought) is proven in `launch-readiness.spec.ts`. If live telemetry shows gathering is optimal, **fix `04 §4` or farm income — never the gate script**.

---

## 10. Elder's guidance & proverbs

`03 §7`. A small **rules table — condition → line** — read from real state (tank, weather, Botho, season), **not** a fixed dialogue tree. Conditions in priority order:

| Condition | Line family |
|---|---|
| Tank empty | "Water is the whole game" |
| Rain imminent/active | a proverb about rain |
| Botho just crossed a threshold | acknowledgment |
| Season == Moriti | dry-season counsel |
| Else | daily proverb rotation |

**The proverb should respond to what the player did** (sold a whole harvest → haste; left a crop unwatered → neglect; contributed → *Motho ke motho ka batho*). Same machinery, warmest cheap character work available. **Native-speaker pass required before shipping** — only *Motho ke motho ka batho* is high-confidence (`04 §9.4`).

---

## 11. Payments, caps, monetisation

### 11.1 Top-up (v1: Madi only)

| Pack | Price BWP | Grants |
|---|---|---|
| Spark | P5 | 5 Madi |
| Farmer | P20 | 20 Madi |
| Harvest (flagship) | P50 | 55 Madi |
| Cattle | P100 | 110 Madi |
| Export | P250 | 275 Madi |
| **Daily cap** | **P500/player/day, Botswana time (UTC+2)** | — |

The cap is enforced **in Botswana time, not server-local** (C5/R4/I12) — a UTC boundary would let a player top up twice inside one local evening.

### 11.2 Store (two cosmetic shelves + Village Pass)

| Item | Price | Note |
|---|---|---|
| Market-shelf decoration | P200 / P600 / P1,500 | Pula — everyday look |
| Festival-shelf decoration | M40 / M80 / M150 / M300 | Madi — seasonal look; **each has a same-slot Market cousin** ("nobody's farm looks poorer because they didn't pay") |
| Village Pass | **M50/mo** | helper (waters+collects) · 1 festival outfit/mo · +50% storage (stacking) |

**Boosts are absent from the catalogue entirely** — `BOOSTS` is `readonly never[]`, `BOOST_SLUGS` is empty. `store.spec.ts` asserts the catalogue stays empty **and** that the three historical slugs are absent **by name**, so a rename cannot smuggle one back.

The helper is also **earned free at Botho 500** — paying gets it early; playing gets it forever.

### 11.3 Community prize

| Value | Amount |
|---|---|
| Pool | `clamp(10% × trailing-month subscription revenue, floor P350, ceiling P1,500)` |
| Split | 4 : 2 : 1 → P200 / P100 / P50 at the floor |
| Eligibility | **top 3 by monthly Botho delta**, minimum 150 in the period |
| Tiebreak | earliest to reach the qualifying total |
| KYC | required before payout (v1.1) |

At illustrative scale, 10% of subscription revenue sits below the P350 floor, so **the floor governs** until ~72 subscribers. Permissioned as a promotional competition under s.67 — ring-fenced.

---

## 12. Sinks and faucets

**Faucets:** Co-op sales, quests, community projects, Almanac, Exchange sales (v1.1).

**Sinks, in order of real magnitude:**

1. **Seeds** — the largest sink by far
2. **Water** — recurring, unavoidable, thematic
3. **Land** — exponential, one-time
4. **Building maintenance** — seasonal, recurring
5. **5% Co-op tax**
6. **Crafting fees** — small; flavour, not ballast

**The endgame sink problem (§7.1):** after all costs, unspent Pula accumulates P1,913 / P5,288 / P8,814 per month at 4 / 12 / 20 plots. **Two unbounded sinks fix it, and both are required:**

1. **Cosmetics priced in Pula** — the only truly unbounded sink (P200–P2,000; seasonal rotation makes it effectively infinite).
2. **The Letsema fund** — donate Pula to community projects. Voluntary, uncapped, socially visible. **Botho from it stays capped per day**, so it is a pure sink (I4).

Without at least one unbounded sink, the soft currency is meaningless by month three and so is every top-up pack. Ship at least one cosmetic line in v1 even if thin.

---

## 13. Cheat-sheet of invariants owned by this document

| Invariant | Rule | Where enforced |
|---|---|---|
| **I2** | No code path moves Pula between two players | `WalletService` signature |
| **I4** | Auto-Collector never increments Botho, directly or indirectly | CI test + `botho_credit_capped` |
| **I7** | Server authoritative on price, quantity, growth, reward | every sale/craft/collect endpoint |
| **I8** | 5% tax server-side; crafted exempt from band (±10%) | `MarketService.sell` |
| **I9** | Botho thresholds enforced server-side | guard on each gated route |
| **I10** | Single canonical Botho number | `player_wallets.botho_points` |
| **I12** | Caps: top-up P500/day (UTC+2); withdrawal P2,000/day, P10,000/mo; 30-day hold | v1: top-up only; rest is v1.1 |
| **I13** | Chapter tokens zero at chapter end, idempotently | rollover job |
| **I14** | Kagiso never negative / above max | property test |
| **I15** | No withdrawal endpoint exists at all | route-table assertion + static grep |

*End of `13`. Proceed to `14_Deterministic_Simulation.md`.*
