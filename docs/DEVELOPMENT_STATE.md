# Molemisi Development State

> Last updated: **2026-10-02**
> Scope: as-built inventory of the repository. Design intent lives in `docs/MVP/` (the
> post-pivot normative set) and `docs/01`–`docs/23` (the original design suite). This
> file describes what the code and database actually do today.

---

## Headline status

**MVP is code-complete and the four gates are green.** The database is at **39 migrations** and
no longer blocked on the original deploy gap. Four capability areas have landed since the
2026-09-16 state note, plus the first three Waves of the decided economy:

1. **RESOLVED — the full migration set is pushed live.** The linked Supabase project
   `nyapfgawanqvnkkjudxb` is current through `20261002000000_kgotla_year_charges` (**39 migrations, 0
   pending**); `/admin`, `/dev` and P2–P9 all run at runtime. The previously load-bearing gap
   (`madi_balance`, `20261001000003`) and the Year-layer `kgotla_charges` table are both live.
2. **NEW — deterministic simulation engine** (`apps/api/src/simulation/engine/`). One pure
   `runSimulation(input) => output`; no clock reads, no global RNG, no I/O. This is where the
   per-system offline time windows now live, in one table (`engine/time.ts`), instead of at
   scattered call sites.
3. **NEW — anti-cheat** (`apps/api/src/anti-cheat/`) plus migration `20261001000002`. Detection
   is split into pure rules (`rules.ts`) and a persistence service. Flags are **review signals,
   never verdicts**: writing a flag never mutates player state.
4. **NEW — state validation & recovery** (`apps/api/src/simulation/state-validation.ts`).
   `validateGameState()` / `planRecovery()` are pure and name the corrective action for each
   corrupted-state class.
5. **NEW — economy metrics API** (`apps/api/src/economy/`) plus migration
   `20261001000001_economy_metrics`. Admin-only read endpoints for supply, wealth, velocity,
   prices, inflation, crop supply and progression.
6. **PARTIAL — the decided economy** (`docs/33` → `docs/34`). **Waves 1–3 are landed**:
   livestock economics retuned and asserted net-positive, maintenance moved to a 30-day bill,
   the **Madi** balance exists (migration `20261001000003`, `wallet_apply()` taught a third
   currency), top-ups grant Madi and never Pula, the store is two cosmetic shelves plus the
   **Village Pass**, and **boosts are cut** (`BOOSTS` is an empty list). **Wave 4 is partial** —
   the land tail is retuned (`LAND_LADDER_TOTAL` 30,200) and the currency copy landed, but the
   store UI has no wired purchase flow and the Botho automation unlocks are still config-only
   (no persistence layer).
7. **RULING — Bushveld comparative income** is answered by live telemetry, not a model
   (Princess Eugenia, 2026-09-11). The structural invariant is proven in code; the
   comparative inversion is recorded in `scripts/balance_verify.py` §8 and accepted.
8. **RULING — wildlife raids and boost effects are deferred from v1** (2026-09-11). Since
   `docs/34` §3.3 the three boost SKUs are **removed from the catalogue entirely**, not merely
   flagged `available: false`.

Quality gates (run 2026-10-02, clean):

| Gate | Result |
| --- | --- |
| `tsc --noEmit -p apps/api` | **0** |
| `tsc --noEmit -p apps/web` | **0** |
| `jest` (apps/api) | **417 passed / 28 suites** |
| `jest` (packages/game-config) | **163 passed / 8 suites** |
| `jest` (packages/validation) | **35 passed / 1 suite** |
| `python scripts/balance_verify.py` | **PASS** |

---

## Milestone status

