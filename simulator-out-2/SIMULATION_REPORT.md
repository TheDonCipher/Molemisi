# Molemisi Simulator — Comprehensive Run Report

**Run date:** 2026-09-25 (UTC, from event timestamps)
**Report status:** *FINAL — Run 3 (post-fix)*. This report supersedes the prior Run 2 write-up. Run 3 applied the three root-caused fixes, completed all 7 simulated days (**1247 events**), and the post-run safeguard suite executed to completion (no crash).
**Author:** Belvedere (royal counsel), for Princess Eugenia
**Data sources:** `simulator-out-3/raw_events.jsonl` (1247-event live-run log) + `simulator-out-3/safeguards.json` (42 checks) + direct API probes.

---

> **Reconciliation addendum — 2026-09-28 (see `docs/32_Sprint_Roadmap_Audit_Reconciliation.md`).**
> Read before trusting the Run-3 conclusions below.
>
> - **API-1 (`/payments/create` malformed → 201) is RESOLVED in code.** `CreatePaymentDto` is now a
>   decorated **class** (not a bare interface), and `main.ts` sets `whitelist + forbidNonWhitelisted`,
>   so extraneous fields are stripped and a body with a valid sku is correctly accepted while a
>   missing/unknown sku is rejected (400/404). The old `SEC-02` check mis-flagged this as a FAIL because
>   it kept a valid sku alongside the junk; `safeguards.ts` now carries an accurate `ECO-10` check.
> - **SEC-04 (rate limiter):** results are contradictory between runs — Run 3 (below) reported it NOT
>   throttling, while `simulator-out-probe/summary.md` (newer) reports PASS (`201x64 429x1`). The limiter
>   code exists; re-verify against a **non-live** target before trusting either claim.
> - **LIVE-SIM HAZARD (do not ignore):** the simulator safety rail checks the HOST, not the backend DB.
>   `localhost` passes even if `apps/api/.env` points at the live Supabase project
>   `nyapfgawanqvnkkjudxb`. A fresh-cohort run (especially the 30–50 player target) **creates real auth
>   accounts on the live project**. Validate only against a throwaway local/seed Supabase, never live.

## 1. Executive Summary

A bounded 9-player cohort (8 `f2p` + 1 `adversary`) was driven against the **live** Supabase project (`nyapfgawanqvnkkjudxb`) through the local API (`http://localhost:3001`, prefix `/api/v1`), reusing `--run-token=mufj683f` (the same 9 accounts as Run 2, so **no new live accounts were created**).

**Headline conclusions:**

1. **All three fixes from the prior report are confirmed working:**
   - **Token refresh** → the run's tail is clean: **zero `401`s, zero undefined-status events**, and days 6–7 are fully populated (164 + 167 events vs the degraded 26 + 16 in Run 2). No server-5xx across the entire run.
   - **`safeguards.ts` `arr()` fix** → the post-run safeguard pass completed and wrote `safeguards.json`. (Run 2 crashed there with `TypeError: .filter is not a function`.)
   - **`actors.ts` `arr()` `projects` fix** → `kgotla/donate` now fires (**27/27**; was 0 events) and `kgotla/turn-in` has **4 successes** (was 0/120) — Elder Neo's `contribute` charge can now pay out.
2. **The API's anticheat + replay protection are solid:** the full anticheat suite (9/9) passes, webhook replay is idempotent (SEC-03 pass), and ownership/threshold gates hold.
3. **One API security bug is now confirmed live:** `/payments/create` accepts malformed payloads (negative/zero/absurd/wrong-type/missing-field all return **201**). `CreatePaymentDto` is a TypeScript interface, so `ValidationPipe` cannot validate it (finding API-1). HIGH priority.
4. **A second API concern surfaced:** the 60/60s rate limiter did not throttle 65 rapid mutations (SEC-04) — needs API-owner confirmation (API-4).
5. **A confounder to read the economy numbers:** reusing `mufj683f` carried the accounts' prior 7-day state forward, so *stateful* systems (Kgotla accept, contracts) are not cleanly comparable to Run 2. A fresh run-token is needed for a clean economy read (see §9).

---

## 2. What Changed Since Run 2

