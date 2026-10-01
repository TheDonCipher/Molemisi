# Document 10: Payment and Monetization Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target), **reconciled to the as-built store 2026-10-02**
> Last Updated: 2026-10-02
> Implementation: provider interface + `StubPaymentProvider` only. Store SKUs in
> `packages/game-config/src/store.ts`. **No Stripe / Orange Money / MyZaka / Smega.** The
> `StoreScreen` component renders both shelves but there is **no wired purchase flow** yet
> (`docs/34` §4.3).

---

## 1. Monetization Strategy

**FR-PAY-001**

Molemisi uses a **cosmetic-only** monetization model (DECIDED 2026-10-01, `docs/33` §1–§2): **decorations and the Village Pass only**. No gameplay advantages are sold. All content is achievable through play.

### Revenue Streams

| Stream | Type | Price Range | Description |
| --- | --- | --- | --- |
| Madi top-up packs | One-time | P5–P250 BWP | Buy Madi (1 Madi = 1 BWP; bonus on the P50+ packs) |
| Decorations — **Market shelf** | One-time | P200 / P600 / P1,500 (Pula, **earned**) | The everyday line, and the unbounded Pula sink |
| Decorations — **Festival shelf** | One-time | M40 / M80 / M150 / M300 (Madi, **bought**) | The seasonal look, optional |
| Village Pass | Recurring | M50/month | Helper + monthly festival outfit + 50 % storage |

**The shelf model is the merchandising decision.** Every Festival item has a **Market cousin in
the same `slot`** (`hut` · `kraal` · `frame` · `livestock` · `outfit`), so a free player can
reach every visual affordance the game has and nobody's farm looks poorer for not paying.
`store.spec.ts` asserts this on every test run, because that promise is the whole product.

### What is NOT sold

- Gameplay advantages (no pay-to-win)
- Exclusive crops or animals
- **Pula — never.** No amount of real money buys Pula, and no premium currency converts to it
- Resources that affect economy
- Competitive advantages
- Botho, season stamps, or anything standing-related

### Boosts are cut, not withdrawn

`05 §P9` originally required three boosts (Pula Stone, Ancestral Ward, Breath of the Land). They
were catalogued and sold while **no endpoint applied any of their effects**. The 2026-09-11
ruling set `available: false`; `docs/34` §3.3 (2026-10-01) went further and **removed the entries
entirely** — `BOOSTS` is `readonly never[]`, `BOOST_SLUGS` is empty, and `store.spec.ts` asserts
the catalogue stays empty. A dead catalogue entry is worse than no entry: it can be half-restored
by a later merge and it keeps `BOOSTS` looking like a live product line. Re-adding one is a
deliberate act gated on **every** effect in its description working.

---

## 2. Payment Architecture

**FR-PAY-002**

### Payment Flow

```
Player
  ↓
Molemisi Payment API (NestJS)          POST /api/v1/payments/create
  ↓
PaymentProvider  (DI token 'PAYMENT_PROVIDER')
  ↓
Provider (Mobile Money / Cards)       ← only StubPaymentProvider is bound today
  ↓
Provider Webhook/Callback             POST /api/v1/payments/webhook
  ↓
Payment Verification (Server)
  ↓
Transaction Ledger                    ledger_entries, via wallet_apply()
  ↓
Entitlement Grant
  ↓
Game Economy
```

### Provider Abstraction

**The real interface** — `apps/api/src/payments/providers/payment-provider.interface.ts`:

```typescript
export interface PaymentProvider {
  /** Unique provider identifier */
  readonly name: string;

  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;
  verifyPayment(transactionId: string): Promise<PaymentVerification>;
  verifyWebhookEvent(payload: unknown, signature: string): Promise<boolean>;
  refund(request: RefundPaymentRequest): Promise<RefundResponse>;
}
```

> ⚠️ The interface in earlier revisions of this document
> (`createTransaction` / `handleWebhook` / `refund(transactionId, amount, ...)`) **did not match
> the code** and would not have compiled against it. The signature above is the as-built one;
> `PaymentsService` injects it as `@Inject('PAYMENT_PROVIDER') private readonly provider:
> PaymentProvider`.

