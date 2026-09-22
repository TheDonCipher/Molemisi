# Molemisi

A pixel-art farm management simulator inspired by Botswana.

## Overview

Molemisi is a cozy economic management game. Plant crops, raise livestock, construct buildings,
trade at the market, visit the Kgotla, explore the Bushveld, and progress through the Three
Pillars (Pula, Botho, Journal).

**Version:** repo `0.1.0` · game-config `GAME_VERSION = 1.0.0-mvp` · **MVP code-complete, not
yet deployed** (see *Current status*).

**Platforms:** Desktop web, mobile web, PWA

**Tech stack:** Next.js 14, NestJS 10, Supabase PostgreSQL, pnpm + Turborepo. (The standalone
Phaser 3 prototype `apps/game` was deleted on 2026-09-11; the React `/game` client is the only shipped client.)

## Current status

The MVP is **code-complete** and the four gates are green (api tsc 0 · web tsc 0 · **209 Jest
tests** · `balance_verify.py` PASS). The database schema is **current**: the 11-migration gap was
pushed to the linked Supabase project `nyapfgawanqvnkkjudxb` on 2026-09-14, so `/admin`, `/dev`
and P2–P9 all run at runtime. Remaining gaps are real-money payments (stub provider), wildlife
raids, and boost effects — the latter two are deferred from v1 by ruling, with their store entries
withdrawn.

Specs and the marketplace pivot (cash-out to mobile money, P2P Exchange) are captured in
`docs/MVP/`; the original design suite lives in `docs/01`–`docs/23`.

## Player path

The playable client is the **Next.js React shell** at `/game`. It talks to the NestJS API over
REST. (The legacy standalone Phaser prototype `apps/game` was deleted on 2026-09-11; React `/game`
is the only shipped client.)

```
Browser
  -> Next.js :3000  (auth, React game UI, admin, dev, PWA)
  -> NestJS  :3001  (/api/v1, authoritative game logic)

Supabase PostgreSQL (linked remote project is the real target)
```

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (Supabase local)
- Supabase CLI

### Installation

```bash
pnpm install
cp .env.example .env.local
pnpm supabase:start          # local Supabase
pnpm supabase:reset          # apply migrations + seed.sql
pnpm dev                     # predev runs assets:sync
```

Do not set `NODE_ENV` in `.env` or `.env.local`. Next.js and NestJS set it themselves.

Register at http://localhost:3000/auth/register. `pnpm db:seed` is **not** available (the Nest
seed script is missing — use registration + `supabase:reset`).

### Development servers

| Service | URL | Port |
| --- | --- | --- |
| Next.js web | http://localhost:3000 | 3000 |
| NestJS API | http://localhost:3001 | 3001 |
| Supabase Studio | http://localhost:54323 | 54323 |

API base path: `http://localhost:3001/api/v1`. There is no Next.js rewrite/proxy; the browser
calls `:3001` directly (CORS via `CORS_ORIGIN`).

## Monorepo

```
molemisi/
├── apps/
│   ├── web/          # Next.js 14 — player UI, auth, admin, dev, PWA
│   └── api/          # NestJS — authoritative game API
├── packages/
│   ├── shared/       # API helpers and constants
│   ├── game-types/   # Shared TypeScript types
│   ├── game-config/  # Crops, buildings, livestock, crafting, chapters, almanac, bushveld, store, theme
│   └── validation/   # Zod schemas
├── supabase/         # Migrations (29), seed, local config
├── assets/           # Pixel-art source (268 manifest entries, synced into web public/)
├── scripts/          # Asset pipeline, admin/dev bootstrap, live API tests, economy gate
└── docs/             # As-built notes + design specs + MVP normative set
```

## Commands

```bash
pnpm dev                 # Start web and api (runs assets:sync first)
pnpm build               # Build all packages
pnpm test                # Run Jest suites (209 tests across 18)
pnpm lint                # Lint all packages
pnpm typecheck           # Type-check all packages
pnpm format              # Format with Prettier

pnpm supabase:start      # Start local Supabase
pnpm supabase:stop       # Stop local Supabase
pnpm supabase:reset      # Reset DB and apply migrations + seed.sql
pnpm supabase:migration:new <name>   # New migration
pnpm dev:kill            # Free ports 3000/3001

pnpm assets:sync         # Copy assets/ into web public folders
pnpm assets:generate     # Generate assets via PixelLab (needs PIXELLAB_API_KEY)
```

## What works today

- Auth: register, login, logout, `/auth/me` (Supabase Auth JWT; role tiers player/admin/dev)
- Farming: 11 crops, plant / water / harvest, Jojo-tank water, elapsed-time simulation
- Buildings (7), livestock (4), inventory + storage tiers, crafting (timers, batching, substitution)
- Market (5% Co-op tax, 2.0× price band, authoritative quote), contracts, progression, Elder tip
- Kgotla (Botho, Letsema, NPCs) with NPC head-portrait dialog, Bushveld (Kagiso, Field Journal, Daily Sparkle), chapters + almanac
- Seasons / weather / world events, notifications, PWA (manifest + service worker)
- Admin dashboard (`AdminGuard`) + dev tooling area (`DevGuard`), in-memory rate limit
- Payments: store catalog (top-up packs, Guild subscription, cosmetics) + stub provider; real-money packs labelled in BWP to distinguish them from soft Pula
- Wallet + ledger with Botswana-day caps; no XP / level (intentionally removed)
- **Currency clarity UI**: a header `?` guide + an inline Wallet section explaining Pula / Botho / Madi / Chapter Token (and that Kagiso is not a currency)
- **Hybrid navigation**: 4 primary screens (Farm · Kgotla · Bushveld · Market) + a More menu, reconciling the four-screen model

## Documentation

- `docs/DEVELOPMENT_STATE.md` — as-built status (**start here**)
- `docs/ARCHITECTURE_OVERVIEW.md` — as-built architecture
- `docs/DEVELOPMENT_SETUP.md` — local setup
- `docs/KNOWN_LIMITATIONS.md` — gaps and debt (migration blocker resolved 2026-09-14)
- `docs/DOCUMENTATION_AUDIT.md` — how the doc set is organized + accuracy map
- `docs/MVP/` — **the normative spec set** (01–07) for the current build
- `docs/01_Game_Design_Specification.md` … `docs/23_*` — original design suite (intent)

Numbered design specs are intent. Where they conflict with the repo, `DEVELOPMENT_STATE.md` and
the `docs/MVP/` set win.

## License

Private — all rights reserved.
