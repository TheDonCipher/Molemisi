# 🌾 Molemisi

A pixel-art farm management simulator inspired by Botswana.

## Overview

Molemisi is a cozy agricultural management game where you build and manage a living farm. Plant crops, raise livestock, construct buildings, trade at the market, and help your community thrive.

**Platforms:** Desktop web, Mobile web, PWA

**Tech Stack:** Next.js, Phaser, NestJS, Supabase PostgreSQL

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Supabase local development)
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
# Edit .env.local with your Supabase credentials

# Start Supabase local
pnpm supabase:start

# Apply database migrations
pnpm supabase:reset

# Seed development data
pnpm db:seed

# Start development servers
pnpm dev
```

### Development Servers

| Service         | URL                    | Port  |
| --------------- | ---------------------- | ----- |
| Next.js Web     | http://localhost:3000  | 3000  |
| NestJS API      | http://localhost:3001  | 3001  |
| Phaser Game     | http://localhost:3002  | 3002  |
| Supabase Studio | http://localhost:54323 | 54323 |

## Architecture

```
Phaser (Game Client)
    ↓
Next.js (Web Shell)
    ↓
NestJS (API)
    ↓
Supabase PostgreSQL (Database)
```

### Monorepo Structure

```
molemisi/
├── apps/
│   ├── web/          # Next.js application
│   ├── game/         # Phaser game client
│   └── api/          # NestJS API
├── packages/
│   ├── shared/       # Shared utilities
│   ├── game-types/   # Game type definitions
│   ├── game-config/  # Game configuration data
│   └── validation/   # Zod validation schemas
├── supabase/         # Database migrations & config
├── assets/           # Game assets (sprites, tiles)
└── docs/             # Documentation
```

## Development Commands

```bash
pnpm dev              # Start all development servers
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format           # Format code with Prettier

pnpm supabase:start   # Start Supabase local
pnpm supabase:stop    # Stop Supabase local
pnpm supabase:reset   # Reset database
pnpm db:seed          # Seed development data
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)
- [Development Setup](docs/DEVELOPMENT_SETUP.md)
- [Known Limitations](docs/KNOWN_LIMITATIONS.md)
- [Game Design Specification](docs/01_Game_Design_Specification.md)
- [System Architecture](docs/02_System_Architecture_Specification.md)
- [API Specification](docs/08_API_Specification.md)
- [Database Design](docs/07_Database_Design_Specification.md)

## License

Private - All rights reserved.
