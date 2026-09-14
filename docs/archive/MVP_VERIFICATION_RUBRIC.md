# Molemisi — MVP Verification Rubric

**Owner:** Belvedere (audit). **Status:** draft, pre-implementation.
**Purpose:** the measuring stick used to confirm the MVP implementation is *correct* and *complete*. Written from `docs/MVP/*.md` before the build lands, so the criteria can't be reverse-engineered to fit whatever got built.

Non-code. Nothing here modifies the app. Safe to read alongside an in-flight implementation.

> ## ⚠️ STOP — three "settled" decisions in here are now under review
>
> On 2026-09-07 Princess Eugenia clarified the actual product intent: **Molemisi is an economic game in the Sunflower Land mould, with real ROI for loyal players**, Stardew-inspired pixel art, and menu-driven (no movement) as a deliberate accessibility choice — monetised via **mobile money for the African market**, with crypto as an accepted fallback.
>
> That intent is incompatible with three decisions this rubric currently treats as locked:
>
> | Decision | Where | Status |
> |---|---|---|
> | No direct cash-out — Pula never convertible to real BWP | Economy §1.2, invariant **I1** | **UNDER REVIEW** — this is the wall between the spec and the intended product |
> | No P2P Pula transfers, ever | Economy §6, invariant **I2** | **UNDER REVIEW** — an economic game generally wants a player market |
> | No EPS / e-money licence required | Economy §6 | **UNDER REVIEW** — that reasoning holds only while there is no cash-out |
>
> **Do not build Phases 5–7 on the assumption these hold.** Phases 1–4 (stabilisation, inventory/crafting, progression, Bushveld) are unaffected and safe to continue.
>
> Awaiting a ruling on the economic model. See `MVP_REVIEW_AND_IMPROVEMENTS.md` and the 2026-09-07 memory log.

---

## 0. Numbers of record

Where the specs disagree, this table is the authority until Princess Eugenia rules otherwise. Rationale for each override is in §1.

> **Rulings applied 2026-09-07.** Princess Eugenia has ruled on C2–C15. Every ruling is folded into this document and marked **RESOLVED**. Two of them change the design materially: **Fertility Shell is removed** (C10) and **Journal page buffs are removed** (C6) — see §1c for the knock-on effect on Pillar 3, which is now a pillar with no mechanical reward.

### Items (base value, Pula)

| Item | Setswana | Category | Stack | Base value | Source |
|---|---|---|---|---|---|
| Sorghum Seeds | Peo ya Mabele | DIPEO | 99 | 2 | Market / Kgotla |
| Maize Seeds | Peo ya Mmidi | DIPEO | 99 | 2 | Market / Kgotla |
| Watermelon Seeds | Peo ya Legapu | DIPEO | 99 | 3 | Market / Kgotla |
| Sorghum | Mabele | DIJALO | 50 | 4 | Farm |
| Maize | Mmidi | DIJALO | 50 | 4 | Farm |
| Watermelon | Legapu | DIJALO | 50 | 6 | Farm |
| Eggs | Mae | DIPHOLOGOLO | 30 | 3 | Farm |
| Milk | Mashi | DIPHOLOGOLO | 30 | 5 | Farm |
| Manure | Manyoro | DIPHOLOGOLO | 30 | 1 | Farm |
| Wood | Dikgong | DITSHIMOLOGO TSA NAGENG | 50 | 2 | Open Bush |
| Stone | Matlapa | DITSHIMOLOGO TSA NAGENG | 50 | 2 | Rocky Outcrop |
| Clay | Letsopa | DITSHIMOLOGO TSA NAGENG | 50 | 3 | Riverbank |
| Palm Fiber | Mokolwane | DITSHIMOLOGO TSA NAGENG | 50 | 4 | Riverbank |
| Thatch / Reeds | Lotlhaka | DITSHIMOLOGO TSA NAGENG | 50 | 3 | Riverbank |
| Mophane Worms | Phane | DITSHIMOLOGO TSA NAGENG | 50 | 10 | Open Bush, seasonal |
| Plank | Poleto | DITSALO | 99 | **7** | Crafting |
| Rope | Thapo | DITSALO | 99 | **18** | Crafting |
| Brick | Setena | DITSALO | 99 | **11** | Crafting |
| Flour | Bupi | DIKUNO | 20 | **20** | Crafting |
| Bread | Borotho | DIKUNO | 20 | **60** | Crafting |

