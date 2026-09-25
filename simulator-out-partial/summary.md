<!--
  PARTIAL RUN. Generated from raw_events-2.jsonl after the run was stopped at
  9 of 25 players, 1 of 1 simulated day, because cloud API latency averaged
  ~2.8s per call (some endpoints 11-22s). Every figure below is a real observed
  outcome; the population is incomplete, so totals are floors, not final numbers.
-->
# Molemisi simulator — run summary

Generated 2026-09-24T13:38:11.887Z

**Cohort:** wide · **Population:** 25 · **Days:** 1 ·
**Anchor:** 2026-09-24 · **Seed:** 1

Real-date span **2026-09-24 → 2026-09-24** · payers **54.17%** · mix {"f2p":10,"payer":7,"subscriber":4,"whale":2,"churner":1,"adversary":1}

Events: **187** (success=63, rejected=124)

> **FIDELITY WARNING.** 25 of 25 accounts were created by service-role provisioning, not `/auth/register` — the project rate-limits signup emails. Account creation is NOT exercised by this run. Every gameplay interaction still went through the real API.

---

### Farming

- Plant attempts **3**, successful **3**; harvests **0**.
- Harvest-to-plant ratio **0.0%**.
- Distinct crops planted **1** across **1** distinct real months.
- Seed calendar rotation: **NOT exercised — the run never changed chapter**.
- Plantings by crop: sorghum=3

### Water

- Refills **9**; deliberate dry-outs **0**.
- Pula spent on water **P540.00**; gross market income **P0.00**.
- Water as a share of gross income **n/a%**.

### Land & Buildings

- Plot purchases **0**, total **P0.00**.
- Building actions recorded **0** (maintenance is a 90-day material sink).
- Sink contribution: land **P0.00**.

### Livestock

- Animals purchased **0**; collections **0**.
- **No livestock activity** — the kraal branch of the economy was never exercised.

### Crafting

- Jobs started **0**, collected **0**.
- By recipe: none
- Batch sizes used: none
- Slots are the binding constraint (timers are 2–6 h): compare starts/day against **3** max slots per player.
- Realized margins must be compared against `recipeEconomics()`, not a copied table. Bonus-yield target **12%**.
- Crafted goods sell at **0.9–1.1x**, exempt from the 0.5–2x raw band.

### Storage

- Upgrade attempts **0**, succeeded **0**.
- Two independent caps apply: slots (24/48/96, Guild x1.5) and listing slots (5/10/20).

### Bushveld

- Collections **0**; by scene: none
- Rarity conditioned on Kagiso at collection time:
  - no collections recorded
- Mophane windows (real months 4, 12): crossed **NONE**; phane collected **0**.
- **FLAG: near-zero activity in open_bush, riverbank, rocky_outcrop**
- **This run never crossed a Mophane window.** A clean Bushveld report here is a false negative, not a pass.

### Kgotla

- Charges accepted **0**, turned in **0**, accepts rejected **0** (pool is 3/farm/Botswana day).
- Objectives by type: none
- Contributions **0** totalling **P0.00**; Letsema uses **0**.
- Gates: Bupi 100 · Deep Bushveld 300 · Letsema 500 · Prize 1000.
- Regard decay is -2 per elder per 7 idle days, floored at 0; it is applied lazily and idempotently.

### Market

- Sells **0**, buys **0**, units sold **0**.
- Gross **P0.00**, Co-op tax collected **P0.00** (rate 5%).
- Realized unit price per item (min–max):
  - no priced sales recorded
- Seeds sold **0** (must be 0 — 26 §11.1 says seeds never sell).

### Economy

- Faucets: gross market income **P0.00**.
- Sinks: water **P540.00** · land **P0.00** · co-op tax **P0.00** · Letsema/community **P0.00** · cosmetics **0 purchases**.
- Real-money events: top-ups **3**, cosmetic purchases **0**.
- Segmentation used: payers **14** of **25** = **54.17%**.
- Targets for comparison: blended ARPU **P2.27**, ARPPU **P75.80** (docs/MVP/02 §6).
- Prize formula: clamp(10% of trailing-month Guild revenue, floor P350, ceiling P1500), split 4:2:1, top 3, min Botho in period 150.
- Boost availability checks run **4** (expected: listed = 0).

### Progression

- Contracts accepted **4**, completed **0** (0.0%).
- Chapter claims **0**.
- Elder's Guidance rules fired: unknown=8
- Real months crossed **9**.

### Safeguards

#### security

| ID | Check | Result | Detail |
|---|---|---|---|
| SEC-01a | harvest another player's plot is rejected | **PASS** | HTTP 400 |
| SEC-01b | collect another player's crafting job is rejected | **PASS** | HTTP 400 |
| SEC-02:/payments/create:negative-quantity | /payments/create rejects negative-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:zero-quantity | /payments/create rejects zero-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:absurd-quantity | /payments/create rejects absurd-quantity | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:wrong-type | /payments/create rejects wrong-type | **FAIL** | HTTP 201 |
| SEC-02:/payments/create:missing-field | /payments/create rejects missing-field | **FAIL** | HTTP 201 |
| SEC-04 | exceeding 60 mutating requests/60s throttles | **PASS** | throttled=true |
| SEC-05 | client-supplied reward/quality is ignored | **FAIL** | INCONCLUSIVE - sale rejected (HTTP 404) |
| SEC-06 | PUT /config is admin-gated | **FAIL** | HTTP 500 - a non-admin reached the handler |

#### anticheat

| ID | Check | Result | Detail |
|---|---|---|---|
| AC-01a | concurrent duplication rejected | **PASS** | second call rejected |
| AC-06 | top-up daily cap enforced | **PASS** | cap respected |

#### deferred

| ID | Check | Result | Detail |
|---|---|---|---|
| DEF-01 | boost purchase rejected | **PASS** | listed=0, unavailable |

#### gap

| ID | Check | Result | Detail |
|---|---|---|---|
| GAP-01 | multi-accounting / one-win-per-identity | **GAP** | NOT TESTED - no phone/KYC field exists anywhere in the API |
| GAP-02 | inhuman action-pace / bot-speed | **GAP** | NOT TESTED - no defense found |

- **7** failing check(s) outside the known-gap group.
- Gaps are reported, not passed: GAP-01, GAP-02.
