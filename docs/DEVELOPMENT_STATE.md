# Molemisi Development State

> Last updated: **2026-10-04**
> Scope: as-built inventory of the repository. Design intent lives in `docs/MVP/` (the
> post-pivot normative set) and `docs/01`–`docs/23` (the original design suite). This
> file describes what the code and database actually do today.

---

## Headline status

**MVP is code-complete and the four gates are green.** The database is at **49 migration files — all committed, pushed, and applied live** to the linked project `nyapfgawanqvnkkjudxb`. (Corrected 2026-10-04: commit `bf235be`, *"all 10 pending migrations apply on live"*, landed the M-series hardening, the atomic helpers, and `spend_chapter_tokens`. Verified: `git ls-files supabase/migrations` = 49, `git status` shows **no** untracked migrations. The prior "49 files / 8–10 untracked and unapplied" state was true before that commit and is now stale. The DB password is no longer an outstanding blocker for this batch — it is applied.) Four capability areas have landed since the
2026-09-16 state note, plus the first three Waves of the decided economy:

1. **RESOLVED — the whole committed migration set is pushed live.** The linked Supabase project
   `nyapfgawanqvnkkjudxb` is current through `20261003000020_spend_chapter_tokens` (**49 committed
   migrations, 0 pending**); `/admin`, `/dev` and P2–P9 all run at runtime. The M-series security
   hardening (`20261002000001` → `20261003000005`: `profiles_role_guard`, `inventory_take`, atomic
   `botho_cap`/`kgotla_charge`, `m2`–`m8`) and `spend_chapter_tokens` were **pushed live on
   2026-10-03** (commit `bf235be`). *(Corrected 2026-10-04 — this entry previously said the 8–10
   newest migrations were untracked and unapplied; that state is stale.)* The
   `madi_balance` (`20261001000003`) and Year-layer `kgotla_charges` tables are both live.
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
   **CORRECTED 2026-10-03 — the 2026-09-11 ruling was signed against a stale model.**
   `SCENE_COUNT` was 3 while Deep Bushveld makes **4** scenes, so both the documented
   ceiling (P153.90/day) and the inversion range were wrong. With all four scenes
   modelled, Bushveld base net is **P245.10/day (+P91.20, ×1.59)** and the inversion
   now spans the **full 4–20 plot range** — previously it stopped at 12 plots, and a
   20-plot player who roughly broke even on the fields now does not. The Deep Bushveld
   scene is Botho-300-gated, so P245.10 is the **post-ladder** figure; the sub-300
   number remains the launch figure. The telemetry ruling stands, but it was made
   against numbers that did not exist.