Tools (Mogoma, Selepe, Watering Can, Pickaxe): owned, unstacked, no durability in MVP.

### Crafting — the five recipes and their margins

| Recipe | Input | Input cost | Fee | Total cost | Sale | Net after 5% tax | Margin |
|---|---|---|---|---|---|---|---|
| Poleto (Plank) | 2× Wood | P4 | P1 | P5 | P7 | P6.65 | +P1.65 (33%) |
| Thapo (Rope) | 3× Palm Fiber | P12 | P1 | P13 | P18 | P17.10 | +P4.10 (32%) |
| Setena (Brick) | 2× Clay | P6 | P2 | P8 | P11 | P10.45 | +P2.45 (31%) |
| Bupi (Flour) | 3× Sorghum or Maize | P12 | P2 | P14 | P20 | P19.00 | +P5.00 (36%) |
| Borotho (Bread) | 2× Bupi | P40 | P3 | P43 | P60 | P57.00 | +P14.00 (33%) |

Timers: Poleto 10 min, Thapo 10 min, Setene 15 min, Bupi 20 min, Borotho 30 min.
Unlocks: Poleto/Thapo/Setene from start; Bupi at Botho ≥ 100; Borotho via Bupi dependency.

### Economy

| Knob | Value |
|---|---|
| Market tax | flat 5%, server-side, on every sale |
| Top-up packs | P5→5, P50→50, P100→105, P250→265, P500→540 |
| Top-up daily cap | P500 per player, server-side |
| Guild subscription | P49 / month |
| Pula Stone | P20 — refill Jojo tank 50% or guarantee rain in 24h |
| Ancestral Ward | P25 — 3-day wildlife-damage shield |
| ~~Fertility Shell~~ | **REMOVED for MVP (C10).** Was P30 / +50% next sale. Do not implement; strike from Economy §3 and from the `premium_boosts` seed. |
| Breath of the Land | P15 — instantly completes an active crafting/building timer |
| Prize pool | `clamp(10% × trailing-month Guild subscription revenue, 350, 1500)`, split 4:2:1 |
| Prize eligibility | Botho ≥ 1000, top 3, KYC-verified before payout |

### Progression

| Gate | Threshold | Unlocks |
|---|---|---|
| Botho | 100 | Bupi recipe |
| Botho | 300 | Deep Bushveld (row exists, "coming soon", zero hotspots) |
| Botho | 500 | Letsema — one free instant full-harvest per 7 days |
| Botho | 1000 | Monthly Community Prize eligibility |

No player levels, no XP. Any existing level/XP field is retired, not extended.

### Storage

| Tier | Name | Slot cap |
|---|---|---|
| 1 | Storage Basket | 24 |
| 2 | Storage Shed | 48 |
| 3 | Storehouse | 96 |

Guild subscribers: +50% on top of current tier.

### Bushveld

- Scenes: Open Bush, Riverbank, Rocky Outcrop (live) + Deep Bushveld (Botho 300, no content).
- 5–8 Hotspots per scene. One tap resolves. Minimum touch target 48×48dp.
- Respawn: common 20–40 min, uncommon 2–4 h, rare 8–16 h.
- Daily Sparkle: exactly one Hotspot system-wide per day, boosted loot table, no claim button.
- Mophane: hotspot `Setlhare sa Phane` in Open Bush, `active_months = [4, 12]`, real calendar only, badge independent of Sparkle.
- Feel target: 2–3 ready Hotspots per scene on a typical 1–2×/day visit. (Needs the simulator to validate — see §5.)

---

## 1. Spec conflicts found — resolve before or during the audit

These are genuine contradictions between the specs, not nitpicks. Each one will produce a wrong-but-plausible implementation if the agent picks the wrong source.

