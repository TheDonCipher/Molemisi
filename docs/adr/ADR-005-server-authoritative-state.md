# ADR-005: Server-Authoritative Game State

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs to prevent cheating and ensure economy integrity.

## Decision

All game state is **server-authoritative**. The client never modifies game state directly.

## Rationale

1. **Anti-cheat:** Server validates all actions
2. **Economy integrity:** All currency changes server-side
3. **Offline progression:** Server calculates elapsed time
4. **Multi-device:** State consistent across devices
5. **Security:** Client cannot manipulate state

## Consequences

- All game actions go through API
- Client sends requests, server applies changes
- Client receives display state only
- Any client-side state is ephemeral

## Implementation

```typescript
// Client sends request
POST /farms/{farmId}/plots/{plotId}/plant
{ "cropType": "sorghum" }

// Server validates and applies
1. Check authentication
2. Check farm ownership
3. Check plot is empty
4. Check seed in inventory
5. Create crop instance
6. Deduct seed from inventory
7. Award XP
8. Record ledger entry
9. Return new state
```
