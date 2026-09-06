# Document 11: Error Handling and Recovery Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Nest exceptions + Zod/class-validator on some routes. `AllExceptionsFilter` exists but is not registered in `main.ts`.

---

## 1. Error Categories

**NFR-ERR-001**

| Category   | Examples                                 | Severity | User Impact         |
| ---------- | ---------------------------------------- | -------- | ------------------- |
| Network    | Offline, timeout, DNS failure            | Medium   | Cannot sync         |
| Auth       | Expired token, invalid credentials       | High     | Must re-login       |
| Game Logic | Invalid action, insufficient resources   | Low      | Action blocked      |
| Database   | Connection failure, constraint violation | Critical | Service unavailable |
| Payment    | Provider failure, webhook error          | High     | Purchase blocked    |
| State      | Corrupted state, stale data              | High     | Data refresh needed |

---

## 2. Client-Side Error Handling

### Network Errors

```typescript
class ApiClient {
  async request<T>(method: string, path: string, body?: any): Promise<T> {
    try {
      const response = await fetch(...);
      if (!response.ok) throw new ApiError(response.status, ...);
      return response.json();
    } catch (error) {
      if (error instanceof NetworkError) {
        // Queue for retry when online
        this.offlineQueue.push({ method, path, body });
        throw new OfflineError('You are offline. Changes will sync when reconnected.');
      }
      throw error;
    }
  }
}
```

### Retry Policies

| Error Type       | Max Retries | Delay      | Backoff       |
| ---------------- | ----------- | ---------- | ------------- |
| Network timeout  | 3           | 1s, 2s, 4s | Exponential   |
| 5xx server error | 2           | 2s, 4s     | Exponential   |
| Rate limited     | 1           | 60s        | Fixed         |
| Auth error       | 0           | -          | Refresh token |
| Validation error | 0           | -          | Show message  |

---

## 3. Server-Side Error Handling

### Database Errors

```typescript
async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      // Unique violation
      throw new ConflictError('Resource already exists');
    }
    if (error.code === '23503') {
      // Foreign key violation
      throw new NotFoundError('Referenced resource not found');
    }
    throw new InternalError('Database error');
  } finally {
    client.release();
  }
}
```

### Game State Errors

| Error                  | Response              | Recovery               |
| ---------------------- | --------------------- | ---------------------- |
| Stale state            | 409 Conflict          | Client refreshes state |
| Invalid action         | 400 Bad Request       | Show error message     |
| Insufficient resources | 400 Bad Request       | Show what's missing    |
| Cooldown active        | 429 Too Many Requests | Show cooldown timer    |

---

## 4. Payment Error Handling

### Provider Failures

```typescript
async function processPayment(payment: Payment): Promise<void> {
  try {
    const result = await provider.createTransaction(payment.amount, ...);
    await updatePaymentStatus(payment.id, 'PROCESSING');
  } catch (error) {
    if (error instanceof ProviderTimeoutError) {
      // Queue for verification
      await queuePaymentVerification(payment.id);
    } else if (error instanceof ProviderRejectedError) {
      await updatePaymentStatus(payment.id, 'FAILED', error.message);
    } else {
      // Unknown error - don't charge player
      await updatePaymentStatus(payment.id, 'FAILED', 'Provider error');
    }
  }
}
```

---

## 5. State Recovery

### Corrupted State Detection

```typescript
function validateGameState(farm: Farm): ValidationResult {
  const errors: string[] = [];

  // Check currency is non-negative
  if (farm.currency < 0) errors.push('Currency is negative');

  // Check plot states are valid
  for (const plot of farm.plots) {
    if (plot.state === 'GROWING' && !plot.cropId) {
      errors.push(`Plot ${plot.id} is GROWING but has no crop`);
    }
  }

  // Check inventory quantities
  for (const item of farm.inventory) {
    if (item.quantity < 0) errors.push(`Item ${item.type} has negative quantity`);
  }

  return { valid: errors.length === 0, errors };
}
```

### Recovery Actions

| Issue                      | Action                    |
| -------------------------- | ------------------------- |
| Negative currency          | Set to 0, log incident    |
| Orphan crop (no plot)      | Remove crop, log incident |
| Negative inventory         | Set to 0, log incident    |
| Stale simulation timestamp | Re-run simulation         |

---

## 6. User-Facing Errors

### Error Messages

| Code               | Message                                               | Action               |
| ------------------ | ----------------------------------------------------- | -------------------- |
| OFFLINE            | "You're offline. Changes will sync when reconnected." | Retry button         |
| SESSION_EXPIRED    | "Your session expired. Please log in again."          | Login button         |
| INSUFFICIENT_FUNDS | "Not enough Pula."                                    | Show required amount |
| PLOT_OCCUPIED      | "This plot already has a crop."                       | Close                |
| CROP_NOT_READY     | "This crop isn't ready yet."                          | Close                |
| ANIMAL_SICK        | "Your animal needs medicine."                         | Go to market         |
| SERVER_ERROR       | "Something went wrong. Please try again."             | Retry button         |

### Error Display Rules

1. Errors appear near the action that caused them
2. Errors auto-dismiss after 5 seconds
3. Critical errors require user acknowledgment
4. Never show technical details to users
5. Always suggest a recovery action
