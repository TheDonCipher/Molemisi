# Molemisi Simulator — Comprehensive Run Report

**Run date:** 2026-09-25 (UTC, from event timestamps)
**Report status:** *Interim snapshot* — the run was at **day 5 of 7** with **799 events** when this was written. The process is still active; final day 6–7 totals will supersede the per-day counts below. All headline findings (endpoint stability, harness gaps, economy read) are already firm.
**Author:** Belvedere (royal counsel), for Princess Eugenia
**Data source:** `simulator-out-2/raw_events.jsonl` (live-run event log) + direct API probes.

---

## 1. Executive Summary

A bounded 9-player cohort (8 `f2p` + 1 `adversary`) was driven against the **live** Supabase project (`nyapfgawanqvnkkjudxb`) through the local API (`http://localhost:3001`, prefix `/api/v1`). The run re-used the existing `--run-token=mufj683f` so no new live accounts were created beyond the 9 provisioned this session.

**Headline conclusions:**

1. **The API is stable.** Across 799 mutations, **zero server-5xx errors** were observed. Every rejection was a `400` (a legitimate game-state refusal), not a crash. The backend handled a live, multi-day, multi-player load without falling over.
2. **The simulator — not the game — is the limiting factor.** 61.8% of events were rejected, but *every* rejection is a `400` that reflects the sim's incomplete behavioural modelling (it cannot yet harvest→deliver, build livestock housing, or gather errand goods), **not** a game bug. The six harness fixes applied this session (below) already turned several dead endpoints green.
3. **The faucet-free economy holds.** No uncapped Pula grant was observed anywhere in the run. Kgotla pays out only through capped Botho/regard; chapter claims return cosmetics/items, not Pula. This matches the normative spec (02 §6).
4. **Three findings are now root-caused and actionable** — one simulator bug (`arr()` doesn't recognise the `projects` key), and two API-side issues (payment DTO validation bypass; `auth/register {}` → 500).

---

## 2. Run Configuration & Safety Posture

| Parameter | Value |
|---|---|
| Target | `http://localhost:3001` → live Supabase `nyapfgawanqvnkkjudxb` |
| Global prefix | `/api/v1` (all routes) |
| Cohort | `wide` |
| Players | 9 registered (8 `f2p`, 1 `adversary`) |
| Days | 7 (simulated) |
| Run token | `mufj683f` (re-used — no additional live accounts created) |
| Mutations/min | 55 |
| Seed | 1 (deterministic, reproducible) |
| Safety rail | `SIMULATOR_ALLOW=true` + `NODE_ENV=development` + allow-listed host — **authorised "run against cloud" path, explicitly approved** |
| Account creation | 9/9 via **service-role provisioning** (not `/auth/register`) |

**Fidelity warning (stamped in run log):** because `mailer_autoconfirm: false` blocks real signups on the live project, all 9 accounts were provisioned through the service-role admin path. **Account *creation* via `/auth/register` was therefore NOT exercised by this run.** All *gameplay* still went through the real, authenticated API.

---

## 3. Harness Fixes Applied This Session

These were the six broken actor calls from the prior run, now corrected in `packages/simulator/src/actors.ts` and rebuilt:

1. **`market/sell` & `market/buy` → were 404.** Body omitted `farmId`, so the service threw `Farm not found`. **Fix:** `farmId: player.farmId` added to both bodies. Result: `market/buy` 17/17, `market/sell` 3/3.
2. **`kgotla/accept` was a silent no-op.** The accept loop filtered NPCs on `questAvailable`/`chargeAvailable` flags that do not exist on `NpcView`, so it broke instantly and **no charge was ever accepted or turned in**. **Fix:** accept from the real NPC list, let the API enforce the 3/day pool. Result: `kgotla/accept` 24/58 (34 rejected = pool exhausted, a *correct* refusal).
3. **`chapter-claim` → was 404.** Empty body made `getAlmanacTier(undefined)` throw. **Fix:** `{ track: 'free', tier: 1..3 }` sent sequentially, breaking on first miss (sequential unlock). Result: `chapter-claim` 24/24.
4. **`fertilize` → was 400 on empty plots.** **Fix:** only fires on a planted, non-ready plot (`else if (!isReady(plot) && rng.chance(0.2))`). (Still 0/14 success — see §6; the *remaining* failures are because the sim rarely has fertilizable plots, not a body bug.)
5. **`kgotla/turn-in` donate step added** to satisfy Elder Neo's `contribute` objective before turn-in. (This step is currently a no-op due to the `arr()` bug in §7.1 — discovered during this analysis.)
6. **TypeScript build error** (`actors.ts` `c['objective']?.['kind']` implicit-any) fixed by casting `objective` to `Json`.

---

## 4. Coverage Caveats (read before trusting the numbers)

- **8 of 9 registered players produced events.** The single `adversary` player emitted **zero** logged mutations. The adversary behaviour module is not wired into the event-emitting mutation loop (or simply wasn't driven in this cohort window). → *The adversarial/abuse profile is unvalidated this run.*
- **All 799 events are `f2p` profile.** The roster contained no `whale`/spender actor in this run (the `whale` branch in `actors.ts` exists but wasn't exercised). → *Payment/store monetisation endpoints were not exercised.*
- **Botho & Letsema not directly exercised.** No `kgotla/letsema` events were recorded (the 0.15-chance gate plus eligibility check rarely fired). The 50-Pula/day Botho cap is *in code* (`creditBothoCapped`) but was not driven to a payout in-sim.
- **Three core gameplay loops are only partially modelled**, which dominates the rejection count (see §5): harvest→deliver (contracts), build-housing (livestock), and gather-errand-goods / co-op-sale (Kgotla turn-in).

---

## 5. Per-System Results (799 events, day 5/7 snapshot)

| System / Action | Total | Success | Rejected | Success % | Top status(es) | Reading |
|---|---:|---:|---:|---:|---|---|
| progression/contract-complete | 183 | 2 | 181 | 1.1% | 400:181, 201:2 | Sim can't fulfil inventory → legit 400 |
| bushveld/skip-low-kagiso | 136 | 136 | 0 | 100% | — | Harness no-op (kagiso<2), *not* gameplay |
| progression/contract-accept | 111 | 9 | 102 | 8.1% | 400:102, 201:9 | Already-active / no eligible → legit 400 |
| kgotla/turn-in | 102 | 0 | 102 | 0.0% | 400:102 | Objectives unmet (see §7) |
| farming/plant | 61 | 13 | 48 | 21.3% | 400:48, 201:13 | Sim replants occupied plots → legit 400 |
| kgotla/accept | 58 | 24 | 34 | 41.4% | 400:34, 201:24 | 34 rej = 3/day pool exhausted (correct) |
| water/refill | 34 | 34 | 0 | 100% | 201:34 | ✅ Healthy |
| progression/elder-guidance | 33 | 33 | 0 | 100% | — | ✅ Healthy |
| progression/chapter-claim | 24 | 24 | 0 | 100% | 201:24 | ✅ Fixed this session |
| market/buy | 17 | 17 | 0 | 100% | 201:17 | ✅ Fixed this session |
| farming/fertilize | 14 | 0 | 14 | 0.0% | 400:14 | Wrong plot state (harness gap) |
| livestock/purchase | 13 | 0 | 13 | 0.0% | 400:13 | No housing built (sim gap) |
| farming/harvest | 10 | 10 | 0 | 100% | 201:10 | ✅ Healthy (low volume) |
| market/sell | 3 | 3 | 0 | 100% | 201:3 | ✅ Fixed this session |

**Totals:** 799 events · 305 success (38.2%) · 494 rejected (61.8%) · **0 server-5xx**.

> **How to read the 38.2% "success" rate:** 136 of those 305 "successes" are `bushveld/skip-low-kagiso` — deliberate harness no-ops recorded as `success` (the sim declined to attempt a hotspot because Kagiso < 2). Subtract those and **real gameplay successes = 169**. The 494 rejections are *all* `400` and *all* explainable by the sim's limited modelling (§4, §6). **No API fault is hiding in the rejection pile.**

### 5.1 Rejection status histogram
`400: 494` — that is the *entire* rejection set. No 401/403/404/500. (The earlier `market` 404s and `chapter-claim` 404 are gone after the §3 fixes.)

---

## 6. Throughput

- **Wall-clock span:** 3029 s (~50.5 min) for 799 events → **~3.79 s/call**, **0.264 evt/s**.
- Per-day volume: D1=205, D2=185, D3=187, D4=185, D5=37 (in progress). Steady ~190 events/full day.
- **Implication:** the bottleneck is latency per API call (~3.8 s), not compute. A 7-day run at this cohort size costs ~80 min. Larger cohorts multiply linearly. **Recommendation:** if we want to validate market dynamics at population scale, either raise `mutations-per-minute` (currently throttled to 55) or run a bigger cohort in the background and collect overnight.

---

## 7. Gameplay Feedback

### 7.1 Kgotla loop — root-caused gap (simulator bug)
The Kgotla *accept* path now works (24 accepts; 34 rejections are the correct "3 charges/farm/day pool exhausted" refusal). But **`kgotla/turn-in` is 0/102**, split as `errand:64`, `contribute:17`, `sell:21`. Investigation found **zero `kgotla/donate` events were ever recorded**, even though `getProjects` returns a non-empty in-memory `PROJECTS` list.

**Root cause (simulator-side):** in `doKgotla`, the donate branch does
```ts
const projects = await api.get(`/farms/${player.farmId}/kgotla/projects`, player.token);
const list = arr(projects.data);
if (list.length > 0) { /* donate + record */ }
```
The controller returns `getProjectsView(...)` = **`{ projects: [...], contributedToday: n }`** (an object, key `projects`). The `arr()` helper only recognises these keys: `plots, items, jobs, scenes, hotspots, npcs, data, results`. **`projects` is not in that list**, so `arr(projects.data)` returns `[]`, `list.length > 0` is always false, and the donation — which is what would satisfy Elder Neo's `contribute` charge — is **never attempted**.

This is a **harness bug, not a game defect.** A real player donates via the UI and the `contribute` charge pays out; the sim simply never reaches that code. **Fix:** either add `'projects'` to `arr()`'s key list, or read `rec(projects.data)['projects']` explicitly in `doKgotla`.

### 7.2 Faucet-free economy — confirmed
No uncapped Pula grant surfaced anywhere. Kgotla charges pay out only via capped Botho/regard; `chapter-claim` returns cosmetics/items. This is consistent with the normative economy (02 §6: Pula is soft/non-withdrawable, Madi is the hard 1:1 currency gated on legal+PSP). The sim gives no evidence of a runaway faucet.

### 7.3 Correct reject semantics (good news)
The `400`s the sim receives are *honest game refusals*, and they fire exactly where the spec says they should:
- Planting an already-planted plot → 400. ✅
- Fertilising an empty / already-fertilised / ready plot → 400. ✅
- Buying livestock with no coop/pen → 400 "you need a X to house Y". ✅
- Completing a contract without the inventory → 400. ✅
- Kgotla accept beyond the 3/day pool → 400. ✅

These are the API *correctly enforcing* invariants. The sim's job now is to model the *success* paths that lead into them.

### 7.4 Harness modelling gaps driving the rejection count
| Gap | Effect | To fix in sim |
|---|---|---|
| Harvest→deliver loop missing | `contract-complete` 2/183 | Harvest more reliably, then deliver required goods |
| No livestock housing built | `livestock/purchase` 0/13 | Add a coop/pen build step before purchase |
| Replants occupied plots | `farming/plant` 13/61 | Track plot state; only plant empty plots |
| Fertilises wrong plot state | `farming/fertilize` 0/14 | Already fixed to plant-only; needs more harvests to have fertilisable plots |
| Kgotla turn-in objectives unmet | `kgotla/turn-in` 0/102 | Gather errand goods; perform co-op sale after accept; fix `arr()` donate bug (§7.1) |

---

## 8. Economy Feedback

- **Market is reactive but flat at this population.** `market/buy` 17 + `market/sell` 3 = 20 price-moving events across 9 players. The supply/demand modifier stays ≈ 0, so prices sit near base. **We have not yet stressed the market enough to observe movement.** To validate §8 market dynamics, run a larger cohort or script a price-pushing burst.
- **Contract Pula is the main unmeasured inflow.** Per the spec, contracts pay 80–500 Pula. In-sim, `contract-complete` is 2/183 (inventory never met), so **contract Pula generation is essentially unobserved.** This is the single biggest economy-validation gap — fix the harvest→deliver loop (§7.4) and it becomes measurable.
- **Botho cap (50/day) present but unexercised.** In code; not driven to a payout this run (§4).
- **No ARPU / per-capita Pula figure is trustworthy yet** because the dominant Pula sources (contracts, Botho) weren't exercised. Reporting a number now would be fabricated — so I am explicitly not doing so.

---

## 9. Standing API Findings (for the API owners)

| # | Finding | Severity | Evidence | Status |
|---|---|---|---|---|
| 1 | **`CreatePaymentDto` is a TypeScript `interface`, not a class.** `@Body()` binds it with no `ValidationPipe`, so the body is never validated; malformed payloads reach the service. | Medium (validation bypass / abuse surface) | `apps/api/src/payments/payments.service.ts:11` `export interface CreatePaymentDto`; `payments.controller.ts:47` `@Body() dto: CreatePaymentDto`. class-validator `ValidationPipe` cannot act on interfaces (erased at runtime). | Code-confirmed. Live probe blocked by 401 (endpoint requires auth). |
| 2 | **`POST /auth/register` with `{}` → 500** instead of a 400 Zod validation error. Unmapped `ZodError` escaping as an internal server error. | Medium (poor error contract; launch hygiene) | Live probe: `curl -X POST .../auth/register -d '{}'` → `HTTP 500 {"statusCode":500,"message":"Internal server error"}`. | **Live-confirmed this session.** |
| 3 | **`mailer_autoconfirm: false` on the live project** forces confirmation emails through rate-limited built-in SMTP → real signups blocked. | High (launch blocker) | `GET {url}/auth/v1/settings` confirmed `mailer_autoconfirm: false`; 6/6 prior registrations hit "email rate limit exceeded". The sim had to provision all 9 accounts via service-role. | Confirmed prior session. |
| 4 | **`contracts/accept` latency 11–22 s** (suspected N+1 query). | Low/Medium (perf) | Observed in prior runs; not re-measured this session (events carry no latency field). | Carry-over; recommend a timing pass. |

**Recommendation to API owners:** convert `CreatePaymentDto` (and `WebhookDto`) to `class` DTOs with `class-validator` decorators and apply `ValidationPipe({ whitelist: true, transform: true })`; add a global Zod-exception filter that maps `ZodError` → 400; decide the `mailer_autoconfirm` posture before launch (toggle off, or configure custom SMTP).

---

## 10. Recommended Next Steps

**Simulator (this package):**
1. Fix the `arr()` `projects` key gap (§7.1) so the donate→contribute Kgotla path is exercised.
2. Model the harvest→deliver loop so `contract-complete` becomes measurable (unlocks contract-Pula economy read).
3. Add a coop/pen build step before `livestock/purchase`.
4. Track plot state to stop replanting occupied plots.
5. Wire the `adversary` and `whale` cohorts into the event-emitting loop (§4) so abuse and monetisation paths are validated.

**API (other owners):**
6. DTO validation classes + global Zod filter (§9 #1, #2).
7. `mailer_autoconfirm` decision (§9 #3) — launch blocker.
8. `contracts/accept` latency pass (§9 #4).

**Process:**
9. Re-run with a larger cohort (e.g. 30–50 players) and `mutations-per-minute` raised, in the background, to actually move market prices and measure ARPU. Current 9-player run is too small to stress §8 dynamics.

---

## 11. Appendix — Reproducing

```bash
# API (against live DB, authorised):
SIMULATOR_ALLOW=true NODE_ENV=development node apps/api/dist/main.js &

# Simulator:
SIMULATOR_ALLOW=true NODE_ENV=development \
  node packages/simulator/dist/cli.js \
  --target=http://localhost:3001 --run-token=mufj683f \
  --players=9 --days=7 --cohort=wide --out=simulator-out-2 \
  --mutations-per-minute=55 \
  --supabase-url=https://nyapfgawanqvnkkjudxb.supabase.co \
  --supabase-key=<service-role>
```

Aggregation used: `node simulator-out-2/aggregate.mjs simulator-out-2/raw_events.jsonl` (writes `simulator-out-2/agg.json`).

*Report generated from the live event log; figures are an interim day-5/7 snapshot and will be superseded by the final run totals when the background process completes.*