| # | Conflict | Sources | Recommendation |
|---|---|---|---|
| C1 | Crafted-good base values differ wildly: Plank 5 vs 7, Rope 6 vs 18, Brick 6 vs 11, Flour 8 vs 20, Bread 12 vs 60 | Inventory §3 vs Core v2 §2 / Economy §8.1 | **Core v2 / Economy v2 win.** They're the explicitly corrected numbers (Core v2 §6.2 recalculated them for a 31–36% margin). Inventory §3 still carries the stale pre-fix table. Under Inventory's numbers every recipe is a guaranteed loss. |
| C2 | Livestock category spelled `DIPHOLOFOLO` vs `DIPHOLOGOLO` | Core v2 §1.1 vs Inventory §2 | **RESOLVED — `DIPHOLOGOLO`.** Make it a checked enum; a mismatch silently drops items from client filters. |
| C3 | Brick spelled `Setene` vs `Setena` | Core v2 §2 vs Economy §8.1 / Inventory §3 | **RESOLVED — `Setena`.** One slug everywhere; slug mismatches break recipe→item joins. |
| C4 | Rare Seed is both an inventory item (stack 10, not sold) and declared "never gets a `player_inventory` row, journal-only" | Inventory §3 vs Core v2 §1.1/§1.3 | **RESOLVED — journal Discovery only.** No inventory row, not giftable, not sellable. Consequence: the `Special` inventory category is now empty and should be dropped from `item_definitions` seed data. |
| C5 | Daily top-up cap (P500) appears in Economy §2.1 and the Phase 8 checklist, but is absent from Phase 6's API description | Economy §2.1 vs Impl Plan Phase 6 | **RESOLVED — the cap is required.** Enforce server-side on `POST /payments/topup`, per-player, per calendar day in **Botswana time (UTC+2)**, not server-local. A UTC-based day boundary would let a player top up twice inside one local evening. |
| C6 | Journal page buffs (+5% bonus yield, weather tooltip, storage discount) exist in Core v2 §5.3 but appear nowhere in the implementation plan | Core v2 §5.3 vs Impl Plan | **RESOLVED — buffs removed.** Pillar 3 now grants no mechanical reward. See §1c: this hollows out the Journal pillar and needs a replacement reward, or the "Three Pillars" framing is overclaiming. |
| C7 | `player_wallets.botho_points` is created in Phase 5 but consumed by Phase 3 | Impl Plan §3 vs §5 | **RESOLVED — `player_wallets.botho_points` is canonical from the start.** Create the column in Phase 3 (not Phase 5); Phase 5 builds around it. Migrate the Kgotla standing score into it, repoint all reads/writes, then delete the old field. Only one Botho number may exist at any time. |
| C8 | Guild +50% storage is in Economy §2.2 but not in the plan's behaviour list | Economy §2.2 vs Impl Plan Phase 6 | **RESOLVED — keep it.** Verify it *stacks* on the current tier (24 → 36, 48 → 72, 96 → 144) rather than replacing it, and that it disappears the instant the subscription lapses. |
| C9 | Discoveries: "reuse existing storage, no dedicated new table" vs a new `field_journal_entries` table | Bushveld §8 vs Impl Plan Phase 4 / Core v2 §1.5 | **New table wins** — Core v2 §1.5 states nothing like it exists yet. |
| C10 | Fertility Shell: "+50% sale value on next harvest sold" vs earlier "quality-grade guarantee" | Roadmap Decision 7, Economy §3, Core v2 §2.2 | **RESOLVED — removed from MVP entirely.** No boost, no grade system, no dependency. Three boosts remain: Pula Stone P20, Ancestral Ward P25, Breath of the Land P15. |

### 1b. Conflicts between the *existing codebase* and the MVP specs

Found by reading `packages/game-config/src` on 2026-09-07. These are the dangerous ones: the specs never mention them, so an implementer adding Phase 2 on top of the current config will produce something that looks finished and is economically broken.

