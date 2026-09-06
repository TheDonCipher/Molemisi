# Architecture Overview

As-built. Design intent that differs is called out. Last updated 2026-09-06.

## System

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT                                                          │
│                                                                 │
│  Next.js :3000 (player path)          Vite Phaser :3002         │
│  • / auth, landing, PWA               • Boot / Preload / Farm   │
│  • /game React screens                • Demo mode if no token   │
│  • /admin dashboard                   • Other scenes unregistered│
│           │                                      │              │
│           └──────────────┬───────────────────────┘              │
│                          │ HTTP REST, Bearer JWT                │
│                          │ (no reverse proxy)                   │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│ NestJS :3001 /api/v1     │                                      │
│ Auth, Farms, Crops, Inventory, Buildings, Livestock, Market,    │
│ Contracts, Progression, Kgotla, Bushveld, WorldEvents,          │
│ Payments, Notifications, Config, Admin, Simulation (no HTTP)    │
└──────────────────────────┼──────────────────────────────────────┘
                           │ service-role Supabase client
┌──────────────────────────┼──────────────────────────────────────┐
│ Supabase                                                        │
│ PostgreSQL + Auth JWT. RLS on player tables.                    │
└─────────────────────────────────────────────────────────────────┘
```

Intended (ADRs 001–002): Next.js shell embeds Phaser. **Current:** React owns the playable UI; Phaser is a parallel prototype.

## Trust boundaries

| Layer | Trust | Notes |
| --- | --- | --- |
| Browser | Untrusted | Sends commands only. Must not write DB. |
| NestJS | Trusted | Game rules, economy, simulation |
| PostgreSQL | Trusted | Constraints + RLS; API uses service role |

## Data flow

```
Tap/click in React (or Phaser FarmScene)
  -> fetch POST/GET /api/v1/...
  -> AuthGuard (Supabase getUser)
  -> ownership checks
  -> service + optional RPC/transaction
  -> JSON
  -> UI update
```

Elapsed-time simulation runs at the start of `GET /farms/current`.

## Module map (NestJS)

| Module | HTTP | Notes |
| --- | --- | --- |
| Health | yes | public |
| Auth | yes | Supabase Auth; logout no-op |
| Profile | yes | |
| Farms | yes | triggers simulation |
| Crops | yes | plant/water/harvest |
| Inventory | yes | |
| Buildings | yes | |
| Livestock | yes | |
| Market | yes | |
| Contracts | yes | catalog hardcoded |
| Progression | yes | |
| Kgotla | yes | NPCs hardcoded |
| Bushveld | yes | zones hardcoded |
| WorldEvents | yes | events hardcoded |
| Payments | yes | stub provider |
| Notifications | yes | |
| Config | yes | not AdminGuard |
| Admin | yes | AdminGuard |
| Simulation | no | used by Farms |
| Analytics | no | no controller |
| Database | no | global Supabase |

## Content

Data-driven in `packages/game-config`: crops, buildings, livestock, weather, store, theme, XP constants.

Still in API source: contracts, NPCs, kgotla projects, bushveld zones, world events.

Runtime overrides: `game_config` table + `/config` API.

## Auth

1. `POST /auth/register` or `/auth/login` -> Supabase session access token
2. Client stores JWT in localStorage
3. `Authorization: Bearer`
4. `profiles.is_admin` for admin routes; `profiles.is_banned` blocks non-admin

No Nest JWT module. No refresh endpoint.

## Payments

Interface `PAYMENT_PROVIDER` bound to `StubPaymentProvider`. Store SKUs in `packages/game-config/src/store.ts` (13). Real providers not wired.

## Frontends

**Web (`apps/web`)**

- App Router, Tailwind
- Game state: `src/lib/gameState.tsx`
- Screens under `src/components/screens/`
- PWA: `public/manifest.json`, `public/sw.js`

**Game (`apps/game`)**

- Vite 3002, Phaser 3, 800x600 FIT
- `ApiClient` retries 408/429/5xx
- Assets from generated manifest

## Infra (local)

| Piece | Used? |
| --- | --- |
| pnpm workspaces + Turborepo | yes |
| Supabase local (Docker) | yes |
| Redis | no |
| GitHub Actions CI | lint/typecheck/test/build |
| Deploy / staging | not implemented |

## Related ADRs

`docs/adr/ADR-001` … `ADR-012`. Treat ADRs as decisions; treat this file as implementation.
