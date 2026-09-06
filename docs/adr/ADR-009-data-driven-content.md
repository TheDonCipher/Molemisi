# ADR-009: Data-Driven Game Content

**Status:** Accepted (partial)
**Date:** 2026-09-02
**As-built (2026-09-06):** crops/buildings/livestock/weather/store in `packages/game-config`. Contracts, NPCs, zones, events still hardcoded in API services.

---

## Context

Molemisi needs to support adding new content (crops, animals, buildings) without rewriting core game logic.

## Decision

All game content is **data-driven** through configuration files.

## Implementation

```json
{
  "crops": {
    "sorghum": {
      "growthStages": 4,
      "timePerStage": 3,
      "yield": { "min": 3, "max": 5 },
      "seedCost": 5,
      "basePrice": 15
    }
  }
}
```

## Rationale

1. **Extensibility:** Add content by editing config, not code
2. **Balance:** Easy to adjust values for tuning
3. **Localization:** Content separated from logic
4. **Modding:** Future modding support possible

## Consequences

- Content service loads and caches configuration
- Game logic reads from content definitions
- New content requires config update + assets