### Supported Providers (MVP)

| Provider | Type | Regions | Status |
| --- | --- | --- | --- |
| `stub` | Dev only | — | **Bound.** Completes inline, always succeeds |
| Orange Money | Mobile Money | Botswana | Phase 7 — interface ready, not implemented |
| Mascom MyZaka | Mobile Money | Botswana | Phase 7 — interface ready, not implemented |
| BTC BeMobile Smega | Mobile Money | Botswana | Phase 7 — interface ready, not implemented |
| Stripe (cards) | Cards | Global | **Deferred** — no card-only model; mobile money is the only rail for Madi |

> *(DECIDED 2026-10-01, `docs/33` §0.)* All real-money transactions flow through the Botswana
> mobile-money providers above. No card-only payment model.

### Adding New Providers

1. Implement the `PaymentProvider` interface above
2. Add provider configuration to environment
3. Register the implementation in `payments.module.ts` under the `PAYMENT_PROVIDER` token
4. **No changes to game economy needed** — this claim is real and load-bearing: the store
   catalogue, entitlements and ledger are all provider-agnostic, and `docs/34` Waves 2–3 were
   built behind exactly this seam

### Webhook authentication — a known gap

The webhook is *conceptually* unauthenticated, but `PaymentsController` applies `AuthGuard` at
the class level, so `POST /payments/webhook` currently **requires a Bearer token**. A real PSP
cannot call it. Fixing this means scoping `AuthGuard` per-route rather than per-class and
replacing the stub's `verifyWebhookEvent` (which always returns `true`) with real HMAC
verification. Tracked in `KNOWN_LIMITATIONS.md`.

---

## 3. Payment Lifecycle

**FR-PAY-003**

### States

```
PENDING → PROCESSING → COMPLETED
                        ↓
                     FAILED
                        ↓
                     REFUNDED
```

### State Transitions

| From       | To         | Trigger                   |
| ---------- | ---------- | ------------------------- |
| PENDING    | PROCESSING | Player initiates payment  |
| PROCESSING | COMPLETED  | Provider confirms payment |
| PROCESSING | FAILED     | Provider rejects payment  |
| COMPLETED  | REFUNDED   | Admin processes refund    |

### Idempotency

- Each payment has a unique `Idempotency-Key`
- Duplicate requests return the same response
- Webhook processing is idempotent

---

## 4. Transaction Ledger

**FR-PAY-004**

All payment-related economic changes are recorded in `game_ledger_entries`:

```sql
INSERT INTO game_ledger_entries (
  farm_id, entry_type, reference_type, reference_id,
  currency_change, currency_balance_after,
  description, metadata
) VALUES (
  $1, 'PAYMENT_PURCHASE', 'payment', $2,
  $3, $4,
  $5, $6
);
```

### Ledger Entry Types

| Type             | Description                 |
| ---------------- | --------------------------- |
| PAYMENT_PURCHASE | Currency added from payment |
| PAYMENT_REFUND   | Currency removed for refund |

---

## 5. Webhook Security

**FR-PAY-005**

### Webhook Verification

