# Architecture Overview

As-built. Design intent that differs is called out. **Last updated 2026-10-02.**

## System

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT                                                                │
│                                                                       │
│  Next.js :3000                        React /game (the only client)   │
│  • / auth, landing, PWA               • ten screens via lib/gameState  │
│  • /game React screens (10)            • 4 primary (Farm/Kgotla/        │
│  • /admin dashboard + /admin/economy     Bushveld/Market) + More menu │
│  • /dev tooling (DevGuard)            • hydrates from GET /farms/current│
│           │                                          │                 │
│           └──────────────┬───────────────────────────┘                 │
│                          │ HTTP REST, Bearer Supabase JWT                │
│                          │ (no reverse proxy; CORS via CORS_ORIGIN)     │
└──────────────────────────┼────────────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────────────┐
│ NestJS :3001 /api/v1     │                                            │
│ Auth, Farms, Crops, Water, Inventory, Buildings, Livestock, Market,    │
│ Contracts, Crafting, Letsema, Progression, Kgotla, Bushveld, Chapters, │
│ WorldEvents, Wallet, Payments, Monetisation(Store), Notifications,     │
│ Config, Admin, Economy, AntiCheat, Dev, Simulation (no HTTP)          │
└──────────────────────────┼────────────────────────────────────────────┘
                           │ service-role Supabase client
┌──────────────────────────┼────────────────────────────────────────────┐
│ Supabase                                                          │
│ PostgreSQL + Auth (Supabase Auth JWT). RLS on player tables.            │
└────────────────────────────────────────────────────────────────────────┘
```

Intended (ADRs 001–002): Next.js shell embeds Phaser. **Current:** React owns the
playable UI; the parallel Phaser prototype `apps/game` was **deleted on 2026-09-11**, so React
`/game` is the only client. See `DEVELOPMENT_STATE.md`.

## Trust boundaries

| Layer | Trust | Notes |
| --- | --- | --- |
| Browser | Untrusted | Sends commands only. Never writes DB. JWT in localStorage. |
| NestJS | Trusted | Game rules, economy, simulation |
| PostgreSQL | Trusted | Constraints + RLS; API uses service role |

## Data flow

```
Tap/click in React (/game screens)
  -> fetch POST/GET /api/v1/...
  -> AuthGuard (Supabase getUser) + ownership checks
  -> service (WalletService is the only writer of Pula/Botho/Madi)
  -> JSON -> UI update
