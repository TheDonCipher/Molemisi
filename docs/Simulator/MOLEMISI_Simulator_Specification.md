# Molemisi — Game Simulator Specification

**Purpose:** exercise the entire game — every feature, every flow, over compressed time — to catch economy imbalances, broken progression pacing, and security/fairness gaps before players do. One harness, real HTTP calls against the real API, a handful of scripted player behaviors including one adversarial profile. Not a general adversarial-AI or chaos-engineering platform — Section 7 says why, and what would change that.

---

## 1. Architecture

- A standalone script package calling the real NestJS API over HTTP for every in-game action — the same contract the real React client uses. This is what gives the security checks real value: a simulator that wrote game state directly to the database would never exercise the API's own validation.
- **One deliberate exception:** advancing simulated time. Rather than building an injectable clock across the whole application, the simulator back-dates the relevant `_at` timestamps directly in a disposable test database (`planted_at`, `last_collected_at`, `subscription_expires_at`, and so on), then calls the real endpoints that already compute state from elapsed time — reusing the game's existing offline-elapsed-time logic instead of building a parallel one.
- **Refuses to run against anything not explicitly allow-listed as a test target** — by `NODE_ENV`, by host match, and by a `SIMULATOR_ALLOW=true` flag that only ever gets set in test contexts. No new named environments; it runs against whichever of the project's existing dev/test/staging environments is pointed at it.
- Every simulated action emits one structured event: `{ timestamp, simulatedDay, playerId, profile, system, action, result, metadata }`, appended to a single log. Every report the tool produces is an aggregation over this log plus final database state — a new question about player behavior later is a new query, not a new tracking feature.

## 2. Player Behavior Profiles

| Profile | Behavior |
|---|---|
| **F2P Grinder** | Full core loop daily — farm, craft, all three live Bushveld scenes, Kgotla quests and community-project contributions, market buy/sell — never spends real money, pursues every Botho threshold |
| **Casual Payer** | Same engagement as the Grinder, plus occasional small top-ups |
| **Guild Subscriber** | Subscribes early, relies on Auto-Collector, otherwise plays the full loop |
| **Whale** | Full loop plus regular large packs, boosts, and subscription |
| **Churner** | Full engagement for roughly two simulated weeks, then stops |
| **Adversary** | The security and anti-cheat checklists in Section 4 — not a normal player |

Default payer segmentation among non-Grinder, non-Adversary profiles: 70% one-time small buyers, 20% subscribers, 8% mid spenders, 2% high spenders, with payers overall at roughly 3% of the total simulated population — matching the assumptions the financial model was built on, so realized revenue is actually comparable to it.

## 3. Full Feature Coverage

### 3.1 Farming, Crafting, Storage
Item catalog: seeds and raw crops (Sorghum, Maize, Watermelon), livestock products (Eggs, Milk, Manure), Bushveld materials (Wood, Stone, Clay, Palm Fiber, Thatch, Mophane Worms), crafted materials (Plank, Rope, Brick), processed goods (Flour, Bread), and one non-sellable Rare Seed Journal-only find.

| Recipe | Input | Fee | Time | Sells For |
|---|---|---|---|---|
| Plank | 2× Wood | P1 | 10 min | P7 |
| Rope | 3× Palm Fiber | P1 | 10 min | P18 |
| Brick | 2× Clay | P2 | 15 min | P11 |
| Flour | 3× Sorghum/Maize | P2 | 20 min | P20 |
| Bread | 2× Flour | P3 | 30 min | P60 |

Storage: three tiers, roughly 24 → 48 → 96 slots. A flat 5% Market Tax applies on every sale — the simulator confirms this is actually deducted, not assumed.

### 3.2 Bushveld
Three live scenes — Open Bush, Riverbank, Rocky Outcrop — plus Deep Bushveld, gated at Botho ≥ 300 and showing "coming soon" with zero Hotspots. Respawn targets: Common 20–40 min, Uncommon 2–4 hr, Rare 8–16 hr. Exactly one Hotspot system-wide carries a daily bonus-loot badge. One named Open Bush Hotspot serves a seasonal loot table only in real-world April and December — the simulator must run at least one full year of simulated real-calendar time to ever exercise this, not just simulated game-days. First-time finds write to a Field Journal, organized by scene.

### 3.3 Kgotla / Botho Progression

| Botho | Unlocks |
|---|---|
| 100 | Flour recipe |
| 300 | Deep Bushveld shows "coming soon" |
| 500 | Letsema — one free instant full-harvest per week |
| 1000 | Monthly Community Prize eligibility |

