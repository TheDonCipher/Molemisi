# 06 — Verification Rubric

**Owner:** Belvedere (audit). **Status:** pre-implementation.
**Purpose:** the measuring stick used to confirm an implementation is *correct* and *complete*.

Written before the build lands, so the criteria can't be reverse-engineered to fit whatever got built. **On any question of "is it done?", this document wins** — including over `01`–`05`.

Non-code. Nothing here modifies the app. Safe to read alongside an in-flight implementation.

---

## 0. Where the numbers live

This rubric does **not** restate the numbers. A second copy of a value is a value that will disagree later. It points at the owner.

| Numbers | Owner |
|---|---|
| Crops, items, crafting margins, thresholds, storage, land, monetisation, prize, income curve | `02 §6` |
| Bushveld scarcity — Kagiso max, regen, tap costs, rest, yields, rarity weights | `04 §4.2` |
| Growth timers, water rates, maintenance cadence | `03 §1`, `02 §6.1` |
| Fee and tax rates | `02 §4` |

An audit finding that cites a number must cite the document that owns it.

---

## 1. Conflict register

Every conflict found across the original spec set, the codebase, and the 2026-09-07 review. **All are resolved.** This section is now a decision log, not an open question list — kept so nobody re-litigates a settled point or accidentally rebuilds the old behaviour.

### 1a. Spec vs spec (C1–C10)

| # | Conflict | Ruling |
|---|---|---|
| C1 | Crafted-good base values differ wildly between the inventory spec and Core/Economy v2 (Plank 5 vs 7, Rope 6 vs 18, Bread 12 vs 60) | **Core/Economy v2 win.** Under the inventory spec's numbers every recipe is a guaranteed loss. |
| C2 | `DIPHOLOFOLO` vs `DIPHOLOGOLO` | **`DIPHOLOGOLO`** (R1). Make it a checked enum — a mismatch silently drops items from client filters. |
| C3 | `Setene` vs `Setena` | **`Setena`** (R2). One slug everywhere; mismatches break recipe→item joins. |
| C4 | Rare Seed is both an inventory item and declared journal-only | **Journal Discovery only** (R3). No inventory row, not sellable. The `Special` category is dropped entirely. |
| C5 | Daily top-up cap (P500) in the economy spec but absent from the implementation plan | **Required** (R4). Server-side, per player, per calendar day **in Botswana time (UTC+2)** — not server-local. |
| C6 | Journal page buffs exist in Core v2 but nowhere in the plan | **Buffs removed** (R5). The Journal's reward is scene restoration instead — see C18. |
| C7 | `player_wallets.botho_points` created in Phase 5, consumed in Phase 3 | **Canonical from the start** (R6). Create it in the wallet phase; migrate the Kgotla standing score into it; delete the old field. |
| C8 | Guild +50% storage in the economy spec but not in the plan's behaviour list | **Keep it** (R7). Must **stack** on tier (24→36, 48→72, 96→144) and vanish instantly on lapse. |
| C9 | Discoveries: "reuse existing storage" vs a dedicated `field_journal_entries` table | **New table.** Nothing suitable exists in the codebase. |
| C10 | Fertility Shell: "+50% next sale" vs "quality-grade guarantee" | **Removed entirely** (R8). Three boosts remain: Pula Stone P20, Ancestral Ward P25, Breath of the Land P15. |

### 1b. Codebase vs spec (C11–C15)

| # | Conflict | Ruling |
|---|---|---|
| C11 | `crops.ts` prices sorghum **P15** / maize **P20** / watermelon **P40**; spec says P4 / P4 / P6 | **Adopt the spec's values.** Bupi needs 3× grain: spec cost P12, actual cost P47 against a P20 sale — a **P27 loss per craft**. Rebasing *up* would force every recipe to be recomputed again and inflates Pula without creating revenue. The real faucet control is **growth time** (C16), not price. *The ruling stands; the spec side of the comparison has since been retuned again — sorghum P3 / maize P5 / watermelon P11 (`02 §6.1`, F1–F2). Use whatever `02 §6.1` says at implementation time, never this row's numbers.* |
| C12 | Level/XP system fully live: `unlockLevel`, `calculateLevelXpRequired()`, `XP_REWARDS`, `STARTING_ENERGY` | **Delete all of it** (D5). Crop progression moves to **seed seasonality** — the Market and Kgotla stock different seeds by season. This also resolves C13. |
| C13 | 11 crops configured vs 3 in the MVP item list | **Keep all 11** (D6), all unlocked. Gives seed seasonality something to rotate. |
| C14 | Market swings 0.5×–2.0×, but crafting margins assume a flat base value | **Split the band by good type.** Raw/foraged swing 0.5×–2.0×; crafted/processed are stable at 1.0× (±10%). Makes the margin table *actually* true rather than true on average, and gives the player a real risk/reward choice. |
| C15 | `MAX_PLOTS = 20`, `STARTING_PLOTS = 4` vs a 4→8→12 land ladder | **4 → 8 → 12 → 20**, exponential costs (D10/D11). |