8. **RULING — wildlife raids and boost effects are deferred from v1** (2026-09-11). Since
   `docs/34` §3.3 the three boost SKUs are **removed from the catalogue entirely**, not merely
   flagged `available: false`. **Enforced in code 2026-10-03:** the raid-advertising `benefit`
   copy on `kraal` ("Protects livestock from overnight raids.") and `farm_boundary` ("Protects
   crops from overnight wildlife raids.") has been removed, `RAID_SYSTEM_IMPLEMENTED` is
   asserted `false`, and `store.spec.ts` proves no building benefit or store SKU may advertise
   a raid / wildlife threat / overnight attacker. Advertising a threat with no mechanic behind
   it is a consumer-protection problem, not a content gap. Every `docs/` reference to raids is
   marked **DEFERRED FROM v1** — none were deleted, since the historical spec is the record of
   what was ruled on.

Quality gates (re-run 2026-10-03 after the security/economy remediation, clean):

| Gate | Result |
| --- | --- |
| `tsc --noEmit -p apps/api` | **0** |
| `tsc --noEmit -p apps/web` | **0** |
| `jest` (apps/api) | **470 passed / 30 suites** |
| `jest` (packages/game-config) | **211 passed / 9 suites** |
| `jest` (packages/validation) | **35 passed / 1 suite** |
| `python scripts/balance_verify.py` | **PASS** (4-scene model) |

> The 2026-10-02 figures were 417/28, 163/8, 35/1. The deltas are the new
> remediation tests: cross-tenant IDOR (A2), deterministic harvest + bank-before-clear
> (A3), the atomic Botho cap contract (H1), `state-validation` wiring into anti-cheat
> (A8), catalogue-item assertions on Year Charges, and four wildlife-raid deferral
> invariants.

**Verified against the LIVE database** (`nyapfgawanqvnkkjudxb`, service-role
reads + constraint probes via `scripts/live-db-audit.mjs`). Postgres is **17.6.1**.
Three defects were confirmed *in production*, not merely in the repo:

1. `ledger_entries.currency` **rejects `'chapter_token'`** (SQLSTATE 23514), so the
   season-stamp sink destroyed stamps and granted nothing.
2. `game_ledger_entries` has **no** `user_id`/`player_id`/`amount_change`/`quantity`
   columns, so six app call sites failed on every write.
3. 27 historical `topup` payments credited **Pula** (P395 total), violating the
   `docs/34` §2.2 spend-only Madi contract. Historical rows are **not** rewritten;
   a reconciliation note is raised instead, for an explicit operator ruling.

The live DB is otherwise healthy: 0 negative balances, 0 negative inventory, 0 orphan
crops, 0 anti-cheat flags.

> ✅ **DDL is applied (corrected 2026-10-04).** The earlier warning that "DDL was never applied" is stale: commit `bf235be` pushed the M-series batch and the commit message records "all 10 migrations are applied live." `inventory_take`, `botho_credit_capped`, `spend_chapter_tokens` and the M-series hardening **exist on the live server**. If a future batch is authored, apply it with `supabase db push` (prompts for the DB password) and verify with `supabase migration list --linked`.

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
M16 Alpha                          [UNBLOCKED — remaining: finish Wave 4 store UI + automation persistence, real PSP, P10 manual checks. Schema is fully pushed (49, all live).]
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

**49 migration files.** All are committed and **pushed live** to the linked project `nyapfgawanqvnkkjudxb` (verified 2026-10-04). This includes the M-series security hardening (`20261002000001` → `20261003000005`: `profiles_role_guard`, `inventory_take`, atomic `botho_cap`/`kgotla_charge`, `m2`–`m8`) and `20261003000020_spend_chapter_tokens`. The atomic helpers, the widened `ledger_entries.currency` CHECK, the EXECUTE revokes and the RLS closures all exist on live.

> **Corrected 2026-10-04.** This section previously claimed the 8–10 newest migrations were "untracked and unapplied". Commit **`bf235be`** (2026-10-03, *"correct m8/m20 SQL so all 10 pending migrations apply on live"*) landed them and the commit message records "both now show Remote timestamps; all 10 migrations are applied live." Re-verify any time with `supabase migration list --linked` — a blank **Remote** column is the only reliable "not applied" signal.

> `20261002000001_profiles_role_guard.sql` and `20261002000002_inventory_take.sql` were
> originally authored by two agents in parallel, which produced duplicate filename
> prefixes (`*_harden_profile_privilege_columns`, `*_atomic_inventory_take`). Supabase
> orders and de-duplicates migrations by filename, so two files sharing a 14-digit
> prefix break `db push` ordering. The two supersets were merged **into the tracked
> filenames** on 2026-10-03; all 49 prefixes are now unique.

> ⚠️ **Applying these requires the database password**, which is not in `.env` and
> not available in this environment. Until `supabase db push` is run, the live server
> is missing `inventory_take`, `botho_credit_capped`, `spend_chapter_tokens`, the
> widened `ledger_entries.currency` CHECK, the EXECUTE revokes, and the RLS
> closures — i.e. **every fix in this batch is code-complete but not yet deployed.**

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
prices and config rows. **`pnpm db:seed` now works** — `apps/api/src/database/seed.ts` was
restored (2026-10-04). It materialises the config canon from `packages/game-config` into
`item_definitions`, `market_prices`, `game_config`, `achievements` and `chapters`, is idempotent
(an upsert on each table's natural key; `chapters` uses DO NOTHING so the rollover window is
never dragged backwards), and supports `--dry-run`. The root script builds `@molemisi/game-config`
first so the seed always reads current numbers. Direct use: registration + `supabase:reset`.

---

## Net-new MVP scope — landed 2026-10-04

Four feature modules plus their tables, config and tests, built against the 2026-10-04 rulings
(`docs/MVP/19` §0.0). Gates re-run after the change: `tsc` 0/0 (api + web) · api Jest **34 suites /
498 tests** · game-config Jest **11 suites / 229 tests** · `balance_verify.py` **PASS** ·
`pnpm db:seed --dry-run` exit 0.

| Module | API | Tables | Config |
|---|---|---|---|
| **Achievements + honour ladder** | `apps/api/src/achievements/` — `GET /achievements`, `GET /achievements/title`, `POST /achievements/evaluate` | `achievements`, `player_achievements` (PK = idempotency guard) | `game-config/src/achievements.ts` |
| **3-layer avatar** | `apps/api/src/avatar/` — `GET /avatar`, `POST /avatar` (create, once), `PUT /avatar/outfit` | `player_avatar` | `game-config/src/avatar.ts` |
| **Events live service** | `apps/api/src/events/` — `GET /events`, `POST /events/:id/claim` | `events`, `event_grants` (UNIQUE(player_id,event_id)) | `game-config/src/events.ts` |
| **Global Kgotla chat** | `apps/api/src/chat/` — `GET /chat`, `POST /chat/messages` | `kgotla_messages` | `game-config/src/chat.ts` |

**Client:** `apps/web/src/lib/{chat,achievements,events,avatar}.ts`, `components/AvatarSprite.tsx`
(3-layer renderer, hat drawn last and always), and `components/KgotlaCommunityPanel.tsx` — a tabbed
panel in the Kgotla (**Talk · Events · Honours**) rendered above the council hall. `StoreScreen`
gained an avatar section (base picker while unchosen, then the wardrobe with a live preview per row).

**Rulings applied in this pass:**
- **No chat moderation.** The profanity filter, mute/block and report queue were removed from the
  config, service, controller and the migration before they shipped. What remains is an **anti-flood**
  guard (interval + rolling window + payload length) — traffic hygiene (`20 §5.4`), not content policy.
- **The twelve Setswana months are correct.** The "9 of 12 month notes missing" blocker is closed; the
  calendar reads `SETSWANA_MONTHS` from `game-config`.

**Migrations:** `20261004000001_achievements` · `20261004000002_player_avatar` ·
`20261004000003_events` · `20261004000004_kgotla_chat`. **53 files total**; the 49 older ones are live,
**all 53 are APPLIED LIVE** as of 2026-10-04 (`supabase migration list` shows a Remote timestamp on each). Each is one balanced `BEGIN;…COMMIT;` per `11 §4.2`.

**Art:** all 33 new PixelLab keys are now declared in `assets/manifest.json` (315 entries total):
6 avatar, 8 farm cosmetics, 4 World Tree stages, 9 breathing idle sheets, 6 calendar-education
assets. The PNGs are not generated yet and every consumer degrades gracefully until they land.

## UI/UX pass — 2026-10-04

Most of the requested surface already existed and was verified rather than rebuilt: the four
footer screens (`FarmScreen`, `KgotlaScreen`, `BushveldScreen`, `MarketScreen`), the header and
`Inventory`/`Settings`, `Store`, `Inventory`/`Crafting`, `Wallet`, `Journal`, and a full CSS
animation set (`farm-coin`, `feed-bob`, `repair-sweep`, `product-pop`, …). The **net-new** work:

| Component | Purpose | Spec |
|---|---|---|
| `components/screens/AlmanacScreen.tsx` | **The calendar education surface (B6).** Teaches the twelve Setswana months (from `SETSWANA_MONTHS`), the four `Sekala sa …` chapters with their Begin/Give/Keep/Leave verbs, the current month + chapter, the days-to-rollover, and the World Tree. Wired into the header nav. Computes **no** calendar logic of its own — it renders what `game-config` says, which is why it is complete with no month-notes copy. | `08` D8, `19` W8.4 |
| `components/BreathingSprite.tsx` | **Ambient breathing loop (B8/W12).** ~3 s cycle, 2–4 px vertical, 2–3 frame sheet. Enforces all four rules: never blocks input (`pointer-events-none`), gated by `useAmbientMotion()`, degrades to the static sprite, and **pauses when the tab is hidden or scrolled out of view**. Wired into `NpcPortrait` (Kgotla) and `AnimalSprite` (Farm). | `08` D1 2nd pass, `22 §11.5` |
| `components/WorldTree.tsx` | **D2 macro goal.** Four stages at the `04 §7.2` thresholds (40 / 70 / 100%) driven by a **community-restoration meter** (Botho 60% + Council Projects 40%) — deliberately distinct from the Bushveld's per-scene meter. | `08` D2, `19` W9.9 |
| `components/RewardFloat.tsx` | **`+{amount} 💰`** after a *confirmed* sale. ~1.2 s, transform-only, self-unmounting — never a waiting loop. | `08` D1, `22 §12.2` |
| `components/Skeleton.tsx` | **Skeleton, never a spinner past 2 s.** Renders nothing for `delayMs`, then shaped blocks; the pulse is itself gated on `useAmbientMotion()`. | `07` UX |
| `lib/useReducedMotion.ts` | Single accessibility gate: OS `prefers-reduced-motion` **AND** the player's Particles setting. JS-driven loops need this because CSS rules do not stop `setInterval`. | `22 §11.5` |
| `globals.css` | `@keyframes reward-float` + `.touch-primary` (56 dp) / `.touch-secondary` (48 dp), the latter auto-applied on coarse pointers. | `07` touch targets |

## Dev tooling (D9 / W10) — landed 2026-10-04

The dev affordances are now **in the game**, not behind a walled `/dev` panel, and every one of
them is gated twice: the client renders `null` for anyone who is not a dev, and the routes sit
behind `AuthGuard + DevGuard`.

| Surface | Affordance | Calls |
|---|---|---|
| **Almanac / calendar** | **Long-press the chapter header** (D9's canonical example), or the gear | `POST /dev/date-jump`, `POST /dev/clock/reset` |
| **Farm** | Gear, floating over the homestead | `POST /dev/inventory/grant` |
| **Kgotla** | Gear beside the council-hall plaque | `POST /dev/kgotla/complete-charge` |
| **any surface** | "Scan game state" in the panel | `GET /dev/state` |

**Two design rules are enforced in code, not left to the client:**

1. **Never the live project** (`09 §7` hazard 2). `ClockService.isLiveProjectUrl()` is a **pure,
   unit-tested** predicate; `DevService.assertThrowaway()` refuses every mutating route when
   `SUPABASE_URL` is a hosted project, unless an operator explicitly sets
   `DEV_TOOLS_ALLOW_LIVE=true`. The UI renders a loud **LIVE PROJECT — tools disabled** banner and
   disables the buttons rather than implying a tool is safe.
2. **Nothing bypasses a sanctioned writer.** Spawn goes through `InventoryService.addItem` (the
   inverse `inventory_take` is paired with, so the slot and stack caps still apply); the date-jump
   moves a `ClockService` offset and calls the existing `ChapterService.rolloverChapters`, which is
   what zeroes Chapter Tokens **exactly once** past a rollover — invariant I13, validated without
   waiting a season. The force-completed Charge pays **capped** Botho, so the dev tool cannot
   become a faucet.

`GET /dev/state` reports the seven corruption classes (`09 §11`) with the named `planRecovery()`
action for each, and is **read-only** — it reports, it never repairs.

## Known deferrals (2026-10-04)

- **Homestead cosmetic sprite swap — DEFERRED to a later version.** The `cosmetics` manifest rows
  (hut / kraal / frame / livestock × Market + Festival) and the store's cosmetic SKUs exist and are
  purchasable, but the farm scene does **not** yet swap the sprite when one is owned. This is a
  rendering task deliberately pushed out of the MVP; nothing in the economy depends on it, and the
  Store still previews the **avatar** outfit layer, which is the cosmetic slot D10 calls mandatory.
- **PixelLab generation and artist credit — DEFERRED.** All 33 manifest keys are declared, but the
  PNGs are **not** generated and **no credit line is being published yet**. Every consumer degrades
  gracefully in the meantime (static sprite → glyph, World Tree → labelled plate, calendar tiles →
  chapter slug, header/month-strip hidden). Generate later with `pnpm assets:generate && pnpm
  assets:sync`; nothing needs refactoring when the art lands.

## Verified

`tsc` 0/0 (api + web) · api Jest **35 suites / 505 tests** · game-config Jest **11 suites / 229
tests** · `balance_verify.py` PASS · **`supabase db push` applied — all 53 migrations live**, the
four new ones (`20261004000001`…`0004`) confirmed with Remote timestamps on
`supabase migration list`.

## Still not built (and not fake-done): the progression sim (W10.4), farm reset via the dev panel
(`POST /admin/players/:id/reset-farm` exists behind `AdminGuard`), and any web-side automated test
harness (`apps/web` has no Jest config, so the new UI has no unit coverage).

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
| Chapter Token spend route | **RESOLVED** — `POST /chapters/tokens/spend` exists (`chapter.controller.ts:56`, backed by `spendTokens()` and a green spec in `chapter.service.spec.ts`); the supporting `spend_chapter_tokens` migration is **committed and pushed live** (2026-10-03, commit `bf235be`) — *(corrected 2026-10-04; previously said untracked)* |
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
work, in order: **commit + push the 10 staged migrations** (`…harden_profile_privilege_columns` →
`…spend_chapter_tokens`) — this is now the largest remaining schema delta; finish **Wave 4** (store
purchase UI, Botho automation persistence; the Chapter Token spend route is now live) — wire
**real-money payments** (a PSP behind the existing
`PaymentProvider` interface, which needs no economy change); and complete the **P10 manual
checks** (PWA install on iOS, throttled-3G smoke, end-to-end walkthrough). Wildlife raids stay
deferred. Track gaps in `KNOWN_LIMITATIONS.md`.

## Recommended next tasks

1. Commit + push the 10 staged migrations (M-series security hardening + Chapter-Token spend) — the only remaining schema delta.
2. Wire the store purchase flow end-to-end against the stub provider (`docs/34` §4.3).
3. Add a persistence layer for Botho automation unlocks, or remove the ladder from the config
   so it stops advertising a reward nothing grants (`docs/34` §1.2).
4. ~~Expose `POST /chapters/tokens/spend`~~ — **DONE** (route exists at `chapter.controller.ts:56`; the supporting `spend_chapter_tokens` migration is committed and pushed live as of 2026-10-03). Only the 25-stamp souvenir SKU validation + UI affordance remain.
5. Wire Next.js rewrites for `/api` → `:3001` (single-port / CORS-free preview).
6. Add the `anti-cheat` review surface to `/admin` and the economy metrics to `/admin/economy`.
7. ~~Restrict `PUT /config` to `AdminGuard`~~ — **DONE** (both PUT routes).
8. ~~Reconcile the footer nav~~ — **DONE** (hybrid 4-primary + More).
9. ~~Remove the dead `db:seed` script, or restore `src/database/seed.ts`~~ — **DONE**
   (2026-10-04: `apps/api/src/database/seed.ts` restored; idempotent, `--dry-run`, builds
   `game-config` first).

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
