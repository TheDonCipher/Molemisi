# Molemisi

A pixel-art farm management simulator inspired by Botswana.

## Overview

Molemisi is a cozy agricultural management game. Plant crops, raise livestock, construct buildings, trade at the market, visit the Kgotla, and explore the Bushveld.

**Version:** 0.1.0 (M16 Alpha in progress)

**Platforms:** Desktop web, mobile web, PWA

**Tech stack:** Next.js 14, Phaser 3, NestJS 10, Supabase PostgreSQL, pnpm + Turborepo

## Current player path

The playable client is the **Next.js React shell** at `/game`. It talks to the NestJS API over REST. Phaser (`apps/game`) is a standalone Vite client on port 3002 (Farm scene + demo mode). It is not mounted inside Next.js.

```
Browser
  -> Next.js :3000  (auth, React game UI, admin, PWA)
  -> NestJS  :3001  (/api/v1, authoritative game logic)
  -> Vite    :3002  (optional standalone Phaser client)

Supabase PostgreSQL :54322  |  Studio :54323
```

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (Supabase local)
- Supabase CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/molemisi.git
cd molemisi

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Start Supabase local
pnpm supabase:start

# Apply database migrations (also runs supabase/seed/seed.sql)
pnpm supabase:reset

# Start development servers
pnpm dev
```

Do not set `NODE_ENV` in `.env` or `.env.local`. Next.js and NestJS set it themselves. A stray `NODE_ENV=development` breaks `next build`.

Register at http://localhost:3000/auth/register. Registration creates the auth user, profile, farm, plots, and starter seeds. `pnpm db:seed` is not available (the Nest seed script is missing).

### Development servers

| Service         | URL                    | Port  |
| --------------- | ---------------------- | ----- |
| Next.js web     | http://localhost:3000  | 3000  |
| NestJS API      | http://localhost:3001  | 3001  |
| Phaser game     | http://localhost:3002  | 3002  |
| Supabase Studio | http://localhost:54323 | 54323 |

API base path: `http://localhost:3001/api/v1`

There is no Next.js rewrite/proxy to the API. The browser calls `:3001` directly (CORS via `CORS_ORIGIN`).

## Monorepo

```
molemisi/
├── apps/
│   ├── web/          # Next.js 14 — player UI, auth, admin, PWA
│   ├── game/         # Phaser 3 + Vite — standalone farm renderer
│   └── api/          # NestJS — authoritative game API
├── packages/
│   ├── shared/       # API helpers and constants
│   ├── game-types/   # Shared TypeScript types
│   ├── game-config/  # Crops, buildings, livestock, weather, store, theme
│   └── validation/   # Zod schemas
├── supabase/         # Migrations, seed, local config
├── assets/           # Pixel-art source (synced into web/game public/)
├── scripts/          # Asset pipeline, admin bootstrap, live API tests
└── docs/             # Specifications and as-built notes
```

## Commands

```bash
pnpm dev              # Start web, api, and game (runs assets:sync first)
pnpm build            # Build all packages
pnpm test             # Run package tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format           # Format with Prettier

pnpm supabase:start   # Start local Supabase
pnpm supabase:stop    # Stop local Supabase
pnpm supabase:reset   # Reset DB and apply migrations + seed.sql
pnpm dev:kill         # Free ports 3000/3001/3002

pnpm assets:sync      # Copy assets/ into web and game public folders
pnpm assets:generate  # Generate assets via PixelLab (needs PIXELLAB_API_KEY)
```

## What works today

- Auth: register, login, logout, `/auth/me` (Supabase JWT in localStorage)
- Farming: 11 crops, plant / water / harvest, elapsed-time simulation
- Buildings (7), livestock (4), inventory, dynamic market, contracts, progression
- Kgotla (NPCs, quests, projects), Bushveld gather, seasons and world events
- Notifications, PWA (manifest + service worker), admin dashboard + `AdminGuard`
- Payments: store catalog (13 SKUs) and stub provider (no Stripe / Orange Money yet)

Details: `docs/DEVELOPMENT_STATE.md`. Gaps: `docs/KNOWN_LIMITATIONS.md`.

## Documentation

- `docs/DEVELOPMENT_STATE.md` — as-built status (start here)
- `docs/DEVELOPMENT_SETUP.md` — local setup
- `docs/ARCHITECTURE_OVERVIEW.md` — as-built architecture
- `docs/KNOWN_LIMITATIONS.md` — gaps and debt
- `docs/01_Game_Design_Specification.md` — design specs (01–23)
- `docs/08_API_Specification.md` — API design (see DEVELOPMENT_STATE for as-built routes)
- `docs/07_Database_Design_Specification.md` — schema design

Numbered specs are design intent. Where they conflict with the repo, the code and `DEVELOPMENT_STATE.md` win.

## License

Private — all rights reserved.
