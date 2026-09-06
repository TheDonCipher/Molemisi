# Documentation Audit

> **Molemisi Farm Management Simulator**
> Version: 0.1.0 (code) / 1.0.0 (design specs)
> Status: Specs are design intent; living docs match the repo
> Last updated: 2026-09-06

---

## How to read this suite

| Kind | Files | Authority |
| --- | --- | --- |
| As-built | README, DEVELOPMENT_STATE, DEVELOPMENT_SETUP, ARCHITECTURE_OVERVIEW, KNOWN_LIMITATIONS, this audit, SCAFFOLD_AUDIT | **Code + these files** |
| Design specs | `01`–`23`, Molemisi-PRD, ROADMAP | Intent / target |
| ADRs | `docs/adr/ADR-001`–`012` | Decisions; some not fully realized |

If a numbered spec disagrees with the repo, the repo wins until the spec is revised.

---

## Living documents

| Document | Status |
| --- | --- |
| README.md | Updated 2026-09-06 |
| DEVELOPMENT_STATE.md | Updated 2026-09-06 |
| DEVELOPMENT_SETUP.md | Updated 2026-09-06 |
| ARCHITECTURE_OVERVIEW.md | Updated 2026-09-06 |
| KNOWN_LIMITATIONS.md | Updated 2026-09-06 |
| SCAFFOLD_AUDIT.md | Historical + pointer |
| DOCUMENTATION_AUDIT.md | This file |

---

## Design specifications

| Document | Role | Implementation notes |
| --- | --- | --- |
| 01 Game Design | Product rules | Mostly reflected in API + config |
| 02 System Architecture | Target topology | Phaser-in-Next and Redis not as drawn |
| 03 UI/UX | UX | React screens; Stitch designs in `docs/Screens/` |
| 04 Phaser rendering | Target renderer | Standalone Farm only; see DEVELOPMENT_STATE |
| 05 Art direction | Art bible | PixelLab assets + stitch backgrounds exist |
| 06 Economy | Balance | Config + market tables |
| 07 Database | Schema | 16 migrations; extra tables beyond first draft |
| 08 API | Endpoint design | Prefix `/api/v1` matches; many paths/rate limits differ |
| 09 Simulation | Offline sim | Implemented in `SimulationService` |
| 10 Payments | Monetization | Stub provider only |
| 11 Errors | Error model | Filter not registered |
| 12 Observability | Logs/metrics | Nest logger + ledger; no Sentry/PostHog |
| 13 Security | Controls | JWT localStorage, in-memory throttle, admin flag |
| 14 Configuration | Env + game.json | Env is `.env.example`; game config is TS + `game_config` table, not JSON files |
| 15 Content data | Data-driven content | Crops/buildings/animals/store yes; NPC/contract/event no |
| 16 Testing | QA | Thin unit tests; live scripts |
| 17 Deployment | DevOps | Local pnpm/supabase only; spec still says npm/Redis |
| 18 Admin | Ops UI | `/admin` implemented; JWT role claim not used |
| 19 Analytics | Metrics | Table exists; no product dashboards |
| 20 MVP plan | Phases 0–7 | Features largely built; checkboxes in 20 still mixed |
| 21 Agent guide | Conventions | Package layout in the guide is outdated |
| 22 UI GX | Motion/feel | Partial |
| 23 Scene renders | Stitch prompts | Backgrounds generated |

ADR-001–012: decisions stand. Unrealized: Phaser host (001/002), Redis (012), Capacitor (011), live payment providers (008), fully data-driven content (009).

---

## Material inconsistencies (spec vs code)

1. **Client split** — Specs: Phaser renders the farm inside Next. Code: React `/game`.
2. **Package manager** — Specs often `npm`. Repo is **pnpm 9** + turbo.
3. **Redis** — Specs list Redis. Not in the stack.
4. **Rate limits** — Spec 08: 100/min global, per-route limits. Code: 60/min flat.
5. **Store size** — Older state docs said 8 SKUs / 6 buildings. Code: **13 SKUs, 7 buildings, 11 crops, 4 animals, 209 assets**.
6. **Admin auth** — Spec: admin JWT role. Code: `profiles.is_admin`.
7. **Env files** — Spec: `.env.development`. Repo: `.env.example` -> `.env.local`.
8. **API modules path** — Agent guide shows `apps/api/src/modules/`. Code: feature folders directly under `src/`.
9. **Phaser port** — Spec 17 put the game at `:3000/game`. That URL is React. Phaser is `:3002`.
10. **db:seed** — README historically documented it. Script target file missing.

---

## Cross-checks that still hold

- Mutations go through Nest (player currency not trusted from the client)
- Simulation state is persisted on farm/crop/livestock/building rows
- Crop economy numbers in `game-config` match the 06 examples (sorghum 5/15, maize 8/20, chicken 50, well 200)
- Auth on player game routes
- RLS present on core player tables

---

## Counts

- Design specs: 23
- ADRs: 12
- Screen DESIGN.md: 5 (Home, Village/Market, Kgotla, Bushveld, Inventory)
- Living operational docs: 7 (including README)

---

## Conclusion

The design suite is still useful as a product bible. It is **not** an implementation log. Agents and humans should start at `DEVELOPMENT_STATE.md` and `KNOWN_LIMITATIONS.md`, then open a numbered spec for intended behavior.