| # | Existing code | MVP spec | Why it matters |
|---|---|---|---|
| C11 | Crop base prices: sorghum **15**, maize **20**, watermelon **40**. Seed costs 5 / 8 / 20 | Sorghum **4**, maize **4**, watermelon **6**. Seeds 2 / 2 / 3 | **Critical.** The corrected crafting margins assume P4 grain. Bupi needs 3× grain: spec cost P12, actual cost P45. Against a P20 sale value that's a **P25 loss per craft** — the exact failure Core v2 §6.2 says was fixed. The fix is only real if crop values are rebased too. |
| C12 | Level/XP system fully live: `unlockLevel` on all 11 crops and animals, `calculateLevelXpRequired()`, `XP_REWARDS`, `STARTING_ENERGY` | "Any existing player-level/XP field is retired, not extended" (Roadmap Decision 2); "No player levels, no XP" | Directly contradicts a locked decision. Also, `unlockLevel` is how crop gating currently works — retiring it needs a replacement gate or every crop is unlocked at once. |
| C13 | **11 crops** configured | MVP inventory lists **3** (sorghum, maize, watermelon) | Scope decision: trim to 3, or keep 11 and extend the item list? The recipes reference sorghum/maize only. |
| C14 | Market prices swing **0.5×–2.0×**, updated every 6h | Crafting margins in Economy §8.1 assume the flat base sale value | At 0.5× every recipe loses money again (Bupi sells P10 against P14 cost). Margins are only valid at 1.0×. Either clamp the multiplier for crafted goods or accept that margins are an average, not a guarantee — but the spec says "consistent," which it currently isn't. |
| C15 | `MAX_PLOTS = 20`, `STARTING_PLOTS = 4` | Land expansion 4 → 8 → 12 plots | Minor; confirm the intended ceiling. |

### 1b resolutions

| # | Ruling |
|---|---|
| **C11** | **RESOLVED — adopt the spec's crop values (sorghum P4, maize P4, watermelon P6; seeds P2/P2/P3), and fix the real problem elsewhere.** Rebasing *up* to the code's P15/P20/P40 would force all five recipes to be recomputed again, and it inflates Pula without creating any real revenue — dev profitability comes from the top-up ladder's *value proposition*, not from starving players of Pula. The actual faucet control is **crop growth time** (see C16, §1c), not crop price. Keep prices low and legible; gate income with time. |
| **C12** | **RESOLVED — every crop available from the start. Retire level/XP entirely.** Delete `calculateLevelXpRequired()`, `XP_REWARDS`, `STARTING_ENERGY`, and every `unlockLevel` field. Crop *progression* moves from a level gate to **seed availability**: the Market and Kgotla stock different seeds by season, so the player discovers crops through the world rather than through a number going up. This also satisfies C13 below. |
| **C13** | **RESOLVED — keep all 11 crops**, all unlocked. The MVP inventory spec's 3-crop list was a minimum, not a ceiling. This gives seed-seasonality (C12) something to rotate through and makes the Market worth visiting. |
| **C14** | **RESOLVED — split the market band by good type.** Raw/foraged goods swing 0.5×–2.0×; **crafted and processed goods are stable at 1.0× (±10%)**. Justification: it's thematically true (commodities fluctuate, contracted processed goods don't), it's player-sensible (crafting is the reliable path, gathering is the speculative one — a real risk/reward choice), and it makes Economy §8.1's "consistent margin" claim *actually true* instead of true-on-average. This is the single highest-leverage fix in the whole economy. |
| **C15** | **RESOLVED — `STARTING_PLOTS = 4`, `MAX_PLOTS = 20`.** Land ladder 4 → 8 → 12 → 20, exponential costs. |

---

## 1c. New conflicts found during the full review (C16–C22)

These emerged from the coherence and maths review and were not in the earlier pass.

