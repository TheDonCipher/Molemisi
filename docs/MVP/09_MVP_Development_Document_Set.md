# MVP Development Document Set — Master Index

> **Status:** Generated 2026-10-04 for coding agents. **Implementation specification.**
> **Authority chain:** `docs/MVP/01`–`06` (normative; `06` wins on "is it done?") → `docs/MVP/08` (locked decisions, 2026-10-04 rulings) → this set (build instructions) → `docs/DEVELOPMENT_STATE.md` (as-built).
> **Rule of construction:** where this set and `01`–`06` disagree, `01`–`06` win and this set is a bug. Where this set and `DEVELOPMENT_STATE.md` disagree about *what exists today*, `DEVELOPMENT_STATE.md` wins. Every number here is **illustrative of the config**, never a second source of truth — see §4.

---

## 1. What this set is

A single, coding-agent-ready implementation specification for the Molemisi MVP. It converts the narrative spec set (`01`–`08`) plus the verification rubric (`06`) into architectural contracts, schemas, route tables, algorithms and acceptance gates.

**It is scoped to the backend and the data layer.** Per the brief: no UI mockups, no frontend component design, no client-side implementation detail. The React client (`apps/web`) and its `/game` shell are assumed to exist; this set specifies only what the API and database must expose to it.

**In scope (v1, closed loop):** Farm, Kgotla, Bushveld, Market (Co-op only), Economy, Auth, plus the ruled additions (avatar/cosmetics schema, Events live service, achievements).
**Out of scope:** crafting/cooking *product UI* (the recipe tables survive as v1.1 spec-of-record — see §5), the Exchange, withdrawals, voice acting, wildlife raids, boosts.

---

## 2. Document map

| # | Document | Covers | Primary spec anchors |
|---|---|---|---|
| **09** | *this file* | Index, conventions, config canon, glossary | — |
| **10** | `10_System_Architecture.md` | Module breakdown, service boundaries, data flow, contracts | `02 §2`, `03 §8`, `06 §2`, `08` |
| **11** | `11_Database_Schema_And_Migrations.md` | Entities, relationships, migration strategy, reconciliation | `05 §P2/P3/P8/P9`, `04 §10`, `07_Database_Design` |

> ⚠️ **Correction of record (2026-10-04, verified against the repo).** `README.md` and `DEVELOPMENT_STATE.md` both say the schema is **51 migrations, 10 untracked**. That is **stale**. `git ls-files supabase/migrations | grep -c .sql` = **49**, `git status` shows **zero untracked** migrations, and commit **`bf235be`** ("all 10 pending migrations apply on live", 2026-10-03) landed and applied the M-series batch. **The true state is 49 migration files, all committed, all pushed live.** This set uses 49 throughout. The "land the 10 migrations" step in `18 §3.1` is therefore **already done** — kept in the runbook as a verification step, not a pending action.
| **12** | `12_API_Endpoint_Specification.md` | REST routes, request/response schemas, error taxonomy | `04 §11`, `DEVELOPMENT_STATE.md` API inventory |
| **13** | `13_Economy_And_Balance_Engine.md` | Timers, decay, tax, band, Botho, caps — all externalised | `02 §3–§7`, `06 I1–I15` |
| **14** | `14_Deterministic_Simulation.md` | Seeded replayable engine, water-stress, seasons, Kagiso | `03 §1`, `04 §4`, `09_Game_Simulation` |
| **15** | `15_Cosmetics_And_Avatar_System.md` | Data-driven SKUs, 2-layer avatar, two shelves | `08 §10`, `Asset_Manifest_MVP.md` |
| **16** | `16_AntiCheat_And_Validation.md` | Server authority, ledger integrity, idempotency, flags | `06 §2`, `13_Security`, anti-cheat module |
| **17** | `17_Testing_Strategy.md` | The 15 invariants → test matrix; `balance_verify.py` gate | `06 §2–§4`, `16_Testing_and_QA` |
| **18** | `18_Deployment_And_Migration_Checklist.md` | Pre-go-live, reconciliation, sign-off, P0–P10 | `05` phases, `17_Deployment_and_DevOps` |

---

## 3. Reading order for a coding agent

