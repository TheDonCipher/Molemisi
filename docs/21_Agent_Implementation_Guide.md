# Document 21: Agent Implementation Guide

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Active conventions + as-built layout
> Last Updated: 2026-09-06
> Start here for agents after `DEVELOPMENT_STATE.md`. Numbered specs are design intent.

### Doc map

| Read first | Then |
| --- | --- |
| `DEVELOPMENT_STATE.md` | `KNOWN_LIMITATIONS.md` |
| `DEVELOPMENT_SETUP.md` | `ARCHITECTURE_OVERVIEW.md` |
| `08_API_Specification.md` (intent) | Live routes in DEVELOPMENT_STATE |
| `01`–`23` design specs | Only for intended behavior, not file layout |

---

## 1. Repository Structure

**NFR-AGENT-001**

```
molemisi/
├── apps/
│   ├── web/                    # Next.js 14 — player UI, admin, PWA
│   │   └── src/
│   │       ├── app/            # App Router (page.tsx routes)
│   │       ├── components/     # Header, footer, screens/
│   │       └── lib/            # api.ts, gameState.tsx
│   ├── game/                   # Phaser 3 + Vite :3002 (standalone)
│   │   └── src/
│   │       ├── scenes/         # Boot, Preload, Farm registered
│   │       ├── objects/        # PlotObject
│   │       ├── services/       # ApiClient
│   │       └── ui/             # Panels (mostly unregistered)
│   └── api/                    # NestJS — feature folders under src/
│       └── src/
│           ├── auth/, farms/, crops/, ...
│           ├── common/         # guards, interceptors, filters
│           └── main.ts         # prefix api/v1
├── packages/
│   ├── shared/
│   ├── game-types/
│   ├── game-config/            # crops, buildings, livestock, weather, store, theme
│   └── validation/
├── supabase/migrations/
├── assets/                     # source art + manifest.json
├── scripts/
├── docs/
├── package.json                # pnpm scripts (not npm)
└── turbo.json
```

**Player path:** Next.js `/game` (React). Do not assume Phaser is mounted in the web app.

**Package manager:** pnpm 9. Commands are `pnpm dev`, `pnpm test`, not `npm run`.

---

## 2. Coding Conventions

**NFR-AGENT-002**

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use `readonly` for immutable data
- Use `unknown` over `any`
- Use explicit return types for public functions

### Naming

| Element         | Convention      | Example           |
| --------------- | --------------- | ----------------- |
| Files           | kebab-case      | `crop.service.ts` |
| Classes         | PascalCase      | `CropService`     |
| Functions       | camelCase       | `calculateYield`  |
| Variables       | camelCase       | `cropType`        |
| Constants       | SCREAMING_SNAKE | `MAX_PLOTS`       |
| Database tables | snake_case      | `crop_instances`  |
| API paths       | nested REST     | `/farms/:id/plots/:id/plant` |

### File Organization

- One class/interface per file
- Group by feature, not by type
- Keep files under 300 lines
- Separate tests from source

---

## 3. Architectural Rules

**NFR-AGENT-003**

### Must Follow

1. **Server-authoritative game state** — All game logic runs on the server
2. **No client-side game state modification** — Client sends requests, server applies changes
3. **No direct database access from client** — All data flows through API
4. **All economic transactions audited** — Every currency/item change recorded in ledger
5. **All database changes via migrations** — Never modify schema directly
6. **All game content data-driven** — Prefer `packages/game-config`. Today contracts/NPCs/zones/events are still in API services; new content of those types should move to game-config, not more hardcoded arrays.

### Must Not

1. **Do not invent architecture** that contradicts the specifications
2. **Do not create unnecessary abstractions** — Keep it simple
3. **Do not introduce new dependencies** without justification
4. **Do not bypass the game API** — No direct DB writes from client
5. **Do not modify game economy directly** — Always go through API
6. **Do not alter database schema** without migrations
7. **Do not implement features** outside the current milestone

---

## 4. Module Boundaries

**NFR-AGENT-004**

### NestJS Module Rules

- Each module owns its database tables
- Modules communicate through injected services
- No direct database access across module boundaries
- Cross-module operations go through service interfaces

### Module Dependencies

```
Auth → Profile (reads user data)
Farm → Crop, Livestock, Building, Inventory
Crop → Simulation (calculates growth)
Market → Economy (price updates)
Payment → Economy (currency changes)
Admin → All modules (read-only access)
```

---

## 5. Database Rules

**NFR-AGENT-005**

### Migration Rules

1. All schema changes go through migrations
2. Migrations are in `supabase/migrations/`
3. Migration filenames: `YYYYMMDDHHMMSS_description.sql`
4. Each migration is atomic
5. Test migrations locally before applying

### Query Rules

1. Use Supabase client library for all queries
2. Use parameterized queries (never string interpolation)
3. Use transactions for multi-table operations
4. Index all foreign keys
5. Use RLS for player data isolation

---

## 6. API Rules

**NFR-AGENT-006**

### Endpoint Rules

1. All endpoints require authentication (except auth endpoints)
2. All endpoints validate input with DTOs
3. All endpoints verify resource ownership
4. All endpoints return standardized response format
5. All state-changing endpoints are idempotent

### Error Rules

1. Use standard error codes
2. Include helpful error messages
3. Never expose internal errors to client
4. Log all errors with context

---

## 7. Frontend Rules

**NFR-AGENT-007**

### Next.js Rules

1. Use App Router (not Pages Router)
2. Server components by default
3. Client components only when needed
4. No game logic in Next.js
5. All game state from API

### Phaser Rules

1. Never modify server state directly
2. Use API client for all server communication
3. Keep rendering separate from game logic
4. Use object pooling for frequent creates/destroys
5. Optimize for mobile performance

---

## 8. Testing Rules

**NFR-AGENT-008**

### Test Requirements

1. Every public function must have unit tests
2. Every API endpoint must have integration tests
3. Critical paths must have E2E tests
4. Tests must be deterministic
5. Tests must not depend on external services

### Test Conventions

```typescript
describe('CropService', () => {
  describe('plantCrop', () => {
    it('should plant a crop on an empty plot', async () => {
      // Arrange
      const farm = await createTestFarm();
      const plot = await createTestPlot(farm.id, 'EMPTY');

      // Act
      const result = await cropService.plantCrop(farm.id, plot.id, 'sorghum');

      // Assert
      expect(result.state).toBe('PLANTED');
      expect(result.crop.type).toBe('sorghum');
    });
  });
});
```

---

## 9. Git Workflow

**NFR-AGENT-009**

### Branch Strategy

- `main` — Production-ready code
- `develop` — Integration branch
- `feature/*` — Feature branches
- `fix/*` — Bug fix branches

### Commit Messages

```
feat(crop): add disease system
fix(market): correct price calculation
refactor(building): extract maintenance logic
test(simulation): add crop growth tests
docs(api): update endpoint documentation
```

### PR Requirements

1. All tests passing
2. Code review approved
3. No merge conflicts
4. Documentation updated (if applicable)

---

## 10. Acceptance Criteria

**NFR-AGENT-010**

### Feature Completion

A feature is complete when:

1. All specified functionality works
2. Unit tests pass (coverage target met)
3. Integration tests pass
4. API documentation updated
5. No known bugs
6. Performance targets met

### Definition of Done

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Migrations tested locally
- [ ] API endpoints tested
- [ ] UI tested on mobile and desktop
