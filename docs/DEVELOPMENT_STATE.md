# Molemisi Development State

> Last updated: **2026-09-14**
> Scope: as-built inventory of the repository. Design intent lives in `docs/MVP/` (the
> post-pivot normative set) and `docs/01`–`docs/23` (the original design suite). This
> file describes what the code and database actually do today.

---

## Headline status

**MVP is code-complete and the four gates are green, but it is not deployable.** Three
things stand between the current build and a shippable v1:

1. **BLOCKER — 11 database migrations are unpushed** to the linked Supabase project
   `nyapfgawanqvnkkjudxb`. Migrations `000000`–`000015` are applied; `000016`–`000021`
   (wallet/ledger → inventory/crafting → water → Kgotla pillars → Bushveld → chapters →
   monetisation → the `role` column) are not. Until they land, every `/admin` and `/dev`
   route fails closed (the guards `select(… role)`), `/auth/me` reports everyone as
   `player`, and none of P2–P9 can function. This must be pushed by the Princess — there
   is no DB password or `SUPABASE_ACCESS_TOKEN` in this environment.
2. **RULING — Bushveld comparative income** is answered by live telemetry, not a model
   (Princess Eugenia, 2026-09-11). The structural invariant is proven in code; the
   comparative inversion is recorded in `scripts/balance_verify.py` §8 and accepted.
3. **RULING — wildlife raids and boost effects are deferred from v1** (2026-09-11). The
   Ancestral Ward, Pula Stone and Breath of the Land are withdrawn from the store.

Quality gates (run 2026-09-14, clean):

| Gate | Result |
| --- | --- |
| `tsc --noEmit -p apps/api` | **0** |
| `tsc --noEmit -p apps/web` | **0** |
| `jest` (apps/api) | **209 passed / 18 suites** |
| `python scripts/balance_verify.py` | **PASS** |

---

## Milestone status

```
M0  Product & Documentation        [COMPLETE]
M1  Repository & Infrastructure    [COMPLETE]
M2  Authentication & Persistent     [COMPLETE — Supabase Auth + profiles]
M3  Phaser Rendering Foundation     [PARTIAL — standalone Farm only; not in Next.js]
M4  First Playable Vertical Slice   [COMPLETE — React /game client]
M5  Time & Offline Simulation       [COMPLETE]
M6  Farm Management                 [COMPLETE — API + React; water via Jojo tank]
M7  Livestock & Production          [COMPLETE — API + React]
M8  Economy & Market                [COMPLETE — wallet + market + crafting]
M9  Progression (Three Pillars)     [COMPLETE — Elder + chapters + almanac]
M10 Kgotla                          [COMPLETE — Botho + Letsema + NPCs]
M11 Bushveld                        [COMPLETE — Kagiso + Field Journal + Sparkle]
M12 Seasons & World Events          [COMPLETE]
M13 Mobile/PWA                      [PARTIAL — manifest + SW + iOS splash; no push]
M14 Monetization & Payments         [PARTIAL — stub provider; boosts withdrawn]
M15 Security / Analytics / Admin    [PARTIAL — admin + dev guards; analytics ingest only]
M16 Alpha                          [BLOCKED — see Headline status]
```

---

## Runtime architecture (as built)

```
Player browser
  -> Next.js :3000  React shell (landing, auth, /game, /admin, /dev, PWA)
       fetch http://localhost:3001/api/v1   (no reverse proxy — CORS via CORS_ORIGIN)
  -> (legacy Phaser prototype `apps/game` deleted 2026-09-11; React `/game` on :3000 is the client)
       fetch http://localhost:3001/api/v1
  -> NestJS  :3001  modular monolith, prefix /api/v1
  -> Supabase PostgreSQL (service-role client in API; RLS as defense in depth)
```

**The player-facing game UI is React** (`apps/web/src/app/game/page.tsx` switches between ten
screens via `lib/gameState.tsx`). The legacy standalone Phaser prototype `apps/game` was deleted
on 2026-09-11, so React `/game` is now the only client. There is **no Next.js rewrite/proxy** to
the API (documented deviation).

---

## Applications

| App | Package | Port | Role |
| --- | --- | --- | --- |
| `apps/web` | `@molemisi/web` | 3000 | Next.js 14 App Router, Tailwind, PWA |
| `apps/api` | `@molemisi/api` | 3001 | NestJS 10, Supabase Auth JWT |

## Shared packages

