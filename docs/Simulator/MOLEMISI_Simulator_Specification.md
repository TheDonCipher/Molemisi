# Molemisi — Game Simulator Specification

**Purpose:** exercise the entire game — every feature, every flow, over compressed time — to catch economy imbalances, broken progression pacing, and security/fairness gaps before players do. One harness, real HTTP calls against the real API, a handful of scripted player behaviors including one adversarial profile. Not a general adversarial-AI or chaos-engineering platform — Section 8 says why, and what would change that.

**Revision:** v2 — 2026-09-24. Rewritten against the as-built repository (see `docs/DEVELOPMENT_STATE.md`, `docs/Screens/Kgotla/SPEC.md`, `docs/26`, `docs/27`, `docs/28`).

> **Status: design only. No simulator code exists.** `packages/simulator` was never created;
> these two documents are the whole of it. Everything below is written against code that
> *does* exist, so it is buildable as specified.

### What changed in v2

The v1 spec (2026-09-11) was written from design intent; a great deal of it no longer
describes the game. The corrections that matter:

| v1 said | As built | Consequence for the harness |
|---|---|---|
| Back-date `_at` columns by N days, then call the endpoint | `MAX_OFFLINE_HOURS = 24` caps elapsed-time simulation | A single back-date silently discards everything past 24 h. Time must advance in ≤24 h **steps**. |
| 3 crops (Sorghum, Maize, Watermelon) | **11** crops, stocked 6-per-chapter by the real calendar | Crop choice is seasonal; a run that never rotates chapters tests one third of the table. |
| Craft timers 10–30 **minutes** | 2–6 **hours** (F14) | Slots, not timers, are the binding constraint. Reports must measure slot occupancy. |
| Flour = 3× Sorghum/Maize | Bupi = **4×** Sorghum/**Millet**; Setena = any 2 of Clay/**Stone** | Substitution is a real decision; margins differ per branch. |
| 5% Market Tax on a static price | 5% Co-op tax **plus** supply/demand-reactive pricing | A 1,000-player run *moves the market*. This is the highest-value emergent check in the tool. |
| Boosts: 4 for sale, bought by whales | **3 defined, all `available: false`** (withdrawn, ruling 2026-09-11) | Assert they are *unpurchasable*; do not simulate effects that do not exist. |
| Kgotla: `POST npcs/:npcId/quest` | Route **deleted**. `GET charges`, `POST accept`, `POST turn-in` | The "complete a quest" faucet is gone; the new check is pool exhaustion and consume-once. |
| Multi-accounting caught by "the real KYC/one-win-per-number rule" | **No phone or KYC field exists anywhere in the API** | Flagged gap (§5.3), not a passing check. It gates a real-money prize. |
| Rate limit: 60 requests/60 s | 60 requests/60 s on **mutating requests only** | 61 GETs will not trip it; the check must use mutations. |
| Storage 24/48/96 slots | 24/48/96 slots **+ 5/10/20 listing slots**, Guild ×1.5, upgrades cost materials too | Two independent caps; upgrade is a Pula *and* thatch sink. |
| Nothing about water, land, buildings, livestock, or maintenance | Water P1/unit, land ladder P37,200, 90-day maintenance, 4 animals | These are the dominant Pula sinks. Omitting them makes the faucet/sink report wrong. |

---

## 1. Architecture

- A standalone script package calling the real NestJS API over HTTP for every in-game action — the same contract the React client uses (`apps/web` :3000 → `apps/api` :3001, prefix `/api/v1`). This is what gives the security checks real value: a simulator that wrote game state directly to the database would never exercise the API's own validation.
- **One deliberate exception:** advancing simulated time. Rather than building an injectable clock across the whole application, the simulator back-dates the relevant `_at` timestamps directly in a disposable test database, then calls the real endpoints that already compute state from elapsed time — reusing the game's existing offline-elapsed-time logic instead of building a parallel one.
- **The exception has a hard constraint the v1 spec missed.** `simulation.service.ts` and `water.service.ts` both clamp elapsed time to `MAX_OFFLINE_HOURS = 24`. Back-dating by 90 days and calling `GET /farms/current` once yields **24 hours** of progress and discards the rest. So `advanceSimulatedTime` is a *loop* of ≤24 h steps, each back-date followed by a real call — not a single jump. Anything else produces a run that looks plausible and is silently wrong.
- **Refuses to run against anything not explicitly allow-listed as a test target** — by `NODE_ENV`, by host match, and by a `SIMULATOR_ALLOW=true` flag that only ever gets set in test contexts. No new named environments; it runs against whichever of the project's existing dev/test/staging environments is pointed at it.
- **Botswana time (UTC+2) is the day boundary.** The Botho cap, the top-up cap, the Kgotla charge pool and the contribution cap are all enforced per Botswana day. The harness's "day" must be `UTC+2`, not server-local and not UTC, or every cap check is off by a boundary.
- Every simulated action emits one structured event: `{ timestamp, simulatedDay, playerId, profile, system, action, result, metadata }`, appended to a single log. Every report the tool produces is an aggregation over this log plus final database state — a new question about player behavior later is a new query, not a new tracking feature.

## 2. Player Behavior Profiles

| Profile | Behavior |
|---|---|
| **F2P Grinder** | Full core loop daily — farm, craft, all unlocked Bushveld scenes, Kgotla charges and community-project contributions, market buy/sell — never spends real money, pursues every Botho threshold |
| **Casual Payer** | Same engagement as the Grinder, plus occasional small top-ups |
| **Guild Subscriber** | Subscribes early, relies on Auto-Collector, otherwise plays the full loop |
| **Whale** | Full loop plus regular large packs and subscription. **Buys cosmetics, not boosts** — boosts are withdrawn from sale, so a whale's only unbounded sink is the cosmetic line |
| **Churner** | Full engagement for roughly two simulated weeks, then stops |
| **Adversary** | The security and anti-cheat checklists in Section 7 — not a normal player |

Default payer segmentation among non-Grinder, non-Adversary profiles: 70% one-time small buyers, 20% subscribers, 8% mid spenders, 2% high spenders, with payers overall at roughly 3% of the total simulated population — matching the assumptions the financial model was built on (`docs/MVP/02 §6`: blended ARPU **P2.27**, ARPPU **P75.80**), so realized revenue is actually comparable to it.

**Two populations, not one.** Because time must advance in ≤24 h steps and the seasonal window is keyed to the real calendar, a full 365-day × 1,000-player run is prohibitively expensive. The harness therefore runs:
- a **wide cohort** (large population, ~30–90 days) for economy, faucet/sink, market impact and ARPU; and
- a **calendar cohort** (small population, ≥12 real months) for chapter rotation, seed stocking, and the Mophane windows.

Both are reported separately, and neither may be presented as if it covered the other.

## 3. Farming, Water, Land, Buildings, Livestock

### 3.1 Crops, water and land

**11 crops**, all unlocked from the start (D6); what changes with the season is which seeds are **stocked**. Growth is hour-based, never under 12 h and never between 24 h and 40 h, with an explicit 1- or 2-day cadence. Net per plot per day spans P12.25 (sorghum) to P40.63 (morula) — a 3.3× spread, ordered by seed cost and capital at risk.

**Water is the central tension and the largest recurring sink.** P1.00 per tank unit; the Jojo tank holds 60 units; a full refill costs P60. Water is drawn only while a crop is `GROWING`, never while it sits ready. Rain credits the tank (2 units/hr, 5 in a storm). **An empty tank halts the growth timer; it never kills a crop.** A simulator that ignores tank level will over-report yield and under-report spend, and will never notice that the dry chapters (`moriti`, rain coverage 0.05) are supposed to bite.

**Land ladder** — 4 plots free, then 8 (P1,200), 12 (P6,000), 20 (P30,000); P37,200 total. Bought as a batch: a 6-plot farm pays 6,000 and jumps to 12.

**Fertilizer** — `POST /plots/:plotId/fertilize`. Only `manure` exists in v1 (+20% growth, one stage), consumed at apply time, one dose at a time. Compost and super-fertilizer are reserved and must be rejected.

**Disease and pest events are removed** (03 §1.1/§1.3). The legacy crop fields still compile for the retired simulation service; the harness must not expect disease events and must not read those fields.

### 3.2 Buildings and maintenance

Buildings construct, upgrade and wear. **Seasonal maintenance every 90 days** is a recurring material sink that keeps the craft chain alive after the build: kraal 2 × thapo, boundary 3 × poleto, water source 2 × setena.

### 3.3 Livestock

Four animals, all requiring the kraal, all available as soon as the player can pay — levels and XP are retired. Products: eggs (P5), milk (P15), truffle (P50), manure (P1). Animals feed, produce on a cycle, and decay in hunger/health/happiness while away; they are self-sustaining after 72 h.

### 3.4 Crafting and storage

Five recipes, named in Setswana, with timers in **hours** (F14 — a sub-visit timer pressures a player to sit in the app, which contradicts the 5–15 minute session and the no-babysitting goal):

| Recipe | Slug | Input | Fee (batch 1) | Time | Output value |
|---|---|---|---|---|---|
| Plank | `poleto` | 2 × wood | P1 | 2 h | P7 |
| Rope | `thapo` | 3 × palm fiber | P1 | 2 h | P18 |
| Brick | `setena` | any 2 of clay / stone, mixed allowed | P2 | 3 h | P11 |
| Flour | `bupi` | 4 × sorghum or millet | P2 | 4 h | P20 |
| Bread | `borotho` | 2 × bupi | P3 | 6 h | P60 |

- **Batching:** sizes 1 / 3 / 6 with fee multipliers 1 / 2.5 / 4 — sub-linear, so batching trades tied-up capital for fee efficiency.
- **Slots:** 1 by default, +1 per upgrade, max 3. Once timers exceed the visit interval, **slots are the binding constraint** — which is the progression the design intended.
- **Bonus yield 12%** — variance, never failure. A cozy game only ever surprises upward.
- **Unlocks:** `poleto`, `thapo`, `setena` from the start; `bupi` and `borotho` at Botho ≥ 100.
- **Margins are computed, not tabulated.** `recipeEconomics()` in `packages/game-config/src/crafting.ts` is the function of record: it prices inputs at opportunity cost (base × 0.95, i.e. what you'd net by just selling them) and applies the 5% Co-op tax. The harness compares realized ledger figures against that function's output for the same input choice — never against a hand-copied table, which is exactly how the old table stopped adding up.

**Storage** — three tiers: 24 / 48 / 96 slots, each with its own **listing slots** (5 / 10 / 20), a second and separate constraint. Guild subscription multiplies slots by 1.5 (36 / 72 / 144). Upgrade costs are Pula **and materials**: tier 2 is P2,500 + 6 thatch, tier 3 is P12,000 + 12 thatch.

## 4. Bushveld

Four scenes — Open Bush, Riverbank, Rocky Outcrop, and Deep Bushveld gated at Botho ≥ 300. Riverbank is the economic heart: clay and palm fiber feed setena and thapo, and thapo is the best profit per slot-hour in the chain.

**Kagiso replaces respawn timers.** Every old respawn band was shorter than a day, so a daily player found every hotspot ready every time. Kagiso (*peace, stillness*) is a per-scene pool: max 6, +1 per 4 hours (6/day, full settle in 24 h), starting at 6. Each hotspot also rests 60 minutes independently. Collection costs 1 for common/material finds and 2 for uncommon/rare/seasonal. Material yield is 2–4.

**Rarity scales with Kagiso, so rarity is a decision rather than a dice roll** — at Kagiso ≥ 5 rare is weighted 2:1 over common; at 1–2 that inverts. Any "realized vs. target rarity" report must be conditioned on the Kagiso value at the moment of collection, or it measures nothing.

Restoration art advances at 40% / 70% / 100% of a scene's finds. First-time finds write to a Field Journal, organized by scene.

**The Mophane window.** One named Open Bush hotspot, `ob_setlhare_sa_phane` (Setlhare sa Phane), carries a seasonal loot table active in **real-world months 4 and 12** — Moranang (April) and Sedimonthole (December) — and is decoupled from the chapter clock. Outside those months it is ordinary wood. Because this keys off the real calendar, the calendar cohort must place simulated days on real April and December dates; a run that only counts "day 1…day 365" from an arbitrary anchor never exercises it. The harness logs which real months each advance step crosses and warns if a run touches neither window.

**Deep Bushveld** is gated at Botho ≥ 300 and its signature find is hardwood (P8). Whether its hotspots are reachable in v1 is a verification item for the harness, not an assumption either way.

## 5. Kgotla / Botho Progression

### 5.1 Charges, not quests

The old `POST /kgotla/npcs/:npcId/quest` route and its `completeQuest` handler are **deleted** — it credited 50 Pula and 10 Botho per call with no objective, no cooldown and no cap: an unbounded faucet bounded only by the rate limit. The loop is now **offer → accept → objective elsewhere → turn-in**:

- `GET /kgotla/charges`, `POST /kgotla/npcs/:npcId/accept`, `POST /kgotla/npcs/:npcId/turn-in`
- **Three charges per farm per Botswana day, shared across the whole council** — five elders, three charges. The player must choose whom to serve; that choice is what the council chamber exists to create. Enforced server-side; the client never decides.
- Progress is **derived, never stored** — `kgotla_quests` has no `progress` column. It is read from inventory and the ledger at turn-in, so it cannot drift from the world and needs no event hooks.

| Elder | Type | Objective | Reward |
|---|---|---|---|
| Elder Neo | community | Contribute 25 Pula to any project | 10 Botho · 2 Chapter Token |
| Mama Naledi | trade | Sell goods worth 60 Pula | 12 Pula · 10 Botho |
| Oupa Kabelo | construction | Bring 6 poleto (consumed) | 12 Pula · 10 Botho |
| Refilwe | gathering | Bring 4 thatch (consumed) | 8 Pula · 10 Botho |
| Thabo | farming | Bring 6 of one named crop (consumed) | 8 Pula · 10 Botho |

Every charge also grants **+10 regard** with that elder. Three charges cap quest income at 32 Pula/day — about a third of a 4-plot farm's income, and only on top of work already done.

**Refilwe's errand is thatch, not "wild herbs"** — there is no wild-herb item; `herbs` is a farmed crop and the Bushveld yields only wood, clay, palm fiber, thatch and phane.

### 5.2 Regard decay

Regard is not permanent. An elder who is not served forgets a little: **−2 regard per full 7-day period** in which no charge for that elder was completed, floored at 0, applied lazily and idempotently. A wholly neglected elder falls from Respected (75) to Acquaintance (24) in about 26 weeks — a nudge to keep visiting, never a punishment for a holiday. A warning surfaces 24 hours before the next period elapses; nobody is punished silently.

### 5.3 Botho gates and caps

| Botho | Unlocks |
|---|---|
| 100 | Bupi and Borotho recipes |
| 300 | Deep Bushveld |
| 500 | Letsema — one free instant full-harvest per week |
| 1000 | Monthly Community Prize eligibility |

Botho accrues only from explicit, manual, deliberate acts and is capped at **50/day**. That cap is a **legal control, not a balance one**: Botho gates a real-money prize, so a paid subscription's Auto-Collector must never supply the materials for a Botho-earning act. The Auto-Collector can never deliver a charge or make a donation.

Community-project contribution is capped at **P200/day** (1 Botho per Pula). Projects are `UNIQUE(farm_id, project_id)` — progress is **per-farm**, so no reward copy may promise a village-wide effect.

Journal-page completion buffs: Open Bush → +5% bonus-yield chance on harvests; Riverbank → weather-forecast tooltip; Rocky Outcrop → discount on the next storage-tier upgrade. Elder's Guidance is a rules table reading tank level, weather and Botho — the simulator logs which rule fires and how often, to catch a dead or dominant rule.

> **FLAGGED — no identity control exists.** v1 asserted that multi-accounting would be caught by "the real KYC/one-win-per-number rule". There is no phone number field and no KYC anywhere in the API. Since Botho gates a real-money prize, one operator with N accounts can place N entries in the monthly payout. The harness reports this as an **open gap**, not a passing check.

## 6. Market and Monetization

### 6.1 The Co-op is reactive

Prices move with what players actually do: `SUPPLY_IMPACT` 0.002 per unit sold, `DEMAND_IMPACT` 0.001 per unit bought, `PRICE_DECAY` 0.02 per update drifting back toward base, clamped to a band. Raw and foraged goods use the 0.5–2.0 band on a 6-hour cycle; **crafted and processed goods are exempt** and sell at 1.0× ±10% — without that exemption a crafted good could sell at 0.5× and every recipe would lose money at random, making the margin table a lie. A flat **5% Co-op tax** applies on every sale. Seeds have a price row for the buy path but must never be sellable.

**This is the tool's highest-value emergent check.** A large simulated population is, in effect, a market-moving cartel: if 1,000 players all farm sorghum, the price falls and the "P12.25/plot/day" figure stops holding. The harness must report realized price dispersion per item and flag any item pushed to a band edge — a failure mode no static margin table can reveal and no unit test will ever catch.

> **Environment precondition.** `docs/28` records that 13 catalogue items were unsellable, 23 carried stale prices 4–8× the catalogue, and 14 rows were orphans, fixed by migration `20260924000000_reconcile_market_prices_to_catalogue.sql`. That migration is **not yet pushed**. Against a database where it is missing, market checks will fail for reasons that are environmental, not economic — the harness must detect and say so rather than reporting a game bug.

### 6.2 Monetization

| Pack | Price | Grants |
|---|---|---|
| Starter | P5 | P5 |
| Farmer | P50 | P50 |
| Harvest | P100 | P105 |
| Cattle | P250 | P265 |
| Export | P500 | P540 |

Top-up is capped at **P500 per player per Botswana day**. Guild subscription is P49/month (Auto-Collector, +50% storage, cosmetics, weekly Pula Stone, ad-free).

**Boosts are withdrawn from sale.** Three are defined — Pula Stone P20, Ancestral Ward P25, Breath of the Land P15 — and all three carry `available: false`, which removes them from both storefronts and makes `purchase()` reject them. The catalogue entries remain deliberately so that restoring them is a one-line change. The harness asserts they are **unpurchasable** and reports the deferral; it does not simulate effects that no code applies.

Cosmetics are the only unbounded Pula sink (P200–P2,000, chapter-gated) and the only thing a whale can actually buy beyond Pula.

Monthly prize pool: `clamp(10% × trailing-month Guild subscription revenue, floor P350, ceiling P1500)`, split 4:2:1 across the top 3 by **Botho earned in the period** (minimum 150 — lifetime totals converge and ties become endemic). Target realized figures at the default segmentation: blended ARPU ≈ P2.27, ARPPU ≈ P75.80.

### 6.3 Progression systems in scope

Chapters and the almanac run on the **real Botswana calendar** — every player experiences the same weeks. Four chapters map to real months (pula 11–1, phane 2–4, moriti 5–7, letlhafula 8–10), each stocking exactly six seeds, which is what forces rotation and prevents tomato monoculture. Contracts, world events and notifications are also in scope; they are ordinary systems with ordinary flows and the harness exercises them as such.

## 7. Security and Anti-Cheat

Two different failure modes, checked separately: **security** defends against malicious or malformed input; **anti-cheat** defends economic fairness even from a legitimate-looking client acting at the wrong time or twice at once.

### 7.1 Security

- Attempt an action on every resource type (crafting job, plot, inventory row, wallet, animal, contract) owned by a different player — every case must be rejected.
- Send malformed input to every mutating endpoint — negative, zero, absurdly large, wrong-typed, missing-field — every case must be rejected with a real validation error.
- Replay the same webhook `provider_tx_id` (top-up, subscription, prize payout) — must credit or pay out exactly once. **The webhook controller currently requires a Bearer token** even though it is documented as public; the replay check must carry one.
- Exceed the rate limit (60 requests / 60 s) — must throttle. **Only mutating requests are counted**, so the check must issue 61+ mutations, not GETs.
- Submit a client-supplied reward, quality, or completion value on an endpoint that should compute it server-side — must be ignored.
- **`PUT /config` is `AuthGuard`-only, not admin-gated.** This is a real, known gap: any authenticated player can rewrite live game configuration. The harness asserts it and reports it as a failure to be fixed, not a tolerance to be adjusted.

### 7.2 Anti-Cheat

- **Concurrency/duplication:** fire the same collect, craft-collect, harvest, sell, or **charge `turn-in`** request twice at genuinely the same instant (not sequentially) — exactly one success, one credit, never two. Now that `turn-in` consumes items, a broken transaction boundary would duplicate both the reward and the consumption. This is a distinct failure mode from webhook replay and the single highest-value check in this list.
- **Charge pool exhaustion:** accept four charges on one Botswana day — the fourth must be rejected. Accepting must move no balance.
- Craft Bupi or Borotho below Botho 100; use Letsema below Botho 500 or within 7 days — rejected.
- Collect a hotspot before its rest elapses, or with insufficient Kagiso — rejected.
- Any request shaped like a Pula transfer to another player's wallet — fails or doesn't exist. v1 is a closed loop; phone-number withdrawal and P2P are v1.1.
- Exceed the P500/player/day top-up cap — second attempt rejected.
- **Flagged, not tested:** multi-accounting (no identity control exists — §5.3) and inhuman action-pace/bot-speed detection (no such defense exists). The simulator reports both as open gaps rather than fabricating checks for controls that aren't there.

### 7.3 Deferred from v1 — assert absence, do not test

Wildlife raids and boost effects are deferred by ruling (2026-09-11). The Ancestral Ward therefore protects nothing; the Pula Stone refills nothing; Breath of the Land completes nothing. The harness asserts these are *unavailable* and reports the deferral. Testing their effects would be testing fiction.

## 8. Reporting

- **`summary.md`** — one section per system in Sections 3–6, plus security and anti-cheat, each stating what was measured, the result, and how far off any target-bearing metric (crafting margins against `recipeEconomics()`, prize formula, rarity odds conditioned on Kagiso, ARPU) landed from its expected value.
- **`raw_events.jsonl`** — the full event log, for any analysis the summary doesn't anticipate.
- **`safeguards.json`** — pass/fail for every Section 7 check, security and anti-cheat reported as distinct groups, non-zero exit code on any failure, for CI use.

Every report states its cohort (wide or calendar), its population mix, and its real-date span, so no figure can be read as covering more than it did.

## 9. Scope Note: "Resources"

This specification covers in-game resource flow — items, materials, currency — under Sections 3 and 6. It does not cover server/infrastructure resource load (concurrent-user capacity, database connection limits, response times under real traffic). That's full load/soak testing, a different tool with a different trigger (Section 10).

## 10. What This Deliberately Isn't

| Not built now | Build it when |
|---|---|
| Deterministic replay kernel with injectable clock/RNG across the whole app | The ≤24 h stepping approach stops being sufficient |
| Learned/LLM-driven adversarial agents | The fixed checklist in Section 7 stops catching real issues found in production |
| Full load/soak testing | Real uptime SLAs exist |
| Inhuman-pace/bot-speed anti-cheat detection | The game's own design adds this control — it doesn't exist yet to test |
| Multi-accounting / identity checks | The game gains a phone or KYC field — until then there is nothing to test |
| A dedicated environment separate from what exists | A second engineer or QA role exists to justify one |

## 11. Open Questions Requiring a Ruling

These are economic or legal decisions, not implementation detail. The harness reports them; it does not resolve them.

1. **Bushveld comparative inversion** — modelled at 4/8/12 plots in `scripts/balance_verify.py` §8 and ruled as answered by live telemetry, not a model. The simulator is the natural place to settle it properly.
2. **The uncapped Letsema fund** — only the capped P200/day community contribution exists.
3. **Prize eligibility conflict** — `BOTHO_THRESHOLDS.PRIZE_ELIGIBILITY` is 1000 while `PRIZE.minimumBothoInPeriod` is 150. Which governs?
4. **Per-act Botho quantum** and the consequence that, at 1 Botho per Pula, a single P50 donation saturates the entire daily Botho cap.
5. **Cosmetics as a Guild benefit**, starter Jojo tank, maintenance timing.
