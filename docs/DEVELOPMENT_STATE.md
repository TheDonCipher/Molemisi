# Molemisi Development State

> Last Updated: 2026-09-03
> Updated By: Asset Pipeline + Pre-existing Bug Fixes

---

## Current Milestone

**M16 — Alpha** [IN PROGRESS]

## Milestone Status

```
M0  Product & Documentation       [COMPLETE]
M1  Repository & Infrastructure   [COMPLETE]
M2  Authentication & Persistent   [COMPLETE]
M3  Phaser Rendering Foundation   [PARTIAL — now with real sprites]
M4  First Playable Vertical Slice [COMPLETE]
M5  Time & Offline Simulation     [COMPLETE]
M6  Farm Management               [COMPLETE]
M7  Livestock & Production        [COMPLETE]
M8  Economy & Market              [COMPLETE]
M9  Contracts & Progression       [COMPLETE]
M10 Kgotla                        [COMPLETE]
M11 Bushveld                      [COMPLETE]
M12 Seasons & World Events        [COMPLETE]
M13 Mobile/PWA                    [COMPLETE]
M14 Monetization & Payments       [COMPLETE]
M15 Security / Analytics / Admin  [COMPLETE]
M16 Alpha                         [IN PROGRESS — asset integration, integration tests]
```

---

## What Was Implemented (Latest Session)

### ✅ PixelLab Asset Generation Pipeline

- 192 assets generated via PixelLab API
- 49 UI icons, 71 crop sprites, 12 animal sprites, 7 buildings, 5 NPCs, 10 decorations, 7 ground tiles, 7 backgrounds, 6 weather, 12 particles, 6 UI panels
- `scripts/generate-pixellab-assets.mjs` — full asset generator with concurrency, retries, manifest tracking
- `scripts/sync-assets.mjs` — copies assets into `apps/web/public/assets/` and `apps/game/public/assets/`, generates typed `apps/game/src/generated-assets.ts`
- `assets/manifest.json` — complete catalog of all 192 assets with metadata

### ✅ Game Sprite Integration

- **PreloadScene** — loads all assets from the generated manifest with progress bar
- **PlotObject** — renders real soil tiles + crop-stage sprites + sparkle particles (no more emoji/rectangles)
- **FarmScene** — sky backdrop, decor trees, buildings, animal sprites with idle bob, weather sprites
- **Web HUD** — bottom nav, weather chip, Pula display use generated pixel icons

### ✅ Pre-existing Bug Fixes

- **next build `useContext` null** — root cause: ambient `NODE_ENV=development` from `.env` / shell. Fixed by removing from `.env`/`.env.example` and adding `cross-env NODE_ENV=production` to web build script
- **EADDRINUSE (3000/3001/3002)** — created `scripts/kill-dev.mjs` helper; added `kill:dev` npm script
- **ESLint 9 broken** — legacy `.eslintrc.js` ignored by ESLint 9. Created `eslint.config.js` flat config, deleted legacy, fixed all 14 unused-import/variable errors in API
- **Game standalone build** — missing `index.html`. Created entry + Vite aliases for workspace packages
- **API test failure** — `jest.config.ts` had `rootDir: src` so `../../packages` resolved wrong. Fixed to `../../../packages`. Updated `crops.service.spec.ts` to match refactored RPC-based `plantCrop`
- **Strict-mode TS errors** — fixed TS2531/TS2352 in StorePanel, LivestockPanel, KgotlaPanel, WorldEventsPanel, ContractsPanel, BushveldPanel, TutorialOverlay (pre-existing)
- **ApiClient VITE_API_URL** — replaced `import.meta.env.VITE_API_URL` with `NEXT_PUBLIC_API_URL` (Vite env not available in Next.js webpack)

---

## Complete Feature Inventory

### Authentication ✅

- Register, login, logout, session management
- JWT validation, farm ownership verification

### Security ✅

- Rate limiting (60 req/min)
- Audit logging for mutations
- CORS, input validation, RLS

### Analytics ✅

- Event tracking, DAU, economy monitoring

### Administration ✅

- Player inspection, economy overview, ledger

### Farming ✅

- 11 crops, planting, watering, growth simulation, harvesting
- Crop quality system, hydration mechanics
- **Real sprite rendering** (soil + crop stages)

### Buildings ✅

- 6 building types, construction, upgrade, maintenance
- **Real sprite rendering**

### Livestock ✅

- 4 animal types, purchase, feed, collect, pet, sickness
- **Real sprite rendering** with idle animation

### Economy ✅

- Dynamic pricing, market events, supply/demand

### Contracts ✅

- 6 contracts, accept, complete, track

### Progression ✅

- XP, levels, achievements, unlocks

### Kgotla ✅

- 5 NPCs, reputation, quests, community projects

### Bushveld ✅

- 5 zones, exploration, resource gathering, rare discoveries

### Seasons & Events ✅

- 4 seasons, weather, 10 world events, festivals
- **Real weather sprites**

### Mobile/PWA ✅

- PWA manifest, service worker, responsive canvas, touch

### Payments ✅

- Store (8 items), provider abstraction, webhook flow

---

## What Is Still Missing

### LOW: No Sound/Music

No audio system.

### LOW: No Admin Role Guard

Admin endpoints protected by JWT but not restricted to admin users.

### LOW: Asset Visual Quality Pass

Generated assets haven't had a visual review — some may need prompt tuning.

---

## Architecture Status

All architectural requirements from the PRD are met:

- Server-authoritative game state ✅
- Supabase PostgreSQL as primary database ✅
- NestJS owns game logic ✅
- Phaser owns rendering ✅
- Next.js owns application UI ✅
- Modular monolith (not microservices) ✅
- Elapsed-time offline simulation ✅
- Payment provider abstraction ✅
- Data-driven game content ✅
- Mobile-first design ✅
- **Real pixel-art assets** ✅

---

## Testing Status

- Core loop integration tests: PASSING
- Unit tests: PASSING
- Lint: PASSING
- Typecheck: PASSING
- Build: PASSING (web + game + api)

---

## Build Health

| Check     | Status  |
| --------- | ------- |
| typecheck | ✅ PASS |
| lint      | ✅ PASS |
| test      | ✅ PASS |
| build     | ✅ PASS |

---

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all services (web:3000, api:3001, game:3002)
pnpm build                # Build all packages
pnpm typecheck            # Type-check all packages
pnpm lint                 # Lint all packages
pnpm test                 # Run all tests
pnpm format               # Format with Prettier
pnpm kill:dev             # Kill stale dev processes on 3000/3001/3002
pnpm assets:sync          # Sync assets/ into web/public + game/public
pnpm assets:generate      # Generate assets via PixelLab API
```

---

## Current Objective

Complete M16 — Alpha quality gate: "Can someone play Molemisi for 1–2 hours without the experience breaking?"

---

## Recommended Next Task

**Visual quality review of generated assets** — Open the game at http://localhost:3000/game and verify all 192 assets render correctly. Fix any that look wrong. Then commit the full batch.