| Package | Contents |
| --- | --- |
| `packages/game-config` | 11 crops, 7 buildings, 4 animals, weather/seasons, store SKUs, theme, **crafting, chapters, almanac, bushveld**, XP-free economy constants. `GAME_VERSION = '1.0.0-mvp'` |
| `packages/game-types` | Plot/building/contract/weather unions, entity shapes, crop DTOs |
| `packages/shared` | `API_VERSION`, pagination helpers, `clamp`, `calculateLevel`, `generateId` |
| `packages/validation` | Zod schemas for auth and game actions |

Contracts (6), Kgotla NPCs (5) + projects (3), Bushveld scenes (4) and world events (10)
are **hardcoded in API services**, not in `game-config`.

---

## Web routes (`apps/web`)

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/auth/login`, `/auth/register` | Player auth; stores `molemisi_token` + `token` in localStorage |
| `/game` | React game shell (ten screens) |
| `/admin/login` | Admin login (same `/auth/login`, then probes `/admin/economy`) |
| `/admin` | Dashboard + player search |
| `/admin/players/[id]` | Player inspection and moderation |
| `/admin/economy` | Economy overview |
| `/admin/audit` | Ledger |
| `/admin/config` | Live `game_config` editor |
| `/dev` | Dev tooling area (`DevGuard`) |

Player logout is implemented in Settings (`supabase.auth.signOut` + token drop).

### Web screens (ten)

`FarmScreen`, `KgotlaScreen`, `BushveldScreen`, `MarketScreen` (primary four), plus
`StoreScreen`, `WalletScreen`, `CraftingScreen`, `InventoryScreen`, `JournalScreen`,
`SettingsScreen`. Nav is a 10-column footer; the four-screen split is being reconciled
(see `KNOWN_LIMITATIONS.md`).

---

## API (`apps/api`) — prefix `/api/v1`

Auth is **Supabase Auth** (`verifyToken()` = `auth.getUser(token)`). `AuthGuard` blocks
banned players except on `/admin/` URLs. Role tiers `profiles.role ∈ player|admin|dev`
(migration `000021`, **unpushed**). `AdminGuard` = `is_admin` OR `role='admin'` (devs
excluded); `DevGuard` = `role='dev'`. `JWT_SECRET` in `.env.example` is unused. There is
**no refresh endpoint** and **no nested-JWT role claim** — `role` lives on `profiles`.

### Public

- `GET /health`
- `POST /auth/register`, `POST /auth/login`
- `GET /payments/store` (catalog)

### Authenticated player

- `POST /auth/logout`, `GET /auth/me`, `GET /profile`
- `GET /farms/current` — runs elapsed-time simulation first
- Crops: `GET /farms/:farmId/plots`, `POST .../plots/:plotId/plant`, `POST .../harvest`
- Water: `GET /farms/:farmId/water`, `POST .../water/refill`
- Buildings: `GET .../buildings`, `GET .../buildings/available`, `POST .../buildings/construct`, `POST .../buildings/:buildingId/upgrade`, `POST .../buildings/:buildingId/maintain`
- Storage: `POST /farms/:farmId/storage/upgrade`
- Livestock: `GET .../livestock`, `GET .../livestock/available`, `POST .../livestock/purchase`, `POST .../livestock/:animalId/{feed,collect,pet}`
- Inventory: `GET /farms/:farmId/inventory`
- Market: `GET /market/prices`, `GET /market/events`, `GET /market/quote`, `POST /market/sell`, `POST /market/buy`
- Contracts: `GET .../contracts/{available,active}`, `POST .../contracts/accept`, `POST .../contracts/:activeContractId/complete`
- Crafting: `GET /farms/:farmId/crafting`, `GET .../crafting/jobs`, `POST .../crafting/start`, `POST .../crafting/:jobId/collect`
- Letsema: `GET /farms/:farmId/letsema`, `POST /farms/:farmId/letsema`
- Kgotla: `GET .../kgotla/npcs`, `POST .../kgotla/npcs/:npcId/{talk,quest}`, `GET .../kgotla/projects`, `POST .../kgotla/projects/:projectId/donate`
- Bushveld: `GET .../bushveld/scenes`, `GET .../bushveld/scenes/:sceneId`, `POST .../bushveld/hotspots/:hotspotId/collect`
- Progression: `GET /progression`, `GET /progression/elder`, `GET /progression/scenes`, `GET /progression/farm/:farmId/elder`
- Chapters: `GET /chapters`, `GET /chapters/current`, `POST /chapters/current/claim`, `POST /chapters/rollover`
- World events: `GET .../events/{active,available}`, `GET .../events/effects`, `POST .../events/trigger/:eventId`
- Wallet: `GET /wallet`, `GET /wallet/ledger`
- Payments: `POST /payments/create`, `GET /payments/history`, `POST /payments/:paymentId/refund`, `POST /payments/webhook`
- Store (Pula): `GET /store`, `POST /store/purchase`, `POST /store/admin/flip-subscriptions`, `POST /store/admin/grant-weekly`
- Notifications: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- Config: `GET /config`, `GET /config/:key`, `GET /config/audit/log`, `PUT /config/:key`, `PUT /config`

### Admin (`AuthGuard` + `AdminGuard`)

- `GET /admin/players`, `GET /admin/players/:playerId`, `GET /admin/players/:playerId/currency-history`
- `GET /admin/economy`, `GET /admin/ledger`
- `POST /admin/players/:playerId/{ban,unban,warn,reset-farm}`

### Dev (`AuthGuard` + `DevGuard`)

- `GET /dev/status`

**Not implemented as HTTP:** refresh-token route, analytics query API, production-chain
endpoints. Simulation has no controller (runs inside `GET /farms/current`). The launch
readiness check is a Jest spec, not an endpoint.

**Known auth gaps (see KNOWN_LIMITATIONS.md):** `PUT /config` is `AuthGuard`-only, not
admin-gated; `POST /payments/webhook` is documented as public but the controller class
uses `AuthGuard`, so it currently needs a Bearer token.

---

## Database (`supabase/migrations`)

**27 migration files. `000000`–`000015` are applied to the linked project; 11 are
not** — this is the deploy blocker.

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
| **000016** ⛔ | **v1 wallet + ledger** |
| **000017** ⛔ | **legacy currency mirror** |
| **000018** ⛔ | **Pula floor** |
| **000019** ⛔ | **P3 inventory + crafting** |
| **000020** ⛔ | **plant transaction → player_inventory** |
| **000040** ⛔ | **P4 growth + water (Jojo tank)** |
| **000050** ⛔ | **P5 Kgotla pillars (Botho / Letsema)** |
| **000100** ⛔ | **P6 Bushveld (Kagiso / scenes / hotspots / journal / sparkle)** |
| **000110** ⛔ | **P8 chapters + almanac** |
| **000120** ⛔ | **P9 monetisation (top-up / subscription / boosts / cosmetics)** |
| **000021** ⛔ | **`profiles.role` column + tiers** |

API uses the **service-role** client. RLS is defense in depth.

Starter data: registration creates the auth user, profile (`STARTING_PULA` 250), farm
(`STARTING_PLOTS` 4), and sorghum/maize seed stock. `supabase/seed/seed.sql` inserts market
prices and config rows. **`pnpm db:seed` is broken** (the Nest seed script does not exist;
use registration + `supabase:reset`).

Promote an admin: `node scripts/create-admin.mjs`. Promote a dev: `node scripts/create-dev.mjs`.

---

## Simulation

`SimulationService` on `GET /farms/current`:

- Cap `MAX_OFFLINE_HOURS` = 24
- Weather every 6 hours; seasons via `SEASON_DURATION_HOURS`
- Crop hydration / growth / disease / pest; rain hydrates; an **empty Jojo tank halts the
  growth timer** server-side (P4)
- Livestock hunger / health / happiness / production; self-sustaining after 72h
- Building construction timers and wear
- Crafting jobs, Kagiso regen, chapter rollover — all computed on read, persisted on write,
  no cron

---

## Assets

- Source: `assets/` + `assets/manifest.json` (**261** entries, 14 groups)
- Groups: 71 crops, 49 icons, 47 item-icons (seeds/crops/animal products/materials/tools/buildings),
  17 scene-props, 12 animals, 12 fx, 10 decor, 8 backgrounds, 7 buildings, 7 ground, 6 weather,
  6 ui-assets, 5 NPCs, 4 branding
- `pnpm assets:sync` copies into `apps/web/public/assets` only (the standalone Phaser prototype
  `apps/game` was deleted on 2026-09-11, so the `generated-assets.ts` emit was removed)
- PixelLab generator: `pnpm assets:generate` (`PIXELLAB_API_KEY`)

Scene stitch backgrounds: farm, kgotla, bushveld, market. Branding lockups + OG card in
`assets/branding/`. Web item icons via `lib/pixelIcons.tsx` + `components/PixelIcon.tsx`.

---

## PWA / mobile

- `apps/web/public/manifest.json` — icons 192/512 + maskable; bg `#1A0F0A`, theme `#FF8F00`
- Icons + favicon generated from `assets/branding/logo.png` by `scripts/generate-icons.mjs`
- iOS launch: 24 `apple-touch-startup-image` splash screens in `layout.tsx`
- `apps/web/public/sw.js` — cached `molemisi-v1`, network-first, skips `/api/`
- Registered in `apps/web/src/app/layout.tsx`. Not `next-pwa`. No push. No Capacitor.

