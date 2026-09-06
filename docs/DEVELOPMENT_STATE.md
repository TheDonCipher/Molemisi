# Molemisi Development State

> Last updated: 2026-09-06
> Scope: as-built inventory of the repository. Design specs in `docs/01`–`docs/23` describe intent; this file describes what the code does.

---

## Current milestone

**M16 — Alpha** [IN PROGRESS]

Quality gate: can someone play Molemisi for 1–2 hours without the experience breaking?

## Milestone status

```
M0  Product & Documentation       [COMPLETE]
M1  Repository & Infrastructure   [COMPLETE]
M2  Authentication & Persistent   [COMPLETE]
M3  Phaser Rendering Foundation   [PARTIAL — standalone Farm scene; not embedded in Next.js]
M4  First Playable Vertical Slice [COMPLETE — React /game client]
M5  Time & Offline Simulation     [COMPLETE]
M6  Farm Management               [COMPLETE — API + React UI]
M7  Livestock & Production        [COMPLETE — API; React coverage varies]
M8  Economy & Market              [COMPLETE]
M9  Contracts & Progression       [COMPLETE]
M10 Kgotla                        [COMPLETE — API + React]
M11 Bushveld                      [COMPLETE — API + React]
M12 Seasons & World Events        [COMPLETE]
M13 Mobile/PWA                    [PARTIAL — manifest + SW; no push]
M14 Monetization & Payments       [PARTIAL — stub provider, 13 SKUs]
M15 Security / Analytics / Admin  [PARTIAL — admin + rate limit; analytics ingest only]
M16 Alpha                         [IN PROGRESS]
```

---

## Runtime architecture (as built)

```
Player browser
  -> Next.js :3000  React shell (landing, auth, /game, /admin, PWA)
       fetch http://localhost:3001/api/v1   (no reverse proxy)
  -> Vite    :3002  standalone Phaser (Boot -> Preload -> FarmScene)
       fetch http://localhost:3001/api/v1
  -> NestJS  :3001  modular monolith, prefix /api/v1
  -> Supabase PostgreSQL (service-role client in API; RLS as defense in depth)
```

**Player-facing game UI is React**, not Phaser. `apps/web/src/app/game/page.tsx` switches Farm / Inventory / Market / Kgotla / Bushveld / Settings screens via `gameState.tsx`. Phaser is not mounted in the Next app (`@/game` webpack alias is unused).

**Phaser** (`apps/game`) registers only Boot, Preload, and FarmScene. KgotlaScene, BushveldScene, MarketScene and most `apps/game/src/ui/*` panels exist on disk but are not in `main.ts`.

---

## Applications

| App | Package | Port | Role |
| --- | --- | --- | --- |
| `apps/web` | `@molemisi/web` | 3000 | Next.js 14 App Router, Tailwind, PWA |
| `apps/api` | `@molemisi/api` | 3001 | NestJS 10, Supabase Auth JWT |
| `apps/game` | `@molemisi/game` | 3002 | Phaser 3 + Vite standalone client |

## Shared packages

| Package | Contents |
| --- | --- |
| `packages/game-config` | 11 crops, 7 buildings, 4 animals, weather/seasons, 13 store SKUs, theme tokens, XP/economy constants. `GAME_VERSION = 0.1.0` |
| `packages/game-types` | Plot/building/contract/weather unions, entity shapes, crop DTOs |
| `packages/shared` | `API_VERSION`, pagination helpers, `clamp`, `calculateLevel`, `generateId` |
| `packages/validation` | Zod schemas for auth and game actions (only register/login/plant wired in controllers) |

Contracts (6), Kgotla NPCs (5) + projects (3), Bushveld zones (5), and world events (10) are **hardcoded in API services**, not in `game-config`.

---