### 1c. Found during the full review (C16–C22)

| # | Conflict | Ruling |
|---|---|---|
| C16 | Crop growth 12–30 **minutes** against a stated 5–15 min daily session | **Retune to ~1 game day** — 14–48 h. At 12-minute sorghum, four plots netted ≈P280/hour and the top-up ladder was worth under two hours of play. Critical coherence failure. |
| C17 | Every Bushveld respawn band is shorter than a day, so a daily player finds *all* hotspots ready every visit | **Abandon timer-scarcity for disturbance-scarcity:** the per-scene **Kagiso** meter (`04 §4`). The old "2–3 ready per scene" target was unreachable by construction. |
| C18 | With C6, the Journal pillar granted literally nothing | **Pull the restoration arc into v1.** Completing a scene's page visibly restores its art. Costs no balance, is permanent and visible, and is the most distinctive thing in the design. |
| C19 | Crafting margins valued inputs at pre-tax base price, not opportunity cost | **Recomputed on an opportunity-cost basis** (input valued at base × 0.95). Real ROI is 35.7–41.8%, not 31–36%. `02 §6.3` carries the corrected table. |
| C20 | Auto-Collector is banned from *directly* incrementing Botho, but supplies the materials for Botho-earning acts | **Three controls:** cap Botho accrual per day, require an explicit manual action, and make the Auto-Collector **provably incapable** of delivering a quest or donating. Invariant **I4**. |
| C21 | Three of five recipes have no sustained demand once the one-time buildings are built | **Seasonal maintenance** on Water Source, Kraal and Farm Boundary. Permanent demand for Poleto/Thapo/Setena, a real recurring sink, and true to Botswana. |
| C22 | Concurrent crafting slots unspecified — swings crafting income ~10× | **1 slot by default; 2nd and 3rd unlocked by Crafting building upgrades.** |

### 1d. Reversed on 2026-09-07 — the pivot

The original spec set described a cozy game. That was wrong, and the following are **reversed**, not merely amended:

| # | Old | New |
|---|---|---|
| C23 | "No direct cash-out — Pula never convertible to real BWP" | **Withdrawals exist.** Madi → verified mobile money number. v1.1. |
| C24 | "No P2P Pula transfers, ever" | **The Exchange is P2P and player-priced.** Pula remains non-transferable; Madi is the trading currency. |
| C25 | "No EPS / e-money licence required" | **Void.** That reasoning held only while there was no cash-out. Legal sign-off is blocker **B1**. |

---

## 2. Hard invariants

Each of these must hold, and each needs its own automated test. **A bug in any of them costs real money or creates legal exposure** — these are not "verify manually" items.

