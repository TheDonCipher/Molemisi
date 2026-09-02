# Molemisi Development State

> Last Updated: 2026-09-02
> Updated By: Initialization Audit

---

## Current Milestone

**M13 — Mobile/PWA**

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
M13 Mobile/PWA                    [IN PROGRESS — manifest, responsive, touch]
```

---

## What Works

### Authentication ✅
- Registration creates auth user + profile + farm + plots + starter seeds
- Login returns JWT token
- JWT validation guard protects API endpoints
- Profile creation on register

### Database ✅
- Core schema: profiles, farms, farm_plots, crop_instances, buildings, livestock, inventory, game_ledger_entries
- RLS policies enforce ownership
- Indexes for performance
- Seed data for market prices

### API Endpoints ✅
- `GET /api/v1/health` — Health check
- `POST /api/v1/auth/register` — Registration
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/auth/me` — Current user
- `GET /api/v1/profile` — Player profile (currency, level)
- `GET /api/v1/farms/current` — Farm + plots + crops
- `POST /api/v1/farms/:farmId/plots/:plotId/plant` — Plant crop
- `POST /api/v1/farms/:farmId/plots/:plotId/water` — Water crop
- `POST /api/v1/farms/:farmId/plots/:plotId/harvest` — Harvest crop
- `GET /api/v1/farms/:farmId/inventory` — List inventory
- `GET /api/v1/market/prices` — Market prices
- `POST /api/v1/market/sell` — Sell items
- `POST /api/v1/market/buy` — Buy items

### Phaser Scenes ✅ (Basic)
- BootScene → PreloadScene → FarmScene pipeline
- PlotObject with state visualization (emoji placeholders)
- Context menu for actions
- Crop picker when planting
- Market panel (buy seeds, sell crops)
- Floating text feedback
- Dynamic HUD (real currency from API)
- Demo mode (works without API)

### Configuration ✅
- 11 crop types defined with full stats
- 6 building types defined
- 4 animal types defined
- XP rewards defined
- Level formula defined
- Weather types and season configs

### M6: Farm Management (Complete)
- Building construction API (list, construct, upgrade, maintain)
- Build panel UI with upgrade and maintenance actions
- Inventory panel UI (view items by category)
- Crop growth stage visuals (crop-specific emoji per stage)
- Hydration bar on plots
- Onboarding tutorial overlay (5 steps)
- Harvest yield calculation (random within crop range, quality tiers)

### M7: Livestock & Production (Complete)
- LivestockModule with purchase, feed, collect, pet endpoints
- Building capacity validation for animal housing
- LivestockPanel UI (view animals, feed, collect, pet, buy)
- Animal status display (hunger bar, sick state, product ready)

### M8: Economy & Market (Complete)
- Dynamic pricing based on supply/demand
- Market events system (random price modifiers)
- Price trends display (up/down/stable indicators)
- Event banners in market panel
- Supply/demand decay over time

### M9: Contracts & Progression (Complete)
- ContractsModule with list, accept, complete endpoints
- 6 pre-defined contracts (local, community, commercial)
- ProgressionModule with XP, levels, unlocks, achievements
- 10 achievements (first harvest, merchant, wealthy, etc.)
- ContractsPanel UI (view available/active contracts, accept/complete)
- ProgressPanel UI (XP bar, level, unlocks, achievements)

### M10: Kgotla (Complete)
- KgotlaModule with NPCs, reputation, talk, quest, donate endpoints
- 5 NPCs (Elder Neo, Mama Naledi, Oupa Kabelo, Refilwe, Thabo)
- Reputation system with tiers (Stranger → Respected)
- 3 community projects (Water Reservoir, School, Market Square)
- KgotlaPanel UI (NPCs, reputation bars, quests, donate)

### M11: Bushveld (Complete)
- BushveldModule with zones, gather, explore endpoints
- 5 zones (Near Bush, Deep Bush, River Bank, Rocky Outcrop, Ancient Ruins)
- Resource gathering with chance-based drops
- Rare discoveries (seed cache, wild saffron, fossils, artifacts)
- Energy system for exploration
- BushveldPanel UI (zones, resource previews, gather buttons)

