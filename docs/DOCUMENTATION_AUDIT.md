# Documentation Audit

> **Molemisi Farm Management Simulator**
> Status: As-built docs track the repo; design specs are intent.
> **Last updated: 2026-09-14** (prior: 2026-09-06).

---

## How to read this suite

There are **three tiers** of documentation. Mixing them up is the single biggest source of
confusion in this repo, so read top to bottom:

| Tier | Files | Authority | Purpose |
| --- | --- | --- | --- |
| **As-built** | `README.md`, `DEVELOPMENT_STATE.md`, `DEVELOPMENT_SETUP.md`, `ARCHITECTURE_OVERVIEW.md`, `KNOWN_LIMITATIONS.md`, `MVP_COMPLETENESS_AUDIT.md`, this file, `SCAFFOLD_AUDIT.md` | **Code + these files** | What the repo does *now* |
| **Normative MVP set** | `docs/MVP/01`–`07`, `docs/MVP/README.md` | **Build from these** | The current v1 specification (post-2026-09-07 marketplace pivot) |
| **Original design suite** | `docs/01`–`docs/23`, `docs/20_MVP_Implementation_Plan`, `Molemisi-PRD`, `Molemisi _ROADMAP` | **Intent / history** | Pre-pivot product vision |

**Golden rules:**

1. If an as-built doc disagrees with the code, the code wins and the doc is stale — fix the doc.
2. If a numbered design spec (`docs/01`–`23`) disagrees with the repo, the repo wins until the
   spec is revised. These docs are *intent*, not an implementation log.
3. For v1 work, **`docs/MVP/` is the authority**. The original suite (`docs/01`–`23`) was written
   before the marketplace pivot and is now largely superseded for implementation purposes.

---

## Living / as-built documents

| Document | Status (2026-09-14) |
| --- | --- |
| README.md | Current — overview, quick start, monorepo, status banner |
| DEVELOPMENT_STATE.md | Current — full as-built inventory |
| DEVELOPMENT_SETUP.md | Current — local setup; add `supabase db push` for the linked project |
| ARCHITECTURE_OVERVIEW.md | Current — as-built topology + module map |
| KNOWN_LIMITATIONS.md | Current — gaps, debt, **the 11-migration blocker**, deferred rulings |
| MVP_COMPLETENESS_AUDIT.md | Current — gate results + the open rulings |
| SCAFFOLD_AUDIT.md | Historical pointer (M1 scaffold); minor count updates |
| DOCUMENTATION_AUDIT.md | This file |

---

## Normative MVP set (`docs/MVP/`)

| Document | Role | Notes |
| --- | --- | --- |
| 01 Product Definition | What the game is, four screens, locked decisions | Current |
| 02 Economy & Currencies | Three currencies, marketplace, **all numbers of record** | Current; `balance_verify.py` is the gate |
| 03 Core Systems | Farming, water, inventory, crafting, buildings, livestock, progression | Wildlife raids (§1.3) deferred 2026-09-11 |
| 04 Bushveld | Scenes, Kagiso, Field Journal, calendar | Comparative income ruled on by telemetry |
| 05 Implementation Plan | Phases P0–P10, done-criteria | Boosts withdrawn (ruling); P10 gate closed by telemetry ruling |
| 06 Verification Rubric | Audit criteria, invariants | **Wins on "is it done?"**; wildlife-raid criterion struck |
| 07 Balance & UX Review | Why the numbers are what they are | Audit record; not normative |

`06` fully supersedes the old `MVP_VERIFICATION_RUBRIC.md` (in `docs/archive/`).

---

## Original design suite (`docs/01`–`docs/23`)

These describe the *product vision* and predate the 2026-09-07 pivot. They are still useful as a
bible for intent, but several sections are now contradicted by the build. Where they conflict,
the repo and the `docs/MVP/` set win.

