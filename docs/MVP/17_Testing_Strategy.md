# 17 — Testing Strategy

> Companion to `09`. Normative anchors: `06 §2` (the 15 invariants), `06 §3` (how the audit runs), `06 §4` (per-phase criteria), `16_Testing_and_QA_Specification.md`.
> **Doctrine:** negative tests matter more than happy paths. A feature that works when used correctly proves little; the money gates, progression gates and scarcity gates only mean anything if they hold under abuse.

---

## 1. Test layers

| Layer | What it proves | Tooling | Where |
|---|---|---|---|
| **Static** | schema vs spec, route inventory, invariant greps, config-vs-`02 §6` diff | grep + `tsc` + a route-table spec | repo root |
| **Unit** | pure logic — engine, rules, calculators | Jest | `packages/*/src/**/*.spec.ts` |
| **Property** | invariants hold across ranges (I5, I14, I12 boundaries) | Jest + generators | same |
| **Integration (seeded stack)** | real API calls against a seeded local DB, asserting **status codes and balances**, not just 200s | Jest + a throwaway Supabase project | `apps/api/test/` ⚠️ |
| **Economy gate** | the numbers you shipped are the numbers you designed | `scripts/balance_verify.py` | CI |
| **Manual** | feel, low-end device, PWA install, full walkthrough | human | P10 |

> ⚠️ **`apps/api/test/**` is NOT picked up by Jest** (`rootDir: src`), and there is no `*.e2e-spec.ts`. The integration layer today falls back to unit + `balance_verify.py` + the live scripts `scripts/test-game-loop.mjs` / `test-full-suite.mjs`. Fixing the integration runner is a testing-strategy prerequisite.

---

## 2. How to run

```bash
# Unit — MUST run from apps/api (root picks up .kilo/worktrees → false failures)
cd apps/api && node node_modules/jest/bin/jest.js --runInBand

# Config & validation packages
pnpm --filter @molemisi/game-config test
pnpm --filter @molemisi/validation test

# Economy gate (the spec is truth; fix the spec, never the script)
python scripts/balance_verify.py

# Types
pnpm -w exec tsc --noEmit -p apps/api
pnpm -w exec tsc --noEmit -p apps/web
```

Current green baseline (`DEVELOPMENT_STATE.md`, 2026-10-03): `tsc` 0/0 · api **470/30** · game-config **211/9** · validation **35/1** · gate **PASS**.

---

## 3. The 15 invariants → test matrix

Every invariant gets its own test at the layer that can actually falsify it. **This table is the contract.**

| # | Invariant | Test type | Concrete test |
|---|---|---|---|
| **I1** | No house-funded Madi | static + integration | assert every `madi_balance` credit traces to a completed `real_world_transactions` row or a counterparty debit |
| **I2** | No P2P Pula | static enumeration | every fn touching `pula_balance`; assert none accepts two player IDs (`launch-readiness.spec.ts`) |
| **I3** | Webhook credits once | integration | same `provider_tx_id` twice → one credit, one ledger row |
| **I4** | Auto-Collector never increments Botho | **dedicated CI** | (a) no direct increment, (b) cannot deliver a quest or donate, (c) accrual capped/day |
| **I5** | Prize pool floor/ceiling | property | across leaderboard sizes and subscriber counts |
| **I6** | No payout while unverified | integration (v1.1) | endpoint test on every payout path |
| **I7** | Server authoritative | fuzz | junk in every client field on sale/craft/collect → ignored or rejected |
| **I8** | 5% tax server-side; crafted exempt from band | integration | each sale path; crafted within ±10%, raw does not |
| **I9** | Botho thresholds server-side | integration | direct API call below threshold fails (not UI-hidden) |
| **I10** | Single canonical Botho | static | no second reputation counter exists; old score migrated |
| **I11** | Withdrawal → funding number only | integration (v1.1) | endpoint test; closed-loop |
| **I12** | Caps hold | property | each cap at the boundary and one unit past |
| **I13** | Chapter tokens zero at end | integration | rollover idempotent and safe to re-run |
| **I14** | Kagiso bounded | property | concurrent + replayed collect calls |
| **I15** | No withdrawal endpoint | static + route table | **must fail closed**; grep + route assertion |

---

## 4. Layer-by-layer detail

### 4.1 Static pass

