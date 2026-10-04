# Document 40: Testing & QA Expansion Plan

> **Molemisi Farm Management Simulator**
> Status: **Actionable plan** (supersedes the "Implementation:" line in `docs/16`)
> Basis: `README.md`, `docs/16_Testing_and_QA_Specification.md`, `docs/MVP/06_Verification_Rubric.md`,
> `docs/DEVELOPMENT_STATE.md`, `docs/KNOWN_LIMITATIONS.md`, and a direct audit of the working tree.
> Last Updated: 2026-10-03

---

## 0. How this plan was produced (measured, not assumed)

Every claim below comes from a command run against the working tree.

| Fact | Measured value | How |
| --- | --- | --- |
| Spec files (api + game-config + validation) | **40** (api 30 · game-config 9 · validation 1) | `Get-ChildItem -Recurse -Filter *.spec.ts` |
| Client (`apps/web`) spec files | **0** | same, over `apps/web/src` (23 `.tsx` components exist) |
| `apps/web` test script | **absent** | `apps/web/package.json` has no `test` key → `turbo test` never touches the client |
| API controllers | **28**, of which **2** have specs (`health`, `wallet`) | filename diff |
| API services with **no** spec | **7** — `admin`, `analytics`, `buildings`, `config`, `database`, `notifications`, `profile` | filename diff |
| Guard/interceptor specs | **0** (`auth`/`admin`/`dev` guards; `rate-limit`/`audit-log` interceptors) | `*-guard*` / `*-interceptor*` search |
| Migration files | **49** (`supabase/migrations/*.sql`) | directory listing (docs variously claim 38 / 39 / 51) |
| Down migrations (`-- +migrate down`) | **0** | grep across all 49 files |
| `coverageThreshold` anywhere | **0** | grep across `apps/api/jest.config.ts`, `packages/*/jest.config.ts` |
| `supertest` in lockfile / API deps | **0 / not listed** | `pnpm-lock.yaml` grep + `apps/api/package.json` |
| `apps/api/test/core-loop.integration.spec.ts` | **291 lines, 22 `it()`s, never executed** | see G-1 |
| `balance_verify.py` in CI | **no** | grep `python|balance|coverage|threshold` in `.github/workflows/ci.yml` → 0 hits |
| CI jobs | `install, lint, typecheck, test, build, simulate` | `ci.yml` |

**Doc drift to fix as part of this work** (it is itself a testable invariant — see DB-10):
the migration-count claims have since been reconciled (2026-10-04) — `README.md`,
`docs/MVP/README.md` and `DEVELOPMENT_STATE.md` all now say **49 migration files, all pushed
live**. The test-count figures still vary by document (`README.md` "592 tests / 35 suites";
`DEVELOPMENT_STATE.md` "470 + 211 tests"). The working tree says **49 migration files,
40 spec files**. Pick one source of truth and assert it in CI.


---

## 1. Gap analysis

Priority: **P0 = ship-blocking / silent-green risk · P1 = required by `docs/16` · P2 = hardening.**

| # | Gap | Evidence | Why it matters | P |
| --- | --- | --- | --- | --- |
| **G-1** | **The only integration suite never runs — for three independent reasons.** | `apps/api/test/core-loop.integration.spec.ts` sits outside `jest.config.ts` `rootDir: 'src'` (so `pnpm test` cannot see it); `apps/api/test/jest-e2e.json` has `testRegex: '.e2e-spec.ts$'` but the file is named `.integration.spec.ts` (so `pnpm test:e2e` cannot see it either); and it imports `supertest`, which is **not installed**. | Requirement 2 ("auth → character → inventory → farming → market → progression") is entirely unverified at the HTTP layer. A green `pnpm test` implies coverage that does not exist. | **P0** |
| **G-2** | **`supertest` is not a dependency.** | 0 hits in `pnpm-lock.yaml`; absent from `apps/api/package.json`. | Requirements 2 and 4 both need it; the existing spec cannot even compile/run. | **P0** |
| **G-3** | **Zero client-side tests.** | 0 specs in `apps/web`; no `test` script; no jsdom/RTL dependency; `turbo test` skips the app. | Requirement 6 (belt-and-suspenders guards, UI validation, error handling) is unmet. The client is where malformed input originates. | **P0** |
| **G-4** | **Zero database tests against real Supabase.** | No test opens a connection; only `apps/api/src/test/fake-supabase.ts` (queue-based mock) is used. `KNOWN_LIMITATIONS.md` says so: "a migration that fails to apply is invisible to `pnpm test`". | Requirement 7. The 49 migrations, FK/CHECK/RLS behaviour and `wallet_apply()` are the game's integrity floor and are unverified. | **P0** |
| **G-5** | **No coverage thresholds, so `docs/16 §2` targets are unenforced.** | 0 `coverageThreshold` keys; `apps/api/jest.config.ts` collects coverage but never evaluates it. | The 95 % target for simulation/economy exists only in prose. | **P1** |
| **G-6** | **Determinism is asserted inline, not as the three required suites.** | `engine.spec.ts` has 3 `it('…DETERMINISTIC…')` cases inside 39 tests; there is **no snapshot suite**, **no replay/recovery suite**, and no `__snapshots__` directory anywhere. | Requirement 3 asks for (a) snapshot, (b) mutation validation, (c) replay/recovery as **separate** suites. Today a refactor can change output shape and still pass, because nothing pins the output bytes. | **P0** |
| **G-7** | **Anti-cheat has no exploit-pattern or CI-surfacing story.** | `rules.spec.ts` (12) + `anti-cheat.service.spec.ts` (17) use fixtures; nothing feeds a *known exploit sequence* end-to-end; nothing asserts the `anti_cheat_flags` unique-open index; no flag counts in CI. | Requirement 4 ("detect known exploit patterns … surface in build reports"). | **P1** |
| **G-8** | **No security tests.** | 0 guard specs; 0 rate-limit specs; no SQLi/XSS/malformed-payload cases; no IDOR matrix. `scripts/test-full-suite.mjs` §15 checks some of this, but manually, against a dev server. | Requirement 4. `docs/13 §3–§6` guards (`AuthGuard`/`AdminGuard`/`DevGuard`, tiered rate limits 10/5/30/100) are load-bearing and untested. | **P0** |
| **G-9** | **7 services and 26 controllers untested.** | See §0 table. Notably `buildings.service.ts` (construction, wear, maintenance) has no spec while `crops`/`livestock`/`market`/`wallet` do. | `docs/16` building target 85/80 cannot be measured, let alone met. | **P1** |
| **G-10** | **No concurrency / idempotency tests.** | Nothing exercises double-submit, parallel plant/sell, or webhook replay. | PSP callbacks retry by design; two racing `sellItem` calls are the classic currency-duplication path (requirement 4). | **P0** |
| **G-11** | **`balance_verify.py` is not a CI gate, and Python↔TS parity is untested.** | 0 hits in `ci.yml`; `balance_verify.py` holds its own `CROPS` table and `TAX = 0.05`, duplicated from `packages/game-config`. | Requirement "run `balance_verify.py` as a gate". Today the doc's numbers and the shipped config can drift apart silently in either direction. | **P0** |
| **G-12** | **Migration integrity is unvalidated, and `db:seed` is broken.** | 0 down migrations; no unique-version assertion; no `supabase migration list` check; root `db:seed` → `apps/api/src/database/seed.ts` **does not exist**; the real seed is `supabase/seed/seed.sql`. | Requirement 7 ("migration rollback safety … seeding reliability"). | **P0** |
| **G-13** | **No performance or load tests.** | No k6, no benchmark; simulator "safeguards" are economic, not latency budgets. | Requirement 8 + `docs/16 §8` targets (p95 < 200 ms, p99 < 500 ms, DB p95 < 50 ms, sim < 100 ms, 100+ users). | **P1** |
| **G-14** | **No machine-readable build reports.** | No `jest-junit`, no coverage artifact, no anomaly report; CI shows console output only. | Requirement: "flag anti-cheat anomalies during test runs and surface them in build reports". | **P2** |
| **G-15** | **Untested pure modules outside the API.** | `packages/simulator` (17 files) has **0 specs**; `packages/game-types`/`packages/shared` have no `test` script. | The simulator is a CI job whose *inputs* are tested but whose *safeguard thresholds* are not. | **P2** |

