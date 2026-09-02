# Molemisi Development State

> Last Updated: 2026-09-02
> Updated By: Initialization Audit

---

## Current Milestone

**M4 — First Playable Vertical Slice**

## Milestone Status

```
M0  Product & Documentation       [COMPLETE]
M1  Repository & Infrastructure   [COMPLETE]
M2  Authentication & Persistent   [COMPLETE]
M3  Phaser Rendering Foundation   [PARTIAL]
M4  First Playable Vertical Slice [COMPLETE — core loop functional]
M5  Time & Offline Simulation     [NOT STARTED]
M6  Farm Management               [NOT STARTED]
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
1. ✅ Elapsed-time calculation (basic — crop growth)
2. ❌ Offline progression (production, livestock)
3. ❌ Weather simulation
4. ❌ Season progression

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

Complete M4 — First Playable Vertical Slice.

The core loop must work end-to-end:
```
Login → Enter Farm → Select Plot → Plant → Wait → Grow → Harvest → Sell → Earn Pula → Buy Seed → Plant Again
```

---

## Next Recommended Task

**Make the HUD dynamic** — Fetch real currency from API instead of showing hardcoded `100 P`.

Then **add seed selection UI** — Let players choose which crop to plant instead of always using sorghum.

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
12. **Add integration tests** for the complete planting → growth → harvest → sell flow
13. **Begin M5: Time & Offline Simulation** — Weather, seasons, offline progression
14. **Begin M6: Farm Management** — Multiple crops, growth stages, watering mechanics