1. **Schema diff** vs `11` (entity model).
2. **Route inventory** vs `12` (every documented route exists; no undocumented value-mutating route).
3. **Invariant greps** — `.from('profiles').update(... currency ...)`, any `pula_balance` write outside `WalletService`, any withdrawal route.
4. **Config-vs-spec diff** — every value in `02 §6` present in seeded data; **no numeric literal from `02 §6` in application code** (`06` P1).
5. **Enum checks** — `DIPHOLOGOLO` (not `DIPHOLOFOLO`), `setena` (not `setene`), no `Special` category.

### 4.2 Unit / property pass

- Every number in `02 §6` and `04 §4.2` asserted against real seed data.
- Margin, pool and Kagiso formulas property-tested.
- The engine replay identity test (`14 §12`).

### 4.3 Integration pass (seeded stack)

Real API calls against a **seeded local stack**, scripted, asserting **status codes and balances**. Must include every **negative** case:

| Negative case | Expected |
|---|---|
| below-threshold (Bupi < Botho 100) | `403 botho_below_threshold` |
| before-timer (harvest/collect early) | `409 not_ready` |
| replayed webhook | `200`, one credit |
| over-cap (top-up P501 in a UTC+2 day) | `429 daily_cap_exceeded` with `resets_at` |
| cross-player (tenant IDOR) | `403` |
| clock-mocked season boundary | chapter/token rollover |
| empty-tank harvest | growth frozen, crop alive |
| Kagiso below cost | `409 scene_not_settled` |
| same hotspot within 60 min | `409 hotspot_resting` |

### 4.4 Manual walkthrough (P10)

`05 §P10` scripted walkthrough in one sitting, desktop + mobile widths:

```
signup → farm → water → harvest → (craft*) → sell (tax visible) → Bushveld sweep
→ journal discovery → Kgotla quest → Botho milestone → top-up (Madi)
→ Village Pass → buy a Festival decoration AND its Market cousin
(* craft step runs only when D7 un-defers)
```

Plus: PWA installs on Android + iOS with no Play Store dependency; low-end device smoke on throttled 3G.

> ⚠️ **The final two steps cannot be performed end-to-end today** — there is no wired store purchase flow (`DEVELOPMENT_STATE.md`, `docs/34 §4.3`).

---

## 5. Per-phase acceptance (the `06 §4` checklists, condensed)

A phase is done when its criteria pass. Full text in `06 §4`.

| Phase | Key gates |
|---|---|
| **P0** | logout wired; `/api` rewrite; `AdminGuard` on `PUT /config` (403 for non-admin); `db:seed` works or is removed; signup→farm→sell→logout→login no dead end |
| **P1** | every `02 §6` value seeded; crop values match `02 §6.1` exactly; `balance_verify.py` PASS; no `unlockLevel`/`XP_REWARDS`/`STARTING_ENERGY`; `DIPHOLOGOLO` + `setena`; no timer < 12 h; **no timer in (24 h, 40 h)**; seed calendar seeded; thirst rating exposed; Morula top-of-ladder, no Saffron; `db:seed` idempotent; no numeric literal in code |
| **P2** | `player_wallets` single home; reconciliation passes; ledger append-only + nullable currency; `credit/debit` the only writers; replay credits once; no P2P Pula; no withdrawal endpoint |
| **P3** | `item_definitions` full catalogue; stack caps enforced; all five recipes net the margins; start rejects on missing input/fee with no partial deduction; collect 409 before timer, credits once; 3rd job rejected; Bupi fails < Botho 100 on direct call; storage upgrade raises cap; Guild +50% stacks + vanishes; only Village Pass exists; rows close horizontally; Bupi takes 4 grain; Setena accepts stone; tools don't consume slots; timers 2–6 h |
| **P4** | empty tank halts growth, refill resumes; empty tank never kills; rain credits; maintenance falls due → demand for a crafted material; land ladder 4→8→12→20; water charged only while growing; P1.00/unit, tank 60, refill P60; 20-plot thirsty drains < 1 day |
| **P5** | `GET /progression` shape; no Level/XP reads; Letsema rejected <500 **and** within 7 days (both server-side); Letsema completes every ready plot; Botho capped/day; Elder tip changes with state; Deep Bushveld `coming_soon` at ≥300 |
| **P6** | scenes seeded, 5–8 hotspots, Deep Bushveld row present; Kagiso on read not cron; collect below cost → `409 scene_not_settled`; re-tap <60 min → `409 hotspot_resting`; Kagiso bounded (I14); rarity scales with Kagiso; exactly one Sparkle/day; Sparkle + seasonal coexist; `Setlhare sa Phane` changes loot only in April/December (mocked clock); Mophane decoupled from season clock; first find writes journal, repeats don't; rare find = no inventory row; page completion swaps background; resting renders resting; touch targets ≥48 dp |
| **P7** | 5% tax every path; client price ignored (fuzz); raw moves 0.5×–2.0×; crafted stays ±10%; seed stock rotates by season |
| **P8** | four chapters seeded with real dates; rollover zeroes tokens exactly once; idempotent; dry-run before the first real one |
| **P9** | `GET /payments/store` = packs + Village Pass, **no boosts**; top-up credits only on webhook; P100 pack → 105 Madi once; P500/day cap in UTC+2 at boundary + 1 thebe past; lapsed sub stops auto-collect/storage/cosmetics; Auto-Collector leaves Botho untouched (CI); crons flip lapsed + grant weekly; ≥1 unbounded Pula sink live; Letsema donations don't exceed the Botho cap |
| **P10** | full walkthrough desktop+mobile; PWA installs; I2/I7–I10/I13–I15 in **production config**; low-end 3G smoke |
| **P11–P14 (v1.1)** | B1+B2 recorded first; one number per account; KYC audit trail; Madi only from deposit/player payment; 10% seller fee; basic crops not Exchange-eligible; 2% round trip / 12% self-dealing; withdrawal only to funding number; day-30 hold; caps at boundary; min P100, fee `max(P5,2%)`; prize by monthly Botho delta; Madi velocity instrumented; promo budget respected; no payout unverified; I15 retired by sign-off |