---

## 2. Test cases

### 2.1 Unit tests (pure functions, no DB, no HTTP)

Convention: colocated `*.spec.ts` next to the module, `rootDir: src` (`apps/api/jest.config.ts`) or `packages/*/src/*.spec.ts`. Keep it.

| ID | File (new/changed) | Setup → Action → Assertion |
| --- | --- | --- |
| **U-01** | `apps/api/src/buildings/buildings.service.spec.ts` (new) | **Setup:** wallet 5 000, tier-1 blueprint queued in `makeFakeSupabase`. **Action:** `constructBuilding()`. **Assert:** fee debits exactly `getBuildingConfig(type).cost`; one `ledger_entries` row with `source='building_construction'`; `construction_ends_at = now + buildHours`. |
| **U-02** | `apps/api/src/buildings/buildings.service.spec.ts` | **Setup:** building at `wear = 0.999`, `wearPerHour = 0.01`. **Action:** `maintainBuilding()`. **Assert:** wear resets to 0, fee == the 30-day maintenance bill rounded to 2 dp, and a second call inside the same 30-day window is rejected (no double-billing). |
| **U-03** | `apps/api/src/common/guards/admin.guard.spec.ts` (new) | **Setup:** fake Supabase returns `{is_admin:false,role:'player'}` / `{role:'admin'}` / `{role:'dev'}` / `{is_admin:true}`. **Action:** `AdminGuard.canActivate(ctx)`. **Assert:** `player` → `ForbiddenException`; the other three → `true`; missing `request.user` → `ForbiddenException`. |
| **U-04** | `apps/api/src/common/guards/dev.guard.spec.ts` (new) | Same matrix for `DevGuard`. **Assert:** `role='dev'`, `role='admin'` and `is_admin=true` pass; `role='player'` throws. |
| **U-05** | `apps/api/src/common/guards/auth.guard.spec.ts` (new) | **Setup:** `verifyToken` → `null` / `{id}` with `is_banned:true` / `{id}` clean. **Action:** `canActivate`. **Assert:** no token → `UnauthorizedException('Missing authentication token')`; bad token → `UnauthorizedException('Invalid or expired token')`; banned → `ForbiddenException`; banned user on a URL containing `/admin/` → **allowed** (the documented intent in `KNOWN_LIMITATIONS.md`). |
| **U-06** | `apps/api/src/common/interceptors/rate-limit.interceptor.spec.ts` (new) | **Setup:** fake `ExecutionContext` for `POST /api/v1/auth/login`. **Action:** invoke 11× in the same millisecond. **Assert:** 1–10 pass, 11th throws HTTP 429; a `GET /farms/current` burst of 200 passes (reads exempt per `docs/13` NFR-SEC-006); the 100/min global backstop still binds on a mutation tier. |
| **U-07** | `apps/api/src/inventory/inventory.service.spec.ts` (extend) | **Setup:** row quantity 3, `take = 3`. **Action:** two `takeItem()` calls via `Promise.all`. **Assert:** exactly one resolves, the other rejects, final quantity is 0 and **never negative** — the `inventory_take` RPC contract asserted at the service boundary. |
| **U-08** | `apps/api/src/wallet/wallet.service.spec.ts` (extend) | **Setup:** botho credited today == `BOTHO_DAILY_CAP - 1`. **Action:** `creditBotho(5)`. **Assert:** exactly 1 credited, one ledger row `source='botho_catchup'`, a second call the same Botswana day credits 0. |
| **U-09** | `apps/api/src/simulation/engine/throughput.spec.ts` (new) | **Setup:** 60 crops × 40 livestock × 10 buildings, `elapsedHours=24`, `seed=1`. **Action:** `runSimulation()` 200×. **Assert:** wall time < 2 000 ms (~10 ms/tick, far inside the 100 ms/farm budget) and `totals.cropsSimulated === 60` — a Jest-speed budget guard that runs on every commit. |
| **U-10** | `packages/game-config/src/economy.spec.ts` (extend) | **Setup:** the shipped `CROPS` table. **Action:** recompute `balance_verify.py` §1 metrics in TS. **Assert:** every crop is 1-day (≤24 h) or 2-day (≥40 h) with **nothing in the 24–40 h dead zone**, and `min(growthHours) >= 12` — the Python gate's `F1` assertion enforced at unit speed. |

### 2.2 Integration tests (Supertest, real HTTP surface)

**Enabling work (blocking, part of Wave 1):**
1. `pnpm --filter @molemisi/api add -D supertest @types/supertest`.
2. Add `apps/api/test/jest-integration.json`: `{ "rootDir": ".", "testRegex": ".*\\.integration\\.spec\\.ts$", "transform": {"^.+\\.ts$": "ts-jest"}, "testEnvironment": "node", "testTimeout": 30000 }` and a `test:integration` script. **Keep `jest.config.ts` `rootDir: src`** so unit runs stay fast; the two configs deliberately cannot see each other's files (that is the bug in G-1 — make it explicit and tested).
3. Extract `test/bootstrap.ts` that reproduces `main.ts` exactly (`api/v1` prefix, `ValidationPipe({whitelist, forbidNonWhitelisted, transform})`, `RateLimitInterceptor`, `AuditLogInterceptor`) so integration and production cannot drift.