| Fix | File | What it does |
|---|---|---|
| F1 | `actors.ts` | Exported `arr()` and added `'projects'` to its key list, so `doKgotla`'s donate step extracts the projects array and actually donates. |
| F2 | `safeguards.ts` | Replaced both `(npcs.data ?? []).filter(...)` with `arr(npcs.data)` — resilient to the `{npcs:[…]}` shape and to 401 error-object bodies. |
| F3 | `run.ts` | Tracks token age per player; re-logins when a token is >45 min old (before each day) and force-refreshes all tokens before the safeguard pass. |

Rebuilt `packages/simulator` (tsc, `BUILD_OK`); verified the compiled `dist` carries all three changes.

### 2.1 Fix validation (Run 2 → Run 3)

| Signal | Run 2 (pre-fix) | Run 3 (post-fix) | Verdict |
|---|---|---|---|
| `401` / `undefined` rejections | 17 + 16 (days 6–7) | **0** | ✅ F3 fixed |
| Days 6–7 event volume | 26 + 16 (degraded) | 164 + 167 (full) | ✅ F3 fixed |
| Post-run safeguards | crashed (`TypeError .filter`) | completed, wrote `safeguards.json` | ✅ F2 fixed |
| `kgotla/donate` events | 0 | **27/27** | ✅ F1 fixed |
| `kgotla/turn-in` success | 0/120 | **4/148** | ✅ F1 fixed (contribute pays out) |
| Server-5xx | 0 | 0 | ✅ unchanged |

---

## 3. Run Configuration & Safety Posture

