# Scaffold Audit

> **Molemisi Farm Management Simulator**
> Version: 0.1.0
> Status: Superseded by implementation
> Last updated: 2026-09-06

This file was the M1 scaffold checklist (2026-09-02). The scaffold is done. Use `docs/DEVELOPMENT_STATE.md` as the live inventory.

---

## Historical scaffold (complete)

- pnpm + Turborepo, TypeScript, ESLint 9 flat config, Prettier
- `apps/web`, `apps/game`, `apps/api`
- Packages: shared, game-types, game-config, validation
- Supabase config, 16 migrations, seed.sql
- GitHub Actions: lint, typecheck, test, build

Those boxes stay checked. They are no longer the interesting status.

---

## What grew after the scaffold

Implemented beyond the original vertical slice:

- Full Nest module set (see DEVELOPMENT_STATE)
- Elapsed-time simulation, weather, seasons
- Livestock, buildings, market, contracts, progression
- Kgotla, Bushveld, world events, notifications
- Admin UI + `AdminGuard` + `is_admin`
- PWA manifest + service worker
- PixelLab asset pipeline (209 manifest entries)
- Stub payments + 13 SKUs
- In-memory rate limit and HTTP audit logger

---

## Deviations that still matter

| Scaffold / spec assumption | As built |
| --- | --- |
| Phaser in Next.js | React `/game`; Phaser standalone on 3002 |
| Placeholder rectangles | Pixel assets in `assets/` |
| No rate limit | 60/min in-memory |
| No PWA | Custom SW |
| No admin role | `profiles.is_admin` |
| Token in localStorage | Still true |
| `npm run dev` | **pnpm** + turbo |
| `db:seed` | Broken (missing seed.ts) |

---

## Verification (architecture invariants)

| Question | Answer |
| --- | --- |
| Does the frontend bypass NestJS for game mutations? | No (except some Bushveld UI demo paths) |
| Does Phaser contain economy logic? | No |
| Can the client set currency locally for real farms? | No — server ledger |
| Can one player read another farm via RLS + API ownership? | API checks farm ownership; RLS on player tables |
| Service role in the browser? | No |
| Migrations reproducible? | Yes, `supabase/migrations/` |
| Payments without live keys? | Yes, stub |
| New crop without core rewrite? | Yes, `packages/game-config/src/crops.ts` |
| Simulation without Phaser? | Yes |

---

## Conclusion

Scaffold complete. Product is in **M16 Alpha**. Remaining work is quality, honesty of the Phaser/React split, payments, audio, and the gaps in `KNOWN_LIMITATIONS.md`.