---

## 6. `balance_verify.py` — the economy gate

**CI gate from P1 onward.** It is not a phase; it is a check on every phase that touches a number.

It reads `02 §6.1` **as written** and asserts:

| Check | Target | Meaning |
|---|---|---|
| Dead-zone rule | 0 crops in (24 h, 40 h) | no crop is silently halved by the daily cadence |
| Within-season dominance | count ≤ 3 | no single crop dominates a season |
| Value spread | 3.32× | ordered by seed cost / capital at risk |
| Thirst spread | 7.5× | water is a real decision |
| Land payback | no rung > ~60 days marginal | no churn wall |
| Crafting closes horizontally | `Total + Profit == Net` | the margin table adds up |
| Bushveld vs Farm (§8) | **reported, not asserted** | the inversion is a recorded, accepted state |

**If it prints `FAIL`, the spec is wrong — fix `02`, never the script** (`README.md`, F19). The script collapsed doc and model into one; a second copy of the numbers is a value that will disagree later.

At P10, run it **against the seeded config**, not against the spec on disk — that is the check that the numbers you shipped are the numbers you designed.

---

## 7. CI configuration

`.github/workflows/ci.yml` currently runs lint / typecheck / test / build on push+PR. **No Supabase service, no deploy.**

**Required additions:**

- [ ] `python scripts/balance_verify.py` as a required gate.
- [ ] The I4 dedicated CI test wired so any change to Auto-Collector or Botho accrual runs it.
- [ ] A static "no numeric literal from `02 §6` in app code" check.
- [ ] A route-table assertion for I15 (no withdrawal endpoint).
- [ ] An integration runner against a throwaway project (fix `rootDir` so `apps/api/test/**` is actually executed).

---

## 8. Testing hazards

1. **Run API Jest from `apps/api`.** From the repo root it picks up `.kilo/worktrees/**` and 70+ suites fail spuriously.
2. **Never point integration/dev-date-jump at the live project** — it creates real accounts. Use a throwaway `molemisi-sim` project.
3. **`MAX_OFFLINE_HOURS = 24`** clamps elapsed sim — advance a simulated week in ≤24 h steps.
4. **The simulator's safety rail checks the HOST, not the DB.** `localhost` passes even when the API targets live Supabase. The rail is a convenience, not a guarantee.
5. **`pnpm` is broken under Git Bash** — migrates the lockfile. Use the pinned v9 or hand-edit `importers:`.

*End of `17`. Proceed to `18_Deployment_And_Migration_Checklist.md`.*