---

## Testing and CI

**Unit / package tests** — 18 Jest suites, **209 tests**, all green:

`auth`, `bushveld`, `chapters`, `crafting`, `crops`, `health`, `inventory`, `kgotla`,
`launch` (readiness gate), `market`, `monetisation` + `store`, `payments`, `progression`,
`simulation`, `wallet` (controller + service), `water`.

Packages: `game-config` crops/weather, `validation`. `apps/api/test/core-loop.integration.spec.ts`
is **not** picked up by Jest (`rootDir: src`). No `*.e2e-spec.ts`.

**Economy gate:** `python scripts/balance_verify.py` — dead-zone 0, dominance ≤3, value
spread 3.32×, thirst 7.5×, crafting closes, Bushveld §8 (ruled: live telemetry).

**Live scripts** (need a running API): `scripts/test-game-loop.mjs`,
`scripts/test-full-suite.mjs`. **CI** (`.github/workflows/ci.yml`): lint / typecheck / test /
build on push+PR. No Supabase service, no deploy.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/sync-assets.mjs` | Copy assets + generate typed manifest |
| `scripts/generate-pixellab-assets.mjs` | PixelLab batch generator |
| `scripts/generate-icons.mjs` | Favicons, PWA icons, iOS splash (from logo) |
| `scripts/generate-media-assets.mjs` | Wordmark lockups, OG card |
| `scripts/build-font.mjs` / `generate-font.mjs` | Molemisi Pixel font |
| `scripts/kill-dev.mjs` | Kill 3000/3001/3002 (`pnpm dev:kill`) |
| `scripts/create-admin.mjs` | Create/promote admin user |
| `scripts/create-dev.mjs` | Create/promote dev user |
| `scripts/test-game-loop.mjs` | Live farming smoke test |
| `scripts/test-full-suite.mjs` | Live multi-system API test |
| `scripts/balance_verify.py` | Economy gate (spec-is-truth; fix spec, never script) |

---

## Feature inventory vs gaps

| Area | Status |
| --- | --- |
| Register / login / logout / me | Done (Supabase Auth) |
| Role tiers (player/admin/dev) | Code done; **blocked on migration 000021** |
| Wallet + ledger (Botswana-day caps) | Done (API) |
| Farming loop + water (Jojo tank) | Done |
| Buildings / livestock | Done |
| Inventory + storage tiers | Done |
| Crafting (timers, batching, substitution) | Done |
| Market (5% tax, price band, quote) | Done |
| Kgotla (Botho, Letsema, NPCs) | Done |
| Bushveld (Kagiso, journal, sparkle) | Done |
| Chapters + almanac | Done |
| Seasons / weather / events | Done on server |
| Admin + dev dashboards/guards | Done (dev guarded; admin flag) |
| Rate limit | In-memory 60/min |
| PWA install | Manifest + SW + full icon set + iOS splash |
| Payments | Stub only; **boosts withdrawn from sale** |
| **Wildlife raids** | **Deferred from v1 (ruling 2026-09-11)** |
| **Boost effects** | **Deferred from v1 (ruling 2026-09-11)** |
| Sound / music | None |
| Push notifications | None |
| Redis | None (ADR-012 deferred) |
| Next `/api` proxy | None (documented deviation) |
| Phone-number withdrawal / P2P | v1.1 only (closed-loop in v1) |

---

## Current objective

Make the MVP deployable: push the 11 unpushed migrations + seed, then run the four gates
and a scripted end-to-end walkthrough. Reconcile the nav with the four-screen model.
(The legacy `apps/game` Phaser prototype was deleted on 2026-09-11.) Track gaps in
`KNOWN_LIMITATIONS.md`.

## Recommended next tasks

1. **`supabase db push` (000016 → 000021) + seed**, then confirm the schema probes — the only
   hard blocker.
2. Wire Next.js rewrites for `/api` → `:3001` (single-port / CORS-free preview).
3. Restrict `PUT /config` to `AdminGuard`.
4. Decide whether the Bushveld comparative + raids/boosts need a follow-up (both are ruled).
5. Reconcile the 10-column footer nav with the four-screen model. (The `apps/game` deletion is done.)
6. Restore `db:seed` or remove the script.