| # | From | Invariant | Test |
|---|---|---|---|
| **I1** | v1.1 | **No house-funded Madi.** Madi is created only by a completed deposit or by a debit from another player's balance | Static + test: assert every credit path to `madi_balance` is traceable to a `real_world_transactions` completed row or a matching counterparty debit |
| **I2** | v1 | **No code path moves Pula between two players** | Enumerate every function touching `pula_balance`; assert none accepts two distinct player IDs. Enforced by `WalletService` signature, not convention |
| **I3** | v1 | **Replayed webhook credits exactly once** | Same `provider_tx_id` delivered twice → exactly one credit, one ledger row |
| **I4** | v1 | **Auto-Collector never increments Botho — directly or indirectly** | Dedicated test, **in CI**, on any change to Auto-Collector or Botho accrual. Must assert: (a) no direct increment, (b) cannot deliver a quest or donate, (c) Botho accrual capped per player per day. This is what keeps the prize a loyalty programme rather than a purchase-linked sweepstakes |
| **I5** | v1.1 | **Prize pool within floor and ceiling** | Property test across leaderboard sizes and subscriber counts |
| **I6** | v1.1 | **No payout while `kyc_status != 'verified'`** | Endpoint test on every payout path |
| **I7** | v1 | **Server is authoritative on price, quantity, growth completion and reward** | Fuzz test on every sale / craft / collect endpoint: client-supplied values are ignored or rejected |
| **I8** | v1 | **5% Co-op tax applied server-side; crafted/processed exempt from the price band** | Each sale path; assert the client cannot supply or bypass the rate, and that a crafted good stays within ±10% while a raw good does not |
| **I9** | v1 | **Botho thresholds enforced server-side** | Direct API calls below threshold fail — not merely hidden in UI |
| **I10** | v1 | **Single canonical Botho number** | No second reputation/standing counter exists; old Kgotla score migrated and repointed |
| **I11** | v1.1 | **Withdrawal only to the funding number** | Endpoint test; closed-loop rule |
| **I12** | v1.1 | **Caps hold:** top-up P500/day (UTC+2); withdrawal P2,000/day, P10,000/month; 30-day new-account hold | Each cap independently, at the boundary and one unit past it |
| **I13** | v1 | **Chapter tokens zero at chapter end** | Rollover job is idempotent and safe to re-run; verified by dry-run before the first real rollover |
| **I14** | v1 | **Kagiso cannot go negative or exceed max**; no collect succeeds below the hotspot's cost | Property test on concurrent and replayed collect calls |
| **I15** | v1 | **No withdrawal endpoint exists at all** | Route-table assertion + static grep. In v1 this is the whole of I1 — it must fail closed |

> **I15 vs I1:** in v1 there is no Madi and no withdrawal, so I15 is the operative check. I1 takes over in v1.1. Both live in CI; I15 is expected to *fail* the moment v1.1 lands, at which point it is retired by explicit sign-off — not quietly deleted.

---

## 3. How the audit runs

1. **Static pass** — schema diff against `05`, route inventory, grep for every invariant, config-vs-`02 §6` diff.
2. **Unit / property pass** — every number in `02 §6` and `04 §4.2` asserted against real seed data; margin, pool and Kagiso formulas property-tested.
3. **Integration pass** — real API calls against a seeded local stack, scripted, asserting **status codes and balances**, not just happy-path 200s. Includes every negative case: below-threshold, before-timer, replayed webhook, over-cap, cross-player, clock-mocked season boundary.
4. **Manual walkthrough** — the P10 checklist, desktop + mobile, low-end device on throttled 3G.
5. **Report** — per-criterion pass/fail, with every failure traced to the spec line it violates.

**Negative tests matter more than happy paths.** A feature that works when used correctly proves little. The money gates, progression gates and scarcity gates only mean anything if they hold under abuse.

---

## 4. Per-phase acceptance criteria

### P0 — Stabilise
- [ ] `POST /auth/logout` wired to Settings; token cleared client-side on response
- [ ] Next.js rewrites `/api/*` → NestJS; no cross-port CORS in the browser path
- [ ] `AdminGuard` on `PUT /config` and `PUT /config/:key`; non-admin gets 403 on a direct call
- [ ] `pnpm db:seed` works or is removed from `package.json`
- [ ] Signup → farm → sell → logout → login, no dead end

### P1 — Numbers of record
- [ ] Every value in `02 §6` present in seeded data, asserted by test
- [ ] Crop values in seeded data match `02 §6.1` exactly — sorghum base **P3**, maize **P5**, watermelon **P11** — **not** the codebase's P15 / P20 / P40 (C11). The current table is: sorghum P3 · millet P4 · maize P5 · cowpeas P6 · tomatoes P10 · watermelon P11 · groundnuts P11 · sesame P15 · pepper P17 · herbs P25 · morula P46
- [ ] `python scripts/balance_verify.py` prints **PASS** — it reads `02 §6.1` as written and asserts the dead-zone rule, dominance, spread and payback (F19)
- [ ] No `unlockLevel`, `XP_REWARDS`, `STARTING_ENERGY`, `calculateLevelXpRequired` anywhere (C12)
- [ ] Category is `DIPHOLOGOLO` (C2); brick slug is `setena` (C3); no `Special` category exists (C4)
- [ ] No crop growth timer under 12 hours anywhere in config (C16)
- [ ] **No crop growth timer sits between 24 h and 40 h** — every crop is explicitly 1-day or 2-day (F1)
- [ ] The seed calendar in `02 §6.1` is seeded: six seeds per chapter, and an out-of-season seed is not purchasable (F6)
- [ ] Every seed exposes a 1–3 drop thirst rating in the store response (F5)
- [ ] Morula is the top-of-ladder crop; no Saffron anywhere in seed data (F18)
- [ ] `pnpm db:seed` is idempotent — second run changes nothing
- [ ] No numeric literal from `02 §6` appears in application code