```typescript
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

### Webhook Rules

1. Always verify HMAC signature before processing
2. Always check idempotency (don't process same webhook twice)
3. Always verify transaction details with provider API
4. Always log webhook events for audit

---

## 6. Refunds

**FR-PAY-006**

### Refund Policy

- Refunds are processed manually by admins
- Refunds reverse all entitlements
- Refunds are recorded in ledger
- Player is notified of refund

### Refund Process

1. Admin initiates refund via admin API
2. Server reverses all entitlements
3. Server records ledger entry
4. Server calls provider refund API
5. Server updates payment status to REFUNDED
6. Player receives notification

---

## 7. Reconciliation

**FR-PAY-007**

### Daily Reconciliation

```typescript
async function reconcilePayments(date: Date): Promise<ReconciliationReport> {
  const payments = await getPaymentsForDate(date);
  const ledgerEntries = await getLedgerEntriesForDate(date, 'PAYMENT');

  // Verify all completed payments have ledger entries
  const missingEntries = payments.filter(
    (p) => p.status === 'completed' && !ledgerEntries.some((e) => e.referenceId === p.id),
  );

  // Verify all ledger entries have corresponding payments
  const orphanEntries = ledgerEntries.filter((e) => !payments.some((p) => p.id === e.referenceId));

  return {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    missingEntries: missingEntries.length,
    orphanEntries: orphanEntries.length,
    discrepancies: [...missingEntries, ...orphanEntries],
  };
}
```

---

## 8. Entitlements

**FR-PAY-008**

### Entitlement Types — as built

`VirtualEntitlement` in `packages/game-config/src/store.ts` is the real union. It is **much
smaller than it was**: the currency entitlement was renamed, the boost entitlement is **gone**,
and `season_pass` / `extra_storage` / `speed_boost` were never implemented in the catalogue at
all.

```typescript
export type VirtualEntitlement =
  | { type: 'madi'; amount: number }                            // top-up packs
  | { type: 'subscription'; slug: string; days: number }       // the Village Pass
  | { type: 'cosmetic'; cosmeticId: string };                  // both shelves
```

| Retired entitlement | Was | Why it is gone |
| --- | --- | --- |
| `{ type: 'currency' }` | granted **Pula** for BWP | Pula is earned-only. Renamed to `madi` (`docs/33` §2). `wallet_apply()` will still accept `'pula'`, but no SKU may produce a Pula ledger row — asserted by `payments.service.spec.ts` |
| `{ type: 'boost' }` | Pula Stone, Ancestral Ward, Breath of the Land | **Cut** (`docs/34` §3.3). None of their effects was ever applied |
| `season_pass` / `speed_boost` | never implemented | Removed from this spec rather than left as a phantom type |
| `extra_storage` | "+50 % storage" | Now part of the **Village Pass** subscription, not a standalone SKU |

> ⚠️ `profile.gems` does not exist. The premium currency is `player_wallets.madi_balance`
> (migration `20261001000003`), and the whole anti-pay-to-win guarantee is structural: there is
> deliberately **no conversion helper** in the schema, so money → Madi → *(nothing that affects
> progression)*.

### Entitlement Grant

```typescript
// apps/api/src/payments/payments.service.ts
private async awardEntitlement(playerId: string, virtualGood: VirtualGood) {
  const entitlement = virtualGood.entitlement;
  switch (entitlement.type) {
    case 'madi':
      // The ONLY thing a real-money purchase may ever credit.
      await this.wallet.creditMadi(playerId, entitlement.amount, `payment:${virtualGood.sku}`);
      break;
    case 'subscription':
      await this.wallet.setSubscription(playerId, entitlement.slug, entitlement.days);
      break;
    case 'cosmetic':
      // Written by StoreService, the only writer of player_cosmetics.
      break;
  }
}
```

In-game cosmetic purchases take a **different** path — `StoreService.purchase()` debits
`spendPula` for the Market shelf and `spendMadi` for the Festival shelf, both ledgered and both
floored at zero, and it rejects any `BWP`-denominated SKU with a message pointing at
`POST /payments/create`. Real money and earned money never meet in one code path.

> **Known gap:** entitlements for extra plots, extra storage and cosmetics are still **largely
> logged rather than fully applied** at runtime. The Village Pass's +50 % storage in particular is
> declared in the SKU description but its effect is not yet wired to the storage-tier check.
> See `KNOWN_LIMITATIONS.md`.

---

## 9. Failed Payments

**FR-PAY-009**

### Failure Handling

| Failure Type       | Response        | User Message                                     |
| ------------------ | --------------- | ------------------------------------------------ |
| Insufficient funds | Show error      | "Insufficient funds. Please try again."          |
| Network timeout    | Show retry      | "Payment timed out. Please try again."           |
| Provider error     | Show error      | "Payment failed. Please try a different method." |
| Duplicate request  | Return existing | (No new payment created)                         |

### Retry Policy

- Client can retry failed payments after 30 seconds
- Maximum 3 retries per payment
- After 3 retries, show "Contact support" message