| # | Conflict | Detail | Recommendation |
|---|---|---|---|
| **C16** | **Crop growth time vs. stated session length** | Existing config: sorghum 4 stages × 3 min = **12 minutes**; watermelon 6 × 5 = 30 min. The spec's micro loop is a **5–15 min daily session**. | **Critical coherence failure.** 12-minute crops make this a trading terminal, not a cozy farm. At 4 plots you'd harvest ~P64 every 12 min ≈ **P320/hour**; at 20 plots, ~P1,600/hour. That destroys the faucet, the value of every sink, and theGenre. **Retune to ~1 game day:** sorghum ~18 h, maize ~22 h, watermelon ~30 h. One harvest per daily check-in. |
| **C17** | **Bushveld respawn bands vs. check-in cadence** | Common 20–40 min, uncommon 2–4 h, rare 8–16 h. A player visiting once per day (1,440 min) finds **every** hotspot ready, because every band is < 24 h. | **The spec's own feel target (2–3 ready per scene) is unreachable at a daily cadence.** All 5–8 hotspots are always available, so scarcity is zero and the Daily Sparkle is meaningless. Fix in §5 of the review doc: either lengthen bands past 24 h or — better — abandon timer-scarcity for **disturbance scarcity**. |
| **C18** | **Journal pillar has no reward** | C6 removed the page buffs. Pillar 3 now grants literally nothing on completion. | Restore a reward or restate the pillar. Recommendation: **pull the Bushveld restoration arc (Bushveld §11) into MVP** — completing a scene's page visibly restores that scene's background art. Costs no balance, is deeply satisfying, and is the most "postmodern" move available: the world changes because you paid attention to it. |
| **C19** | **Crafting margin method error** | Economy §8.1 taxes the *output* at 5% but values the *input* at pre-tax base price. The true opportunity cost of an input is what you'd net from selling it (base × 0.95). | Recomputed on an opportunity-cost basis, real ROI is **35.7%–41.8%**, not 31–36%. All five recipes are *more* profitable than stated. Not harmful, but the spec's numbers are wrong and should be corrected rather than defended. Full table in the review doc. |
| **C20** | **Botho decoupling is weaker than claimed** | The Auto-Collector is forbidden from *directly* incrementing Botho. But it generates **inventory**, and Botho is earned by delivering quest items and donating to community projects. | The subscription therefore *indirectly accelerates* Botho accrual by supplying the materials. If Botho gates a real-money prize, that's the exact link the legal framing says must not exist. **Fix:** cap Botho accrual per day, require an explicit manual action per increment, and make the Auto-Collector provably unable to deliver quests or donate. Add this to the I4 invariant. |
| **C21** | **Three of five recipes have no sustained demand** | Poleto/Thapo/Setena exist as building inputs, but MVP buildings are **flat, single-tier, built once**. After the last building, those three recipes are dead content. | Add **recurring maintenance**: thatch needs re-ratching, kraals need repair, fences need mending — on a seasonal cadence. Creates permanent demand for planks/rope/brick, a real Pula sink, and it's true to Botswana where a kraal is never "finished." |
| **C22** | **Concurrent crafting slots unspecified** | The plan never says how many `crafting_jobs` may run at once. | This single unknown swings crafting income by ~10×. **Specify: 1 slot by default, 2nd and 3rd unlocked by buildings.** It gives the flat single-tier buildings a purpose without violating Decision 5. |

---

## 2. Hard invariants — must be true, each with its own test in CI

These are the ones where a bug costs real money or legal exposure. Not "verify manually" items.

| # | Invariant | Test |
|---|---|---|
| I1 | No endpoint converts Pula back to real money | Static grep + route-table assertion: no handler path produces a payout to a provider |
| I2 | No code path moves Pula between two different players | Automated test enumerating every function that touches `pula_balance`; assert none accepts two distinct player IDs. Enforced by `WalletService` signatures, not convention |
| I3 | Replayed webhook credits exactly once | Idempotency test: same `provider_tx_id` delivered twice → exactly one credit, one ledger row |
| I4 | Auto-Collector never increments Botho — **directly or indirectly** (C20) | Dedicated test, **in CI**, on any change to Auto-Collector or Botho accrual. Must assert: (a) no direct increment, (b) the Auto-Collector cannot deliver a quest or donate to a project, (c) Botho accrual is capped per player per day. This is the safeguard that keeps the prize a loyalty program rather than a purchase-linked sweepstakes |
| I5 | Prize pool never exceeds P1,500 | Property test across leaderboard sizes and subscriber counts |
| I6 | No payout while `kyc_status != 'verified'` | Endpoint test on every payout path |
| I7 | Server is authoritative on price, quantity, reward | Client-supplied price/quantity is ignored or rejected — fuzz test on every sale/craft/collect endpoint |
| I8 | 5% Market Tax applied server-side on every sale | Each sale path; assert client cannot supply or bypass the rate |
| I9 | Botho thresholds enforced server-side | Direct API calls below threshold must fail — not just be hidden in UI |
| I10 | Single canonical Botho number | No second reputation/standing counter exists; old Kgotla score migrated and repointed |

