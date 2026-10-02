# Documentation Audit

> **Molemisi Farm Management Simulator**
> Status: As-built docs track the repo; design specs are intent.
> **Last updated: 2026-10-02** (prior: 2026-09-14).

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

| Document | Status (2026-10-02) |
| --- | --- |
| README.md | Current — overview, quick start, monorepo, status banner |
| DEVELOPMENT_STATE.md | Current — full as-built inventory |
| DEVELOPMENT_SETUP.md | Current — local setup, CORS, env, test commands |
| ARCHITECTURE_OVERVIEW.md | Current — as-built topology + module map |
| KNOWN_LIMITATIONS.md | Current — the three doc-30 P0s closed; Wave 4 + tooling debt open |
| MVP_COMPLETENESS_AUDIT.md | **Stale** — gate counts and rulings predate the Wave 1–3 build |
| SCAFFOLD_AUDIT.md | Historical pointer (M1 scaffold); minor count updates |
| DOCUMENTATION_AUDIT.md | This file |

---

## Review & reconciliation series (`docs/24`–`docs/30`)

Audit and review passes. These are **ledgers**, not specifications: they record what a pass found,
with evidence, and whether each item has been closed. They do not override `docs/MVP/`.

| Document | Role | Status |
| --- | --- | --- |
| 24 Player Experience Analysis | Four-economy model, session shape, flow health check | Living; §7 risks supplemented by `30` |
| 25 Inventory Item Detail UX | Item-detail presentation | Applied |
| 26 Inventory Crafting System | Crafting system reconciliation | Applied |
| 27 Market Reconciliation | `market_prices` reconciled to the catalogue (38 canonical rows) | Applied 2026-09-24 |
| 28 Reconciliation Verification | Verification of `27` | Applied |
| 29 Kgotla Reconciliation | Charges reconciled to the item catalogue; `acceptCharge` progress bug fixed | Applied 2026-09-24 |
| **30 Gameplay, Visual & Narrative Review** | **Full player-experience audit: 3 P0 defects, 37 findings (G/V/N), a four-pass implementation plan, 7 open rulings** | **P0-1 and P0-2 now CLOSED** (72 h livestock window, 12 h starvation window, self-sustaining from uncapped time, feed now debits rations). **P0-3 partially closed** (reachability improved, art archived; building states + palette pass outstanding) |

---

## Economy & monetization strategy (`docs/33`)

A **strategy / decision register** layered above the numbers. Where it disagrees with `docs/MVP/`, `docs/MVP/` wins and the strategy doc is the proposal (every such point is a labelled decision `D-n` or trade-off `T-n`).

| Document | Role | Status |
| --- | --- | --- |
| 31 Inventory, Crafting, Market, Maintenance & Progression Audit | Systems audit: leak list, ROI, land payback | Audit record; see its §11 P0 |
| 32 Sprint Roadmap *(+ superseded reconciliation)* | Living P0/P1 execution ledger (four passes) | Living; see `32_Sprint_Roadmap.md` |
| **33 Economy & Monetization Strategy** | **The simple, cozy plan (DECIDED 2026-10-01): 2 currencies + 1 meter, 2 store products, Pula income by stage, Botho unlocks, seasons, fairness promise, revenue** | **Living design reference — implementation sequence in `docs/34`** |
| **34 Economy & Monetization Implementation** | **The build sequence for `docs/33`: copy-paste config values, file-by-file tasks, acceptance tests, and the Madi-balance migration plan** | **Waves 1–3 LANDED** (livestock economics, 30-day maintenance, `madi_balance` migration, Madi top-ups, two cosmetic shelves, Village Pass, boosts cut). **Wave 4 partial** — land tail + currency copy done; store UI and automation persistence open |

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

| Document | Role | Implementation notes (2026-10-02) |
| --- | --- | --- |
| 01 Game Design | Product rules | Mostly reflected in API + config; superseded by `MVP/01` for build. Offline cap and currency rules superseded — see `09` and `10` |
| 02 System Architecture | Target topology | Phaser-in-Next and Redis not as drawn; two simulation layers exist (live + pure engine) |
| 03 UI/UX | UX | React screens; Stitch designs in `docs/Screens/` |
| 04 Phaser rendering | Target renderer | **Void** — the standalone Phaser client was deleted 2026-09-11. Nothing in the build follows this document |
| 05 Art direction | Art bible | **§14/§15 rewritten to the real tree**; the 800×600 figure and the atlas conventions were Phaser leftovers. Backgrounds are in `tiles/sky/`, withdrawn art in `_archive/` |
| 06 Economy | Balance | Config + market tables (numbers now live in `MVP/02`) |
| 07 Database | Schema | **39 migrations** (was 16; was 29 as of 2026-09-14; all pushed live) |
| 08 API | Endpoint design | Prefix `/api/v1` matches; many paths differ. Now also has `/admin/economy/*` and `/admin/anti-cheat/*`, which this doc never anticipated |
| 09 Simulation | Offline sim | **§2, §5, §8, §9, §10 rewritten.** Now documents the pure engine, the per-system time-window table, the 12 h starvation window and uncapped building wear |
| 10 Payments | Monetization | Stub provider only; **boosts cut from the catalogue**; the `PaymentProvider` signature in this doc was wrong and is now corrected |
| 11 Errors | Error model | Filter not registered — but §5 corrupted-state recovery is now **implemented** in `state-validation.ts` |
| 12 Observability | Logs/metrics | Nest logger + ledger; no Sentry/PostHog |
| 13 Security | Controls | JWT localStorage, in-memory throttle, admin flag + role, **`PUT /config` now admin-gated**; anti-cheat + state validation shipped |
| 14 Configuration | Env + game config | Env is `.env.example`; game config is TS + `game_config` table (an *override* — TS is the source of truth) |
| 15 Content data | Data-driven content | Crops/buildings/animals/store/crafting yes; NPC/contract/event no |
| 16 Testing | QA | **37 suites / 615 tests** across the workspace; live scripts |
| 17 Deployment | DevOps | Local pnpm/supabase only; spec still says npm/Redis |
| 18 Admin | Ops UI | **Rewritten 2026-10-02** — `/admin` implemented; tier on `profiles`, **no JWT role claim**; economy metrics + anti-cheat review added |
| 19 Analytics | Metrics | `analytics_events` table exists with no query API; the new `economy/` module is the queryable surface |
| 20 MVP plan | Phases 0–7 | **Superseded by `MVP/05`**; features largely built |
| 21 Agent guide | Conventions | Package layout outdated |
| 22 UI GX | Motion/feel | Partial |
| 23 Scene renders | Stitch prompts | **Corrected 2026-10-02** — backgrounds are at `tiles/sky/`, not `backgrounds/`; 7 shipped, not 4 |