## Web routes (`apps/web`)

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/auth/login`, `/auth/register` | Player auth; stores `molemisi_token` and `token` in localStorage |
| `/game` | React game shell |
| `/admin/login` | Admin login (same `/auth/login`, then probes `/admin/economy`) |
| `/admin` | Dashboard + player search |
| `/admin/players/[id]` | Player inspection and moderation |
| `/admin/economy` | Economy overview |
| `/admin/audit` | Ledger |
| `/admin/config` | Live `game_config` editor |

No `/admin/players` index page (search is on the dashboard). No player logout in Settings (API `POST /auth/logout` exists; web does not call it).

---

## API (`apps/api`) — prefix `/api/v1`

Auth is **Supabase JWT** via `Authorization: Bearer`. `AuthGuard` verifies with `auth.getUser(token)` and blocks banned players except on `/admin/` URLs. `JWT_SECRET` in `.env.example` is unused.

### Public

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

### Authenticated player

- `POST /auth/logout` — no-op server-side; client must drop the token
- `GET /auth/me`
- `GET /profile`
- `GET /farms/current` — runs elapsed-time simulation first
- `POST /farms/:farmId/plots/:plotId/{plant,water,harvest}`
- `GET /farms/:farmId/inventory`
- `GET /market/prices`, `GET /market/events`, `POST /market/{sell,buy}`
- `GET /farms/:farmId/buildings`, `GET .../buildings/available`
- `POST /farms/:farmId/buildings/construct`
- `POST /farms/:farmId/buildings/:buildingId/{upgrade,maintain}`
- `GET /farms/:farmId/livestock`, `GET .../livestock/available`
- `POST /farms/:farmId/livestock/purchase`
- `POST /farms/:farmId/livestock/:animalId/{feed,collect,pet}`
- `GET /farms/:farmId/contracts/{available,active}`
- `POST /farms/:farmId/contracts/accept`
- `POST /farms/:farmId/contracts/:activeContractId/complete`
- `GET /progression`
- `GET /farms/:farmId/kgotla/npcs`, `POST .../npcs/:npcId/{talk,quest}`
- `GET /farms/:farmId/kgotla/projects`, `POST .../projects/:projectId/donate`
- `GET /farms/:farmId/bushveld/zones`, `POST .../bushveld/gather`, `GET .../bushveld/history`
- `GET /farms/:farmId/events/{active,available,effects}`
- `POST /farms/:farmId/events/trigger/:eventId`
- `GET /payments/store`, `POST /payments/create`, `GET /payments/history`
- `POST /payments/:paymentId/refund`, `POST /payments/webhook`
- `GET /notifications`, `GET /notifications/unread-count`
- `POST /notifications/:id/read`, `POST /notifications/read-all`
- `GET /config`, `GET /config/:key`, `PUT /config/:key`, `PUT /config`, `GET /config/audit/log`

### Admin (`AuthGuard` + `AdminGuard`, `profiles.is_admin`)

- `GET /admin/players`, `GET /admin/players/:playerId`
- `GET /admin/players/:playerId/currency-history`
- `GET /admin/economy`, `GET /admin/ledger`
- `POST /admin/players/:playerId/{ban,unban,warn,reset-farm}`

**Not implemented as HTTP:** refresh-token route, analytics query API, production-chain endpoints. Simulation has no controller (runs inside `GET /farms/current`).

**Config writes are authenticated but not admin-gated.** Payment webhook is documented as public but the controller class uses `AuthGuard`, so it currently requires a Bearer token. Provider is `StubPaymentProvider` (always succeeds).

### Cross-cutting

- Global prefix `api/v1`, CORS (`CORS_ORIGIN` or `http://localhost:3000`), `ValidationPipe`
- In-memory rate limit: **60 req / 60s** per user id or IP
- Audit interceptor logs mutating HTTP methods to Nest logger (not a DB table)
- `AllExceptionsFilter` exists but is **not registered** in `main.ts`

---

## Database (`supabase/migrations`)

16 migrations, `20260902000000`–`20260902000015`:

| Migration | Summary |
| --- | --- |
| 000000 | Core: profiles, farms, plots, crops, buildings, livestock, inventory, ledger + RLS |
| 000001 | `plant_crop_transaction` RPC |
| 000002 | Weather / simulation columns |
| 000003 | Market prices, transactions, events |
| 000004 | Contracts + `profiles.xp` |
| 000005 | Kgotla reputation and projects |
| 000006 | Bushveld explorations |
| 000007 | World events |
| 000008 | Payments |
| 000009 | Analytics events (RLS, no user policies) |
| 000010–000013 | `game_config` + audit log + default keys cleanup |
| 000012 | Ban / warn columns |
| 000014 | Notifications |
| 000015 | `profiles.is_admin`, `is_admin()`, `set_admin()` |

API uses the **service-role** client. RLS is defense in depth.