```
M0  Product & Documentation        [COMPLETE]
M1  Repository & Infrastructure    [COMPLETE]
M2  Authentication & Persistent     [COMPLETE — Supabase Auth + profiles]
M3  Phaser Rendering Foundation     [REMOVED — standalone prototype deleted 2026-09-11; React /game is the client]
M4  First Playable Vertical Slice   [COMPLETE — React /game client]
M5  Time & Offline Simulation       [COMPLETE — pure deterministic engine, per-system time windows]
M6  Farm Management                 [COMPLETE — API + React; water via Jojo tank]
M7  Livestock & Production          [COMPLETE — API + React; 72 h decay window, self-sustaining beyond]
M8  Economy & Market                [COMPLETE — wallet + market + crafting; chapter market events auto-seeded]
M9  Progression (Three Pillars)     [COMPLETE — Elder + chapters + almanac]
M10 Kgotla                          [COMPLETE — Botho + Letsema + NPCs; charge bug fixed]
M11 Bushveld                        [COMPLETE — Kagiso + Field Journal + Sparkle]
M12 Seasons & World Events          [COMPLETE]
M13 Mobile/PWA                      [PARTIAL — manifest + SW + iOS splash; no push]
M14 Monetization & Payments         [PARTIAL — stub provider; boosts CUT from the catalogue]
M14a Decided strategy (2026-10-01) [DECIDED — `docs/33`: 2 currencies + 1 meter, 2 store products (decorations + M50 Village Pass); Pula never sold; Madi spend-only; boosts cut; land tail retuned. Build sequence in `docs/34`; **Waves 1–3 landed**, Wave 4 partial]
M15 Security / Analytics / Admin    [PARTIAL — admin + dev guards; anti-cheat + economy metrics shipped; analytics ingest only]
M16 Alpha                          [UNBLOCKED — remaining: push the 9 pending migrations, Wave 4 store UI + automation persistence, real PSP, P10 manual checks]
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
| `packages/simulator` | Offline balance/load simulator. **Not a game client** — it drives a real database and creates real accounts, so never point it at the linked project. |

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
`SettingsScreen`. Nav is now **hybrid**: the four primary screens sit in the footer and the
rest live in a header **More** menu, reconciling the four-screen model (see `KNOWN_LIMITATIONS.md`).

---

## API (`apps/api`) — prefix `/api/v1`

Auth is **Supabase Auth** (`verifyToken()` = `auth.getUser(token)`). `AuthGuard` blocks
banned players except on `/admin/` URLs. Role tiers `profiles.role ∈ player|admin|dev`
(migration `000021`). `AdminGuard` admits `is_admin` OR `role='admin'` OR `role='dev'` — **dev is
the top tier and is admitted to `/admin`**, so the dev test account can do and test anything.
`DevGuard` admits `role='dev'` OR `role='admin'` OR `is_admin`, so admins can reach the dev
tooling. `JWT_SECRET` in `.env.example` is unused. There is **no refresh endpoint** and
**no nested-JWT role claim** — `role` lives on `profiles`, not in the token.

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
- Store (in-game cosmetics, Pula **or** Madi): `GET /store`, `POST /store/purchase`, `POST /store/admin/flip-subscriptions`, `POST /store/admin/grant-weekly`
- Notifications: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- Config: `GET /config`, `GET /config/:key`, `GET /config/audit/log`, `PUT /config/:key`, `PUT /config` — **both PUT routes now carry `AdminGuard`**

### Admin (`AuthGuard` + `AdminGuard`)

- `GET /admin/players`, `GET /admin/players/:playerId`, `GET /admin/players/:playerId/currency-history`
- `GET /admin/economy`, `GET /admin/ledger`
- `POST /admin/players/:playerId/{ban,unban,warn,reset-farm}`
- **Economy metrics** (new): `GET /admin/economy/{overview,currency,wealth,velocity,prices,inflation,crop-supply,progression}`
- **Anti-cheat** (new): `GET /admin/anti-cheat/flags`, `POST /admin/anti-cheat/passive`, `POST /admin/anti-cheat/active`

### Dev (`AuthGuard` + `DevGuard`)

- `GET /dev/status`

**Not implemented as HTTP:** refresh-token route, analytics query API, production-chain
endpoints. Simulation has no controller (runs inside `GET /farms/current`). The launch
readiness check is a Jest spec, not an endpoint. `ChapterService.spendTokens()` exists and
`ChapterController` now exposes `POST /chapters/tokens/spend` (`chapter.controller.ts:56`), so
Chapter Tokens (season stamps) are spendable on the 25-stamp souvenir sink (`docs/34` §3.4).

**Known auth gap (see KNOWN_LIMITATIONS.md):** `POST /payments/webhook` is documented as
public but the controller class uses `AuthGuard`, so it currently needs a Bearer token.

---

## Database (`supabase/migrations`)

**39 migration files.** All migrations through `20261002000000_kgotla_year_charges` are **pushed live** to the linked project `nyapfgawanqvnkkjudxb`; **0 pending**.

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
| 000016 ✅ pushed 2026-09-14 | **v1 wallet + ledger** |
| 000017 ✅ pushed 2026-09-14 | **legacy currency mirror** |
| 000018 ✅ pushed 2026-09-14 | **Pula floor** |
| 000019 ✅ pushed 2026-09-14 | **P3 inventory + crafting** |
| 000020 ✅ pushed 2026-09-14 | **plant transaction → player_inventory** |
| 000040 ✅ pushed 2026-09-14 | **P4 growth + water (Jojo tank)** |
| 000050 ✅ pushed 2026-09-14 | **P5 Kgotla pillars (Botho / Letsema)** |
| 000100 ✅ pushed 2026-09-14 | **P6 Bushveld (Kagiso / scenes / hotspots / journal / sparkle)** |
| 000110 ✅ pushed 2026-09-14 | **P8 chapters + almanac** |
| 000120 ✅ pushed 2026-09-14 | **P9 monetisation (top-up / subscription / boosts / cosmetics)** |
| 000021 ✅ pushed 2026-09-14 | **`profiles.role` column + tiers** |
| 20260914000022 | fix `player_cosmetics.cosmetic_id` UUID → TEXT drift ✅ pushed live (2026-10-02) |
| 20260916000030 | drop 2 obsolete `plant_crop_transaction` overloads ✅ pushed live (2026-10-02) |
| 20260923000031 | livestock inventory cutover ✅ pushed live (2026-10-02) |
| 20260923000032 | Kgotla charges + decay ✅ pushed live (2026-10-02) |
| 20260923000033 | deep time & lore content ✅ pushed live (2026-10-02) |
| 20260923000034 | batch-2 Deep Bushveld + fertilizer ✅ pushed live (2026-10-02) |
| 20260924000000 | **reconcile `market_prices` to the catalogue** (`docs/27`–`28`) ✅ pushed live (2026-10-02) |
| 20260928000001 | livestock starvation window — `hunger_zero_since` ✅ pushed live (2026-10-02) |
| 20261001000001 | economy metrics — `economy_price_snapshots` ✅ pushed live (2026-10-02) |
| 20261001000002 | anti-cheat — `anti_cheat_flags` ✅ pushed live (2026-10-02) |
| 20261001000003 | **`madi_balance` + `wallet_apply()` third currency** (`docs/34` §2.1) ✅ pushed live (2026-10-02) |
| 20261002000000 | **Year-layer `kgotla_charges` table** (`docs/38` I-2, `docs/36`) ✅ pushed live (2026-10-02) |

> ⚠️ `public.is_admin` is declared as `is_admin(user_id uuid)` in `20260902000015`. RLS policies
> **must** call it as `is_admin(auth.uid())` — the bare zero-arg form is a `42883` at
> `CREATE POLICY` time, which aborts the whole transaction and leaves the migration unapplied.
> `20261001000001` carries a comment to that effect.

API uses the **service-role** client. RLS is defense in depth.

Starter data: registration creates the auth user, profile (`STARTING_PULA` 250), farm
(`STARTING_PLOTS` 4), and sorghum/maize seed stock. `supabase/seed/seed.sql` inserts market
prices and config rows. **`pnpm db:seed` is broken** — the root `package.json` delegates to
`pnpm --filter @molemisi/api db:seed`, which runs `ts-node src/database/seed.ts`, and that file
does not exist. Use registration + `supabase:reset`.

Promote an admin: `node scripts/create-admin.mjs`. Promote a dev: `node scripts/create-dev.mjs`.

---

## Simulation

Two layers, and the split matters when reading the older specs.

**Live read path** — `SimulationService` runs inside `GET /farms/current` and persists to
Supabase. **Pure engine** — `apps/api/src/simulation/engine/` exposes one
`runSimulation(input) => output` with no clock reads, no global RNG and no I/O, so a captured
`SimulationInput` replays to an identical `SimulationOutput`. Crop ticks in the live path still
go through the tank-gated `WaterService.advanceFarmGrowth`; the engine's crop model is the pure,
seeded home for the rules and is what the simulator and the engine suite exercise.

**Per-system offline windows** are resolved in one place, `engine/time.ts`
(`resolveTimeWindows()`), because the old "cap everything at 24 h" reading made several rulings
unreachable:

| System | Window | Why |
| --- | --- | --- |
| Crops (growth) | **24 h cap** (`MAX_OFFLINE_HOURS`) | a once-daily check-in must not be out-run |
| Weather | **24 h cap** | only weather crops will see |
| Building construction | **absolute timer** | ends on its own; no cap |
| Building wear | **UNCAPPED** | weekly ≠ 7× the wear (G-13) |
| Livestock hunger/health/production | **72 h cap** (`LIVESTOCK_OFFLINE_CAP_HOURS`) | "decays up to three days" (09 §9) |
| Livestock self-sustaining flag | **UNCAPPED, > 72 h** | compared against true away-time so it can actually fire (G-4) |

Self-sustaining mode (after 72 h uncapped): hunger decays at 25 % rate, no production, no
health decay, no happiness decay, hunger floored at 0.1. Health additionally only begins to
decay after **12 consecutive hours** at `hunger == 0`, tracked by the persisted
`hunger_zero_since` column (migration `20260928000001`) — the starvation window that removed
the unrecoverable-death loop.

Also simulated: weather every 6 hours; seasons via `SEASON_DURATION_HOURS`; crop
hydration / growth / disease / pest with rain hydration and an **empty Jojo tank halting the
growth timer** server-side (P4); crafting jobs, Kagiso regen and chapter rollover — all
computed on read, persisted on write, **no cron**.

Market events are self-seeding: `ensureActiveChapterEvent()` guarantees a fresh install always
has an active, chapter-themed event and rotates it when the real Botswana chapter changes. It is
idempotent and de-dupes by name, so a concurrent double-seed cannot double-apply a multiplier.

---

## Assets

- Source: `assets/` + `assets/manifest.json` (**282** entries, 14 groups)
- Groups: 71 crops, 49 icons, 47 item-icons (seeds/crops/animal products/materials/tools/buildings),
  17 scene-props, 12 animals, 12 fx, 10 decor, 8 backgrounds, 7 buildings, 7 ground, 6 weather,
  6 ui-assets, 5 NPCs, 4 branding
- `pnpm assets:sync` copies into `apps/web/public/assets` only (the standalone Phaser prototype
  `apps/game` was deleted on 2026-09-11, so the `generated-assets.ts` emit was removed)
- PixelLab generator: `pnpm assets:generate` (`PIXELLAB_API_KEY`)
- **Withdrawn art is archived, not deleted:** `assets/_archive/` (19 files) holds the pig
  sprites, the Saffron crop (replaced by Morula), the item icons for `building_borehole`,
  `building_greenhouse`, `material_marula`, `material_salt`, `product_saffron`, `product_wool`,
  `seed_saffron`, the `snowflake` particle and the withdrawn `lvl1` building sheets. The
  archive is **excluded from the sync**, so those paths resolve to nothing in the client. See
  `assets/_archive/README.md` and `docs/05 §14`.
- Ground autotiles were renamed from UUID filenames to **`0.png` / `15.png`** endpoints per tile
  set (`grass_dirt`, `grass_dry`, `grass_path`, `grass_water`) by
  `scripts/normalize-ground-tiles.mjs`; `apps/web/src/lib/groundTiles.ts` reads the
  corresponding `*.json` index.

Scene backgrounds: farm (day/sunset/night), kgotla, market, bushveld savanna + riverbank — all
under `assets/tiles/sky/` (⚠️ **not** `assets/backgrounds/`, despite the manifest group being
called `backgrounds`; resolve via the manifest's `file` field). Branding lockups + OG card in
`assets/branding/`. Web item icons via `lib/pixelIcons.tsx` (`resolveItemIcon` /
`pixelItemIcon`) + `components/PixelIcon.tsx`.

---

## PWA / mobile

- `apps/web/public/manifest.json` — icons 192/512 + maskable; bg `#1A0F0A`, theme `#FF8F00`
- Icons + favicon generated from `assets/branding/logo.png` by `scripts/generate-icons.mjs`
- iOS launch: 24 `apple-touch-startup-image` splash screens in `layout.tsx`
- `apps/web/public/sw.js` — cached `molemisi-v1`, network-first, skips `/api/`
- Registered in `apps/web/src/app/layout.tsx`. Not `next-pwa`. No push. No Capacitor.

