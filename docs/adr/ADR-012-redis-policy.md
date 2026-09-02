# ADR-012: Redis Usage Policy

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Redis is available but should be used sparingly. The question is: what should Redis be used for?

## Decision

Redis is used **only** for:
1. BullMQ job queue
2. Rate limiting cache
3. Market price cache (frequently updated)

Redis is **NOT** used for:
- Primary game state (PostgreSQL is authoritative)
- Session storage (Supabase Auth handles this)
- Persistent data
- Game simulation state

## Rationale

1. **Simplicity:** PostgreSQL is the single source of truth
2. **Reliability:** No data loss risk from Redis restart
3. **Consistency:** All state in one database
4. **Cost:** Less infrastructure to manage

## Consequences

- Redis is optional (can fallback to sync processing)
- Redis data is ephemeral (can be lost without impact)
- PostgreSQL remains the authoritative store
