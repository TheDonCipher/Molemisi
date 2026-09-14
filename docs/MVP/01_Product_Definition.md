# 01 — Product Definition

---

## 1. What Molemisi is

A **menu-driven farm economy game**, rooted in Botswana, where players grow crops, gather from the Bushveld, craft goods, and trade with each other on a real marketplace. Loyal play produces goods that other players will pay real money for, and that money can be withdrawn to mobile money.

It is an **economic game** in the Sunflower Land mould, wearing **Stardew Valley-inspired pixel art**, made **accessible enough for someone who has never played a game**.

The elevator pitch, for a player:

> *Grow things. Sell them to real people. Get paid on your phone.*

And for a non-gamer auntie in Gaborone, the same pitch without the jargon:

> *Tshameka, jala, rekisa, duelelwa.* Play, plant, sell, get paid.

---

## 2. Audience

**Primary:** Botswana and regional (Southern Africa) **non-gamers** on low-to-mid Android devices, on mobile data, paying via **mobile money**.

What that audience implies, and these are hard constraints, not preferences:

| Constraint | Consequence |
|---|---|
| Has never played a game | **No movement, no twitch, no fail states.** Every action is a tap on a clear target. |
| Low-end device, mobile data | Small bundles, no heavy animation, must work on a spotty connection. |
| Pays by mobile money, not card | Orange Money and MyZaka are the payment rails. Card is a nice-to-have. |
| May be semi-literate in English | Setswana-first UI, short sentences, icon-led. |
| Data is expensive | Batch calls, cache aggressively, no chatty polling. |
| Suspicious of online money | **Transparency is a feature.** Show the fee before confirming. Show withdrawal history. Never hide a cost. |

---

## 3. The four screens

Already built. The economy slots into them; they are not being redesigned.

### FARM
Production. Plant, water, harvest, raise livestock, craft, build and maintain.
**Entirely in Pula.** This is the factory floor and the cost centre.

### BUSHVELD
Gathering. Three scenes of hand-illustrated bush with tappable hotspots.
This is where **genuine scarcity** lives, because a player cannot grind faster than the scene recovers (see `04`). Feeds crafting and the Field Journal.

### MARKET
Trade. Two sides:
- **Co-op** — NPC buyer, Pula, stable, always available, 5% tax. The reliable baseline.
- **Exchange** — player-to-player, Madi, player-priced, 10% fee. The real economy.

### KGOTLA
Community and contracts. Player contracts, seasonal export contracts, community projects, Botho standing, the Elder's guidance, the seasonal Almanac.
The heart of the game, and the screen that is least like anything else on the store.

---

## 4. Design principles

1. **One tap resolves an action.** No menus behind menus, no confirmation chains, no drag gestures, no timing inputs.
2. **No fail states on work.** You never lose a crop to a mis-tap. Outcomes may vary; failure does not happen.
3. **The server is authoritative on everything that touches value.** Always. No exceptions, ever.
4. **Never surprise the player with a cost.** Every fee is shown before confirmation.
5. **Nothing purchasable is required.** A free player can reach every piece of content. Money buys time and expression, never access.
6. **Content is data, not code.** Scenes, hotspots, loot, prices and timers live in config and seed.
7. **Specificity is the moat.** The Botswana setting is not decoration; it's the reason this game can't be copied by a reskin.

---

## 5. Locked decisions

These are settled. Reopening one requires an explicit ruling.