---

## Testing and CI

**Unit / package tests — 37 Jest suites, 615 tests, all green:**

`apps/api` (28 suites / 417 tests): `anti-cheat`, `auth`, `bushveld`, `chapters`,
`contracts`, `crafting`, `crops`, `economy`, `engine`, `health`, `inventory`, `kgotla`, `year-charge`,
`launch` (readiness gate), `livestock`, `market`, `monetisation` + `store`, `payments`,
`progression`, `simulation`, `wallet` (controller + service), `water`, `world-events`.

`packages/game-config` (8 suites / 163 tests): `chargeYear`, `crops`, `economy`, `itemRelations`,
`livestock`, `rng`, `store`, `weather`. `packages/validation` (1 suite / 35 tests).

`apps/api/test/core-loop.integration.spec.ts` is **not** picked up by Jest (`rootDir: src`). No
`*.e2e-spec.ts`.

**Economy gate:** `python scripts/balance_verify.py` — dead-zone 0, dominance 1 (target ≤ 3),
value spread 3.32×, thirst 7.5×, crafting closes, Bushveld §8 (ruled: live telemetry).

**Live scripts** (need a running API): `scripts/test-game-loop.mjs`,
`scripts/test-full-suite.mjs`. **CI** (`.github/workflows/ci.yml`): lint / typecheck / test /
build on push+PR. No Supabase service, no deploy.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/sync-assets.mjs` | Copy assets + generate typed manifest (excludes `assets/_archive/`) |
| `scripts/generate-pixellab-assets.mjs` | PixelLab batch generator |
| `scripts/normalize-ground-tiles.mjs` | Rename ground autotiles to `0.png` / `15.png` endpoints |
| `scripts/generate-icons.mjs` | Favicons, PWA icons, iOS splash (from logo) |
| `scripts/generate-media-assets.mjs` | Wordmark lockups, OG card |
| `scripts/build-font.mjs` / `generate-font.mjs` | Molemisi Pixel font |
| `scripts/kill-dev.mjs` | Kill 3000/3001 (`pnpm dev:kill`) |
| `scripts/create-admin.mjs` | Create/promote admin user |
| `scripts/create-dev.mjs` | Create/promote dev user |
| `scripts/create-player.mjs` | Create a plain player-tier test user |
| `scripts/test-game-loop.mjs` | Live farming smoke test |
| `scripts/test-full-suite.mjs` | Live multi-system API test |
| `scripts/balance_verify.py` | Economy gate (spec-is-truth; fix spec, never script) |

---

## Feature inventory vs gaps

| Area | Status |
| --- | --- |
| Register / login / logout / me | Done (Supabase Auth) |
| Role tiers (player/admin/dev) | Done (migration `000021`); dev is top tier, admitted to `/admin` and `/dev` |
| Wallet + ledger (Botswana-day caps) | Done (API) |
| **Madi balance** | Done — `madi_balance` + `wallet_apply()` third currency, spend-only |
| Farming loop + water (Jojo tank) | Done |
| Buildings / livestock | Done |
| Inventory + storage tiers | Done |
| Crafting (timers, batching, substitution) | Done |
| Market (5% tax, price band, quote) | Done; chapter events auto-seeded; prices reconciled to catalogue |
| Kgotla (Botho, Letsema, NPCs) | Done; `acceptCharge` progress bug fixed |
| Bushveld (Kagiso, journal, sparkle) | Done |
| Chapters + almanac | Done |
| Seasons / weather / events | Done on server |
| Deterministic simulation engine | Done — pure, seeded, replayable (`simulation/engine/`) |
| State validation + recovery | Done — pure detection + named corrective actions |
| Anti-cheat | Done — passive + active rules, `anti_cheat_flags`, admin read routes |
| Economy metrics API | Done — 8 admin read endpoints |
| Admin + dev dashboards/guards | Done (dev guarded; admin flag; `PUT /config` admin-gated) |
| Rate limit | In-memory 60/min |
| PWA install | Manifest + SW + full icon set + iOS splash |
| Payments | **Stub provider only**; boosts **cut** from the catalogue; top-ups grant **Madi** |
| Botho automation unlocks (300/500) | **Config only** — no persistence layer yet (`docs/34` §1.2) |
| Chapter Token spend route | **Missing** — `spendTokens()` exists, no controller route (`docs/34` §3.4) |
| Store purchase UI | **Not wired** — `StoreScreen` is a component reference, no live flow |
| **Wildlife raids** | **Deferred from v1 (ruling 2026-09-11)** |
| **Boost effects** | **Cut from the catalogue (`docs/34` §3.3)** |
| Sound / music | None |
| Push notifications | None |
| Redis | None (ADR-012 deferred) |
| Next `/api` proxy | None (documented deviation) |
| Phone-number withdrawal / P2P | v1.1 only (closed-loop in v1) |

> **Decided direction (2026-10-01, `docs/33` — simple economy):** the store sells **only**
> decorations (Market shelf in Pula, Festival shelf in Madi) and the Village Pass (M50/mo).
> Top-up packs grant **Madi, never Pula**. Boosts are **cut** (not just withdrawn) until every
> effect works. Implementation sequence: **`docs/34`** — **Waves 1–3 landed**, Wave 4 partial.

---

## Current objective

The MVP is runtime-functional with the decided economy's first three Waves landed. Remaining
work, in order: **push the 9 pending migrations** (`20260914000022` → `20261001000003`) — this is
now the largest single delta; finish **Wave 4** (store purchase UI, Botho automation
persistence, Chapter Token spend route); wire **real-money payments** (a PSP behind the existing
`PaymentProvider` interface, which needs no economy change); and complete the **P10 manual
checks** (PWA install on iOS, throttled-3G smoke, end-to-end walkthrough). Wildlife raids stay
deferred. Track gaps in `KNOWN_LIMITATIONS.md`.

## Recommended next tasks

1. Push the 9 pending migrations + seed — the only remaining schema delta.
2. Wire the store purchase flow end-to-end against the stub provider (`docs/34` §4.3).
3. Add a persistence layer for Botho automation unlocks, or remove the ladder from the config
   so it stops advertising a reward nothing grants (`docs/34` §1.2).
4. Expose `POST /chapters/tokens/spend`, or hide the Chapter Token balance in the UI.
5. Wire Next.js rewrites for `/api` → `:3001` (single-port / CORS-free preview).
6. Add the `anti-cheat` review surface to `/admin` and the economy metrics to `/admin/economy`.
7. ~~Restrict `PUT /config` to `AdminGuard`~~ — **DONE** (both PUT routes).
8. ~~Reconcile the footer nav~~ — **DONE** (hybrid 4-primary + More).
9. Remove the dead `db:seed` script from the root and `apps/api` `package.json`, or restore
   `src/database/seed.ts`.

---

## Audit reconciliation (superseded 2026-10-02)

Two audits — `30_Gameplay_Visual_Narrative_Review.md` and
`31_Inventory_Crafting_Progression_Systems_Audit.md` — were reconciled into a living sprint
roadmap: **`docs/32_Sprint_Roadmap_Audit_Reconciliation.md`**. Authority: `docs/MVP/` wins on
conflict; doc 30 §6 four-pass plan is the implementation pathway. That document records the
2026-09-28 position; the entries below are its **current** as-built state.

**P0/P1 status (2026-10-02):**
- **Livestock soft-lock (doc30 P0-1 / G-2) — RESOLVED.** Three fixes, all landed:
  `feedAnimal` now debits `{feedType, feedPerDay}` atomically via `InventoryService`; a **12 h
  starvation window** means health only decays after 12 *consecutive* hours at `hunger == 0`
  (persisted `hunger_zero_since`, migration `20260928000001`); and self-sustaining mode is
  computed from **uncapped** away-time so `SELF_SUSTAINING_THRESHOLD_HOURS` is no longer a dead
  constant. Animals also decay on a **72 h** window, not 24 h. Per-kraal feeding (one tap feeds
  every feedable animal, summing rations atomically) landed with the per-animal fallback kept.
- **Free feeding (doc30 P0-2 / G-3; doc31 P0#2) — RESOLVED.** The feed map was the bug, not the
  items: goat/cow were mapped to `herbs` (P25) and made three of four animals net-negative. All
  four are on `sorghum` now, and `livestock.spec.ts` asserts every animal is **net-positive per
  day** with exact margins, that no animal eats herbs, and the payback window.
- **Market-buy arbitrage (doc31 P0#1) — RESOLVED** by the in-season seed stocking gate.
- **Contracts (doc31 P0#3) — DONE**: `contracts.service.ts` caps each payout to Co-op value
  (`contractRewardCap`) and enforces a `repeatCooldownHours`. Remaining: Botho/token rewards +
  surfacing `category` in UI (P1-D).
- **Kgotla charges (doc29) — RESOLVED.** `acceptCharge` was reporting the player's **regard** as
  objective progress; fixed. Every charge maps to a real, obtainable catalogue item.
- **Market prices (doc27–28) — RESOLVED.** Migration `20260924000000` reconciles
  `market_prices` to the catalogue (fixes 13 unsellable items, 23 stale prices, 14 orphans) and
  blocks selling seeds. Chapter market events are now self-seeding.
- **Visual P0-3 (doc30) — PARTIALLY closed.** Sprite *reachability* improved (kraal, morula,
  crafted and Deep Bushveld content now wired), and withdrawn art moved to `assets/_archive/`.
  Buildings still render as item icons rather than the four states `docs/05 §5` requires, and the
  palette/quantise pass is outstanding. Pass 2 is not finished.

**Security safeguards:**
- `PUT /config` carries `AdminGuard` on both PUT routes (SEC-06 closed).
- Anti-cheat shipped: pure passive + active rules, `anti_cheat_flags` with a unique-open index to
  stop flag flooding, and RLS with **no** player read policy (players cannot read their own
  flags). Flags are review signals — nothing is auto-actioned.
- State validation shipped: negative balances, orphan crops and stale/future timestamps are
  detected and mapped to named recovery actions.
- `/payments/create` "FAIL" was a safeguard **false-positive** (`forbidNonWhitelisted` strips
  junk); the accurate gate is `ECO-09` + `ECO-10`. Rate-limiter `SEC-04` **PASSES**.
- **Live-sim hazard:** do NOT run the simulator against the live Supabase project (it creates real
  accounts). Validate via unit/integration tests + `balance_verify.py` and a throwaway local DB only.