---

## 3. Per-phase acceptance criteria

Derived from the "Done when" lines in the Implementation Plan, expanded into individually checkable statements.

### Phase 1 — Stabilize
- [ ] `POST /auth/logout` wired to the Settings screen; token cleared client-side on response
- [ ] Next.js rewrites `/api/*` → NestJS; no cross-port CORS remains in the browser path
- [ ] `AdminGuard` on `PUT /config` and `PUT /config/:key`; a non-admin account gets 403 on a direct call
- [ ] `pnpm db:seed` either works or is removed from `package.json`
- [ ] Signup → farm → sell → logout → login completes with no dead end

### Phase 2 — Inventory, Crafting, Storage
- [ ] `item_definitions` seeded with the full catalog at the values in §0
- [ ] Stack caps enforced: Seeds 99, Crops 50, Forage 50, Livestock 30, Crafted 99, Processed 20, Tools 1, Special 10
- [ ] All five recipes craftable end to end
- [ ] Each recipe nets the exact margin in §0 after the 5% tax
- [ ] `POST /crafting/start` rejects when inputs missing **or** fee unaffordable, and deducts atomically (no partial deduction on failure)
- [ ] `POST /crafting/:jobId/collect` returns 409 before the timer elapses; credits once, not twice, on repeat calls
- [ ] Bupi returns an error below Botho 100 via direct API call
- [ ] Storage upgrade raises the enforced cap (24 → 48 → 96); inventory writes rejected at cap
- [ ] 5% tax applied on `POST /market/sell`

### Phase 3 — Three Pillars
- [ ] `GET /progression` returns `{ pula, botho: {current, thresholds, next}, journal: {pagesComplete, totalPages} }`
- [ ] No response anywhere still reads Level/XP fields
- [ ] Letsema: rejected below Botho 500, and rejected if used within the last 7 days — both server-side
- [ ] Letsema completes every ready-to-harvest plot in one call
- [ ] Elder's tip changes when tank level / weather / Botho change (rules table, not static text)
- [ ] Deep Bushveld returns a "coming soon" flag at Botho ≥ 300, not a 403

### Phase 4 — Bushveld & Field Journal
- [ ] Three scenes seeded, 5–8 hotspots each, rarity tiers matching the respawn bands in §0
- [ ] `GET /bushveld/scenes/:sceneId` returns `state: ready|resting`, `eta_seconds` when resting, `is_sparkling_today`, `is_seasonal_active_today`
- [ ] One tap resolves a ready hotspot; second attempt before respawn returns 409
- [ ] Exactly one hotspot system-wide carries the Sparkle badge per day
- [ ] Sparkle badge carries a boosted loot table for that day only
- [ ] `Setlhare sa Phane` loot table changes only in real-world April and December
- [ ] Mophane month check is decoupled from the farm's simulated season clock
- [ ] First-time finds write to `field_journal_entries`; repeat finds don't duplicate
- [ ] Journal organised by real scene page
- [ ] Depleted hotspots render in a resting state, not removed
- [ ] Hotspot touch targets ≥ 48×48dp

