# Known Limitations

This document tracks known limitations and technical debt from the initial scaffolding.

## Scaffold Limitations

### 1. Phaser Integration

**Status:** Basic integration complete

- Phaser game runs in a separate Vite dev server
- No hot module replacement between Next.js and Phaser
- Game assets are placeholders (colored rectangles)
- No actual sprite sheets or tilemaps loaded

### 2. Authentication Flow

**Status:** Foundation complete

- Registration creates auth user + profile + farm
- Login returns JWT token
- Token stored in localStorage (not httpOnly cookie)
- No token refresh mechanism implemented
- No logout endpoint

### 3. Database

**Status:** Schema complete

- Core tables created with RLS policies
- No database functions or triggers
- Seed data is commented out (requires auth user)
- No automated type generation from Supabase

### 4. API

**Status:** Foundation complete

- Health endpoint works
- Auth endpoints (register, login) work
- Farm retrieval works
- Crop planting, watering, harvesting work
- No rate limiting implemented
- No request validation beyond Zod schemas
- No idempotency support

### 5. Game Logic

**Status:** Vertical slice only

- Crop planting works
- Crop watering works
- Crop harvesting works
- No crop growth simulation
- No weather system
- No season system
- No livestock system
- No building system
- No market system
- No contracts
- No Kgotla
- No Bushveld

### 6. Testing

**Status:** Minimal

- Health controller test exists
- Crops service test exists (minimal)
- No integration tests
- No E2E tests
- No database tests

### 7. CI/CD

**Status:** Basic

- GitHub Actions workflow for lint, typecheck, test, build
- No deployment pipeline
- No staging/production environments

### 8. Documentation

**Status:** Scaffold complete

- README with setup instructions
- Architecture overview
- Known limitations (this file)
- Full specification suite in docs/

## Technical Debt

1. **Token Storage** - Using localStorage instead of httpOnly cookies
2. **Error Handling** - Basic error filter, no structured logging
3. **Validation** - Zod schemas not integrated with NestJS pipes
4. **Database Queries** - Using Supabase client directly, no repository pattern
5. **Game State** - No client-side state management
6. **Asset Pipeline** - No asset loading or caching strategy
7. **PWA** - No service worker or manifest configured
8. **Mobile** - No touch optimization or responsive testing

## Next Implementation Priorities

1. **Crop Growth Simulation** - Implement server-side time-based growth
2. **Weather System** - Add weather effects and modifiers
3. **Season System** - Implement seasonal changes
4. **Livestock** - Add animal management
5. **Buildings** - Add construction and upgrades
6. **Market** - Implement trading system
7. **PWA** - Add service worker and offline support
8. **Testing** - Add integration and E2E tests
