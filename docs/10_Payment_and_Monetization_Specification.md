# Document 10: Payment and Monetization Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Provider interface + `StubPaymentProvider` only. 13 SKUs in `packages/game-config/src/store.ts`. No Stripe/Orange Money. No React store UI.

---

## 1. Monetization Strategy

**FR-PAY-001**

Molemisi uses a **cosmetic and convenience** monetization model. No gameplay advantages are sold. All content is achievable through play.

### Revenue Streams

| Stream           | Type      | Price Range  | Description                 |
| ---------------- | --------- | ------------ | --------------------------- |
| Premium currency | One-time  | 5-50 BWP     | Buy Gems for cosmetic shop  |
| Cosmetic packs   | One-time  | 10-100 BWP   | Farm decorations, themes    |
| Season passes    | Recurring | 25 BWP/month | Exclusive cosmetic tracks   |
| Convenience      | One-time  | 5-20 BWP     | Speed boosts, extra storage |

### What is NOT sold

- Gameplay advantages (no pay-to-win)
- Exclusive crops or animals
- Currency directly
- Resources that affect economy
- Competitive advantages

---

## 2. Payment Architecture

**FR-PAY-002**

### Payment Flow

```
Player
  ↓
Molemisi Payment API (NestJS)
  ↓
Payment Provider Abstraction
  ↓
Provider (Mobile Money / Cards)
  ↓
Provider Webhook/Callback
  ↓
Payment Verification (Server)
  ↓
Transaction Ledger
  ↓
Entitlement Grant
  ↓
Game Economy
```

### Provider Abstraction

```typescript
interface PaymentProvider {
  name: string;
  createTransaction(amount: number, currency: string, metadata: any): Promise<PaymentSession>;
  verifyTransaction(transactionId: string): Promise<PaymentVerification>;
  handleWebhook(payload: any, signature: string): Promise<WebhookResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
}
```

### Supported Providers (MVP)

| Provider        | Type         | Regions  | Status  |
| --------------- | ------------ | -------- | ------- |
| Orange Money    | Mobile Money | Botswana | Phase 7 |
| Mascom WiFi Pay | Mobile Money | Botswana | Phase 7 |
| Stripe          | Cards        | Global   | Phase 7 |

### Adding New Providers

1. Implement `PaymentProvider` interface
2. Add provider configuration to environment
3. Register provider in provider registry
4. No changes to game economy needed

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

### Entitlement Types

| Type             | Data                                | Grant Method                |
| ---------------- | ----------------------------------- | --------------------------- |
| premium_currency | `{ amount: 500 }`                   | Add to profile.gems         |
| cosmetic_item    | `{ itemId: "farm_theme_sunset" }`   | Add to inventory            |
| season_pass      | `{ seasonId: "spring_2026" }`       | Set profile flag            |
| extra_storage    | `{ slots: 50 }`                     | Increase inventory capacity |
| speed_boost      | `{ multiplier: 2, duration: 3600 }` | Set temporary multiplier    |

### Entitlement Grant

```typescript
async function grantEntitlement(paymentId: string, entitlement: Entitlement): Promise<void> {
  // 1. Record entitlement
  await db.paymentEntitlements.create({
    paymentId,
    farmId: entitlement.farmId,
    entitlementType: entitlement.type,
    entitlementData: entitlement.data,
  });

  // 2. Apply to game state
  switch (entitlement.type) {
    case 'premium_currency':
      await addCurrency(entitlement.farmId, entitlement.data.amount, 'PAYMENT_PURCHASE');
      break;
    case 'cosmetic_item':
      await addToInventory(entitlement.farmId, entitlement.data.itemId, 1);
      break;
    // ... other types
  }
}
```

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
