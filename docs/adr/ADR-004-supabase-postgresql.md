# ADR-004: Supabase PostgreSQL as Primary Database

**Status:** Accepted
**Date:** 2026-09-02
**As-built (2026-09-06):** 16 migrations under `supabase/migrations/`. API uses service-role client; RLS is defense in depth.

---

## Context

Molemisi needs a persistent database for game state, player data, and economy.

## Decision

Use **Supabase PostgreSQL** as the primary database.

## Rationale

1. **PostgreSQL:** Industry-standard, reliable, feature-rich
2. **Supabase:** Managed hosting, Auth, Storage, Realtime included
3. **RLS:** Row Level Security for player data isolation
4. **Migrations:** Version-controlled schema changes
5. **Backups:** Automatic backups and point-in-time recovery
6. **Free tier:** Generous free tier for development

## Consequences

- All game state persists in PostgreSQL
- Supabase Auth handles authentication
- RLS policies protect player data
- Migrations ensure schema consistency

## Alternatives Rejected

| Alternative         | Reason Rejected                          |
| ------------------- | ---------------------------------------- |
| Firebase            | NoSQL, vendor lock-in                    |
| MongoDB             | NoSQL, less suitable for relational data |
| DynamoDB            | AWS lock-in, NoSQL                       |
| Supabase + other DB | Unnecessary complexity                   |
