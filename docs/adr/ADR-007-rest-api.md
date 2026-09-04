# ADR-007: REST API for Game Commands

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs a communication protocol between client and server.

## Decision

Use **REST API** for game commands, not WebSocket or GraphQL.

## Rationale

1. **Simplicity:** REST is well-understood, easy to implement
2. **Compatibility:** Works with HTTP, proxies, CDNs
3. **Idempotency:** Easy to implement with Idempotency-Key header
4. **Caching:** HTTP caching for read-heavy endpoints
5. **Tooling:** Excellent tooling (OpenAPI, Postman, etc.)

## Consequences

- All game actions are HTTP requests
- No real-time push (client polls for updates)
- Supabase Realtime used for critical notifications only

## Alternatives Rejected

| Alternative | Reason Rejected                    |
| ----------- | ---------------------------------- |
| WebSocket   | Complex, stateful, harder to scale |
| GraphQL     | Overkill for this use case         |
| gRPC        | Not browser-friendly               |