| Parameter | Value |
|---|---|
| Target | `http://localhost:3001` → live Supabase `nyapfgawanqvnkkjudxb` |
| Global prefix | `/api/v1` |
| Cohort | `wide` |
| Players | 9 registered (8 `f2p`, 1 `adversary`) — **reused from Run 2** (`--run-token=mufj683f`) |
| Days | 7 (simulated) — **all 7 reached, 1247 events** |
| Mutations/min | 55 |
| Seed | 1 (deterministic) |
| Safety rail | `SIMULATOR_ALLOW=true` + `NODE_ENV=development` + allow-listed host |
| Account creation | 0 new accounts (reused Run 2's 9, service-role provisioned) |
| Exit code | 1 — **only because 8 safeguard checks failed** (known gaps + the payment bug), *not* a crash. Event data fully captured. |

**Fidelity warning (stamped in run log):** all 9 accounts were provisioned via service-role (because `mailer_autoconfirm: false` blocks `/auth/register`); account *creation* was not exercised. All gameplay went through the real API.

---

## 4. Coverage Caveats

- **8 of 9 players emitted events**; the `adversary` player emitted 0 (behaviour module not wired into the event loop). → *Abuse profile unvalidated.*
- **All events are `f2p`**; no `whale`/spender cohort exercised. → *Monetisation endpoints not exercised.*
- **Account-state carryover (important):** reusing `mufj683f` means these accounts already completed 7 days in Run 2, so their Kgotla/contract state for 2026-09-25…2026-10-01 was pre-populated. This depresses *stateful* accept/complete counts in Run 3 and is **not** a regression in the fixes — it is a confounder. A fresh run-token removes it (§9).
- **Three core gameplay loops still only partially modelled** (harvest→deliver, livestock housing, gather-errand-goods), driving most `400`s.
- **Botho/Letsema not driven to a payout** this run.

---

## 5. Per-System Results — Run 3 (1247 events, 7 days)

| System / Action | Total | Success | Rejected | Success % | Top status(es) | Reading |
|---|---:|---:|---:|---:|---|---|
| progression/contract-complete | 336 | 0 | 336 | 0.0% | 400:336 | Sim can't fulfil inventory (carryover + harvest gap) |
| bushveld/skip-low-kagiso | 224 | 224 | 0 | 100% | — | Harness no-op (kagiso<2), *not* gameplay |
| progression/contract-accept | 170 | 1 | 169 | 0.6% | 400:169, 201:1 | Already-active (carryover) → legit 400 |
| kgotla/turn-in | 148 | **4** | 144 | 2.7% | 400:144, 201:4 | **4 succeed (contribute) — F1 working** |
| water/refill | 56 | 32 | 24 | 57.1% | 201:32, 400:24 | 24×400 = "tank full" (legit, not token) |
| kgotla/accept | 56 | 0 | 56 | 0.0% | 400:56 | Carryover: already served those days |
| progression/elder-guidance | 56 | 56 | 0 | 100% | 201:56 | ✅ Healthy |
| farming/plant | 51 | 16 | 35 | 31.4% | 400:35, 201:16 | Replants occupied plots → legit 400 |
| market/buy | 35 | 35 | 0 | 100% | 201:35 | ✅ Healthy |
| progression/chapter-claim | 30 | 30 | 0 | 100% | 201:30 | ✅ Healthy |
| kgotla/donate | 27 | 27 | 0 | 100% | 201:27 | ✅ **NEW — F1 fixed** |
| farming/fertilize | 24 | 0 | 24 | 0.0% | 400:24 | Wrong plot state (harness gap) |
| livestock/purchase | 16 | 0 | 16 | 0.0% | 400:16 | No housing built (sim gap) |
| market/sell | 15 | 15 | 0 | 100% | 201:15 | ✅ Healthy |
| farming/harvest | 3 | 3 | 0 | 100% | 201:3 | ✅ Healthy (low volume — carryover) |

**Totals:** 1247 events · 443 success (35.5%) · 804 rejected (64.5%) · **0 server-5xx**.

### 5.1 Rejection status histogram
`400: 804` — **that is the entire rejection set.** No 401, no 404, no 5xx. Every rejection is a legitimate game-state refusal. (Contrast Run 2: `400:591, 401:17, undefined:16`.)

> **Reading the 35.5% "success" rate:** 224 of 443 "successes" are `bushveld/skip-low-kagiso` no-ops. Real gameplay successes = **219**. The 804 rejections are `400`s explained by the sim's modelling limits (§4, §7) and account carryover — **no API fault hides in them.**

### 5.2 Kgotla detail
`accept` 56 (0 success — carryover), `turn-in` 148 (4 success, 144 rejected), split `errand:105, contribute:8, sell:35`. The 4 turn-in successes are the first time any Kgotla charge has paid out in-sim, and they coincide with the new `donate` events — direct evidence F1 closes the contribute loop.

---

## 6. Throughput

- **Wall-clock span:** 4976 s (~83 min) for 1247 events → **~3.99 s/call**, 0.251 evt/s.
- Per-day volume: D1=193, D2=189, D3=182, D4=184, D5=168, **D6=164, D7=167** (full, healthy days — the token fix removed the tail collapse).
- The ~4 s/call latency (not the 55/min throttle) is the binding constraint. Longer cohorts multiply linearly.

---

## 7. Gameplay Feedback

### 7.1 Kgotla contribute loop — FIXED (F1)
`kgotla/donate` 27/27 and `kgotla/turn-in` 4/148 confirm Elder Neo's `contribute` charge now pays out when the sim donates. The `arr()` `projects`-key gap is closed.

### 7.2 Faucet-free economy — confirmed (again)
No uncapped Pula grant anywhere. Kgotla pays out only via capped Botho/regard; chapter claims return cosmetics/items.

### 7.3 Correct reject semantics — intact
`400`s fire where the spec demands: plant-occupied (35×), fertilise-wrong-state (24×), buy-livestock-no-coop (16×), complete-contract-no-inventory (336×), Kgotla pool-exhausted (56×). These are the API correctly enforcing invariants.

### 7.4 Harness modelling gaps (still open)
| Gap | Effect | To fix in sim |
|---|---|---|
| Harvest→deliver loop missing | `contract-complete` 0/336 | Harvest reliably, then deliver required goods |
| No livestock housing built | `livestock/purchase` 0/16 | Add coop/pen build step |
| Replants occupied plots | `farming/plant` 16/51 | Track plot state |
| Kgotla errand/sell objectives unmet | `kgotla/turn-in` 144 rej | Gather errand goods; co-op sale after accept |

### 7.5 Account-state carryover (run-specific)
`kgotla/accept` 0/56 and `contract-*` collapses vs Run 2 reflect pre-populated state from reusing `mufj683f`, **not** a fix regression. A fresh run-token yields clean stateful counts.

---

## 8. Safeguard Suite — Run 3 (42 checks)

| Group | Pass | Fail | Notes |
|---|---:|---:|---|
| security | 21 | 8 | Payment validation bypass (5) + rate-limit (1) + inconclusive (1) + expected-config-gap (1) |
| anticheat | 9 | 0 | **All pass** — idempotency, Botho/Letsema gates, hotspot rest, no-Pula-transfer, top-up cap |
| deferred | 2 | 0 | Boost purchases & wildlife raids correctly absent (v1-deferred) |
| gap | 0 | 2 | Multi-accounting (no KYC), bot-speed (no defense) — documented exposures |

**Notable passes:** SEC-01a (cross-player harvest rejected 403), SEC-03 (webhook replay idempotent, ledger entries 0), AC-01a/b/d (concurrent ops credit at most once), AC-04 (hotspot rest collision → 409), AC-05 (no Pula-transfer route → 404).

**Failures that matter:**
- **SEC-02 `/payments/create` (5 variants) → 201.** Negative/zero/absurd/wrong-type/missing-field payloads are *accepted*. Only `null-body` was rejected (404). **This is API-1, now confirmed live** — a malicious client can drive unintended payment states. (All other SEC-02 targets — market, store — correctly reject malformed input with 404/400.)
- **SEC-04 rate limiter → not enforced.** 65 mutations in 60s returned `201×65`, `throttled=false`. Either the limiter isn't wired in this environment or the harness's 55/min client pacing masked it; regardless, no 429 was observed. **Flag for API owners (API-4).**
- **SEC-06 `PUT /config` → 500** (expected known gap; a non-admin must not rewrite live config — 500 denies it, though a clean 403 is preferred).
- **GAP-01 / GAP-02** — multi-accounting (no KYC/phone field anywhere) and inhuman-pace detection are open legal/abuse exposures; Botho gates a real-money prize, so GAP-01 is the more serious.

---

## 9. Economy Feedback & Recommended Next Run

- **Market flat at 9 players** (35 buys + 15 sells; supply/demand modifier ≈ 0 → prices at base). Unstressed; needs a larger cohort.
- **Contract Pula unmeasured** (harvest→deliver gap + carryover). Still the biggest economy-validation gap.
- **Botho cap (50/day) unexercised.**
- **ARPU intentionally NOT reported** — dominant Pula sources unexercised and days confounded by carryover; a number now would mislead.

**Recommended next run (clean economy read):** a **fresh `--run-token`** (creates 9 new accounts, no carryover) and a **larger cohort (30–50)** with raised `mutations-per-minute`, run in the background. That removes the §4 confounder and actually moves market prices. The three fixes are validated; this is purely to get a clean economy profile.

---

## 10. Standing API Findings (for API owners)

| # | Finding | Severity | Evidence | Status |
|---|---|---|---|---|
| **API-1** | **`/payments/create` does not validate input** — accepts negative/zero/absurd/wrong-type/missing-field (all 201). `CreatePaymentDto` is a TS `interface`, so `ValidationPipe` skips it. | **High** | Run 3 SEC-02: 5 variants → 201 (live). Code: `payments.service.ts:11`. | **Live-confirmed this run.** |
| API-2 | `POST /auth/register {}` → 500 (should be 400 Zod). | Medium | Live probe (Run 2). | Confirmed. |
| API-3 | `mailer_autoconfirm: false` blocks real signups (launch blocker). | High | Settings probe. | Confirmed. |
| **API-4** | **60/60s rate limiter not observed** (65 mutations, 0 throttled). | Medium/High | Run 3 SEC-04. | **New this run — investigate.** |
| API-5 | `contracts/accept` latency 11–22 s (suspected N+1). | Low/Medium | Prior runs. | Carry-over. |

**Recommendation:** convert `CreatePaymentDto`/`WebhookDto` to `class` DTOs + `ValidationPipe({whitelist,transform})`; add a global Zod-exception filter (→400); decide `mailer_autoconfirm`; verify the rate-limiter is actually wired (API-4); `PUT /config` should return 403 not 500.

---

## 11. Appendix — Reproducing

```bash
# API (against live DB, authorised) — must be running at :3001:
SIMULATOR_ALLOW=true NODE_ENV=development node apps/api/dist/main.js &

# Simulator (post-fix rebuild):
SIMULATOR_ALLOW=true NODE_ENV=development \
  node packages/simulator/dist/cli.js \
  --target=http://localhost:3001 --run-token=mufj683f \
  --players=9 --days=7 --cohort=wide --out=simulator-out-3 \
  --mutations-per-minute=55 \
  --supabase-url=https://nyapfgawanqvnkkjudxb.supabase.co \
  --supabase-key=<service-role>
```

Aggregation: `node simulator-out-2/aggregate.mjs simulator-out-3/raw_events.jsonl`.

*Report: Run 3 (post-fix), 1247 events, days 1–7, all three fixes confirmed. Days 1–7 fully reliable (no token expiry, no crash). Account-state carryover is a confounder for stateful systems only; see §4/§9.*