| ID | File | Setup → Action → Assertion |
| --- | --- | --- |
| **I-01** | `core-loop.integration.spec.ts` (revive) | Register → login → `GET /farms/current` → plant sorghum → water → advance `last_simulated_at` by 19 h → harvest → sell → buy seed → plant again. **Assert:** each hop's status, Pula strictly increases after the sale, and `seed_sorghum` decrements by exactly 1 per plant. (This file already exists with 22 `it()`s — it needs an owner, a matching glob, and its dependency.) |
| **I-02** | `test/integration/error-paths.integration.spec.ts` | Plant twice on one plot → 400, plot stays `PLANTED`; plant `cropType:'dragonfruit'` → 400 **before** any DB write (assert zero `crop_instances` rows); harvest a `GROWING` crop → 400 `CROP_NOT_READY` **and** an `anti_cheat_flags` row of kind `sequence_violation` (detection is a side effect of a rejected action, per `docs/13 §9`). |
| **I-03** | `test/integration/market.integration.spec.ts` | Quote then sell 5 sorghum. **Assert:** `quote.net === sell.net` to the cent; `gross - net === 5 %`; selling `seed_*` → 400; buying out-of-season seed → 400 naming the returning chapter. |
| **I-04** | `test/integration/wallet-ledger.integration.spec.ts` | Snapshot wallet + ledger, then run co-op sale, seed purchase, water refill, craft fee. **Assert:** `sum(ledger.amount, currency='pula') === wallet.pula_balance - signup_grant` after every hop, and no row has a negative `balance_after`. |
| **I-05** | `test/integration/progression.integration.spec.ts` | Drive a documented gate (chapter completion → next chapter; Kgotla charge → real catalogue item). **Assert:** calling the next endpoint directly is rejected (a gate cannot be skipped), and `acceptCharge` reports the objective item progress, **not** the player's regard — the doc29 bug as a permanent regression test. |
| **I-06** | `test/integration/concurrency.integration.spec.ts` | Hold 20 sorghum, then fire `POST /market/sell {quantity:20}` ×5 via `Promise.all`. **Assert:** exactly one 201 and four 400s; wallet credited **once**; inventory 0; no negative row anywhere. |
| **I-07** | `test/integration/concurrency.integration.spec.ts` | Fire the **same** payments webhook body 5× (`Promise.all`). **Assert:** one credit, four no-ops/409s, exactly one `real_world_transactions` row for that `provider_tx_id` (UNIQUE), `madi_balance` credited once — this is the P2 done-criterion ("a replayed webhook credits exactly once") proven end-to-end. |
| **I-08** | `test/integration/idor.integration.spec.ts` | Player B calls every owner-scoped route with A's IDs (`farmId`, `plotId`, `cropId`, `animalId`, `buildingId`). **Assert:** 403/404 for all, and A's rows are byte-identical afterwards (re-read with the service role). |
| **I-09** | `test/integration/livestock.integration.spec.ts` | Buy a chicken → per-kraal feed → skip 13 h → feed again. **Assert:** each feed debits `feedPerDay` sorghum per animal atomically; no health decay before the 12 h starvation onset; the per-kraal call equals the sum of the per-animal calls to the unit. |
| **I-10** | `test/integration/offline-sim.integration.spec.ts` | Set `last_simulated_at = now − 96 h`, then `GET /farms/current`. **Assert:** `awayHours ≈ 96`, `appliedHours === 24` for crops, livestock `selfSustaining === true`, building wear accrued over the **full** 96 h (uncapped), and one welcome-back notification per system (no duplicates). |

### 2.3 Deterministic simulation tests — three suites, three questions

`docs/09 §10` promises `last_simulated_at + elapsed + state + rules = new state`, reproducibly. Three separate files, one per validation approach, so a failure names the *kind* of regression rather than "the engine changed".

**(a) Snapshot comparison — `apps/api/src/simulation/engine/determinism.snapshot.spec.ts`**

| ID | Setup → Action → Assertion |
| --- | --- |
| **D-01** | **Setup:** one canonical fixture set (`fixtures/engine/typical.ts`): 8 crops (one WITHERED), 4 livestock (one sick), 3 buildings (one `MAINTENANCE_NEEDED`), `elapsedHours ∈ {0.5, 6, 24, 73, 240}`, `seed ∈ {1, 42, 9001}`. **Action:** `expect(normalise(runSimulation(input))).toMatchSnapshot()`. **Assert:** 15 committed snapshots under `__snapshots__/`. Any numeric or shape change now fails loudly and must be justified in the PR that changes it. |
| **D-02** | **Setup:** identical input, `seed=1`, 1 000 iterations. **Action:** serialise every output. **Assert:** all 1 000 strings are identical — proves no clock read, no `Math.random`, no global-RNG bleed across calls (stronger than the single-call inline check that exists today). |
| **D-03** | **Setup:** `seed=1` vs `seed=2`, everything else identical. **Action:** run both. **Assert:** `output.weather` differs **and** `output.totals.cropsSimulated` is equal — the seed drives only the stochastic part, and `createRng().fork()` isolation holds (adding a weather draw must not shift a crop draw). |

**(b) State mutation validation — `apps/api/src/simulation/engine/mutation.spec.ts`**

| ID | Setup → Action → Assertion |
| --- | --- |
| **D-04** | **Setup:** fixed `now`, `elapsedHours=24`, sorghum `growthHours=18`, hydration 1.0. **Action:** compare `output.crops[0]` against input. **Assert:** progress advanced by exactly `24 × seasonGrowthModifier` (RNG-free), `growthStage === stageFor(progress)`, `lifecycle === 'READY'`, `ready === true`. |
| **D-05** | **Setup:** hydration 0, `elapsedHours=7`. **Action:** run. **Assert:** `withered === true`, `health === 0`, progress unchanged — **no progress while dry**, and withering lands in the documented 6–8 h band (the `docs/16 §2` example vector, corrected to the real `CROPS` table). |
| **D-06** | **Setup:** livestock `hunger=0`, `hungerZeroSince = now − 13 h`, `elapsedHours=24`. **Action:** run. **Assert:** health decayed and `isSick === true` (12 h onset respected), `hungerZeroSince` preserved by a tick that never fed the animal, and a *fed* animal's clock resets to `null`. |
| **D-07** | **Setup:** `elapsedHours ∈ {72, 73, 240}`. **Action:** run. **Assert:** at ≤72 h full decay; at ≥73 h `selfSustaining === true` with hunger floored at 0.1, no production and no health/happiness decay — **while crops stay capped at 24 h and building wear uses the full 240 h**. Three windows, one input; this is the `engine/time.ts` reconciliation as an executable assertion. |
| **D-08** | **Setup:** building `state='MAINTENANCE_NEEDED'`, `wear=1.0`, `lastMaintainedAt` overdue; plus a second building mid-construction. **Action:** run. **Assert:** the overdue building escalates to `DISABLED`; wear is uncapped; the mid-construction building completes on its **absolute** `constructionEndsAt`, not on the elapsed window. |

**(c) Replay / recovery integrity (anomaly detection) — `apps/api/src/simulation/replay.spec.ts`**