1. Read **09 §4 (config canon)** and **09 §5 (scope fence)** first — they prevent the two most expensive mistakes (hardcoding a number, building a deferred system).
2. Read **10** (architecture) to learn the module boundaries you may not cross.
3. Build in the phase order of **18 §2**, which mirrors `05`'s critical path. Each phase's acceptance criteria are in **17 §5**.
4. Every phase that touches a value must pass `python scripts/balance_verify.py` — see **13 §9**.

---

## 4. The config canon (single source of truth)

**Every numeric value in the game lives in `packages/game-config/`, seeded from there to the database.** Application code must not contain a numeric literal that appears in `02 §6` or `04 §4.2`. This is enforced by test (`06` P1: *"No numeric literal from `02 §6` appears in application code"*).

| Config module | Owns | Spec anchor |
|---|---|---|
| `crops.ts` | 11 crops — seed cost, base value, yield, growth hours, water/hr, thirst | `02 §6.1` |
| `items.ts` | Full item catalogue — slug, category, stack, base value | `02 §6.2` |
| `crafting.ts` | 5 recipes — inputs, fee, timer, unlock condition (v1.1 record) | `02 §6.3` |
| `economy.ts` | Tax, price band, water, storage, land, Botho thresholds, caps, prize, maintenance | `02 §4`, `§6.4–§6.7` |
| `buildings.ts` | 7 buildings — cost, tiers, maintenance cadence | `03 §4`, `02 §7` |
| `livestock.ts` | Animals — feed, produce, decay window | `03 §5` |
| `chapters.ts` | 4 chapters — months, character, market event | `04 §9.2` |
| `bushveld.ts` | Scenes, hotspots, loot tables, Kagiso knobs, `active_months` | `04 §4.2`, `§10` |
| `store.ts` | Villages Pass, both cosmetic shelves, top-up packs. **`BOOSTS` is empty.** | `02 §6.6` |
| `almanac.ts` | Almanac free + pass tracks | `05 §P8` |
| `botswanaTime.ts` | The UTC+2 day boundary — every cap uses this | `06 C5` |

> **Seeding is idempotent.** `pnpm db:seed` run twice must produce zero change on the second run (`06` P1). Config is the input; the database is a materialised view of it.

---

## 5. Scope fence (what NOT to build in v1)

Explicitly deferred or cut. A coding agent that builds any of these has misread the brief.

| Not in v1 | Why | Where it returns |
|---|---|---|
| Crafting / cooking **product UI and endpoint exposure** | D7 ruling 2026-10-04 — MVP is farming-only | v1.1. Recipe data stays seeded as spec-of-record (`02 §6.3`) |
| Exchange (P2P), withdrawals, KYC | v1 ships closed-loop (`01 D12`); gated on B1 legal + B2 PSP | v1.1 — P11–P14 |
| Wildlife raids | Ruling 2026-09-11; no mechanic exists; copy removed | post-launch, same commit as the raid tick |
| Boosts (Pula Stone, Ancestral Ward, Breath of the Land) | Cut from catalogue entirely (`docs/34 §3.3`) | when every effect works |
| Soil degradation | D3 ruling 2026-10-04 | not planned |
| Voice acting | D11 ruling 2026-10-04 — all VO deferred | "later versions" |
| Level / XP system | C12 — deleted, not extended | never |
| `Special` inventory category | R3 — rare finds are journal Discoveries only | never |
| Kgotla renaming | D4 (stands) — farm name only | — |
| 4th Bushveld scene *content* | `01 §6` — slot + gate exist, content post-MVP | post-MVP |

> **Ruled-in for v1 despite being new (D5/D6/D8/D10):** global Kgotla chat (`B1`), player achievements (`B2`), the Events live service (`B3`), the 2-layer avatar (`B4`), the World Tree asset (`B5`), calendar education UI (`B6`), expandable cosmetic SKUs (`B7`). These are *new scope* — they must enter the sprint plan, not be assumed covered.

---

## 6. Glossary