Starter data: register creates profile (`STARTING_CURRENCY` 100), farm (`STARTING_PLOTS` 4), and sorghum/maize seeds. `supabase/seed/seed.sql` inserts extra market prices. `pnpm db:seed` points at missing `apps/api/src/database/seed.ts`.

Promote an admin: `node scripts/create-admin.mjs` (creates `admin@molemisi.co`).

---

## Simulation

`SimulationService` on `GET /farms/current`:

- Cap `MAX_OFFLINE_HOURS` = 24
- Weather every 6 hours; seasons via `SEASON_DURATION_HOURS`
- Crop hydration / growth / disease / pest; rain hydrates
- Livestock hunger / health / happiness / production; self-sustaining after 72h
- Building construction timers and wear

---

## Assets

- Source: `assets/` + `assets/manifest.json` (**209** entries)
- Groups: 71 crops, 49 icons, 17 scene-props, 12 animals, 12 fx, 10 decor, 7 buildings, 7 ground, 7 backgrounds, 6 weather, 6 UI, 5 NPCs
- `pnpm assets:sync` copies into `apps/web/public/assets` and `apps/game/public/assets`, writes `apps/game/src/generated-assets.ts`
- Hooked as root `predev` / `prebuild`
- PixelLab generator: `pnpm assets:generate` (`PIXELLAB_API_KEY`)

Scene stitch backgrounds: farm, kgotla, bushveld, market (`docs/23_Scene_Render_Specifications.md`).

---

## PWA / mobile

- `apps/web/public/manifest.json`, icons 192/512
- `apps/web/public/sw.js` — cache `molemisi-v1`, network-first, skips `/api/`
- Registered in `apps/web/src/app/layout.tsx`
- Not `next-pwa`. No push notifications. No Capacitor packaging.

---

## Testing and CI

**Unit / package tests**

- API: `auth.service.spec.ts`, `crops.service.spec.ts`, `health.controller.spec.ts`, `market.service.spec.ts`
- Packages: `game-config` crops + weather, `validation`
- `apps/api/test/core-loop.integration.spec.ts` is **not** picked up by Jest (`rootDir: src`)
- No `*.e2e-spec.ts` files

**Live scripts** (need running API): `scripts/test-game-loop.mjs`, `scripts/test-full-suite.mjs`

**CI** (`.github/workflows/ci.yml`): on push/PR to `main` — install, then parallel lint / typecheck / test, then build. No Supabase service, no deploy.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/sync-assets.mjs` | Copy assets + generate typed manifest |
| `scripts/generate-pixellab-assets.mjs` | PixelLab batch generator |
| `scripts/kill-dev.mjs` | Kill 3000/3001/3002 (`pnpm dev:kill`) |
| `scripts/create-admin.mjs` | Create/promote admin user |
| `scripts/test-game-loop.mjs` | Live farming smoke test |
| `scripts/test-full-suite.mjs` | Live multi-system API test |

---

## Feature inventory vs gaps

| Area | Status |
| --- | --- |
| Register / login / me | Done |
| Player logout UI | Missing (API no-op exists) |
| Token refresh endpoint | Missing (Supabase returns refreshToken) |
| Farming loop | Done (React + API; Phaser farm demo too) |
| Buildings / livestock | API done; Phaser objects not used |
| Market / contracts / XP | Done |
| Kgotla / Bushveld | API + React; Phaser scenes unregistered |
| Seasons / weather / events | Done on server |
| Admin dashboard + guard | Done |
| Rate limit | In-memory 60/min |
| PWA install | Manifest + SW |
| Payments | Stub only |
| Sound / music | None (Settings sliders are inert) |
| Push notifications | None |
| Redis | None (ADR-012 deferred) |
| Next `/api` proxy | None |

---

## Current objective

Finish M16 Alpha: stable 1–2 hour play session on the React client, honest docs, and known gaps tracked in `KNOWN_LIMITATIONS.md`.

## Recommended next tasks

1. Wire Next.js rewrites for `/api` -> `:3001` (single-port preview / CORS-free)
2. Player logout in Settings; consistent token key
3. Restrict `PUT /config` to `AdminGuard`
4. Register remaining Phaser scenes or drop unused scene/panel code from the player path
5. Restore `db:seed` or remove the script
6. Visual pass on generated assets in `/game`