| ID | Setup → Action → Assertion |
| --- | --- |
| **D-09** | **Setup:** run `simulateFarm(farmId, now, seed)` against the fake-Supabase queue and capture `{input, output}`. **Action:** rebuild a `SimulationInput` from the *persisted* output rows and re-run with the same `(now, seed)`. **Assert:** the second output is byte-identical to the first — the persistence round-trip loses and reorders nothing. This is the "anomaly detection" tripwire for a column added to the write path but forgotten in the read path. |
| **D-10** | **Setup:** one corrupted snapshot per `ValidationCode` — `NEGATIVE_CURRENCY`, `NEGATIVE_BOTHO`, `NEGATIVE_INVENTORY`, `ORPHAN_CROP`, `STALE_SIMULATION`, `FUTURE_SIMULATION`, `PLOT_WITHOUT_CROP`. **Action:** `validateGameState()` → `planRecovery()`. **Assert:** each code maps to its named action (`SET_CURRENCY_ZERO`, `SET_BOTHO_ZERO`, `SET_INVENTORY_ZERO`, `REMOVE_ORPHAN_CROP`, `RERUN_SIMULATION`) and the plan is **data only** — no row is written, no state mutated. |
| **D-11** | **Setup:** one 240 h tick **vs** five sequential 48 h ticks from the same start state. **Action:** compare final state. **Assert:** livestock identical (same 72 h window); crops agree on `lifecycle`/`growthStage` with progress divergence permitted **only** by the documented 24 h cap, asserted numerically. Documented divergence passes; anything else fails. |
| **D-12** | **Setup:** a tick that crosses a chapter boundary (`pula → phane`). **Action:** run with the boundary chapter injected as `input.chapter`. **Assert:** `seasonChanged === true`, `newSeason === 'phane'`, exactly one season notification, and the growth modifier applied is the **new** chapter's — the "one calendar" rule (`docs/37 §Pass 3.1`). |
| **D-13** | **Setup:** capture the exploit ledger fixture (P13 000 credited in 24 h + a buy→sell flip at +120 s + an unexplained inventory gain of 40) and run `AntiCheatService` twice. **Action:** diff the two `Flag[]` arrays and count persisted rows. **Assert:** identical kinds/severities/evidence both runs, one row per open flag (the unique-open index suppresses the duplicate) — determinism extended from simulation to **detection**, so a flag storm cannot silently change a build's anomaly report. |
| **D-14** | **Setup:** a farm whose `last_simulated_at` is **in the future** (`now + 48 h`). **Action:** `simulateFarm()` + `validateGameState()`. **Assert:** `FUTURE_SIMULATION` flagged (critical), elapsed time treated as 0 (never negative), simulation is a no-op that records nothing, and an `anti_cheat_flags` row of kind `corrupted_state` carries `evidence.code === 'FUTURE_SIMULATION'` plus the recovery plan. |

### 2.4 Security tests

Files: `apps/api/test/security/*.security.spec.ts` (HTTP layer, Supertest) and `apps/api/src/**/*.guard.spec.ts` / `*.rules.spec.ts` (pure unit layer).

| ID | File | Setup → Action → Assertion |
| --- | --- | --- |
| **S-01** | `test/security/authz-matrix.security.spec.ts` | Enumerate all 28 controllers from the compiled Nest router (`app.getHttpServer()._events`) and, for each route, call it with (a) no token, (b) a player token, (c) an admin token, (d) a dev token. **Assert:** the guard table below holds for every route; **a route that is neither guarded nor on the explicit public allow-list (`/health`, `/auth/register`, `/auth/login`, payments webhook) fails the test.** A new unguarded endpoint cannot ship. |
| **S-02** | same | **Assert detail:** `@UseGuards(AuthGuard, AdminGuard)` routes (`/admin/*`, `/anti-cheat/*`, `/economy/*`, `PUT /config/*`) → player 403; `@UseGuards(AuthGuard, DevGuard)` (`/dev/*`) → player 403, admin 200; `monetisation` admin route 403 for player; all `AuthGuard`-only routes 401 without a token. |
| **S-03** | `test/security/injection.security.spec.ts` | Send `'; DROP TABLE farms; --`, `1 OR 1=1`, `\u0000`, a 1 MB string, `__proto__`/`constructor.prototype` keys, and a nested object where a string is expected into `cropType`, `itemType`, `name`, `displayName`, webhook `payload`. **Assert:** 400 (validation) or 200-with-no-effect — never 500; `farms` still exists; the response JSON never echoes raw HTML (`<script>` is escaped or rejected); `forbidNonWhitelisted` strips the pollution keys. |
| **S-04** | `test/security/wallet-integrity.security.spec.ts` | Attempt every currency-duplication vector: negative quantity sell (must be refused before crediting), concurrent sells (I-06), duplicated webhook (I-07), fractional quantity (`1.5` → 400), `NaN`/`Infinity`/`1e9` amounts, and a `madi → pula` path. **Assert:** **no route or service can move Pula out of nothing**; total Pula supply is monotonic except for documented sinks; `madi` can never be converted (the absence of that helper is the invariant — assert it reflectively like `wallet.service.spec.ts` already does for transfers). |
| **S-05** | `test/security/wallet-integrity.security.spec.ts` | Call every `WalletService` public method reflectively and assert **no method takes two player-ish params** (`/^(player|from|to|sender|recipient|target|beneficiary|user|owner)/i`) — extend the existing reflection test from `WalletService` to `PaymentsService`, `MarketService`, `ContractsService`, `KgotlaService`. **Assert:** zero P2P movement methods exist anywhere in the API. |
| **S-06** | `apps/api/src/anti-cheat/exploits.spec.ts` (new, unit) | Feed the four known exploit patterns as fixtures: **E1** rapid credit (>P10 000/24 h), **E2** cost bypass (a build with no `refId` debit row), **E3** inventory manipulation (`player_inventory` grows with no crediting ledger row), **E4** market flip (buy→sell inside `minFlipSeconds = 300`). **Assert:** each yields its exact `FlagKind` (`rapid_currency_gain`, `cost_bypass`, `resource_without_source`, `market_manipulation`) at the documented severity, and an at-par round-trip (`sell price == buy price`) yields **none** (the "normalisation, not unit bias" guard). |
| **S-07** | `apps/api/src/anti-cheat/thresholds.spec.ts` (new) | Boundary-probe `ANTICHEAT_THRESHOLDS`: P10 000/24 h exactly → no flag; P10 000.01 → flag; flip at 299 s → flag, 300 s → no flag; price band 0.5/2.0 inclusive. **Assert:** thresholds are asserted at the boundary and one unit past it (the `docs/MVP/06 §I12` "boundary + one unit" style). |
| **S-08** | `test/security/anticheat-rls.security.spec.ts` (DB) | Using the **anon** key + a real player JWT, `GET /rest/v1/anti_cheat_flags`. **Assert:** 200 with `[]` or 403 — **never rows**; using the service role returns rows. Players must not be able to read their own flags (`KNOWN_LIMITATIONS.md` states this; nothing enforces it today). |
| **S-09** | `test/security/rate-limit.security.spec.ts` | Burst the documented tiers: `/auth/login` 11× (11th → 429), `/payments/*` 6× (6th → 429), mutations 31× (31st → 429), reads 200× (all 200). **Assert:** the tier table is enforced per user+endpoint, and a **different** user is unaffected (the key is `endpoint+user`, not global). |
| **S-10** | `test/security/webhook.security.spec.ts` | POST the payments webhook with (a) a valid HMAC over the **raw body**, (b) a signature computed over a re-serialised body (must fail — the A7 fix), (c) no signature, (d) a tampered body with the original signature. **Assert:** only (a) is accepted; (b) proves the verifier uses `req.rawBody` and not `JSON.stringify(body.payload)`. |