| Term | Meaning |
|---|---|
| **Pula (P)** | Soft currency. Earned only, never sold, never transferable, never withdrawable. |
| **Madi (M)** | Hard currency, 1:1 BWP. **v1: spend-only.** Withdrawable + P2P from v1.1. |
| **Chapter Token / season stamp** | Per-chapter cosmetic currency. **Expires to zero at chapter end.** |
| **Botho** | Community standing. Single canonical number on `player_wallets.botho_points`. Manual acts only, daily-capped. |
| **Kagiso** | Per-scene Bushveld scarcity meter (*peace, stillness*). Computed on read. |
| **Co-op** | NPC buyer. Pula. 5% tax. Price band 0.5×–2.0×. |
| **Exchange** | P2P marketplace. Madi. 10% seller fee. v1.1. |
| **Letsema** | One free instant full-harvest, Botho ≥ 500, 7-day cooldown. |
| **Botho Thresholds** | 100 Bupi · 300 Deep Bushveld / Auto-Feeder · 500 Letsema / Auto-Helper · monthly-prize delta. |
| **Chapter** | One of four 3-month seasons (Sekala sa Pula / Phane / Moriti / Letlhafula). |
| **Invariant (I1–I15)** | A hard, money-or-legal-critical rule, each with its own automated test (`06 §2`). |
| **The gate** | `scripts/balance_verify.py`. If it FAILs, fix the spec, never the script. |
| **Village Pass** | M50/mo subscription: helper (waters+collects) · 1 festival outfit/mo · +50% storage (stacking). |
| **Wave / Pass** | Implementation sequencing terms from `docs/32`; "Wave 1–4" = the decided-economy build order in `docs/34`. |

---

## 7. Standing hazards (from `DEVELOPMENT_STATE.md` + audit)

These are non-obvious and durable. A coding agent will hit all of them.

1. **API tests must run from `apps/api`** — `cd apps/api && node node_modules/jest/bin/jest.js --runInBand`. From the repo root, Jest picks up `.kilo/worktrees/**` and 70+ suites fail spuriously.
2. **Never point the simulator or a dev date-jump at the live Supabase project** — it creates real accounts and mutates real balances. Use a throwaway `molemisi-sim` project.
3. **`supabase db push` applies every pending migration, including other agents'.** Run `supabase migration list --linked` first; if only your migrations show a blank Remote column, the push is safe. A blank Remote column *after* a push means the migration rolled back and was **not** recorded — check for an unbalanced `BEGIN;`/`COMMIT;`.
4. **One balanced `BEGIN; … COMMIT;` per migration file.** A stray `COMMIT;` or an unclosed `BEGIN;` makes `db push` print "Finished" while silently leaving the migration unapplied.
5. **`COMMENT ON … IS 'a' || 'b'` is rejected by Postgres** (SQLSTATE 42601). Use adjacent string literals, never `||`.
6. **The `role`/`is_admin` guard is a DB trigger** (`trg_profiles_guard_role`). Do not attempt to set a role with a plain `UPDATE`; use the `set_role()` / `set_admin()` RPCs (revoked from `anon`/`authenticated`).
7. **`AdminGuard` and `DevGuard` are logically identical** — both admit admin + dev + is_admin. This is audit finding M1, still open. Do not rely on the "AdminGuard is admin-only" claim in older docs.
8. **`game_ledger_entries` is retired** — never write it. The live ledger is `ledger_entries`.
9. **The only sanctioned inventory removal is the `inventory_take(player,item,qty)` RPC** — atomic `WHERE quantity >= qty`. A select-then-update is a TOCTOU (that was C3).
10. **`pnpm` is broken under Git Bash** (real v11 vs pinned v9). New workspace packages need the `importers:` block hand-edited.

---

## 8. Delivery checklist for the coding agent

Before declaring any phase done, confirm:

- [ ] No numeric literal from `02 §6` / `04 §4.2` appears in application code (`06` P1).
- [ ] `python scripts/balance_verify.py` prints **PASS** (`13 §9`).
- [ ] `cd apps/api && node node_modules/jest/bin/jest.js --runInBand` is green.
- [ ] Every invariant touched by the phase has its test (`17 §5`).
- [ ] Every balance write goes through `WalletService.credit/debit` (`16 §3`).
- [ ] The webhook path is idempotent on `provider_tx_id` (`16 §5`).
- [ ] Any new table shipped with a single balanced `BEGIN;…COMMIT;` migration (`18 §4`).

*End of index. Proceed to `10_System_Architecture.md`.*