### P2 — Wallet, ledger, server authority
- [ ] `player_wallets` is the single home for Pula and Botho
- [ ] Migration reconciliation run and passing: `sum(old) == sum(new)`
- [ ] `ledger_entries` is append-only; `currency` is nullable and accepts `'madi'` (§0.3 foresight)
- [ ] `WalletService.credit/debit` are the only functions touching a balance; both transactional, both write a ledger row
- [ ] Duplicate webhook credits exactly once (I3)
- [ ] No P2P Pula transfer path exists (I2)
- [ ] No withdrawal endpoint exists (I15)

### P3 — Inventory, storage, crafting
- [ ] `item_definitions` seeded with the full catalogue at `02 §6.2` values
- [ ] Stack caps enforced: Seeds 99, Crops 50, Forage 50, Livestock 30, Crafted 99, Processed 20, Tools 1
- [ ] All five recipes craft end to end, netting the margins in `02 §6.3` after tax (C19 corrections applied)
- [ ] `POST /crafting/start` rejects on missing inputs **or** unaffordable fee, with no partial deduction
- [ ] `POST /crafting/:jobId/collect` returns 409 before the timer; credits once on repeat calls
- [ ] A third concurrent job is rejected while only two slots are unlocked (C22)
- [ ] Bupi fails below Botho 100 on a direct API call (I9)
- [ ] Storage upgrade raises the enforced cap; writes rejected at cap
- [ ] Guild +50% **stacks** on tier and disappears on lapse (C8)
- [ ] Only three boosts exist; no Fertility Shell in seed or store response (C10)
- [ ] **Every crafting row in `02 §6.3` closes horizontally**: `Total + Profit == Net` (F4)
- [ ] Bupi takes **4** grain; Setena accepts stone as a substitute (F8)
- [ ] Tools do not consume storage slots (F15)
- [ ] Crafting timers are 2–6 h, not minutes (F14)

### P4 — Farm loop
- [ ] With an empty tank, a crop's growth timer does not advance; refilling resumes it from where it stopped
- [ ] An empty tank never kills a crop
- [ ] Rain events credit the tank
- [ ] A maintenance cycle falls due and creates real demand for a crafted material (C21)
- [ ] **STRUCK from v1 (ruling 2026-09-11) — wildlife raids are deferred.** The former criterion read: *"Wildlife raid occurs on an unprotected plot and is prevented by Farm Boundary / Ancestral Ward."* No raid mechanic is implemented; building one touches the growth simulation and the offline-elapsed-time pass. The Ancestral Ward is withdrawn from the store rather than sold inert. See `03 §1.3` and `docs/KNOWN_LIMITATIONS.md`.
- [ ] Land ladder 4 → 8 → 12 → 20, costs per `02 §6.5`
- [ ] **Water is charged only while a crop is growing** — never while it sits ready (F5)
- [ ] Water at P1.00/unit, tank 60, full refill P60
- [ ] An empty tank halts growth and does not kill the crop
- [ ] A 20-plot thirsty-crop farm drains the tank in under a day; a drought-crop farm does not

### P5 — Kgotla and Three Pillars
- [ ] `GET /progression` returns `{ pula, botho: {current, thresholds, next}, journal: {pagesComplete, totalPages} }`
- [ ] No response anywhere reads Level/XP fields (C12)
- [ ] Letsema rejected below Botho 500 **and** within 7 days — both server-side
- [ ] Letsema completes every ready plot in one call
- [ ] Botho accrual is capped per player per day (I4)
- [ ] Elder's tip changes when tank / weather / Botho change — rules table, not static text
- [ ] Deep Bushveld returns `coming_soon` at Botho ≥ 300, not a 403