### 2.5 Game logic tests

Cross-referenced against `scripts/balance_verify.py` §1–§8 and `docs/MVP/02 §6.1`.

| ID | File | Setup → Action → Assertion |
| --- | --- | --- |
| **GL-01** | `packages/game-config/src/crops.spec.ts` (extend) + `apps/api/src/simulation/engine/crops.logic.spec.ts` (new) | **Crop growth by hydration and elapsed hours.** For each of the 11 crops sweep `hydration ∈ {0, 0.25, 0.5, 1.0}` × `hours ∈ {1, 6, 18, 24}`. **Assert:** progress is monotonically non-decreasing in both; `hydration = 0` yields **no** progress (with `stalled = true`, the F17 telemetry) and withers inside 6–8 h; `growthStage` never exceeds 3; `fertilizerActive` multiplies growth by exactly `fertilizerBonus` for the stage-bounded window. |
| **GL-02** | `packages/game-config/src/crops.spec.ts` | **Season effects.** For each chapter (`pula`, `phane`, `moriti`, `letlhafula`) assert `chapterWeather(chapter).growthModifier` is applied per crop, and that the **seed stocking gate** matches the chapter list: a seed in `CHAPTERS[n].stocked` buys in season, everything else → 400 naming the returning chapter. **Assert:** no seed is purchasable in all four chapters (that would be the doc31 P0-1 market-buy arbitrage). |
| **GL-03** | `packages/game-config/src/livestock.spec.ts` (extend) | **Feed economics, per animal.** For chicken / guinea fowl / goat / cow: `netPerDay = productValue × yield − feedPerDay × feedUnitValue` must be **positive**, with the exact documented margins (P14 / P7 / P21 / P27), all below morula (P40.63), and **no animal eats herbs** (the P0-2 feed-map bug). **Assert:** the payback window stays inside the documented bound, so re-mapping any feed breaks this test. |
| **GL-04** | `apps/api/src/livestock/livestock.logic.spec.ts` (new) | **Animal state transitions.** health/hunger/happiness matrices: 12 h starvation onset, 72 h decay window, self-sustaining beyond 72 h (hunger floored at 0.1), production only while fed and healthy, happiness decay only after >24 h of neglect, `is_sick` at `< 0.3` health **with a working recovery path** (feeding restores health — the P0-1 soft-lock regression). |
| **GL-05** | `apps/api/src/buildings/buildings.service.spec.ts` (new) | **Buildings (7 types).** Per type: construction cost == config, duration == `buildHours`, wear rate == `wearPerHour`, `MAINTENANCE_NEEDED` exactly at `wear >= 1.0`, `DISABLED` once overdue, effects applied (water source/borehole raising the water ceiling, storage tiers raising capacity, kraal capacity), and **no building grants XP/level** (intentionally removed — assert zero `xp`/`level` symbols in the building path). |
| **GL-06** | `apps/api/src/crafting/crafting.service.spec.ts` (extend) | **Recipes.** Every recipe closes horizontally: `sum(inputs at base value) + profit == output value` (±0.005), `profit > 0` (a losing recipe is a trap, not a choice), and every craft timer **≥120 minutes** (`balance_verify.py` §7 `F14`). A batch of 6 costs 6× materials — the historical batch-duplication bug, now permanent. |
| **GL-07** | `apps/api/src/market/market.service.spec.ts` (extend) | **Market pricing.** Raw goods use the 0.5–2.0 band; crafted/processed (`DITSALO`, `DIKUNO`) use the 0.9–1.1 band; seeds are **never sellable**; the 5 % Co-op tax is taken on gross; `quote` and `sell` agree to the cent; a price outside the band can never be persisted (`market_prices` reconciliation as the reference data). |
| **GL-08** | `apps/api/src/economy/economy.exploits.spec.ts` (new) | **No exploit loops.** Model four 30-day player paths — all-1-day crops, all-2-day crops, livestock-only, Bushveld-only. **Assert:** (a) no path compounds without paying each step's cost in the same step; (b) Bushveld income **never exceeds** the best farm path (`balance_verify.py` §8 structural invariant, currently accepted as a telemetry question); (c) the sorghum→morula spread stays inside the documented window. |
| **GL-09** | `apps/api/src/economy/economy.metrics.spec.ts` (extend) | **Supply, demand and inflation bounds.** `inflationRate`, `priceDrift`, `supplyFlag`, `transactionVelocity`, `giniCoefficient`, `percentile`, `summarizeBalances`, `progressionBottlenecks` each get boundary cases: empty sample → 0; single holder → Gini 0; perfect inequality → Gini → 1; inflation above the band raises `supplyFlag`; a 30-day window with hard sinks (maintenance, land, water) keeps Pula supply from running away. |
| **GL-10** | `apps/api/src/progression/progression.service.spec.ts` (extend) | **Progression gates.** Chapters advance only on completion; every Kgotla charge maps to a **real, obtainable catalogue item** (no charge references a withdrawn asset: pig, saffron, greenhouse, borehole); Botho/House-Pass accrual respects the daily cap; a gate cannot be skipped or replayed for double rewards (idempotency by `refId`). |

### 2.6 Client-side tests

**Enabling work:** add `jest`, `ts-jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` to `apps/web`; add `apps/web/jest.config.ts` (`testEnvironment: 'jsdom'`, `setupFilesAfterEach: ['./jest.setup.ts']`, `testRegex: '.*\\.spec\\.tsx?$'`) and a `test` script so `turbo test` finally covers the client. 23 components exist today with no tests.