Journal-page completion buffs: Open Bush → +5% bonus-yield chance on harvests; Riverbank → weather-forecast tooltip; Rocky Outcrop → discount on the next Storage-tier upgrade. Elder's Guidance is a rules table reading tank level, weather, and Botho — the simulator logs which rule fires and how often, to catch a dead or dominant rule.

### 3.4 Economy and Monetization

| Pack | Price | Grants |
|---|---|---|
| Starter | P5 | P5 |
| Farmer | P50 | P50 |
| Harvest | P100 | P105 |
| Cattle | P250 | P265 |
| Export | P500 | P540 |

Subscription: Guild, P49/month (Auto-Collector, +50% storage, cosmetics, weekly Pula Stone, ad-free). Boosts: Pula Stone P20, Ancestral Ward P25, Fertility Shell P30 (+50% sale value on next harvest sold), Breath of the Land P15. Monthly prize pool: `clamp(10% × trailing-month Guild subscription revenue, floor P350, ceiling P1500)`, split 4:2:1 across the top 3 Botho ≥ 1000 players. Target realized figures at the default segmentation: blended ARPU ≈ P2.27, ARPPU ≈ P75.80.

## 4. Security and Anti-Cheat

Two different failure modes, checked separately: **security** defends against malicious or malformed input; **anti-cheat** defends economic fairness even from a legitimate-looking client acting at the wrong time or twice at once.

### 4.1 Security
- Attempt an action on every resource type (crafting job, plot, inventory row, wallet) owned by a different player — every case must be rejected.
- Send malformed input to every mutating endpoint — negative, zero, absurdly large, wrong-typed, missing-field — every case must be rejected with a real validation error.
- Replay the same webhook `provider_tx_id` (top-up, subscription, prize payout) — must credit or pay out exactly once.
- Exceed the existing per-user rate limit (60 requests/60s) — must throttle.
- Submit a client-supplied reward, quality, or completion value on an endpoint that should compute it server-side — must be ignored.

### 4.2 Anti-Cheat
- **Concurrency/duplication:** fire the same collect, craft-collect, harvest, or sell request twice at genuinely the same instant (not sequentially) — exactly one success, one credit, never two. This is a distinct failure mode from webhook replay above and the single highest-value check in this list.
- Craft Flour below Botho 100, or use Letsema below Botho 500 or within 7 days of last use — both rejected via direct API call.
- Collect a Hotspot before its cooldown elapses — 409.
- Any request shaped like a Pula transfer to another player's wallet — fails or doesn't exist.
- Exceed the P500/player/day top-up cap — second attempt rejected.
- **Multi-accounting:** several accounts attempting to each claim a first-purchase-style bonus, or to place more than one in the same monthly prize payout under the same underlying phone number — caught by the real KYC/one-win-per-number rule.
- **Flagged, not tested:** inhuman action-pace/bot-speed detection. Nothing in the game's design suggests this defense exists yet, so the simulator reports this as an open gap rather than fabricating a check for a control that isn't there.

## 5. Reporting

- **`summary.md`** — one section per system in Section 3, plus security and anti-cheat, each stating what was measured, the result, and how far off any target-bearing metric (crafting margins, prize formula, rarity odds, ARPU) landed from its expected value.
- **`raw_events.jsonl`** — the full event log, for any analysis the summary doesn't anticipate.
- **`safeguards.json`** — pass/fail for every Section 4 check, security and anti-cheat reported as distinct groups, non-zero exit code on any failure, for CI use.

## 6. Scope Note: "Resources"

This specification covers in-game resource flow — items, materials, currency — under Sections 3.1 and 3.4. It does not cover server/infrastructure resource load (concurrent-user capacity, database connection limits, response times under real traffic). That's full load/soak testing, a different tool with a different trigger (Section 7).

## 7. What This Deliberately Isn't

| Not built now | Build it when |
|---|---|
| Deterministic replay kernel with injectable clock/RNG across the whole app | The timestamp-back-dating approach stops being sufficient |
| Learned/LLM-driven adversarial agents | The fixed checklist in Section 4 stops catching real issues found in production |
| Full load/soak testing | Real uptime SLAs exist |
| Inhuman-pace/bot-speed anti-cheat detection | The game's own design adds this control — it doesn't exist yet to test |
| A dedicated environment separate from what exists | A second engineer or QA role exists to justify one |