ADR-001–012: decisions stand. Unrealized: Phaser host (001/002), Redis (012), Capacitor (011),
live payment providers (008), fully data-driven content (009).

---

## Material inconsistencies (spec vs code)

1. **Client split** — Specs: Phaser renders the farm inside Next. Code: React `/game`.
2. **Package manager** — Specs often `npm`. Repo is **pnpm 9** + turbo.
3. **Redis** — Specs list Redis. Not in the stack.
4. **Rate limits** — Spec 08: 100/min global, per-route limits. Code: 60/min flat.
5. **Versions** — Old docs say `0.1.0` / 16 migrations / 13 SKUs. Code: `game-config`
   `GAME_VERSION = 1.0.0-mvp`, **39 migrations** (all pushed live), and a store with **no boost SKUs at all**.
6. **Admin auth** — Spec 18 said "admin JWT role". Code: no JWT role claim; `profiles.is_admin`
   **or** `profiles.role ∈ {admin, dev}`, queried per request.
7. **Env files** — Spec: `.env.development`. Repo: `.env.example` → `.env.local`.
8. **API modules path** — Agent guide shows `apps/api/src/modules/`. Code: feature folders.
9. **Phaser port** — Spec 17 put the game at `:3000/game`. That URL is React; the standalone
   Phaser prototype (`:3002`) was deleted 2026-09-11.
10. **db:seed** — the root and `apps/api` `package.json` both define it; `src/database/seed.ts`
    does not exist, so the command fails.
11. **Offline caps** — `docs/09` said "24 h for most systems" and the code applied 24 h
    *everywhere*, which silently disabled the livestock self-sustaining and building-wear
    rulings. `docs/09 §9` is now the per-system authority.
12. **Asset paths** — the manifest `group` field is a label, not a path. `backgrounds` maps to
    `tiles/sky/`. Rebuilding a path from the group name yields 404s.
13. **Currencies** — Old specs and code had Pula sold for BWP. Decided 2026-10-01 and now
    implemented: top-ups grant **Madi**; `wallet_apply()` accepts a third currency; there is
    deliberately no conversion function anywhere.

---

## Cross-checks that hold

- Mutations go through Nest (player currency not trusted from the client)
- Simulation state is persisted on farm/crop/livestock/building rows
- Crop economy numbers in `game-config` match the 02 examples (sorghum 5/15, maize 8/20, chicken 50, well 200)
- Auth on player game routes
- RLS present on core player tables
- Livestock is now net-positive per day for all four animals, asserted in `livestock.spec.ts`
- No top-up can credit Pula, asserted in `payments.service.spec.ts`
- No boost SKU exists, asserted in `store.spec.ts`
- Every Festival decoration has a Market-shelf cousin, asserted in `store.spec.ts`

---

## Counts (2026-10-02)

- As-built / living docs: 8 (incl. README)
- Normative MVP specs: 7 (`01`–`07`) + README
- Original design specs: 23 (`docs/01`–`docs/23`) + `20_MVP_Implementation_Plan` + PRD + ROADMAP
- Review / audit / strategy docs: 11 (`24`–`34`)
- ADRs: 12
- Screen DESIGN.md: 5 (`docs/Screens/`)
- Jest: **37 suites / 615 tests** (api 28/417 · game-config 8/163 · validation 1/35)
- Supabase migrations: **39** (all pushed live through `20261002000000`; 0 pending)
- Asset manifest entries: **282** (plus 19 archived files excluded from sync)
- Store categories: `currency` · `subscription` · `cosmetic` (`boost` **removed**)
- Currencies: Pula (earned) · Botho (meter) · **Madi** (spend-only premium)

---

## Conclusion

The design suite is still useful as a product bible and the `docs/MVP/` set is the build
authority. Start at `DEVELOPMENT_STATE.md` and `KNOWN_LIMITATIONS.md`, then open a spec for
intended behavior. The repo is code-complete for v1 and the `docs/33` → `docs/34` economy is
landed through Wave 3. The schema is fully pushed (**39 migrations, 0 pending**); `madi_balance`
and `kgotla_charges` are live, so the store and Year-layer routes resolve against the remote DB.
