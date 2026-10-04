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

The MVP is **code-complete** and the four gates are green (api tsc 0 · web tsc 0 · **615 Jest
tests** across 37 suites · `balance_verify.py` PASS). The schema is at **49 migration files — all
committed and pushed live** to the linked Supabase project `nyapfgawanqvnkkjudxb` (corrected
2026-10-04; commit `bf235be` landed the M-series batch and records *"all 10 migrations are applied
live"*). The original 11-migration deploy gap was pushed on 2026-09-14, so `/admin`, `/dev` and
P2–P9 all run at runtime.

Since the 2026-09-16 state note, four further capability areas have landed:

- **Deterministic simulation engine** (`apps/api/src/simulation/engine/`) — one pure
  `runSimulation(input) => output`, no clock reads, no I/O, seeded RNG
- **Anti-cheat** (`apps/api/src/anti-cheat/`) — pure detection rules + `anti_cheat_flags` table
- **State validation & recovery** (`apps/api/src/simulation/state-validation.ts`)
- **Economy metrics API** (`apps/api/src/economy/`) — supply, wealth, velocity, inflation
- **The decided economy** (`docs/33` → `docs/34`, Waves 1–3): top-ups grant **Madi, never Pula**;
  the store sells decorations on two shelves plus the **Village Pass**; boosts are **cut**

Remaining gaps: real-money payments (stub provider only — **the store purchase flow itself is
wired and verified**), wildlife raids, boost effects, and Botho automation-unlock persistence
(config-only). Raids and boosts are deferred from v1 by ruling; the automation persistence is the
open Wave 4 item (`docs/34` §4.3, `KNOWN_LIMITATIONS.md`). Also outstanding: the avatar / Event /
calendar **art assets** (PixelLab manifest rows now exist; the PNGs are not generated yet — every
consumer degrades gracefully), and the four migrations of 2026-10-04, which are now **applied live** (53 total).

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

Register at http://localhost:3000/auth/register. `pnpm db:seed` **works** — it materialises
the config canon from `packages/game-config` into `item_definitions`, `market_prices`,
`game_config`, `achievements` and `chapters`. It is idempotent (an upsert on each table's
natural key), so a second run is a no-op, and `--dry-run` reports without writing. The root
script builds `@molemisi/game-config` first so the seed always reads current numbers.

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
│   ├── validation/   # Zod schemas
│   └── simulator/    # Offline balance simulator (not a game client)
├── supabase/         # Migrations (49, all live), seed, local config
├── assets/           # Pixel-art source (282 manifest entries), synced into web public/
├── scripts/          # Asset pipeline, admin/dev bootstrap, live API tests, economy gate
└── docs/             # As-built notes + design specs + MVP normative set
```

Retired art is moved, not deleted: `assets/_archive/` (19 files) holds the withdrawn pig, saffron,
`building_borehole` / `building_greenhouse` and legacy snowflake assets. See `assets/_archive/README.md`.

## Commands

```bash
pnpm dev                 # Start web and api (runs assets:sync first)
pnpm build               # Build all packages
pnpm test                # Run Jest suites (615 tests across 37 suites)
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

pnpm simulate            # Run the offline balance simulator (DO NOT point at the live project)
```

> **Live-sim hazard.** `packages/simulator` creates real accounts. Never run `pnpm simulate`
> against the linked Supabase project — validate with Jest and `balance_verify.py` instead.

## What works today

- Auth: register, login, logout, `/auth/me` (Supabase Auth JWT; role tiers player/admin/dev)
- Farming: 11 crops, plant / water / harvest, Jojo-tank water, elapsed-time simulation
- Buildings (7), livestock (4), inventory + storage tiers, crafting (timers, batching, substitution)
- Market (5% Co-op tax, 2.0× price band, authoritative quote), contracts, progression, Elder tip
- Kgotla (Botho, Letsema, NPCs) with NPC head-portrait dialog, Bushveld (Kagiso, Field Journal, Daily Sparkle), chapters + almanac
- **Global Kgotla chat** — one shared Setswana/English channel in the Kgotla (poll on a slow interval, visible-tab only; **unmoderated by ruling**, anti-flood only)
- **Achievements + honorific ladder** — Molemi → Molemi-Morui → Moagi → Motsadi → Mokgosi, earned only, display-only, never purchasable
- **Events live service** — one chapter-scoped Event per Setswana chapter; grants Bupi/Borotho and pays Chapter Tokens on turn-in; a replayed claim is a no-op
- **3-layer avatar** — base chosen once, swappable outfit cosmetic, and the always-worn Farmer's Hat drawn on top
- **Almanac** — the calendar education screen: the twelve Setswana months, the four `Sekala sa …` chapters with their Begin/Give/Keep/Leave verbs, the current month/chapter and the days-to-rollover
- **World Tree** — four restoration stages on a community-restoration meter (Botho + Council Projects)
- **Ambient breathing loops** — NPCs in the Kgotla and livestock on the Farm; ~3 s cycle, 2–4 px, 2–3 frames, switched off under reduced motion or Particles-OFF
- **In-game dev tools** (dev accounts only) — long-press the Almanac chapter header to date-jump, gear affordances on Farm and Kgotla for spawn / force-complete, plus a game-state scan of the seven corruption classes. Refuses to run against the live project
- Seasons / weather / world events, notifications, PWA (manifest + service worker)
- Admin dashboard (`AdminGuard`) + dev tooling area (`DevGuard`), in-memory rate limit
- **Deterministic simulation engine** — pure, seeded, replayable; livestock decays on a 72 h window and self-sustains beyond it, building wear is uncapped
- **State validation & recovery** — pure detection of negative balances, orphan crops and stale/future timestamps, each mapped to a named corrective action
- **Anti-cheat** — pure passive (corrupt state) and active (suspicious sequences) rules writing `anti_cheat_flags`; flags are review signals, never verdicts
- **Economy metrics API** — currency supply, wealth, velocity, prices, inflation, crop supply, progression
- Payments: store catalog + stub provider; decided direction (`docs/33`, 2026-10-01): top-ups grant **Madi, never Pula** — the store sells only looks and time
- Wallet + ledger with Botswana-day caps; **Madi** balance added as spend-only premium currency; no XP / level (intentionally removed)
- **Currency clarity UI**: a header `?` guide + an inline Wallet section explaining Pula / Botho / Madi / Chapter Token (and that Kagiso is not a currency)
- **Hybrid navigation**: 4 primary screens (Farm · Kgotla · Bushveld · Market) + a More menu, reconciling the four-screen model

## Documentation

- `docs/DEVELOPMENT_STATE.md` — as-built status (**start here**)
- `docs/ARCHITECTURE_OVERVIEW.md` — as-built architecture
- `docs/DEVELOPMENT_SETUP.md` — local setup
- `docs/KNOWN_LIMITATIONS.md` — gaps and debt
- `docs/DOCUMENTATION_AUDIT.md` — how the doc set is organized + accuracy map
- `docs/MVP/` — **the normative spec set** (01–07) for the current build
- `docs/30`–`docs/34` — gameplay/visual review, systems audit, sprint roadmap, economy strategy
  and its implementation sequence (Waves 1–4)
- `docs/01_Game_Design_Specification.md` … `docs/23_*` — original design suite (intent)

Numbered design specs are intent. Where they conflict with the repo, `DEVELOPMENT_STATE.md` and
the `docs/MVP/` set win.

## License

Private — all rights reserved.
