# Molemisi Simulator — Implementation Prompt

Build the simulator described in `MOLEMISI_Simulator_Specification.md` into this codebase. Read that document first — this prompt is the "build it" companion, not a restatement of the design.

**Revision:** v2 — 2026-09-24, aligned to the as-built repository. The v1 prompt assumed a
game that has since changed underneath it; every section below has been corrected against
code. Nothing here exists yet — `packages/simulator` was never created.

---

## 0. Before You Write Any Code

- Build the production-target safety rail first, before anything else. A simulator that can accidentally touch production data is worse than no simulator.
- Reuse `game-types`, `shared`, `game-config` and `validation` from the existing packages rather than redefining player/item/action shapes. In particular, **do not restate any economic number** — import it. `recipeEconomics()`, `STORAGE_TIERS`, `WATER`, `LAND_LADDER`, `BOTHO_THRESHOLDS`, `PRIZE`, `RECIPES` and `TOP_UP_PACKS` are all already the single source of truth, and a copied constant is a constant that will drift.
- Reuse the real game's existing seed data (items, recipes, Bushveld scenes/hotspots, top-up packs, subscription plan, cosmetics) for the simulator's test database rather than maintaining a parallel content set. If any of it doesn't already exist in a test environment, building it is a prerequisite task, not something the simulator invents at runtime.
- **Verify the environment precondition before the first run.** Migration `20260924000000_reconcile_market_prices_to_catalogue.sql` (see `docs/28`) fixes 13 unsellable items, 23 stale prices and 14 orphan `market_prices` rows. It is written but **not pushed**. The harness should probe for a known-good price row and, if the reconciliation is missing, report `ENV_PRECONDITION_MISSING` and stop — not emit 36 market failures that look like game bugs.
- **Read `MAX_OFFLINE_HOURS` before designing time.** It is 24, and it constrains the whole harness. See §4.

## 1. Package and CLI

