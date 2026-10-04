# 16 — Anti-Cheat & Validation

> Companion to `09`. Normative anchors: `06 §2` (the 15 hard invariants), `13_Security_Specification.md`, `11_Error_Handling_and_Recovery_Specification.md`, `DEVELOPMENT_STATE.md` §Simulation/§Security.
> **Governing principle:** **flags are review signals, never verdicts.** Writing a flag never mutates player state. Every corrective action is named, deliberate, and audited.

---

## 1. The threat model

Molemisi is an economic game with (from v1.1) real money out. The threats that matter, in order:

| # | Threat | Impact | Primary control |
|---|---|---|---|
| 1 | Client forges value (price, quantity, growth, reward) | inflation / theft | **server authority** (I7) |
| 2 | Replayed PSP webhook | free Madi | **idempotency** (I3) |
| 3 | Player-to-player Pula transfer | breaks the closed loop | **no such function** (I2) |
| 4 | Grinding Botho via automation | buys prize eligibility | **cap + manual-only** (I4) |
| 5 | TOCTOU inventory race | item duplication | `inventory_take` atomic RPC (C3) |
| 6 | Concurrent Kagiso drain | out-earns the farm | bounded property tests (I14) |
| 7 | Sybil / multi-account | fraud (v1.1) | one verified number = one account |
| 8 | Wash trading | fee laundering (v1.1) | 10% + 2% round-trip economics |

v1's job is to make 1–6 structurally impossible. 7–8 are v1.1.

---

## 2. Server authority (the first line)

`03 §8`: *the client never determines price, quantity owned, growth completion, or reward.*

| Server decides | Client may send |
|---|---|
| Sale price (from `market_prices` × band) | item slug + quantity |
| Whether a crop is ready | plot id |
| Harvest yield (seeded) | — |
| Loot rarity and reward | hotspot id |
| Whether the player owns an item | item id + quantity to consume |
| Botho granted | donation amount |
| Madi credited | pack slug |

**Test (I7):** a fuzz test on every sale / craft / collect endpoint supplies junk in every client-controllable field and asserts the server either ignores it or rejects it.

---

## 3. Ledger integrity

`10 §3.1`, `13 §3`. The wallet is the money boundary.

```ts
// The ONLY balance writers. Transactional. Each writes one ledger row.
credit(playerId, currency, amount, source, refId?)
debit (playerId, currency, amount, source, refId?)
```

**Enforced controls:**

| Control | Mechanism |
|---|---|
| Single writer | `launch-readiness.spec.ts` static check forbids direct balance updates |
| No P2P | **signature** — neither function accepts two player IDs (I2) |
| Atomic with ledger | both the balance change and the ledger row commit or roll back together |
| No negative balance | `m3_non_negative_checks` DB constraint |
| Append-only ledger | no UPDATE/DELETE policy on `ledger_entries` |
| Idempotent | unique index on `(source, ref_id)` |
| Botho-capped | Botho credits route through `botho_credit_capped`, never `credit` directly |

> **`game_ledger_entries` is retired.** Six app call sites historically failed on every write because the table has none of the expected columns. The live ledger is `ledger_entries`. Never write the retired table.

**Reconciliation** (`11 §5`): REC-1 (Pula), REC-2 (Botho), REC-3 (historical top-ups). All must pass before their cutover.

---

## 4. Inventory race safety

The C3 finding was a **TOCTOU**: `removeItem` did a select-then-update, so two concurrent requests could both see qty ≥ needed and both succeed, duplicating the item.

**Fix, and the rule:** all removals go through the atomic RPC.

```sql
-- inventory_take(player, item, qty) — the ONLY sanctioned removal
UPDATE player_inventory
   SET quantity = quantity - qty
 WHERE player_id = player AND item_def_id = item
   AND quantity >= qty
RETURNING quantity;
-- zero rows returned → RAISE (insufficient): no partial deduction, ever.
```

**Do NOT reintroduce a select-then-update.** The atomic `WHERE quantity >= qty` is the whole fix.

---

## 5. Webhook idempotency

I3. The unique constraint on `real_world_transactions.provider_tx_id` **is** the guard.

```
webhook(payload):
  1. verify HMAC signature (PAYMENT_WEBHOOK_SECRET)
  2. row = real_world_transactions[provider_tx_id]     (unique)
  3. if row.status == 'completed' → 200 immediately    ← the replay gate
  4. assert payload.provider == row.provider
     assert payload.amount   == row.amount_bwp
     assert payload.currency == row.currency
  5. row.status = 'completed'                          ← flip FIRST
     WalletService.credit(playerId, 'madi', grantedMadi, 'topup', row.id)
  6. commit (5); return 200
```

**Rules:**
- Always return `200` on a valid signature (even on replay) so the PSP stops retrying.
- Credit **only** on webhook, never on `POST /payments/create`.
- The status flip and the credit are one transaction; a crash between them leaves the row `pending`, and the PSP's next retry completes it — never a double credit.
- **`PaymentsModule` throws at boot if `NODE_ENV=production` resolves the stub provider.** The stub accepts unsigned webhooks **in dev only**.

**Test:** deliver the same `provider_tx_id` twice → exactly one credit, one ledger row.

---

## 6. Passive & active anti-cheat

