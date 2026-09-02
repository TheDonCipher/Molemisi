# Architecture Overview

## System Architecture

Molemisi uses a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────────────┐     │
│  │   Next.js Shell  │          │     Phaser Game Client   │     │
│  │                  │          │                          │     │
│  │  • Auth UI       │          │  • Farm Scene            │     │
│  │  • Payments      │          │  • Kgotla Scene          │     │
│  │  • Settings      │          │  • Bushveld Scene        │     │
│  │  • PWA Shell     │          │  • Rendering             │     │
│  └────────┬─────────┘          └────────────┬─────────────┘     │
│           │                                 │                   │
│           └──────────┬──────────────────────┘                   │
│                      │                                          │
│              ┌───────▼────────┐                                 │
│              │  API Client    │                                 │
│              │  (HTTP/REST)   │                                 │
│              └───────┬────────┘                                 │
└──────────────────────┼──────────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────┼──────────────────────────────────────────┐
│                      │          API LAYER                       │
│              ┌───────▼────────┐                                 │
│              │   NestJS API   │                                 │
│              │                │                                 │
│              │  ┌───────────┐ │                                 │
│              │  │ Auth      │ │                                 │
│              │  ├───────────┤ │                                 │
│              │  │ Farms     │ │                                 │
│              │  ├───────────┤ │                                 │
│              │  │ Crops     │ │                                 │
│              │  ├───────────┤ │                                 │
│              │  │ Inventory │ │                                 │
│              │  └───────────┘ │                                 │
│              └───────┬────────┘                                 │
└──────────────────────┼──────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│                      │        DATA LAYER                        │
│              ┌───────▼────────┐                                 │
│              │   Supabase     │                                 │
│              │                │                                 │
│              │  ┌───────────┐ │                                 │
│              │  │PostgreSQL │ │                                 │
│              │  └───────────┘ │                                 │
│              │  ┌───────────┐ │                                 │
│              │  │  Auth     │ │                                 │
│              │  └───────────┘ │                                 │
│              └────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Trust Boundaries

### Client (UNTRUSTED)

- All game actions validated server-side
- Client receives display state only
- Client cannot modify database directly

### API (TRUSTED)

- Authoritative game logic
- All economic calculations
- All state transitions

### Database (TRUSTED)

- Persistent storage
- Data integrity constraints
- Row Level Security

## Key Design Decisions

1. **Server-Authoritative Game State** - All game logic runs on the server
2. **Modular Monolith** - NestJS modules with clear boundaries
3. **Supabase PostgreSQL** - Single database for all persistent data
4. **Elapsed-Time Simulation** - Offline progression via time calculations
5. **Data-Driven Content** - Game configuration in shared packages

## Data Flow

```
Player Action (Click/Tap)
    ↓
Game Command (Phaser)
    ↓
API Request (HTTP REST)
    ↓
Authentication (JWT)
    ↓
Validation (Zod/DTO)
    ↓
Game Logic (NestJS Service)
    ↓
Database Transaction (Supabase)
    ↓
Response to Client
    ↓
Visual Update (Phaser)
```

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| Auth | Registration, login, JWT validation |
| Farms | Farm CRUD, plot management |
| Crops | Planting, watering, harvesting |
| Inventory | Item management |
| Buildings | Construction, upgrades |
| Livestock | Animal management |
| Market | Trading, pricing |
| Contracts | Quest system |
| Kgotla | Community hub |
| Bushveld | Exploration |
| Progression | Levels, skills |
| Simulation | Time-based calculations |
| Payments | Payment processing |
| Notifications | Player alerts |
| Admin | Administration tools |
