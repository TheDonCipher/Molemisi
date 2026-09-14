# Molemisi — MVP Roadmap

A cozy, live-service farming game rooted in Botswana life: grow and sell crops, gather from the Bushveld, build standing in the Kgotla community, and spend real money on convenience and self-expression — never on winning.

This roadmap defines the smallest version of Molemisi that is complete, honest, and worth charging for. Every open design question has a decision below. Everything not decided as in-scope is explicitly deferred, not forgotten.

---

## MVP Scope

**In:** farming (plant/water/harvest/sell), five crafting recipes, simple tiered storage, Three Pillars progression (Pula, Botho, Journal), a three-scene Bushveld with tap-and-cooldown Hotspots, Kgotla quests and community projects, market contracts, a real-money wallet with mobile top-ups, a monthly subscription, four premium convenience purchases, and a capped monthly community prize.

**Out, for now:** multi-tier buildings beyond Storage (Water Source, Kraal, Farm Boundary stay simple and flat), the fourth Bushveld scene's actual content, quality grading / freshness decay / tool durability, Village Evolution's shared visual upgrades, the Master Molemisi title and NPC apprentices, and any Google Play Store billing work. None of these are cut permanently — they're the first backlog after MVP ships, in roughly that order.

---

## Decisions

These were open questions; they're closed now, and the roadmap below is written against these answers.

1. **Rendering:** React only. The game is not built in Phaser. No further Phaser work happens.
2. **Progression model:** Three Pillars (Pula, Botho, Journal) is the only progression system. Any existing player-level/XP field is retired, not extended.
3. **Botho Points:** the existing Kgotla community-standing score *is* Botho Points — no second counter. It gates: 100 → unlocks the Grain Mill's Bupi (Flour) recipe at a bonus rate; 300 → held in reserve until the fourth Bushveld scene ships post-MVP; 500 → Letsema, one free instant full-harvest per week; 1000 → eligibility for the monthly community prize.
4. **Storage:** one building line, three tiers — Storage Basket → Storage Shed → Storehouse — each raising the inventory slot cap. No separate silo, no spoilage-prevention framing.
5. **Other buildings:** flat, single-tier for MVP. A well, a kraal, a boundary fence — built once, functional, not upgradeable yet. Upgrade tiers for these come after MVP.
6. **Crafting:** five recipes (grain → flour, flour → bread, wood → plank, fiber → rope, clay → brick), each a flat fee, timer, and output. No quality inheritance, no station-per-building gating — any unlocked recipe is available from the Farm's crafting menu directly.
7. **Fertility Shell** (premium item): redefined for MVP as "+50% sale value on the next harvest sold," rather than a quality-grade guarantee. Revisit once/if a grade system exists.
8. **Village Evolution and Master Molemisi/Apprentice:** both out of MVP entirely. They're prestige/endgame layers with no bearing on whether the core loop is complete.
9. **Fourth Bushveld scene:** the Botho-300 gate exists in the data model but shows "coming soon" in MVP — no broken unlock, no built content behind it yet.
10. **Distribution:** PWA only, installed from the web, paid for directly through mobile money. No Play Store work in this roadmap.

---

## Phase 1 — Stabilize the Existing Build
Tighten what's already running before adding new systems on top of it: a single-origin API path instead of cross-port calls, working player logout, admin-only config writes, a working seed script, and a visual pass on the current screens.

**Done when:** a new player can play a full session — sign up, farm, sell, log out, log back in — with no dead ends anywhere in that path.

## Phase 2 — Inventory, Crafting, Storage
Build the item catalog (seeds, raw crops, livestock products, Bushveld materials, crafted materials, processed goods, tools) with no quality or freshness fields. Build the five crafting recipes. Build the three-tier Storage line. Apply the flat 5% market tax on every sale, server-side, with no client-supplied price ever trusted.

**Done when:** a player can gather a material, craft it, sell the output, watch the 5% tax apply, and fill and then expand their storage cap — all through real server calls.

## Phase 3 — Three Pillars Progression
Wire the Botho thresholds from Decision 3. Confirm the Pula pillar is just "can afford it" — no separate mechanic needed beyond the wallet built in Phase 5. Build the Journal pillar's structure (page tracking) even though its content depends on Phase 4.

**Done when:** hitting 100/500/1000 Botho visibly and correctly unlocks the Bupi bonus, Letsema, and giveaway eligibility, each checked server-side.

## Phase 4 — Bushveld: Hotspots and the Field Journal
Three scenes (Open Bush, Riverbank, Rocky Outcrop), each with 5–8 Hotspots on independent respawn timers (common 20–40 min, uncommon 2–4 hr, rare 8–16 hr). One tap resolves a ready Hotspot instantly. One Hotspot system-wide carries a daily bonus-loot badge. One named Hotspot in Open Bush carries a real-calendar-gated seasonal loot table active only in its two real harvest months. First-time finds write to a new Field Journal. The fourth scene's slot exists and shows "coming soon" once Botho hits 300.

**Done when:** a player can check all three scenes, tap every ready Hotspot in one action each, see accurate resting/ready states and countdowns, and build a Journal from first-time finds.

## Phase 5 — Real-Money Wallet and Ledger
One wallet per player: Pula balance, Botho points, subscription status. One immutable transaction log recording every real-money event by provider and external transaction ID, unique-constrained so a retried webhook can never double-credit. No endpoint, anywhere, converts Pula back to real money. No endpoint, anywhere, moves Pula from one player's wallet to another's — items and cosmetics can be gifted, currency cannot.

**Done when:** a simulated duplicate payment webhook credits a wallet exactly once, and an automated test confirms no code path can move balance between two different players.

## Phase 6 — Top-Ups, Subscription, Premium Boosts
Five top-up tiers (smallest priced for a low-friction first purchase, largest with the best bonus ratio), through real mobile money providers, webhook-verified, capped per player per day. One monthly subscription granting an auto-collect convenience, extra storage, exclusive cosmetics, and a small weekly bonus item — and nothing that touches Botho accrual, ever; that rule gets its own automated test, not just a design note. Four premium convenience items, including the redefined Fertility Shell from Decision 7.

**Done when:** every real-money flow only credits after provider confirmation, a subscriber gets exactly the stated perks and loses exactly those perks the moment it lapses, and the Botho-decoupling test passes and stays in CI.

## Phase 7 — Monthly Community Prize
A capped prize pool, split three ways, paid as airtime to the top three Botho-eligible players each month, gated on identity verification matching their mobile money account before payout.

**Done when:** the payout total for any given month cannot exceed the fixed cap regardless of leaderboard size, and no payout fires without verification.

## Phase 8 — Launch Readiness
Full walkthrough of every real-money and progression path end to end. Confirm the PWA installs and plays correctly on both desktop and mobile browsers. Confirm every financial safeguard from Phase 5–7 is live in production configuration, not just in tests.

**Done when:** a new player can go from signup to a completed top-up, a completed craft, a completed Bushveld loop, and a Botho milestone, in one sitting, with nothing broken.

---

## After MVP, in priority order

1. Fourth Bushveld scene's real content.
2. Tiered upgrades for Water Source, Kraal, and Farm Boundary.
3. Quality grading and freshness decay, added as new fields, not a redesign — this is also when Fertility Shell can revert to a grade-based effect if wanted.
4. Village Evolution's shared visual upgrades.
5. Master Molemisi title and NPC apprentices.
6. Google Play Store distribution, if and when it's worth the billing-fee trade-off.