| # | Decision |
|---|---|
| D1 | **Marketplace model, not gambling.** Revenue is fees on player-to-player trade. The house never funds withdrawable rewards. (See `02 §2`, the Withdrawal Funding Rule.) |
| D2 | **Mobile money is the rail.** Orange Money and Mascom MyZaka at launch. Crypto is not part of this plan. |
| D3 | **React only. No Phaser.** All rendering, including building and storage tier swaps. |
| D4 | **Menu-driven, no player movement.** Accessibility decision. Do not "fix" it by adding movement. |
| D5 | **Three Pillars progression:** Pula (infrastructure), Botho (community), Journal (ecological mastery). No player levels, no XP — retired entirely. |
| D6 | **All crops available from the start.** Progression comes from land, buildings, and seed seasonality — not from a level gate. |
| D7 | **Three currencies:** Pula (soft), Madi (hard, withdrawable), Chapter Token (seasonal, expires). |
| D8 | **Storage is the only tiered building line** in v1. Water Source, Kraal and Farm Boundary are flat but require ongoing maintenance. |
| D9 | **Storage:** Basket 24 → Shed 48 → Storehouse 96. Guild subscribers +50%, stacking. |
| D10 | **Plots:** start 4, max 20. Ladder 4 → 8 → 12 → 20. |
| D11 | **Max plots 20.** Yes, confirmed. |
| D12 | **Ship v1 closed-loop** (no withdrawals); unlock the Madi layer in v1.1 subject to legal and PSP. |
| D13 | **PWA distribution.** No Play Store work in v1. |

### Content rulings (2026-09-07)

| # | Ruling |
|---|---|
| R1 | Livestock category is **`DIPHOLOGOLO`**. |
| R2 | Brick is **`Setena`**. |
| R3 | Rare Seed is a **journal Discovery only** — never an inventory item. The `Special` inventory category is dropped. |
| R4 | **Daily top-up cap (P500) is required**, enforced per player per day **in Botswana time (UTC+2)**. |
| R5 | **Journal page buffs removed.** The Journal's reward is the restoration of the scene's art (see `03 §7`). |
| R6 | **`player_wallets.botho_points` is the single canonical Botho number**, created in the first phase that needs it. |
| R7 | **Guild +50% storage stays**, stacking on tier. |
| R8 | **Fertility Shell removed.** Three boosts remain: Pula Stone P20, Ancestral Ward P25, Breath of the Land P15. |

---

## 6. MVP scope — v1 (closed loop)

**In:**
- FARM: all 11 crops, ~1-day growth, water/Jojo tank, livestock, five crafting recipes, buildings with maintenance, land ladder
- BUSHVELD: three scenes, disturbance scarcity, Field Journal, restoration art, Mophane real-calendar event
- MARKET: Co-op with dynamic prices and 5% tax
- KGOTLA: quests, community projects, Botho and its thresholds, Elder's guidance, Almanac (free + Guild track)
- Live service: chapters, chapter tokens, real-calendar events
- Monetisation: Guild subscription P49/mo, top-up packs for Pula, three boosts, cosmetics
- Auth, PWA, admin

**Out, deliberately:**
- Withdrawals and the Madi layer → **v1.1**
- Player-to-player Exchange → **v1.1**
- Fourth Bushveld scene's content (slot and gate exist) → post-MVP
- Tiered Water Source, Kraal, Farm Boundary → post-MVP
- Quality grading, freshness decay, tool durability → post-MVP
- Village Evolution, Master Molemisi and apprentices → post-MVP
- Play Store → not in v1

---

## 7. Evolution

### v1.1 — the Madi layer
Subject to legal sign-off and a PSP. KYC, mobile money in and out, the Exchange, player contracts, withdrawal with the closed-loop rule, caps, holding period, promotional prize permissioned under s.67.

### v2 — regional
South Africa first, via **BTC Smega** — the same cross-border rail Betway already demonstrates works. Then Zambia, Namibia.

### Post-MVP content backlog, in order
1. Fourth Bushveld scene's real content.
2. Tiered upgrades for Water Source, Kraal, Farm Boundary.
3. Quality grading and freshness decay — added as fields, not a redesign. This is also when Fertility Shell could return in its grade-based form.
4. Village Evolution — shared visual upgrades driven by community-project completion.
5. Master Molemisi title and NPC apprentices.
6. Play Store distribution, if the billing-fee trade-off is ever worth it.

---

## 8. What makes it defensible

Three things a competitor cannot copy quickly:

1. **The real Botswana calendar.** Every player experiences first rains, mophane season, and the dry end in the same weeks. Not a skin — a shared clock.
2. **Mobile-money-native economics.** KYC'd SIMs mean one verified number = one account, which is Sybil resistance that Web3 has to pay for. Withdrawals land in a minute.
3. **The Kgotla.** A community screen where contracts, shared projects, and reputation live. Nobody else has this, because nobody else is from here.
