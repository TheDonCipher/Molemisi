# ADR-003: NestJS Modular Monolith

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs a backend API that handles game logic, economy, and payments.

## Decision

Use **NestJS** as a **modular monolith** for the backend API.

## Rationale

1. **Modular:** Clear separation of concerns (farm, crop, market, etc.)
2. **TypeScript:** Consistent with frontend stack
3. **NestJS DI:** Dependency injection for clean module boundaries
4. **Monolith simplicity:** Single deployment, no distributed systems complexity
5. **Scalability:** Can extract modules to services later if needed

## Consequences

- All modules run in one process
- Database access through service role
- Modules communicate through injected services
- Future extraction to microservices possible

## Alternatives Rejected

| Alternative    | Reason Rejected                  |
| -------------- | -------------------------------- |
| Microservices  | Unnecessary complexity for MVP   |
| Express.js     | Less structure, more boilerplate |
| Fastify        | Less mature ecosystem            |
| Django/FastAPI | Wrong language (Python)          |