### M12: Seasons & World Events (Complete)
- WorldEventsModule with active, available, trigger, effects endpoints
- 10 world events (festivals, seasonal, market, weather)
- Season-based event availability
- Event effects (growth, price, xp, energy modifiers)
- WorldEventsPanel UI (active events, available events, trigger)

### M13: Mobile/PWA (In Progress)
- PWA manifest with icons and theme colors
- Service worker for offline caching
- Responsive Phaser canvas (FIT mode)
- Touch-friendly navigation (44px targets)
- Safe area insets for notched devices
- Mobile viewport meta tags

---

## What Was Fixed (2026-09-02)

### ✅ Crop Growth Simulation
Elapsed-time simulation service implemented. Crops now advance through growth stages when farm data is read. Hydration decays over time. Crops wither after 6 hours without water.

### ✅ FarmScene Event Handling
Plot clicks now open context menus with available actions (Plant, Water, Harvest). Selection highlight added. Actions execute via API when authenticated, or in demo mode.

### ✅ PreloadScene Asset Fix
Removed non-existent `farm.json` tilemap load. Scene now transitions cleanly to FarmScene.

### ✅ Market Sell/Buy Endpoints
`POST /market/sell` and `POST /market/buy` endpoints added. Sell deducts inventory and adds currency. Buy deducts currency and adds inventory. Both record ledger entries and market transactions.

### ✅ Farm Ownership Verification
All crop endpoints (plant, water, harvest) now verify the authenticated user owns the farm before processing.

## What Was Implemented (M5 — Time & Offline Simulation)

### ✅ Weather Simulation System
- 5 weather types: clear, cloudy, rain, storm, drought
- Season-based weather probabilities
- Temperature and humidity per weather type
- Weather changes every 6 game hours

### ✅ Season Progression
- 4 seasons: spring, summer, autumn, winter
- Season duration: 4 weeks (game time)
- Growth modifiers per season (spring +10%, winter -20%)
- Frost risk in winter, pest modifier in summer

### ✅ Weather-Aware Crop Growth
- Rain adds hydration (+0.2/hour)
- Storm adds more hydration (+0.3/hour)
- Disease chance increases in humid weather
- Pest chance increases in warm weather, decreases in rain

### ✅ Livestock Simulation
- Hunger decay over time
- Health decay when starving
- Happiness decay without petting
- Production timer advancement
- Self-sustaining mode after 3 days offline
- Sick state when health < 0.3

### ✅ Building Simulation
- Construction timer completion
- Wear accumulation over time
- Maintenance state transitions (ACTIVE → MAINTENANCE_NEEDED → DISABLED)

### ✅ Welcome-Back Notifications
- Banner shows crops ready, withered, or building needs maintenance
- Auto-hides after 4 seconds

### ✅ Weather Display in HUD
- FarmScene shows weather emoji, temperature, and season
- React HUD shows weather info in top bar
- Weather-updated event bridge between Phaser and React

### ✅ Database Migration
- Added `last_simulated_at`, `weather_temperature`, `weather_humidity`, `current_day` to farms
- Added `product_timer_hours` to livestock

---

## What Is Still Missing

### MEDIUM: No Integration Tests
No tests for the complete planting → growth → harvest → sell flow.

### LOW: No Phaser Sprites
Still using emoji placeholders. Acceptable for M4, should be addressed for M6+.

---

## What Is Partial

### M3: Phaser Rendering Foundation [PARTIAL]
- FarmScene exists but uses emoji placeholders
- No actual sprite sheets loaded
- No tilemap rendering
- No camera bounds/panning
- No responsive canvas sizing (hardcoded 800x600)
- PreloadScene references non-existent assets

### API: Ownership Verification ✅ (Fixed)
- `verifyFarmOwnership` now called by CropsController before plant, water, harvest
- All crop endpoints verify the authenticated user owns the farm

