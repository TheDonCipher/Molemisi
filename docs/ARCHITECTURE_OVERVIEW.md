# Architecture Overview

As-built. Design intent that differs is called out. **Last updated 2026-09-14.**

## System

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT                                                                │
│                                                                       │
│  Next.js :3000 (player path)            Vite Phaser :3002 (legacy)     │
│  • / auth, landing, PWA                 • Boot / Preload / FarmScene    │
│  • /game React screens (10)             • Demo mode if no token          │
│  • /admin dashboard                     • Other scenes unregistered      │
│  • /dev tooling (DevGuard)              • Not part of the shippable path │
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
│ WorldEvents, Wallet, Payments, Store, Notifications, Config, Admin,     │
│ Dev, Simulation (no HTTP)                                             │
└──────────────────────────┼────────────────────────────────────────────┘
                           │ service-role Supabase client
┌──────────────────────────┼────────────────────────────────────────────┐
│ Supabase                                                          │
│ PostgreSQL + Auth (Supabase Auth JWT). RLS on player tables.            │
└────────────────────────────────────────────────────────────────────────┘
```

Intended (ADRs 001–002): Next.js shell embeds Phaser. **Current:** React owns the
playable UI; Phaser is a parallel prototype still on port 3002. See `DEVELOPMENT_STATE.md`
Headline status — `apps/game` is a deletion candidate.

## Trust boundaries

| Layer | Trust | Notes |
| --- | --- | --- |
| Browser | Untrusted | Sends commands only. Never writes DB. JWT in localStorage. |
| NestJS | Trusted | Game rules, economy, simulation |
| PostgreSQL | Trusted | Constraints + RLS; API uses service role |

## Data flow

```
Tap/click in React (or Phaser FarmScene)
  -> fetch POST/GET /api/v1/...
  -> AuthGuard (Supabase getUser) + ownership checks
  -> service (WalletService is the only writer of Pula)
  -> JSON -> UI update
```

Elapsed-time simulation runs at the start of `GET /farms/current`. Kagiso, crafting jobs,
chapter rollover are computed on read and persisted on write — **no cron, no dr/ drift**.

## Module map (NestJS)

| Module | HTTP | Notes |
| --- | --- | --- |
| Health | yes | public |
| Auth | yes | Supabase Auth; `/auth/logout` now drops the token client-side |
| Profile | yes | |
| Farms | yes | triggers simulation |
| Crops | yes | plant / harvest (no inline water) |
| Water | yes | Jojo tank refill + status |
| Inventory | yes | |
| Buildings | yes | + storage upgrade on separate controller |
| Livestock | yes | |
| Market | yes | **`/market/quote`** added (authoritative price/tax/gross/net) |
| Contracts | yes | catalog hardcoded |
| Crafting | yes | jobs, batching, substitution |
| Letsema | yes | Kgotla contribution endpoint |
| Progression | yes | Elder tip + scene access |
| Kgotla | yes | NPCs + projects hardcoded |
| Bushveld | yes | Kagiso-driven scenes/hotspots |
| Chapters | yes | rollover + claim |
| WorldEvents | yes | events hardcoded |
| Wallet | yes | ledger endpoint |
| Payments | yes | stub provider; webhook stays AuthGuard |
| Store (monetisation) | yes | Pula goods; **boosts withdrawn** |
| Notifications | yes | |
| Config | yes | **AuthGuard only — NOT admin-gated** |
| Admin | yes | AdminGuard |
| Dev | yes | DevGuard |
| Simulation | no | used by Farms |
| Analytics | no | no controller; table ingest only |
| Launch | no | Jest readiness gate, not an endpoint |
| Database | no | global Supabase |

## Content

Data-driven in `packages/game-config`: crops, buildings, livestock, weather, **crafting,
chapters, almanac, bushveld**, store, theme, economy constants (`GAME_VERSION =
'1.0.0-mvp'`).

Still hardcoded in API source: contracts, NPCs, Kgotla projects, Bushveld scenes, world
events.

Runtime overrides: `game_config` table + `/config` API.

## Auth

1. `POST /auth/register` or `/auth/login` → Supabase session access token
2. Client stores JWT in localStorage (`molemisi_token` + `token`)
3. `Authorization: Bearer`
4. `profiles.role` (`player|admin|dev`, migration `000021` **unpushed**) drives `AdminGuard`
   / `DevGuard`; `profiles.is_admin` is the legacy boolean. `AuthGuard` blocks banned
   players except on `/admin/` URLs.

No Nest JWT module. No refresh endpoint. No nested JWT role claim.

## Payments

Interface `PAYMENT_PROVIDER` bound to `StubPaymentProvider`. Store SKUs in
`packages/game-config/src/store.ts` (top-up packs, Guild subscription, cosmetics; **the
three boosts are `available: false`**). Real providers not wired.

## Frontends

**Web (`apps/web`)** — App Router, Tailwind, `lib/gameState.tsx`, screens under
`src/components/screens/`, PWA `public/manifest.json` + `public/sw.js`.

**Game (`apps/game`)** — Vite 3002, Phaser 3, standalone. Assets from generated manifest.
Not in the shippable path.

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