| Document | Role | Implementation notes (2026-09-14) |
| --- | --- | --- |
| 01 Game Design | Product rules | Mostly reflected in API + config; superseded by `MVP/01` for build |
| 02 System Architecture | Target topology | Phaser-in-Next and Redis not as drawn |
| 03 UI/UX | UX | React screens; Stitch designs in `docs/Screens/` |
| 04 Phaser rendering | Target renderer | Standalone Farm only; see DEVELOPMENT_STATE |
| 05 Art direction | Art bible | PixelLab assets + stitch backgrounds exist |
| 06 Economy | Balance | Config + market tables (numbers now live in `MVP/02`) |
| 07 Database | Schema | 27 migrations (was 16); extra tables beyond first draft |
| 08 API | Endpoint design | Prefix `/api/v1` matches; many paths differ (see DEVELOPMENT_STATE) |
| 09 Simulation | Offline sim | Implemented in `SimulationService` |
| 10 Payments | Monetization | Stub provider only; boosts withdrawn |
| 11 Errors | Error model | Filter not registered |
| 12 Observability | Logs/metrics | Nest logger + ledger; no Sentry/PostHog |
| 13 Security | Controls | JWT localStorage, in-memory throttle, admin flag + role |
| 14 Configuration | Env + game config | Env is `.env.example`; game config is TS + `game_config` table |
| 15 Content data | Data-driven content | Crops/buildings/animals/store/alchemy yes; NPC/contract/event no |
| 16 Testing | QA | 18 suites / 209 tests; live scripts |
| 17 Deployment | DevOps | Local pnpm/supabase only; spec still says npm/Redis |
| 18 Admin | Ops UI | `/admin` implemented; role claim on `profiles.role` |
| 19 Analytics | Metrics | Table exists; no product dashboards |
| 20 MVP plan | Phases 0–7 | **Superseded by `MVP/05`**; features largely built |
| 21 Agent guide | Conventions | Package layout outdated |
| 22 UI GX | Motion/feel | Partial |
| 23 Scene renders | Stitch prompts | Backgrounds generated |

ADR-001–012: decisions stand. Unrealized: Phaser host (001/002), Redis (012), Capacitor (011),
live payment providers (008), fully data-driven content (009).

---

## Material inconsistencies (spec vs code)

1. **Client split** — Specs: Phaser renders the farm inside Next. Code: React `/game`.
2. **Package manager** — Specs often `npm`. Repo is **pnpm 9** + turbo.
3. **Redis** — Specs list Redis. Not in the stack.
4. **Rate limits** — Spec 08: 100/min global, per-route limits. Code: 60/min flat.
5. **Versions** — Old docs say `0.1.0` / 16 migrations / 13 SKUs. Code: `game-config`
   `GAME_VERSION = 1.0.0-mvp`, **27 migrations**, store SKUs minus the 3 withdrawn boosts.
6. **Admin auth** — Spec: admin JWT role. Code: `profiles.is_admin` boolean **and** `role='admin'`.
7. **Env files** — Spec: `.env.development`. Repo: `.env.example` → `.env.local`.
8. **API modules path** — Agent guide shows `apps/api/src/modules/`. Code: feature folders.
9. **Phaser port** — Spec 17 put the game at `:3000/game`. That URL is React; Phaser is `:3002`.
10. **db:seed** — README historically documented it; script target missing.

---

## Cross-checks that hold

- Mutations go through Nest (player currency not trusted from the client)
- Simulation state is persisted on farm/crop/livestock/building rows
- Crop economy numbers in `game-config` match the 02 examples (sorghum 5/15, maize 8/20, chicken 50, well 200)
- Auth on player game routes
- RLS present on core player tables

---

## Counts (2026-09-14)

- As-built / living docs: 8 (incl. README)
- Normative MVP specs: 7 (`01`–`07`) + README
- Original design specs: 23 (`docs/01`–`docs/23`) + `20_MVP_Implementation_Plan` + PRD + ROADMAP
- ADRs: 12
- Screen DESIGN.md: 5 (`docs/Screens/`)
- API Jest suites: 18 (209 tests)
- Supabase migrations: **27** (16 applied, **11 unpushed — blocker**)

---

## Conclusion

The design suite is still useful as a product bible and the `docs/MVP/` set is the build
authority. Start at `DEVELOPMENT_STATE.md` and `KNOWN_LIMITATIONS.md`, then open a spec for
intended behavior. The repo is code-complete for v1 but **not deployable** until the 11 unpushed
migrations land.