| ID | File (new) | Setup → Action → Assertion |
| --- | --- | --- |
| **CL-01** | `apps/web/src/components/CurrencyGuide.spec.tsx` | Render the currency `?` guide. **Assert:** Pula / Botho / Madi / Chapter Token are each explained and the copy states Kagiso is **not** a currency (the currency-clarity requirement) — dropping a currency from the copy fails the build. |
| **CL-02** | `apps/web/src/components/HeaderNav.spec.tsx` + `MobileFooterNav.spec.tsx` | **Assert:** exactly 4 primary destinations (Farm · Kgotla · Bushveld · Market) plus More; each destination resolves to a route that exists in `apps/web/src/app`; no dead link (the hybrid-navigation reconciliation). |
| **CL-03** | `apps/web/src/components/ToastNotification.spec.tsx` | Render with an error payload. **Assert:** the message renders as **text** (never `dangerouslySetInnerHTML`), auto-dismisses on the documented timer, and an `aria-live` region announces it. |
| **CL-04** | `apps/web/src/lib/gameState.spec.tsx` | Mock `fetch` returning 401, then 500, then a valid farm. **Assert:** the provider surfaces a recoverable error state (no infinite retry loop, no hung request — the shell P0 fix), retries as designed, and renders the farm once the API recovers. |
| **CL-05** | `apps/web/src/lib/playerActions.spec.ts` | **Client/API validation parity (belt-and-suspenders).** Table-driven: the client must reject the *same* payloads the API rejects — negative/zero/fractional quantity, unknown `cropType`, `seedId` not in `getItemDef()`, over-max farm name — **using the shared `@molemisi/validation` schemas**, not a hand-rolled copy. **Assert:** each invalid payload never reaches `fetch`. |
| **CL-06** | `apps/web/src/lib/playerActions.spec.ts` | **Assert:** the API base URL comes from `NEXT_PUBLIC_API_URL` only — a source scan finds **no** hard-coded `localhost:3001` literal in `apps/web/src` (the closed shell P0), and no `localhost:3000` literal in `apps/api/src`. |
| **CL-07** | `apps/web/src/components/screens/FarmScreen.spec.tsx` | **Assert:** a READY crop shows the harvest affordance, a WITHERED crop shows the withered treatment, a `seasonChanged` welcome-back flag renders the season banner exactly once, and a plot with an action in flight cannot be double-tapped (button disabled / optimistic lock). |
| **CL-08** | `apps/web/src/lib/kgotla.spec.ts` + `store.spec.ts` | **Assert:** the Kgotla charge progress shown in the UI is computed from **objective item counts**, not regard (mirrors I-05 at the client layer), and the store refuses a purchase when `madiBalance < price` **before** calling the API. |

### 2.7 Database tests (live Supabase — cloud-hosted PostgreSQL)

**Enabling work (blocking):** FK/CHECK/RLS/catalog assertions need direct Postgres access. Add a `SUPABASE_DB_URL` (pooler) secret **alongside** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (the service-role key is a JWT, **not** the DB password — `KNOWN_LIMITATIONS.md`), add `pg` as an API dev dependency, and add `apps/api/test/jest-db.json` (`testRegex: '.*\\.db\\.spec\\.ts$'`, `maxWorkers: 1` — these mutate real rows and must run serially). `scripts/live-db-audit.mjs` (already in the tree, read-only REST + service role) is the precedent for live access and is reused for read-only assertions.

| ID | File (new) | Setup → Action → Assertion |
| --- | --- | --- |
| **DB-01** | `test/db/schema-integrity.db.spec.ts` | **Assert:** every table the code reads exists with its expected columns (`farms`, `farm_plots`, `crop_instances`, `livestock`, `buildings`, `player_wallets`, `ledger_entries`, `player_inventory`, `item_definitions`, `market_prices`, `market_transactions`, `crafting_jobs`, `crafting_recipes`, `storage_tiers`, `kgotla_charges`, `kgotla_projects`, `player_chapter_state`, `chapters`, `anti_cheat_flags`, `payments`, `real_world_transactions`, `game_config`, `config_audit_log`, `economy_price_snapshots`, `profiles`, `busy`), and that `supabase migration list` reports **0 pending** against the linked project. |
| **DB-02** | `test/db/constraints.db.spec.ts` | **FK:** `farm_plots(farm_id='nonexistent')` rejects; deleting a farm cascades to plots/crops/animals/buildings. **UNIQUE:** a second `farms` row per user rejects; two `real_world_transactions` with one `provider_tx_id` reject. **CHECK:** `ledger_entries.currency` rejects an unknown value; negative balances reject (M3); `wallet_apply` refuses to drive Pula below 0. Every probe cleans up after itself. |
| **DB-03** | `test/db/rpc-contracts.db.spec.ts` | **Assert:** the live RPCs exist and are privilege-audited — `wallet_apply`, `plant_crop_transaction`, `inventory_take`, `spend_chapter_tokens`, `economy_snapshot_prices`, plus the Botho-cap and Kgotla-charge helpers; `EXECUTE` is **revoked from `anon`/`authenticated`** where the M2 migration says so; each RPC is atomic (a forced mid-call failure leaves the balance unchanged). |
| **DB-04** | `test/db/rls.db.spec.ts` | For each RLS-enabled table assert policy counts and **effective** access: a player JWT reads only its own rows (farms/plots/crops/livestock/buildings/inventory/wallet/ledger) and **cannot** read `anti_cheat_flags` (see S-08), `config_audit_log`, or another player's `payments`; admin/dev can. **Assert:** zero `public` tables with RLS disabled. |
| **DB-05** | `test/db/migration-integrity.db.spec.ts` | **Assert:** the 49 local migration filenames have **unique 14-char version prefixes** (a duplicate version breaks `supabase migration list` silently), sort monotonically, and are each either applied or explicitly pending. **Assert:** every file contains at least one `CREATE`/`ALTER`/`INSERT`/`GRANT` statement — no empty placeholder (the m8/m20 regression fixed in `bf235be`). |
| **DB-06** | `test/db/migration-replay.db.spec.ts` | **Rollback safety without down-migrations.** Supabase applies forward-only, so "rollback" means **replayability**: on a throwaway local stack, `supabase db reset` applies all 49 files from scratch with exit 0; run the set a second time on a fresh reset and assert an identical schema hash (`pg_dump --schema-only` diff). **Assert:** no migration depends on an untracked manual step and none is order-fragile on a fresh reset. |
| **DB-07** | `test/db/migration-rollback-safety.db.spec.ts` | **Assert the documented rollback story:** every migration is either (a) additive/idempotent (`IF NOT EXISTS`, `DROP … IF EXISTS`) so re-running is safe, or (b) listed in a new `supabase/MIGRATIONS_ROLLBACK_NOTES.md` with its inverse SQL. The test fails for any migration that is neither — forcing the decision to be explicit for all 49. One destructive migration (`drop_obsolete_plant_crop_overloads`) is exercised end-to-end: apply → re-apply → apply its documented inverse → assert the pre-state schema. |
| **DB-08** | `test/db/seed-consistency.db.spec.ts` | **Seeding.** `supabase/seed/seed.sql` must be **idempotent**: apply twice on a reset DB and assert identical row counts. **Assert:** `item_definitions` matches `packages/game-config` (the 13 previously-unsellable items reconciled), **no orphan prices**, no seed without a price, no price without a definition, and crops (11) / animals (4) carry the documented base values (sorghum P3 … morula P46). |
| **DB-09** | `test/db/seed-command.db.spec.ts` | **Assert the `db:seed` defect is closed:** either `pnpm db:seed` exits 0 **and** populates `item_definitions`, or the script is removed from both `package.json` files. A test asserting "the documented command works" is what stops a dead script surviving another release. |
| **DB-10** | `test/db/doc-drift.db.spec.ts` | **Assert the docs match reality:** parse `README.md`, `DEVELOPMENT_STATE.md`, `docs/MVP/README.md` and assert their migration/test counts equal the measured values (49 files; the Jest total). Where a count cannot be auto-checked, require an explicit `<!-- doc-count: 49 -->` marker. Doc drift becomes a build failure instead of a Monday surprise. |
| **DB-11** | `test/db/query-performance.db.spec.ts` | **Assert p95 DB query time < 50 ms** on the hot paths: farm load (farms → plots → crops → livestock → buildings), wallet + ledger read, market prices by chapter, inventory by player, anti-cheat passive sweep. Each runs 100× with `EXPLAIN (ANALYZE, BUFFERS)` captured; **assert** the plan uses index scans (no Seq Scan on `ledger_entries` / `player_inventory`) and every query is inside budget. Feeds §5 with real numbers. |

