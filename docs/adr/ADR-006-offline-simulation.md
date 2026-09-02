# ADR-006: Elapsed-Time Offline Simulation

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs to support offline progression. When a player returns after absence, their farm should have advanced.

## Decision

Use **elapsed-time calculations** for offline simulation, not periodic ticks.

## Rationale

1. **Efficient:** No background processes per player
2. **Scalable:** Works for any number of players
3. **Simple:** Calculate once on player connect
4. **Deterministic:** Same input produces same output

## Implementation

```
On player connect:
  elapsed_hours = (now - last_simulated_at) / 60
  capped_hours = min(elapsed_hours, 24)
  
  For each crop:
    advance_growth(crop, capped_hours)
    decay_hydration(crop, capped_hours)
    check_disease(crop, capped_hours)
  
  For each animal:
    decay_hunger(animal, capped_hours)
    advance_production(animal, capped_hours)
  
  Update last_simulated_at = now
```

## Consequences

- No background job per player
- Simulation runs on player connect or background job (5-min interval)
- Maximum 24 hours of offline simulation
- Animals enter self-sustaining mode after 3 days