### P6 — Bushveld
- [ ] Three scenes seeded, 5–8 hotspots each, Deep Bushveld's row present with zero hotspots
- [ ] Kagiso computed on read from `kagiso_updated_at`, not by a cron
- [ ] Collect below `kagiso_cost` returns **409 `scene_not_settled`** (not a generic failure)
- [ ] Second tap on the same hotspot within 60 min returns **409 `hotspot_resting`**
- [ ] Kagiso never negative, never above max, under concurrent and replayed collects (I14)
- [ ] Rarity weights scale with Kagiso per `04 §4.2`
- [ ] Exactly one hotspot system-wide carries the Sparkle per day
- [ ] Sparkle and seasonal badges can coexist on one hotspot
- [ ] `Setlhare sa Phane` changes loot table **only** in real-world April and December — verified with a mocked clock
- [ ] Mophane check is decoupled from the farm's season clock
- [ ] First-time finds write to `field_journal_entries`; repeats don't duplicate
- [ ] A rare find never creates an inventory row (C4)
- [ ] Completing a scene's page swaps its background asset at each restoration threshold (C18)
- [ ] Resting hotspots render in a resting state, not removed
- [ ] Hotspot touch targets ≥ 48×48 dp

### P7 — Market: Co-op
- [ ] 5% tax applied on every sale path, server-side (I8)
- [ ] Client-supplied price is ignored or rejected — fuzz confirmed (I7)
- [ ] Raw/foraged goods move within 0.5×–2.0× across a full band cycle
- [ ] Crafted/processed goods stay within ±10% of base across the same cycle (C14)
- [ ] Seed stock rotates by season

### P8 — Live service
- [ ] Four chapters seeded with the real-calendar dates in `04 §9.2`
- [ ] Chapter rollover zeroes every player's token balance exactly once
- [ ] Rollover job is idempotent and safe to re-run (I13)
- [ ] Dry-run of the rollover executed against production-shaped data before the first real one

### P9 — Monetisation
- [ ] `GET /payments/store` returns packs and the plan at `02 §6.6` values. **Boosts are absent (ruling 2026-09-11)** — withdrawn from both storefronts until their effects are wired; R8/C10 still holds because the three slugs remain in config. See `docs/KNOWN_LIMITATIONS.md`.
- [ ] Top-up credits only after webhook confirmation, never on request
- [ ] P100 pack credits exactly 105 Pula, once
- [ ] Daily cap P500 enforced per player per **Botswana** day (UTC+2) — verified at the boundary and one thebe past it (C5)
- [ ] Lapsed subscription immediately stops auto-collect, storage bonus and cosmetics
- [ ] Auto-Collector runs and leaves Botho untouched (I4, CI-enforced)
- [ ] Daily cron flips lapsed subscriptions; weekly cron grants Pula Stone
- [ ] **At least one unbounded Pula sink is live** — cosmetics priced in Pula, the Letsema fund, or both (F7)
- [ ] Letsema-fund donations do **not** increase Botho beyond the daily cap (I4)

### P10 — v1 launch readiness
- [ ] Full scripted walkthrough passes in one sitting, desktop + mobile widths
- [ ] PWA installs on Android and iOS with no Play Store dependency
- [ ] I2, I7–I10, I13–I15 confirmed in **production configuration**, not only in test
- [ ] Low-end device smoke test on throttled 3G passes

### v1.1 — P11 to P14
- [ ] **B1** legal sign-off and **B2** PSP decision are both recorded before P11 starts
- [ ] One verified mobile number per account; duplicate numbers rejected
- [ ] KYC review queue has an audit trail on every decision
- [ ] Madi is created only by deposit or player payment (I1)
- [ ] Exchange fee 10% charged to the seller; listing slots bounded by storage tier
- [ ] Basic crops are **not** Exchange-eligible
- [ ] Deposit → withdraw round trip costs exactly 2%; self-dealing sale costs 12%
- [ ] Withdrawal to a non-funding number is rejected (I11)
- [ ] Withdrawal before day 30 is rejected (I12)
- [ ] Daily and monthly caps hold at the boundary (I12)
- [ ] **Withdrawal below P100 is rejected; fee is `max(P5, 2%)`** — no withdrawal may settle at a fee below the disbursement cost (F9)
- [ ] Prize ranks by **monthly Botho earned**, with a minimum threshold and an earliest-reached tiebreak (F16)
- [ ] **Madi velocity is instrumented** — trades per deposited pula before withdrawal (F10)
- [ ] Export Contracts + prize spend never exceed the configured promotional budget
- [ ] No payout while `kyc_status != 'verified'` (I6)
- [ ] I15 retired by explicit sign-off once withdrawals are live

