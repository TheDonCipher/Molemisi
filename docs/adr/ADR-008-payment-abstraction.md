# ADR-008: Payment Provider Abstraction

**Status:** Accepted
**Date:** 2026-09-02

---

## Context

Molemisi needs to support multiple payment providers (mobile money, cards) without coupling game logic to specific providers.

## Decision

Use a **payment provider abstraction** layer.

## Implementation

```typescript
interface PaymentProvider {
  name: string;
  createTransaction(amount: number, currency: string, metadata: any): Promise<PaymentSession>;
  verifyTransaction(transactionId: string): Promise<PaymentVerification>;
  handleWebhook(payload: any, signature: string): Promise<WebhookResult>;
}
```

## Rationale

1. **Flexibility:** Add new providers without changing game logic
2. **Testing:** Mock providers for testing
3. **Isolation:** Payment failures don't affect game state
4. **Future-proof:** Easy to add new providers

## Consequences

- Game economy never directly interacts with payment providers
- All payment verification is server-side
- Webhooks are verified with HMAC signatures
