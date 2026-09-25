# Molemisi simulator — run summary

Generated 2026-09-24T12:50:37.467Z

**Cohort:** wide · **Population:** 2 · **Days:** 2 ·
**Anchor:** 2026-09-24 · **Seed:** 1

Events: **95** (success=11, rejected=84)

> **FIDELITY WARNING.** 2 of 2 accounts were created by service-role provisioning, not `/auth/register` — the project rate-limits signup emails. Account creation is NOT exercised by this run. Every gameplay interaction still went through the real API.

---

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Farming

- Plant attempts **1**, successful **1**; harvests **0**.
- Harvest-to-plant ratio **0.0%**.
- Distinct crops planted **1** across **1** distinct real months.
- Seed calendar rotation: **NOT exercised — the run never changed chapter**.
- Plantings by crop: sorghum=1

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Water

- Refills **2**; deliberate dry-outs **0**.
- Pula spent on water **P120.00**; gross market income **P0.00**.
- Water as a share of gross income **n/a%**.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Land & Buildings

- Plot purchases **0**, total **P0.00**.
- Building actions recorded **0** (maintenance is a 90-day material sink).
- Sink contribution: land **P0.00**.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Livestock

- Animals purchased **0**; collections **0**.
- **No livestock activity** — the kraal branch of the economy was never exercised.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Crafting

- Jobs started **0**, collected **0**.
- By recipe: none
- Batch sizes used: none
- Slots are the binding constraint (timers are 2–6 h): compare starts/day against **3** max slots per player.
- Realized margins must be compared against `recipeEconomics()`, not a copied table. Bonus-yield target **12%**.
- Crafted goods sell at **0.9–1.1x**, exempt from the 0.5–2x raw band.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Storage

- Upgrade attempts **0**, succeeded **0**.
- Two independent caps apply: slots (24/48/96, Guild x1.5) and listing slots (5/10/20).

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Bushveld

- Collections **0**; by scene: none
- Rarity conditioned on Kagiso at collection time:
  - no collections recorded
- Mophane windows (real months 4, 12): crossed **NONE**; phane collected **0**.
- **FLAG: near-zero activity in open_bush, riverbank, rocky_outcrop**
- **This run never crossed a Mophane window.** A clean Bushveld report here is a false negative, not a pass.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Kgotla

- Charges accepted **0**, turned in **0**, accepts rejected **0** (pool is 3/farm/Botswana day).
- Objectives by type: none
- Contributions **0** totalling **P0.00**; Letsema uses **0**.
- Gates: Bupi 100 · Deep Bushveld 300 · Letsema 500 · Prize 1000.
- Regard decay is -2 per elder per 7 idle days, floored at 0; it is applied lazily and idempotently.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Market

- Sells **0**, buys **0**, units sold **0**.
- Gross **P0.00**, Co-op tax collected **P0.00** (rate 5%).
- Realized unit price per item (min–max):
  - no priced sales recorded
- Seeds sold **0** (must be 0 — 26 §11.1 says seeds never sell).

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Economy

- Faucets: gross market income **P0.00**.
- Sinks: water **P120.00** · land **P0.00** · co-op tax **P0.00** · Letsema/community **P0.00** · cosmetics **0 purchases**.
- Real-money events: top-ups **0**, cosmetic purchases **0**.
- Segmentation used: payers **1** of **2** = **0.00%**.
- Targets for comparison: blended ARPU **P2.27**, ARPPU **P75.80** (docs/MVP/02 §6).
- Prize formula: clamp(10% of trailing-month Guild revenue, floor P350, ceiling P1500), split 4:2:1, top 3, min Botho in period 150.
- Boost availability checks run **0** (expected: listed = 0).

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Progression

- Contracts accepted **6**, completed **0** (0.0%).
- Chapter claims **0**.
- Elder's Guidance rules fired: unknown=2
- Real months crossed **9**.

cohort **wide** · players **2** · days **2** · seed **1**
real-date span **2026-09-24 → 2026-09-25** · payers **0.00%** · mix {"f2p":1,"adversary":1}

### Safeguards

#### security