---

## 5. The simulator

`04 §4` replaces the old respawn bands, and those bands were never validated — the old spec itself called them "starting targets for playtesting." The Kagiso numbers are likewise a reasoned proposal, not a measurement. **That claim is currently unverified**, as is the month-long faucet/sink balance of the whole economy.

**Chosen design (Princess Eugenia, 2026-09-07):**

- **Form:** an interactive tuning sandbox — browser UI with sliders for Kagiso, prices, fees and timers, plus time controls, showing a simulated month play out live.
- **Runtime:** both, on a **shared config**. One source of truth for every number, consumed by (a) a fast in-memory model for thousands of runs, and (b) an API-driving bot that verifies the shipped build still matches the model. The shared config is what stops the two drifting apart.

### 5.1 Sequencing — **build first, then simulate** (ruling 2026-09-07)

The sandbox is **deferred until P6 is complete.** Implement v1 first. Four reasons, in order of weight:

1. **Half the design cannot exist yet.** The runtime above is deliberately two-headed — the API-driving bot exists to *verify the shipped build against the model*. With no build, only the weaker head is deliverable, and the head that prevents drift is precisely the missing one.
2. **A simulator built now is a third copy of the numbers.** F19 was caused by exactly this: the spec and its tuning model drifted apart. `balance_verify.py` fixed it by collapsing doc and model into one. Standing up a browser sandbox before implementation re-introduces the bug that was just removed — three sources of truth instead of two.
3. **The remaining questions are mostly not simulation questions.** Of the seven below, two are already answered analytically, two are cheap headless extensions, one is a playtest, and one needs real players. Only one genuinely needs the sandbox.
4. **Feel cannot be simulated.** "Does a 5–15 minute session feel complete?" and "does Kagiso deliver 3–5 finds per visit?" are answered by playing the built game. Simulating them produces confident numbers about an experience nobody has had — worse than no answer, because it looks like one.

**What stays now, cheap:** `scripts/balance_verify.py`, extended as questions 3–4 and 6 are retired into it. It is a CI gate, it is headless, and it reads the spec as written.

**Trigger to build the sandbox:** P6 complete (Farm loop **and** Bushveld both real). At that point both income sources exist in code and question 2 can be answered against the actual build.

### 5.2 The seven questions, re-sorted by what actually answers them

| # | Question | Answered by | Status |
|---|---|---|---|
| 2 | Does the Bushveld stay a *supplement* to the Farm rather than out-earning it? | **Sandbox, post-P6** — needs both systems real | Open |
| 1 | Does Kagiso deliver **3–5 resolved hotspots per daily visit**, for once- and twice-daily players? | **Playtest the build** — it is a feel question, not an arithmetic one | Open |
| 5 | Time to Botho 100 / 500 / 1000 under a realistic cadence? | **Playtest, then telemetry** | Open |
| 3 | Over 30 days, does Pula accumulate without bound, or do the sinks hold? | Headless | **Answered** — P1,913 / P5,288 / P8,814 per month at 4 / 12 / 20 plots. Sinks hold; the unbounded sinks in `02 §7.1` are for the surplus, not for runaway inflation |
| 6 | How long to max land (P37,200)? | Headless | **Answered** — 58 d best / 114 d median / 205 d worst. The 3–4 month estimate holds at median |
| 4 | What fraction of craft cycles are profitable across the market band (C14)? | Headless — fold into `balance_verify.py` | Cheap extension |
| 7 | What listing volume does the Exchange need before 10% fees matter? | **v1.1 telemetry** — needs real traders; gated behind B1/B2 regardless | Deferred |

**Question 2 is still the one that decides whether the economy holds together.** It is also now the only one that justifies the sandbox. Build to P6, then answer it.
