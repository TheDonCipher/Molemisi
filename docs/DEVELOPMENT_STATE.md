# Molemisi Development State

> Last Updated: 2026-09-02
> Updated By: M14 Implementation

---

## Current Milestone

**M14 — Monetization & Payments** [COMPLETE]

## Milestone Status

```
M0  Product & Documentation       [COMPLETE]
M1  Repository & Infrastructure   [COMPLETE]
M2  Authentication & Persistent   [COMPLETE]
M3  Phaser Rendering Foundation   [PARTIAL]
M4  First Playable Vertical Slice [COMPLETE — core loop functional]
M5  Time & Offline Simulation     [COMPLETE — weather, livestock, buildings]
M6  Farm Management               [COMPLETE — buildings, inventory, tutorial]
M7  Livestock & Production        [COMPLETE — purchase, feed, collect, pet]
M8  Economy & Market              [COMPLETE — dynamic pricing, events]
M9  Contracts & Progression       [COMPLETE — contracts, XP, achievements]
M10 Kgotla                        [COMPLETE — NPCs, reputation, projects]
M11 Bushveld                      [COMPLETE — zones, gather, explore]
M12 Seasons & World Events        [COMPLETE — festivals, seasonal effects]
M13 Mobile/PWA                    [COMPLETE — manifest, responsive, touch]
M14 Monetization & Payments       [COMPLETE — store, payments, provider abstraction]
M15 Security / Analytics / Admin  [NOT STARTED]
```

---

## What Works

### Authentication ✅
- Registration creates auth user + profile + farm + plots + starter seeds
- Login returns JWT token
- JWT validation guard protects API endpoints
- Profile creation on register
- Logout endpoint

### Database ✅
- Core schema: profiles, farms, farm_plots, crop_instances, buildings, livestock, inventory, game_ledger_entries
- Market: market_prices, market_transactions
- Payments: payments table with idempotency
- Contracts: contracts, player_contracts
- Progression: player_progression, achievements
- Kgotla: kgotla_npcs, npc_relationships, community_projects
- Bushveld: bushveld_zones, bushveld_resources, bushveld_explorations
- World events: world_events, player_event_effects
- RLS policies enforce ownership
- Indexes for performance
- Seed data for market prices

### API Endpoints ✅
- Auth: register, login, logout, me
- Profile: get profile
- Farms: get current farm, create, plots
- Crops: plant, water, harvest (with transactions)
- Market: prices, sell, buy (dynamic pricing, events)
- Inventory: list items
- Buildings: list, construct, upgrade, maintain
- Livestock: list, purchase, feed, collect, pet
- Contracts: list, accept, complete
- Progression: get XP, achievements, unlocks
- Kgotla: NPCs, talk, quest, donate
- Bushveld: zones, explore, gather
- World Events: active, available, trigger
- Payments: store, create, history, refund, webhook

### Phaser Scenes ✅ (Basic)
- BootScene → PreloadScene → FarmScene pipeline
- PlotObject with state visualization (emoji placeholders)
- Context menu for actions
- Crop picker when planting
- Market panel (buy seeds, sell crops)
- Build panel (construct, upgrade, maintain)
- Inventory panel (view items)
- Livestock panel (view, feed, collect, buy)
- Contracts panel (available, active, complete)
- Progress panel (XP bar, level, achievements)
- Kgotla panel (NPCs, reputation, quests)
- Bushveld panel (zones, gather, explore)
- World Events panel (active, available, trigger)
- Store panel (buy virtual goods)
- Floating text feedback
- Dynamic HUD (real currency, weather, season from API)
- Demo mode (works without API)

### Configuration ✅
- 11 crop types with full stats
- 6 building types
- 4 animal types
- Weather types and season configs
- World events definitions
- NPC definitions
- Bushveld zones and resources
- Virtual goods store (cosmetics, convenience, premium)

### M14: Monetization & Payments (Complete)
- PaymentProvider interface abstraction (ADR-008)
- StubPaymentProvider for development (always succeeds)
- PaymentsModule with create, history, refund, webhook endpoints
- Payment records with idempotency keys
- Webhook verification flow (server-authoritative)
- Entitlement system (currency, cosmetics, convenience boosts)
- Refund flow with entitlement reversal
- Payments table with RLS
- Store UI in Phaser (category tabs, buy buttons, feedback)
- Virtual goods config (8 items: 4 cosmetic, 3 convenience, 1 premium)

---

## What Is Still Missing

### HIGH: No Integration Tests
No tests for the complete planting → growth → harvest → sell flow.

### MEDIUM: No Phaser Sprites
Still using emoji placeholders. Acceptable for prototype, should be addressed for production.

### MEDIUM: No Sound/Music
No audio system implemented.

---

## Architecture Issues

1. **Demo mode bypass:** FarmScene simulates actions locally when no token exists — could mask real bugs
2. **Token stored in localStorage:** Not httpOnly cookie (acceptable for PWA, but less secure)

## Technical Debt

1. Token stored in localStorage (not httpOnly cookie)
2. No structured logging in NestJS
3. Supabase queries use admin client (bypasses RLS) instead of user client
4. No repository pattern — services query DB directly
5. No error logging/monitoring (Sentry not configured)
6. No rate limiting
7. No CORS configuration beyond defaults

---

## Testing Status

- Health controller unit test: EXISTS (minimal)
- Crops service unit test: EXISTS (minimal)
- Integration tests: NONE
- E2E tests: NONE
- Database tests: NONE

---

## Documentation Status

- 21 specification documents: COMPLETE
- 12 ADRs: COMPLETE
- README.md: EXISTS
- DEVELOPMENT_SETUP.md: EXISTS
- ARCHITECTURE_OVERVIEW.md: EXISTS
- KNOWN_LIMITATIONS.md: EXISTS
- SCAFFOLD_AUDIT.md: EXISTS
- DEVELOPMENT_STATE.md: THIS FILE

---

## Current Objective

Complete M15 — Security, Analytics & Administration.

The next priorities are:
1. Add integration tests for the core loop
2. Implement proper CORS configuration
3. Add rate limiting
4. Add structured logging
5. Add analytics event tracking

---

## Recommended Next Task

**Add integration tests for the core loop** — This validates the entire Plant → Grow → Harvest → Sell → Buy → Plant Again flow works correctly end-to-end.