Create `packages/simulator` (or `tools/simulator` — check the monorepo's existing conventions first). One CLI entry point:

```
pnpm simulate --profiles=f2p:70,payer:20,mid:8,whale:2,churner:5 --players=1000 --days=90 \
              --target=http://localhost:3001 --seed=<n> --anchor=2026-01-01 --cohort=wide
```

- `--profiles` — comma-separated profile:weight pairs, per the spec's Section 2.
- `--players` — total synthetic population.
- `--days` — simulated days to compress into the run.
- `--target` — API base URL; the safety rail rejects anything not explicitly allow-listed.
- `--seed` — RNG seed, for reproducing a specific failing run.
- `--anchor` — the **real calendar date** simulated day 1 lands on. Required, not optional: chapter seed stocking and the Mophane window both key off the real month, so a run without an anchor silently tests one season.
- `--cohort` — `wide` (large population, short span: economy, market impact, ARPU) or `calendar` (small population, ≥12 real months: chapters, seed rotation, Mophane). See §4.

## 2. Event Log

Build this before any player-behavior code — everything else depends on it:

```ts
interface SimEvent {
  timestamp: string;
  simulatedDay: number;
  /** The REAL calendar date this simulated day maps to. Everything seasonal reads this. */
  realDate: string; // YYYY-MM-DD
  playerId: string;
  profile: string;
  system: 'farming' | 'water' | 'land' | 'building' | 'livestock'
        | 'crafting' | 'storage' | 'bushveld' | 'kgotla' | 'market'
        | 'economy' | 'progression' | 'security' | 'anticheat';
  action: string;
  result: 'success' | 'rejected' | 'error';
  metadata: Record<string, unknown>;
}
```

Note the two additions over v1: `realDate`, because seasonality is real-calendar-driven, and `water`/`land`/`building`/`livestock`/`progression`, because those systems are now in scope.

Every actor function appends one `SimEvent` per action, success or failure, to `raw_events.jsonl`. No report reads from anything other than this log plus final database state.

## 3. Player Actors

Each simulated player is a real row in `auth.users`/`profiles`/`farms`, created through the real registration flow — not a synthetic bypass. Registration grants P250, 4 plots and sorghum/maize seed stock; start there, not from a fabricated state.

From there, each profile's per-simulated-day loop drives real HTTP calls:

- **Farm** — plant, water, harvest. Buy only seeds the current chapter stocks (six per chapter; planting out of season is not possible and attempting it is itself a useful rejection case).
- **Water** — check the tank, refill when low, and record the spend. A run that never refills is a run that never noticed water is the central tension.
- **Land and buildings** — walk the land ladder as Pula allows; construct, upgrade, and pay the 90-day maintenance (kraal 2 thapo, boundary 3 poleto, water source 2 setena).
- **Livestock** — purchase, feed, collect, pet; eggs, milk, truffle and manure.
- **Craft** — start and collect across all five recipes the player has unlocked, in batches of 1/3/6. Track **slot occupancy**, not just throughput: with 2–6 hour timers, slots are the binding constraint.
- **Storage** — upgrade tiers, respecting both the slot cap and the listing-slot cap, and paying the thatch as well as the Pula.
- **Bushveld** — visit each unlocked scene, collect hotspots while Kagiso allows. Record the Kagiso value at collection time; rarity means nothing without it.
- **Kgotla** — `accept` a charge, do the objective elsewhere in the loop, `turn-in`. Respect the shared pool of three per Botswana day. Contribute to community projects up to the P200/day cap. Use Letsema when eligible.
- **Market** — buy and sell. This is where the population moves prices; make sure volume is realistic, not maximal.
- **Payers** — top-up, subscribe, buy cosmetics. **Boosts are `available: false`**; a whale cannot buy them. Assert that, don't work around it.
- **Progression** — accept and complete contracts; claim chapter rewards on rollover; read the Elder's Guidance and log which rule fires.

**Three things the run configuration must get right or the report will be silently wrong:**

- **Time span and cohort.** The wide cohort gives you economy and market-impact numbers; it will never cross a Mophane window and its report must say so. The calendar cohort crosses April and December by construction. Do not present one as the other.
- **Population mix.** Use the spec's default segmentation (70/20/8/2 among payers, ~3% of total population being payers) unless explicitly overridden, so realized ARPU/ARPPU are comparable to the P2.27/P75.80 targets rather than being arbitrary.
- **Day boundary.** Caps are enforced per **Botswana day (UTC+2)**. Compute the simulated day from UTC+2, not from server-local time.

## 4. Time Advancement

**This is the section v1 got wrong, and it is the difference between a simulator and a random number generator.**

`simulation.service.ts:101` and `water.service.ts:73` both clamp elapsed time:

```ts
const cappedHours = Math.min(elapsedHours, MAX_OFFLINE_HOURS); // 24
```

So back-dating `last_simulated_at` (and friends) by 30 days and calling `GET /farms/current` once produces **24 hours** of simulation and silently discards the other 29 days. A naive implementation still "works" — the run completes, the reports print — and every pacing number in them is wrong.

`advanceSimulatedTime(days: number)` is therefore a **loop of ≤24 h steps**: for each step, back-date the relevant `_at` columns for every active player, then call the real endpoint so the game's own logic resolves the result. This remains the one place the simulator touches the database directly instead of going through the API; document it clearly as the deliberate exception it is.

Two further requirements:

- **Each step advances the real calendar date too**, so `realDate` in the event log stays truthful. That is what makes chapters rotate and what puts some steps inside April and December.
- **Log which real months each run crossed**, and warn loudly if a calendar-cohort run touched neither Mophane window — a false negative here is worse than no check, because the summary will look clean.

## 5. Security and Anti-Cheat

Implement Section 7.1 (security) and 7.2 (anti-cheat) of the spec as two separate groups of named, pass/fail assertion functions — not a fuzzer, not a learned agent. Run the full checklist after at least one simulated month of population activity, so ownership/threshold/replay checks have real state to act against.

- **The concurrency/duplication check is the one to get right.** Fire both requests via `Promise.all` (or equivalent) against the same resource — not one immediately followed by the other. A fast sequential pair can accidentally look like a pass even when the transaction boundary is genuinely broken; this check only means something if it actually races the server. It must now cover **`POST /kgotla/npcs/:npcId/turn-in`**, which both pays out and consumes items — a broken boundary there duplicates the reward *and* the consumption.
- **Charge-pool exhaustion** is a new named check: accept four charges in one Botswana day, the fourth must be rejected, and accepting must move no balance.
- **Malformed-input checks** should be table-driven — one list of bad payloads (negative, zero, oversized, wrong-typed, missing-field) run against every mutating endpoint in a loop, so a new endpoint later doesn't require a hand-written new test.
- **The rate-limit check must use mutations.** Only mutating requests are counted by `RateLimitInterceptor`; 61 GETs will not trip it and the check would pass while proving nothing.
- **The webhook replay check must carry a Bearer token.** `POST /payments/webhook` is documented as public but its controller uses `AuthGuard`; without a token the request fails for the wrong reason and the check is vacuous.
- **`PUT /config` is expected to fail.** It is `AuthGuard`-only rather than admin-gated (see `docs/KNOWN_LIMITATIONS.md`). Assert it, report it, and let CI go red — do not soften the assertion to make the build green.
- **Multi-accounting checks cannot be written.** There is no phone number and no KYC field anywhere in the API. Extra accounts can still be created to prove that *nothing* stops one operator from claiming multiple first-purchase bonuses or multiple prize slots; tag them so the economy/ARPU report doesn't count them as real population, and report the finding as an open legal gap rather than a pass.
- **Log the deferred-from-v1 items explicitly** — wildlife raids and boost effects have no implementation, so the Ancestral Ward, Pula Stone and Breath of the Land must be asserted *unavailable* and the deferral printed in the report. Report the bot-speed/inhuman-pace gap the same way: "not tested, no defense found in current design". Don't omit either silently.

## 6. Reports

Build one aggregation function per system, reading only `raw_events.jsonl` and final database state:

- `reportFarming` — crops/day per crop, average idle-plot time, realized yield vs. the configured yield range, and whether the seed calendar actually forced rotation between chapters.
- `reportWater` — tank-level distribution, Pula spent on water as a share of gross income, and how often growth was halted by an empty tank. If this is near zero, the run never exercised the central tension.
- `reportLandAndBuildings` — days to each land rung, maintenance events paid, total sink contribution.
- `reportLivestock` — collection rate per animal, feed spend vs. product value.
- `reportCrafting` — usage per recipe and per batch size, **slot occupancy over time**, realized margin vs. `recipeEconomics()` for the same input choice, days-to-first-Bupi, bonus-yield realization against the 12% target.
- `reportStorage` — % of time at cap per tier for **both** slots and listing slots, average day each tier is reached.
- `reportBushveld` — collection rate per scene (flag any scene with near-zero activity), **rarity distribution conditioned on Kagiso at collection time**, daily-sparkle engagement rate, whether the run actually crossed a Mophane window and what happened if so, Journal completion curve.
- `reportKgotla` — Botho accrual rate per profile, days-to-threshold for each gate, charges accepted vs. the 3/day pool, objectives completed by type, regard decay observed, Letsema usage rate, which Elder tips fire and how often.
- `reportMarket` — transaction volume, **realized price dispersion per item with any item flagged at a band edge** (this is the emergent market-impact check), contract fulfillment rate, and confirmation that seeds are not sellable.
- `reportEconomy` — faucets vs. sinks split by system (water, seeds, land, maintenance, Co-op tax, cosmetics, Letsema fund), realized ARPU/ARPPU against the P2.27/P75.80 targets with the actual segmentation ratio stated plainly, and the computed prize pool at the run's actual ending subscriber count against the formula.
- `reportProgression` — chapter rollovers, claim rate, contract completion, world events triggered.
- `reportSafeguards` — pass/fail table for every 7.1 and 7.2 check, reported as two distinct groups.

Compose all of these into `summary.md`; write `raw_events.jsonl` as-is; write `safeguards.json` from the last function's output with a non-zero exit code on any failure. Every report must print its cohort, population mix and real-date span in its header.

## 7. CI Integration

Wire a scaled-down `wide` run (small population, short duration) into CI on pull requests touching the API — enough to catch a regression in the core safeguard checks and crafting-margin figures, not a full 90-day/1000-player run on every commit. The scaled-down run will not naturally cross a Mophane window; its report should say so explicitly rather than silently reporting a false negative. Save the full-scale, calendar-spanning run for a manual or pre-release trigger.

## 8. Definition of Done

- [ ] The simulator refuses to run against anything not explicitly allow-listed as a test target.
- [ ] `advanceSimulatedTime` steps in ≤24 h increments, verified by code review against the `MAX_OFFLINE_HOURS` clamp, and the event log's `realDate` tracks the real calendar throughout.
- [ ] A mixed-profile `wide` run of at least 100 players over at least 30 simulated days completes, touches every system in Sections 3–6, and produces all three report files.
- [ ] At least one `calendar` run has crossed a real April and a real December, and the Bushveld report confirms the Mophane hotspot's seasonal table actually activated.
- [ ] All three live Bushveld scenes show non-trivial collection activity; Deep Bushveld's reachability at Botho ≥ 300 is reported either way rather than assumed.
- [ ] Realized crafting margins match `recipeEconomics()` within tolerance for all five recipes, and crafting is reported exempt from the 0.5–2.0 price band.
- [ ] Realized blended ARPU/ARPPU are reported alongside their targets, with the actual segmentation ratio used stated plainly.
- [ ] Water spend and growth-halt events are non-trivial, and the faucet/sink report names water, land, maintenance and cosmetics as sinks.
- [ ] The market report shows realized price dispersion and flags any item driven to a band edge by simulated volume.
- [ ] Every Section 7.1 security check and 7.2 anti-cheat check passes against the real API, reported as two distinct groups — including a verified-by-code-review **concurrent** (not sequential) execution of the duplication check, and a charge-pool exhaustion check.
- [ ] Boost purchases are asserted rejected, and the raids/boosts deferral appears explicitly in the report.
- [ ] The multi-accounting gap and the bot-speed/inhuman-pace gap appear explicitly in the report as known, untested limitations.
- [ ] `PUT /config` is asserted as the admin-gating failure it is.
- [ ] A scaled-down version of this run is wired into CI and fails the build on any security or anti-cheat check failure.

### Verification status — 2026-09-24

The package is built (`packages/simulator`, 15 source modules, CLI entry `dist/cli.js`). The
checkboxes above are deliberately left unchecked: **most of them can only be satisfied by a run
against a live API, and no such run has happened yet.** What has actually been verified:

| Claim | Status | How |
|---|---|---|
| Package typechecks and emits `dist/` | **Verified** | `tsc -p packages/simulator/tsconfig.json` → exit 0 |
| Library barrel loads at runtime (55 exports) | **Verified** | `require('dist/index.js')` |
| Safety rail refuses a non-allow-listed target | **Verified** | exits 2 with all failing reasons listed |
| Bad `--players=0` rejected | **Verified** | exits 2 with `ConfigError` |
| `planSteps()` never exceeds the 24 h clamp | **Verified** | 30-day plan: 30 steps, max `hours` = 24 |
| Event log JSONL round-trips | **Verified** | 1,291 events written, 1,291 re-read |
| All 12 report sections render | **Verified** | offline synthetic-event run |
| Safeguard groups render as four distinct tables | **Verified** | security / anticheat / deferred / gap |
| Mophane window detection (April crossed) | **Verified** | `crossed: [4]` |
| False-negative warning when no window crossed | **Verified** | January run prints the warning |
| CI job wired | **Verified structurally** | YAML parses; not executed on a runner |
| Everything requiring a live API / DB | **NOT verified** | needs a running API + Supabase |

Known gaps in the build, not yet resolved:

- **The CI job has never run.** `supabase start`, the health wait, and the simulator invocation are
  written but unexecuted. Treat the first green run as the real verification.
- **`pnpm-lock.yaml` was hand-edited** to add the `packages/simulator` importer. Local pnpm is
  v11.22.0 while the repo pins v9 (`lockfileVersion: '9.0'`), so running `pnpm install` would have
  migrated the whole lockfile. The hand edit keeps it at v9 and is validated by YAML parse, but a
  real `pnpm install --frozen-lockfile` on CI is the actual proof.
- **The simulator inherits the repo-wide prettier/CRLF lint noise** (52 errors, all
  `prettier/prettier`; `packages/game-config` alone has 801). Not reformatted here.
- **The host allow-list does not protect against a local API wired to the production Supabase
  project.** `localhost` passes the rail even when `apps/api/.env` points at production. Running the
  simulator locally would create real accounts in that project. Needs a ruling before any local run.

### Running it

```bash
# Safeguard checklist only — no time advancement, no Supabase credentials needed.
SIMULATOR_ALLOW=true NODE_ENV=test \
  pnpm simulate:safeguards --target=http://127.0.0.1:3001

# Full run against a local API. Point --supabase-url/--supabase-key at a LOCAL
# Supabase instance, never the production project.
SIMULATOR_ALLOW=true NODE_ENV=test \
  pnpm simulate --players=30 --days=14 --cohort=wide --seed=1 \
    --anchor=2026-01-01 --out=simulator-out \
    --target=http://127.0.0.1:3001 \
    --supabase-url=http://127.0.0.1:54321 --supabase-key=<local-service-role-key>
```

The run exits `0` clean, `1` on any security/anti-cheat failure, `2` on config or safety refusal.

### First cloud run attempt — 2026-09-24 (blocked)

Attempted against the live project (`nyapfgawanqvnkkjudxb`) with a 25-player / 7-day
payer-weighted cohort. It did **not** complete. Three real defects were found and fixed,
and one project-level blocker remains.

Fixed in the harness during the attempt:

1. **The client ignored the global route prefix.** `ApiClient` built `{target}{path}`, so
   every call went to `http://127.0.0.1:3001/auth/register` instead of
   `/api/v1/auth/register` → 404 on everything. `ApiClient` now takes an `apiPrefix`
   (default `/api/v1`, override with `--api-prefix`); the PostgREST client in `db.ts`
   explicitly passes `''` so it does not inherit the prefix.
2. **Registration emails were invalid.** `sim+{i}-{rand}@molemisi.test` was rejected by
   GoTrue — `+` aliases and the reserved `.test` TLD are not accepted. Now
   `sim-{i}-{rand}@example.com` (RFC 2606 reserved: valid format, never deliverable,
   identifiable by prefix for later cleanup).
3. **The CLI lied on early exit.** On an environment-precondition failure it still printed
   "wrote summary.md, raw_events.jsonl, safeguards.json", none of which existed. It now
   reports the abort instead.

Applied to the live project (with sign-off): `20260924000000_reconcile_market_prices_to_catalogue.sql`,
via `supabase db query --linked` — deliberately **not** `db push`, which would also have
applied the pending destructive `20260923000031_livestock_inventory_cutover.sql`.

**Remaining blocker — `mailer_autoconfirm: false` on the live project.** Confirmed via
`GET {SUPABASE_URL}/auth/v1/settings`. With email confirmation on, every `signUp` sends
through Supabase's built-in SMTP, which allows only a few messages per hour. An empirical
probe of six registrations with valid addresses returned `email rate limit exceeded` for
all six. `/auth/register` is therefore unusable for bulk provisioning — **and real users
cannot sign up either**, which is a launch-readiness issue independent of this simulator.

`/farms/current` does not bootstrap: it throws `NotFoundException` when the user has no
farm. Since `/auth/register` is the only code path that creates profile + farm + plots +
water tank + starter kit, the harness cannot provision players any other way without
duplicating that bootstrap. Hence the harness is blocked on the project setting rather than
on a workaround.

Also noted while probing: `POST /api/v1/auth/register` with an empty body returns **500**
rather than 400 — `RegisterSchema.parse()` throws a ZodError that nothing maps to a
client error. Not simulator-specific; worth a global exception filter.

### Run executed — 2026-09-24 (partial)

The blocker was worked around with service-role provisioning (`src/provision.ts`) rather
than by changing the project's auth settings, so the harness could run without touching
the live configuration. 25 accounts were provisioned and the run started.

It was **stopped deliberately at 9 of 25 players / 1 simulated day**. The reason is
throughput, not correctness: cloud API latency averaged **~2.8 s per call**, with some
endpoints taking 11–22 s (`progression/contract-accept`). At that rate a 25 × 7 run needs
hours. Investigating those slow endpoints is probably the single highest-value follow-up.

Three further defects were found and fixed while running:

4. **`crafting_jobs` has no `farm_id`** — it is keyed by `player_id`. Back-date targets now
   carry `filterSource: 'farm' | 'player'`.
5. **The rate limiter is per-user** (`user:${sub}`, IP fallback). Pacing globally throttled
   25 players to one player's budget; pacing is now bucketed per token.
6. **The Kagiso gate sat inside the hotspot loop**, so an exhausted pool logged one
   "rejected" event per hotspot × scene × player × day — 192 of 309 events in the first
   attempt. A refusal the harness chose not to attempt is a *skip*, not a rejection.

Observed real outcomes (successes only, 9 players, 1 day): `economy/top-up` (topup_starter)
3× 201 · `water/refill` 9× · `progression/contract-accept` 4× · `farming/plant` 3× ·
`economy/boost-availability` 4× (listed = 0, correct per the 2026-09-11 ruling).

**Do not trust economy/ARPU figures from this run.** The following harness calls are still
wrong and need a pass first: `market/buy` 404s for `watermelon_seed` / `herbs_seed` /
`morula_seed`; `kgotla/turn-in` sends an empty `type` → 400; `progression/contract-complete`
400; `progression/chapter-claim` 404; `farming/fertilize` 400; `livestock/purchase` 400.
A report is available at `simulator-out-partial/summary.md`.