### 2.8 Performance & load tests (k6 + Jest budgets)

Artifacts: `perf/k6/` (`smoke.js`, `typical.js`, `peak.js`, `sim-heavy.js`, `README.md`) and `perf/thresholds.json`. k6 is a **binary**, not a pnpm dependency — install in CI with `grafana/setup-k6-action`. Thresholds live **in the script** so a regression fails the run itself, not a human reading the summary.

| ID | File | Setup → Action → Assertion |
| --- | --- | --- |
| **PF-01** | `perf/k6/smoke.js` | **1 VU, 60 s**, every documented route in sequence (register/login/farm/plant/water/harvest/sell/buy). **Assert (`thresholds`):** `http_req_failed < 1 %`, `p(95) < 200 ms` — a fast, cheap gate that fails on a catastrophic regression before the heavy runs start. |
| **PF-02** | `perf/k6/typical.js` | **Ramp 0 → 50 VUs over 1 m, hold 5 m, ramp-down 1 m**, weighted realistic mix (60 % `GET /farms/current`, 15 % plant, 10 % water, 10 % market, 5 % misc). **Assert:** `p(95) < 200 ms`, `p(99) < 500 ms`, `http_req_failed < 1 %`, `checks > 99 %`. |
| **PF-03** | `perf/k6/peak.js` | **Ramp 0 → 120 VUs over 2 m, hold 5 m** (the docs/16 "100+ concurrent users" target, with headroom). **Assert:** `p(95) < 200 ms`, `p(99) < 500 ms`, zero 5xx, and the API's tiered rate limiter returns 429 (not 500) under burst — a load test that also proves the limiter degrades gracefully. |
| **PF-04** | `perf/k6/sim-heavy.js` | Each VU keeps a farm with 20+ plots and 4 animals and returns after a forced 24 h absence (`last_simulated_at` moved), so every call runs a full `simulateFarm`. **Assert:** **`simulateFarm` p95 < 100 ms** and p99 < 200 ms, measured end-to-end from the HTTP response plus the `simulation_ms` log line. This is the farm-simulation budget from `docs/16 §8`. |
| **PF-05** | `apps/api/src/simulation/engine/throughput.spec.ts` | The Jest-level sibling of PF-04: `runSimulation` throughput on the worst-case fixture (60 crops / 40 animals / 10 buildings) must stay under ~10 ms/tick. **Assert:** the pure engine never becomes the API's bottleneck, and the budget is checked on every commit without running k6. |
| **PF-06** | `perf/k6/db-query.js` + DB-11 | **Assert:** DB p95 < 50 ms for the hot queries (measured in DB-11 via `EXPLAIN (ANALYZE)`), and `pg_stat_statements`-style top-5 slowest statements stay inside budget after a peak run — i.e. the load test's own queries do not leave a slow path behind. |
| **PF-07** | `perf/k6/regression-baseline.json` + CI step | **Assert:** each run's `p95`/`p99`/`http_req_duration` is compared to the committed baseline with a **10 % tolerance**; a run more than 10 % slower on any threshold **fails the build** with the delta printed. Baselines are updated only by an explicit `--update-baseline` commit, so performance drift is a decision, not an accident. |

---

## 3. Implementation roadmap

Sequencing rule: **security and determinism first** — they protect the two things that cannot be fixed after the fact (money and reproducibility).

### Wave 0 — Make the suite honest (½ day, P0) — no new coverage, only truth

1. Add `supertest` + `@types/supertest` to `apps/api`; add `apps/api/test/jest-integration.json`; rename or re-glob `core-loop.integration.spec.ts` so it runs; extract `test/bootstrap.ts` (**G-1, G-2**).
2. Add `apps/api/test/jest-db.json` + `pg` + `SUPABASE_DB_URL` wiring (**G-4**).
3. Add `coverageThreshold` to `apps/api/jest.config.ts` with the `docs/16` values, starting at the **minimum** column (**G-5**).
4. Add `jest-junit` reporters + coverage/k6/anomaly artifacts to CI (**G-14**).
5. **Exit:** `pnpm test` still green, `pnpm test:integration` executes ≥ 22 tests, a coverage summary artifact is uploaded, and CI fails if the coverage minimum is missed.

### Wave 1 — Security + determinism gates (3–5 days, P0)

*Security:* S-01/S-02 (authz matrix), S-03 (injection), S-04/S-05 (wallet integrity + reflection), U-03–U-06 (guards, rate limiter), S-06/S-07 (exploits + thresholds), S-10 (webhook raw body).
*Determinism:* D-01–D-03 (snapshots), D-04–D-08 (mutation), D-09–D-14 (replay/recovery), D-13 (detection determinism).
*Exit:* every security and determinism case blocking in CI; snapshots committed; `anti-cheat` anomaly report artefact produced by the test run.

### Wave 2 — Integration + concurrency (3–4 days, P0)

I-01–I-10, plus U-07/U-08 (atomic take, Botho cap), I-06/I-07 (concurrency), I-08 (IDOR).
*Exit:* the full journey (auth → farm → inventory → market → progression) is proven over HTTP; every concurrency case asserts *exactly one* success.

### Wave 3 — Database + balance gates (2–4 days, P0/P1)

DB-01–DB-11; `balance_verify.py` wired as a CI job; the Python↔TS parity case (U-10); `db:seed` fixed or removed (DB-09).
*Exit:* 0 pending migrations asserted against the linked project; replay from scratch proven; `balance_verify.py` blocks the build.