```

Elapsed-time simulation runs at the start of `GET /farms/current`. Kagiso, crafting jobs,
chapter rollover are computed on read and persisted on write — **no cron, no drift**.

**Two simulation layers.** The live path (`SimulationService`) owns Supabase and the real clock.
The engine (`simulation/engine/`) is pure — instant from `input.now`, randomness from
`input.seed`, no I/O — so a captured input replays identically. See `docs/09 §2`.

## Module map (NestJS)

| Module | HTTP | Notes |
| --- | --- | --- |
| Health | yes | public |
| Auth | yes | Supabase Auth; role read from `profiles`, **not** a JWT claim |
| Profile | yes | |
| Farms | yes | triggers simulation |
| Crops | yes | plant / harvest (no inline water) |
| Water | yes | Jojo tank refill + status; gates the crop growth timer |
| Inventory | yes | |
| Buildings | yes | + storage upgrade on separate controller |
| Livestock | yes | feed debits rations; per-kraal and per-animal actions |
| Market | yes | `/market/quote`; chapter events self-seed; prices reconciled |
| Contracts | yes | catalog hardcoded; payouts capped to Co-op value |
| Crafting | yes | jobs, batching, substitution |
| Letsema | yes | Kgotla contribution endpoint |
| Progression | yes | Elder tip + scene access |
| Kgotla | yes | NPCs + projects hardcoded; charge progress bug fixed |
| Bushveld | yes | Kagiso-driven scenes/hotspots |
| Chapters | yes | rollover + claim. ⚠️ **no token-spend route** |
| WorldEvents | yes | events hardcoded |
| Wallet | yes | ledger endpoint; **Pula / Botho / Madi** |
| Payments | yes | stub provider; ⚠️ webhook behind class-level `AuthGuard` |
| Store (monetisation) | yes | two cosmetic shelves (Pula / Madi); **boosts cut** |
| Notifications | yes | |
| Config | yes | `AuthGuard`; **both PUT routes now also `AdminGuard`** |
| Admin | yes | AdminGuard |
| **Economy** | yes | **new** — 8 read-only admin metrics endpoints |
| **AntiCheat** | yes | **new** — flag list + passive/active detection passes |
| Dev | yes | DevGuard |
| Simulation | no | used by Farms; plus the pure `engine/` sub-tree |
| Analytics | no | no controller; table ingest only |
| Launch | no | Jest readiness gate, not an endpoint |
| Database | no | global Supabase |

## Content

Data-driven in `packages/game-config`: crops, buildings, livestock, weather, **crafting,
chapters, almanac, bushveld**, store, theme, economy constants (`GAME_VERSION =
'1.0.0-mvp'`).

Still hardcoded in API source: contracts, NPCs, Kgotla projects, Bushveld scenes, world
events.

Runtime overrides: `game_config` table + `/config` API (admin-gated for writes). The
TypeScript constants remain the source of truth; a `game_config` row is an override that the
test suites will contradict.

## Auth

1. `POST /auth/register` or `/auth/login` → Supabase session access token
2. Client stores JWT in localStorage (`molemisi_token` + `token`)
3. `Authorization: Bearer`
4. `profiles.role` (`player|admin|dev`, migration `20260911000021`) drives `AdminGuard`
   / `DevGuard`; `profiles.is_admin` is the legacy boolean, still honoured. `AuthGuard` blocks
   banned players except on `/admin/` URLs.

| Tier | `/admin` | `/dev` | Player routes |
| --- | --- | --- | --- |
| `player` | 403 | 403 | ✅ |
| `admin` | ✅ | ✅ | ✅ |
| `dev` | ✅ (top tier) | ✅ | ✅ |

`AdminGuard` admits `is_admin` OR `role='admin'` OR `role='dev'`; `DevGuard` admits
`role='dev'` OR `role='admin'` OR `is_admin`. No Nest JWT module. No refresh endpoint. **No
nested JWT role claim** — the token carries identity, the tier comes from the database.

## Payments

Interface `PAYMENT_PROVIDER` (DI token) bound to `StubPaymentProvider`, injected as
`@Inject('PAYMENT_PROVIDER')`. Store SKUs in `packages/game-config/src/store.ts`: top-up packs
(grant **Madi**, never Pula), the **Village Pass** (M50/mo), and cosmetics on two shelves
(Market = Pula, Festival = Madi). **`BOOSTS` is an empty list** — the three boost SKUs were cut
in `docs/34` §3.3, not merely hidden. Real providers are not wired; the interface is, so adding
one needs no economy change.

## Anti-cheat

Pure detection rules in `anti-cheat/rules.ts`, in two families: **passive** (the account became
corrupt — negative currency/inventory, orphan crops, resources without a source) and **active**
(suspicious sequences — rapid gains, cost bypass, inventory manipulation, market flip /
out-of-band price, rule-ordering violations). Flags are written to `anti_cheat_flags` with the
service role; **writing a flag never mutates player state**, and the response (warn / suspend /
ignore) is a human decision. See `docs/18 §7`.

## Frontends

**Web (`apps/web`)** — App Router, Tailwind, `lib/gameState.tsx`, screens under
`src/components/screens/`, PWA `public/manifest.json` + `public/sw.js`.

**Game (`apps/game`)** — *removed 2026-09-11.* This was a Vite 3002 / Phaser 3 standalone
prototype; the shippable client is React `/game` in `apps/web`.

## Infra (local)

| Piece | Used? |
| --- | --- |
| pnpm workspaces + Turborepo | yes |
| Supabase local (Docker) | yes (and the *linked* remote project is the real target) |
| Redis | no |
| GitHub Actions CI | lint / typecheck / test / build |
| Deploy / staging | not implemented |

## Related ADRs

`docs/adr/ADR-001` … `ADR-012`. Treat ADRs as decisions; treat this file as implementation.