`apps/api/src/anti-cheat/`. Detection is split into **pure rules** (`rules.ts`) and a persistence service.

| Class | What it detects | Signal type |
|---|---|---|
| **Passive** | impossible states flagged by `validateGameState()` — negative currency/Botho/inventory, orphan crops, stale/future timestamps | review |
| **Passive** | ledger imbalance, missing ledger rows, balance not matching ledger sum | review |
| **Active** | impossible action sequences — harvest before ready, collect without cost, cross-tenant access | review |
| **Active** | rate anomalies (see §7), device/IP clustering (v1.1) | review |

**Persistence:** `anti_cheat_flags`, with a **unique-open index** to stop flag flooding. RLS has **no** player read policy — a player cannot read its own flags.

> **Flags NEVER auto-action.** Writing a flag is read-only with respect to player state. Every corrective action is a separate, named, audited operation (`07`-style `planRecovery()`).

---

## 7. Rate limiting & infrastructure controls

| Control | State | Note |
|---|---|---|
| Rate limit | in-memory, flat **60/min non-GET** | **H2 open** — no `trust proxy`, in-memory `Map` (does not survive restart or scale horizontally) |
| `trust proxy` | **not set** | H2 — a proxied deployment would rate-limit the proxy, not the client |
| Redis | none (ADR-012 deferred) | shared rate-limit store is the natural fix |

> H2 and the missing `trust proxy` are recorded audit findings. They are launch-acceptable for a single-instance v1 but must be closed before scale-out.

---

## 8. Map of invariant → enforcement

The rubric's 15 hard invariants (`06 §2`) and where each is enforced. **A bug in any of these costs real money or creates legal exposure.**

| # | Invariant | Enforced by | Test |
|---|---|---|---|
| **I1** | No house-funded Madi | every `madi_balance` credit traces to a completed deposit or a counterparty debit | static + test |
| **I2** | No P2P Pula | `WalletService` signature | enumerate balance-touching fns |
| **I3** | Webhook credits once | `provider_tx_id UNIQUE` | replay test |
| **I4** | Auto-Collector never increments Botho | CI test on any Auto-Collector/Botho change | dedicated CI |
| **I5** | Prize pool within floor/ceiling | `PRIZE` clamp | property test |
| **I6** | No payout while `kyc_status != 'verified'` | every payout path (v1.1) | endpoint test |
| **I7** | Server authoritative | §2 above | fuzz test |
| **I8** | 5% tax server-side; crafted exempt from band | `MarketService.sell` | per sale path |
| **I9** | Botho thresholds server-side | guards on gated routes | direct-call test |
| **I10** | Single canonical Botho | `player_wallets.botho_points` only | schema grep |
| **I11** | Withdrawal only to funding number (v1.1) | closed-loop rule | endpoint test |
| **I12** | Caps hold | top-up cap (v1); withdrawal caps (v1.1) | boundary + 1 past |
| **I13** | Chapter tokens zero at end | rollover job | idempotent dry-run |
| **I14** | Kagiso bounded | recompute-on-read + property test | concurrency/replay |
| **I15** | No withdrawal endpoint exists | route-table assertion + static grep | **must fail closed** |

> **I15 vs I1:** in v1 there is no Madi outflow, so **I15 is the operative check**. I1 takes over in v1.1. Both live in CI; I15 is expected to **fail** the moment v1.1 lands, at which point it is **retired by explicit sign-off — not quietly deleted**.

---

## 9. Open audit findings (do not assume these are fixed)

From the 2026-10-02 security audit. Ship-blockers C1/C2/C3/H3/H6 are **fixed and pushed**. The following remain **open**:

| # | Finding | Severity |
|---|---|---|
| **H1** | Botho cap read-then-write (partially addressed by `botho_credit_capped`; verify it is applied) | HIGH |
| **H2** | Rate limit = flat 60/min, no `trust proxy`, in-memory Map | HIGH |
| **H4** | Kgotla pool count-then-insert; turn-in sets `claimed` **last** | HIGH |
| **H5** | Admin service uses the **anon** client; `game_ledger_entries` wrong columns | HIGH |
| **M1** | `AdminGuard` ≡ `DevGuard` (not admin-only) | MEDIUM |
| **M2–M10** | incl. M8: contracts pay **1.25×** vs spec **1.05×**, no 3/day accept cap | MEDIUM |
| **L1–L10** | low-severity | LOW |

> **Treat any "gates green" claim as unverified until re-run.** `tsc -p apps/api` was **not** 0 on HEAD before the remediation pass (commit `3747cd8` broke it with a missing `LedgerSource` member).

---

## 10. Anti-cheat acceptance

- [ ] Every flag write leaves player state **unchanged**.
- [ ] `validateGameState()` returns all seven corruption classes correctly and `planRecovery()` names a distinct action for each.
- [ ] A replayed webhook credits exactly once (I3).
- [ ] An enumeration test confirms no balance-touching function accepts two player IDs (I2).
- [ ] A fuzz test confirms no client-supplied price is honoured (I7).
- [ ] Kagiso never negative / above max under concurrent + replayed collects (I14).
- [ ] The route table contains **no** withdrawal endpoint (I15).
- [ ] I4's dedicated CI test exists and runs on any Auto-Collector / Botho change.

*End of `16`. Proceed to `17_Testing_Strategy.md`.*