### Wave 4 — Client + coverage depth (3–4 days, P1)

`apps/web` jest setup + CL-01–CL-08; `buildings`/`notifications`/`profile`/`admin`/`analytics`/`config` service specs (G-9); 26 controller specs (thin, ~2–3 cases each: happy path, guard, validation) (G-9).
*Exit:* `turbo test` includes the web app; coverage targets met per module.

### Wave 5 — Performance & load (2–3 days, P1)

`perf/k6/**` (PF-01–PF-07), DB-11 tuning, baseline file committed; k6 job in the pipeline with the 10 % regression gate.
*Exit:* p95 < 200 ms, p99 < 500 ms, sim p95 < 100 ms, DB p95 < 50 ms at 120 VUs, all blocking.

### Wave 6 — Hygiene (1 day, P2)

`packages/simulator` safeguard specs (G-15); doc-drift gate (DB-10); `audit-log` interceptor test; keep the suite under a 10-minute wall clock.

### File organization & naming

| Layer | Location | Glob / config | Naming |
| --- | --- | --- | --- |
| Unit (API) | `apps/api/src/<module>/` | `apps/api/jest.config.ts` (`rootDir: src`, `.*\.spec\.ts$`) | `<file>.spec.ts` (existing convention) |
| Unit (packages) | `packages/<pkg>/src/` | `packages/<pkg>/jest.config.ts` | `<file>.spec.ts` |
| Integration (HTTP) | `apps/api/test/integration/` | `test/jest-integration.json` → `.*\.integration\.spec\.ts$` | `<flow>.integration.spec.ts` |
| Security | `apps/api/test/security/` + `src/**/*.guard.spec.ts` | integration + unit configs | `<area>.security.spec.ts`, `<x>.guard.spec.ts` |
| Determinism | `apps/api/src/simulation/engine/`, `apps/api/src/simulation/` | API unit config | `determinism.snapshot.spec.ts`, `mutation.spec.ts`, `replay.spec.ts` |
| Database | `apps/api/test/db/` | `test/jest-db.json` → `.*\.db\.spec\.ts$` | `<area>.db.spec.ts` |
| Client | `apps/web/src/**/` | `apps/web/jest.config.ts` (jsdom) | `<Component>.spec.tsx`, `<lib>.spec.ts` |
| Performance | `perf/k6/` | k6 CLI | `<scenario>.js` |

**Jest config summary (the four configs, deliberately separate):** unit (`rootDir: src`, fast), integration (`rootDir: test`, needs `supertest` + a live API/database), db (`rootDir: test`, serial, live cloud), web (jsdom). Turbo gains `test:integration`, `test:db`, `test:security` and `test:perf` tasks; `turbo test` stays the fast unit gate.

**Tooling decisions:** Supertest for HTTP · `pg` + `supabase-js` (service role) for the database · k6 for load · Jest + Testing Library for the client · `scripts/balance_verify.py` unchanged, but invoked as a gate. **Playwright/Percy stay deferred** (`docs/16` lists them; the repo has neither, and `KNOWN_LIMITATIONS.md` records E2E as not implemented).

---

## 4. Coverage targets (from `docs/16 §2`) and why each one matters

| Module | Target | Minimum | Why it matters in *this* game |
| --- | --- | --- | --- |
| **Simulation engine** (`simulation/engine/**`) | 95 % | 90 % | The engine is the single arbiter of offline time. A missed branch means a crop that should have withered survives — a free-resource path — or an animal that should have self-sustained dies. Determinism (§2.3) is only meaningful if the branch coverage underneath it is real. |
| **Economy & payment logic** (`economy/**`, `payments/**`, `wallet/**`, `monetisation/**`) | 95 % | 90 % | Money in and money out. Every uncovered path is a potential currency-duplication or double-credit route; PSP callbacks retry by design, so the idempotency branch must be covered or the bug ships. This is also the module the anti-cheat *rules* read, so its correctness bounds detection quality. |
| **Crop, livestock & market logic** (`crops/**`, `livestock/**`, `market/**`) | 90 % | 85 % | Three interlocking sinks/sources: seeds out, harvest in, 5 % tax at the market. The historical P0 bugs (feeding that cost nothing, a batch of 6 costing 1× materials, market-buy arbitrage) all lived in uncovered branches here. |
| **Building logic** (`buildings/**`) | 85 % | 80 % | Lower target is honest: construction/wear/maintenance is arithmetic with fewer branches than combat-style rules. But it is where the *uncapped* wear window lives (a 96 h absence must accrue 96 h of wear), so it is not trivial. |
| **API controllers** (`**/*.controller.ts`) | 80 % | 75 % | Thin by design — the value is *guard coverage and status codes*, not logic. The target is deliberately lower than services because a controller that only delegates needs one happy path plus its 401/403/400 cases. Wave 4's controller specs are what move this number off ~7 % (2 of 28 today). |

**How coverage is enforced** — `apps/api/jest.config.ts` gains per-glob thresholds so the numbers are per-module, not a diluted global average:

```ts
coverageThreshold: {
  global: { statements: 70, branches: 60, functions: 70, lines: 70 },
  './src/simulation/engine/': { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/simulation/':       { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/economy/':          { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/wallet/':           { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/payments/':         { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/monetisation/':     { statements: 95, branches: 90, functions: 95, lines: 95 },
  './src/crops/':            { statements: 90, branches: 85, functions: 90, lines: 90 },
  './src/livestock/':        { statements: 90, branches: 85, functions: 90, lines: 90 },
  './src/market/':           { statements: 90, branches: 85, functions: 90, lines: 90 },
  './src/buildings/':        { statements: 85, branches: 80, functions: 85, lines: 85 },
  './src/anti-cheat/':       { statements: 95, branches: 90, functions: 95, lines: 95 }, // detection is a gate
  './src/**/*.controller.ts':{ statements: 80, branches: 75, functions: 80, lines: 80 },
}
```

Rules: (1) thresholds start at the **minimum** column and ratchet to **target** once met — they never go down; (2) a PR that lowers a module's threshold must say so in the description; (3) coverage is measured **per module**, so the 28 controllers cannot hide behind the well-tested services.

**How coverage ties to determinism and anti-cheat (the point, not the metric):**
- Determinism is a *behavioural* claim, and coverage is the evidence that the behaviour was executed at every branch. A 90 %-covered engine can still be non-deterministic if the uncovered 10 % is the branch that reads a clock — which is why D-02 (1 000 identical runs) exists **in addition to** coverage.
- Anti-cheat is a *detector*. Every uncovered branch in the anti-cheat rules is a silent hole: the exploit still happens and no flag is written, so the build report says everything is fine. That is why the anti-cheat module carries the economy-grade 95/90 target even though it mutates nothing.
- Together: coverage tells you the code you wrote ran; the snapshot/replay suites tell you it produced the *same* thing twice; the anomaly report tells you whether the exploits the suite injected were actually seen.