| ID | Check | Result | Detail |
|---|---|---|---|
| SEC-01a | harvest another player's plot is rejected | **PASS** | HTTP 400 |
| SEC-02:/market/sell:negative-quantity | /market/sell rejects negative-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/sell:zero-quantity | /market/sell rejects zero-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/sell:absurd-quantity | /market/sell rejects absurd-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/sell:wrong-type | /market/sell rejects wrong-type | **PASS** | HTTP 404 |
| SEC-02:/market/sell:missing-field | /market/sell rejects missing-field | **PASS** | HTTP 404 |
| SEC-02:/market/sell:null-body | /market/sell rejects null-body | **PASS** | HTTP 404 |
| SEC-02:/market/buy:negative-quantity | /market/buy rejects negative-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/buy:zero-quantity | /market/buy rejects zero-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/buy:absurd-quantity | /market/buy rejects absurd-quantity | **PASS** | HTTP 404 |
| SEC-02:/market/buy:wrong-type | /market/buy rejects wrong-type | **PASS** | HTTP 404 |
| SEC-02:/market/buy:missing-field | /market/buy rejects missing-field | **PASS** | HTTP 404 |
| SEC-02:/market/buy:null-body | /market/buy rejects null-body | **PASS** | HTTP 404 |
| SEC-02:/store/purchase:negative-quantity | /store/purchase rejects negative-quantity | **PASS** | HTTP 400 |
| SEC-02:/store/purchase:zero-quantity | /store/purchase rejects zero-quantity | **PASS** | HTTP 400 |
| SEC-02:/store/purchase:absurd-quantity | /store/purchase rejects absurd-quantity | **PASS** | HTTP 400 |
| SEC-02:/store/purchase:wrong-type | /store/purchase rejects wrong-type | **PASS** | HTTP 400 |
| SEC-02:/store/purchase:missing-field | /store/purchase rejects missing-field | **PASS** | HTTP 400 |
| SEC-02:/store/purchase:null-body | /store/purchase rejects null-body | **PASS** | HTTP 404 |
| SEC-02:/payments/create:negative-quantity | /payments/create rejects negative-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:zero-quantity | /payments/create rejects zero-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:absurd-quantity | /payments/create rejects absurd-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:wrong-type | /payments/create rejects wrong-type | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:missing-field | /payments/create rejects missing-field | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:null-body | /payments/create rejects null-body | **PASS** | HTTP 404 |
| SEC-03 | replayed webhook provider_tx_id credits at most once | **PASS** | first HTTP 201, replay HTTP 201, matching ledger entries: 0 |
| SEC-04 | exceeding 60 mutating requests/60s throttles | **PASS** | throttled=true; status histogram=201x64 429x1 |
| SEC-05 | client-supplied reward/quality is ignored | **FAIL** | INCONCLUSIVE — sale rejected (HTTP 404); no payout to inspect, so this check asserted nothing. |
| SEC-06 | PUT /config is admin-gated (known gap — expected to fail) | **FAIL** | HTTP 500 — a non-admin player must not rewrite live config |

#### anticheat

| ID | Check | Result | Detail |
|---|---|---|---|
| AC-01a | concurrent harvest credits once | **PASS** | Promise.all statuses: 400, 400 — at most one may succeed |
| AC-01c | concurrent market sell credits once | **PASS** | Promise.all statuses: 404, 404 — at most one may succeed |
| AC-01d | concurrent charge turn-in credits and consumes once | **PASS** | Promise.all statuses: 400, 400 — at most one may succeed |
| AC-02 | at most 3 charges accepted per Botswana day (shared pool) | **PASS** | accepted=0 of 4 attempts; statuses=0,0,0,0 |
| AC-03a | Bupi/Borotho below Botho 100 is rejected (or player legitimately unlocked) | **PASS** | statuses=400,400 |
| AC-03b | Letsema below Botho 500 / inside the 7-day cooldown is rejected | **PASS** | HTTP 400 — 200 is only acceptable if genuinely eligible |
| AC-04 | collecting a hotspot before its rest elapses is rejected | **PASS** | first HTTP 201, immediately-after HTTP 409 |
| AC-05 | no Pula transfer to another player is possible | **PASS** | HTTP 404 (404 = no such route, which is also correct) |
| AC-06 | top-up above the P500/player/day cap is rejected | **PASS** | HTTP 400 |

#### deferred

| ID | Check | Result | Detail |
|---|---|---|---|
| DEF-01 | boost purchases are rejected (boost effects deferred from v1) | **PASS** | HTTP 400 |
| DEF-02 | no wildlife-raid surface for the Ancestral Ward to protect | **PASS** | raids deferred from v1 (ruling 2026-09-11) |

#### gap

| ID | Check | Result | Detail |
|---|---|---|---|
| GAP-01 | multi-accounting / one-win-per-identity | **GAP** | NOT TESTED — no phone number or KYC field exists anywhere in the API. Botho gates a real-money prize, so this is an open legal exposure. |
| GAP-02 | inhuman action-pace / bot-speed detection | **GAP** | NOT TESTED — no defense found in current design. |

- **7** failing check(s) outside the known-gap group.
- Gaps are reported, not passed: GAP-01, GAP-02.