### Phase 5 — Wallet & Ledger
- [ ] `player_wallets` is the single home for Pula and Botho; migration reconciliation run and passing (sum old == sum new)
- [ ] `real_world_transactions` is append-only, `provider_tx_id` unique-constrained
- [ ] `WalletService.credit/debit` are the only functions touching `pula_balance`; both transactional, both write a ledger row
- [ ] Duplicate webhook credits exactly once (I3)
- [ ] No P2P transfer path exists (I2)
- [ ] No withdrawal path exists (I1)

### Phase 6 — Top-ups, Subscription, Boosts
- [ ] `GET /payments/store` returns packs, plan, boosts at the values in §0
- [ ] Top-up credits only after provider webhook confirmation, never on request
- [ ] P100 Harvest Pack credits exactly 105 Pula, once
- [ ] Daily cap P500 enforced server-side (C5 — verify explicitly)
- [ ] Subscription: auto-collect, +50% storage, cosmetics, weekly Pula Stone (C8)
- [ ] Lapsed subscription immediately stops auto-collect, storage bonus, cosmetics
- [ ] Boosts deduct Pula atomically; only **three** boosts exist (Pula Stone P20, Ancestral Ward P25, Breath of the Land P15) — no Fertility Shell anywhere in seed data or store response
- [ ] Auto-Collector runs and leaves Botho untouched (I4, CI-enforced)
- [ ] Daily cron flips lapsed subscriptions; weekly cron grants Pula Stone

### Phase 7 — Monthly Community Prize
- [ ] Monthly cron selects top 3 by Botho among players ≥ 1000
- [ ] Pool formula matches §0 with floor P350 / ceiling P1500
- [ ] Split 4:2:1
- [ ] `kyc_status` starts `pending`; payout blocked until `verified` (I6)
- [ ] Pool never exceeds P1,500 under any input (I5)

### Phase 8 — Launch Readiness
- [ ] Scripted walkthrough passes: signup → farm → craft → sell (tax visible) → Bushveld loop → Botho milestone → top-up → subscribe → boost, one sitting, desktop + mobile widths
- [ ] PWA installs from both platforms, no Play Store dependency
- [ ] All of I1–I10 confirmed in *production configuration*, not only in test

---

## 4. How the audit will actually run

1. **Static pass** — schema diff against the plan, route inventory, grep for the hard invariants.
2. **Unit/property pass** — the numbers in §0 asserted against real seed data; margin and pool formulas property-tested.
3. **Integration pass** — real API calls against a seeded local stack, scripted, asserting status codes and balances, not just happy-path 200s. Includes negative cases: below-threshold, before-timer, replayed webhook, over-cap, cross-player.
4. **Manual walkthrough** — Phase 8 checklist, desktop + mobile.
5. **Report** — per-criterion pass/fail, with anything failing traced back to the spec line it violates.

Negative tests matter more than happy paths here. A feature that works when used correctly proves little; the money and progression gates only mean something when they hold under abuse.

---

## 5. The simulator

Bushveld §10 states the respawn bands are "starting targets for playtesting, not a validated simulation," and names a feel target of 2–3 ready Hotspots per scene on a typical 1–2 visits/day pattern. **That claim is currently unverified.** So is the crafting chain's faucet/sink balance over a month of play (see C14 — the margins only hold at a 1.0× market multiplier).

**Chosen design (Princess Eugenia, 2026-09-07):**

- **Form:** interactive tuning sandbox — a browser UI with sliders for respawn bands, prices, fees, and timers, plus time controls, showing a simulated month play out live.
- **Runtime:** both, on a **shared config**. One source of truth for every number, consumed by (a) a fast in-memory model for thousands of runs, and (b) an API-driving bot that verifies the shipped build matches the model. Shared config is what stops the two drifting apart.

**First questions the simulator should answer:**

1. Do the Bushveld respawn bands actually deliver 2–3 ready Hotspots per scene on a 1–2 visits/day pattern?
2. At the real market multiplier range (C14), what fraction of craft cycles are profitable?
3. Over 30 simulated days, does Pula accumulate without bound, or do the sinks (fees, 5% tax, seeds, land) hold?
4. How long to the first Botho 100 / 500 / 1000 milestone under a realistic check-in cadence?