### API: Request Validation [PARTIAL]
- Zod schemas defined in validation package
- Auth controller uses Zod parsing
- Crops controller uses Zod for plant endpoint
- Water and harvest endpoints have no body validation (acceptable)

---

## What Is Missing

### M4 Requirements (Core Game Loop)
1. ✅ Crop growth simulation (server-side time-based)
2. ✅ Market sell endpoint
3. ✅ Market buy endpoint (seed purchasing)
4. ✅ Currency update on sell/buy
5. ✅ FarmScene event handling (plot clicks)
6. ❌ Phaser asset pipeline (actual sprites — placeholders acceptable for M4)
7. ✅ Inventory display in game (market panel shows inventory)
8. ✅ Currency display in game (dynamic, from API)
9. ✅ Logout endpoint
10. ✅ Farm ownership verification on crop endpoints
11. ✅ Seed selection UI (crop picker on empty plots)
12. ✅ Market UI (buy seeds, sell crops)
13. ✅ Database transactions (plant_crop_transaction RPC function)

### M5 Requirements (Time & Simulation)
1. ✅ Elapsed-time calculation (crop growth)
2. ✅ Offline progression (livestock, buildings)
3. ✅ Weather simulation (5 weather types, probabilities per season)
4. ✅ Season progression (4 seasons, growth modifiers, frost/pest effects)
5. ✅ Livestock simulation (hunger, health, production, self-sustaining mode)
6. ✅ Building simulation (construction timer, wear, maintenance states)
7. ✅ Weather-aware crop growth (rain hydration, drought effects)
8. ✅ Disease/pest simulation based on weather
9. ✅ Welcome-back notification banner
10. ✅ Weather display in game HUD
11. ✅ Database migration for simulation columns

---

## Architecture Issues

1. ~~**Security:** CropsController does not verify farm ownership~~ ✅ FIXED — ownership verified before all crop operations
2. **Demo mode bypass:** FarmScene simulates actions locally when no token exists, but also simulates when API calls fail — this could mask real bugs
3. **No transactions:** Crop planting does 4 separate DB operations (update plot, insert crop, update inventory, insert ledger) without a transaction — partial failure could corrupt state

---

## Technical Debt

1. Token stored in localStorage (not httpOnly cookie)
2. No structured logging in NestJS
3. Supabase queries use admin client (bypasses RLS) instead of user client
4. No repository pattern — services query DB directly
5. No error logging/monitoring (Sentry not configured)
6. No rate limiting

---

## Testing Status

- Health controller unit test: EXISTS (minimal)
- Crops service unit test: EXISTS (minimal, only tests one error case)
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

Complete M6 — Farm Management.

The farm should feel like a living management game with meaningful choices:
```
Multiple crops → Growth stages → Watering → Harvest yields → Crop seasons → Soil mechanics
```

---

## Next Recommended Task

**Add multiple crop types with varied growth mechanics** — The config already defines 11 crops, but the game needs to display growth stages visually and implement watering mechanics properly.

Then **add building construction UI** — Let players build a Well, Coop, or Barn.

---

## Recommended Task Order

1. ~~Fix FarmScene event handling~~ ✅
2. ~~Fix PreloadScene~~ ✅
3. ~~Implement crop growth simulation~~ ✅
4. ~~Add farm ownership verification~~ ✅
5. ~~Implement market sell endpoint~~ ✅
6. ~~Implement market buy endpoint~~ ✅
7. ~~Make HUD dynamic~~ ✅
8. ~~Add seed selection UI~~ ✅
9. ~~Add logout endpoint~~ ✅
10. ~~Add database transactions~~ ✅
11. ~~Add sell/buy UI to game~~ ✅
12. ~~Implement weather simulation~~ ✅
13. ~~Implement livestock simulation~~ ✅
14. ~~Implement building simulation~~ ✅
15. **Add integration tests** for the complete planting → growth → harvest → sell flow
16. **Begin M6: Farm Management** — Multiple crops, building construction, watering mechanics
