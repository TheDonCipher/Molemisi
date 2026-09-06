# Document 13: Security Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target)
> Last Updated: 2026-09-02
> Implementation: 2026-09-06 — Supabase JWT in localStorage, `AuthGuard`, `AdminGuard` (`profiles.is_admin`), farm ownership checks, RLS, in-memory 60/min rate limit. Config PUT is not admin-gated.

---

## 1. Threat Model

**NFR-SEC-001**

### Assets to Protect

| Asset                 | Value    | Threats                 |
| --------------------- | -------- | ----------------------- |
| Player accounts       | High     | Unauthorized access     |
| Game currency         | High     | Duplication, theft      |
| Player data           | Medium   | Exposure, modification  |
| Payment data          | Critical | Theft, fraud            |
| Game economy          | High     | Manipulation, inflation |
| Server infrastructure | High     | DDoS, intrusion         |

### Trust Boundaries

```
┌─────────────────────────────────────┐
│         UNTRUSTED ZONE              │
│  (Player's device, browser)         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     API BOUNDARY            │    │
│  │  (NestJS + Validation)      │    │
│  │                             │    │
│  │  ┌─────────────────────┐    │    │
│  │  │   TRUSTED ZONE      │    │    │
│  │  │  (Database, Redis)   │    │    │
│  │  └─────────────────────┘    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 2. Authentication

**NFR-SEC-002**

### Supabase Auth

- JWT tokens with 1-hour expiry
- Refresh tokens for token renewal
- Email/password authentication
- Rate limiting on auth endpoints (10/minute)

### Token Validation

```typescript
// Every API request validates JWT
@UseGuards(AuthGuard)
@Controller('farms')
export class FarmController {
  @Get('current')
  async getFarm(@Request() req) {
    const userId = req.user.id; // From validated JWT
    return this.farmService.getFarm(userId);
  }
}
```

---

## 3. Authorization

**NFR-SEC-003**

### RLS Policies

All player data protected by Supabase RLS:

```sql
-- Players can only access their own data
CREATE POLICY "own_data_only" ON public.farms
  FOR ALL USING (user_id = auth.uid());
```

### API Authorization

```typescript
// Verify farm ownership before any operation
async function verifyFarmOwnership(farmId: string, userId: string): Promise<boolean> {
  const farm = await db.farms.findById(farmId);
  return farm && farm.userId === userId;
}
```

---

## 4. Anti-Cheat

**NFR-SEC-004**

### Client-Trust Rules

1. **NEVER trust client-side state** for game actions
2. **ALWAYS validate** on server before applying changes
3. **ALWAYS check** resource availability server-side
4. **ALWAYS record** economic transactions in ledger

### Validation Points

| Action       | Server Validation                                 |
| ------------ | ------------------------------------------------- |
| Plant crop   | Plot empty, seed in inventory, crop type unlocked |
| Harvest crop | Crop state is READY, plot ownership               |
| Sell item    | Item in inventory, quantity available             |
| Buy item     | Sufficient currency, item available               |
| Build        | Resources available, building not duplicate       |

### Cheat Detection

```typescript
// Detect impossible state transitions
if (newCurrency < 0) {
  logger.warn('cheat_detected', { userId, reason: 'negative_currency' });
  await banUser(userId);
}
```

---

## 5. Payment Security

**NFR-SEC-005**

### Webhook Verification

```typescript
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Payment Rules

1. Never award purchases based on client-side state
2. Always verify with provider API
3. Always check idempotency
4. Always log payment attempts

---

## 6. API Security

**NFR-SEC-006**

### Rate Limiting

| Endpoint Type | Limit   | Window |
| ------------- | ------- | ------ |
| Auth          | 10/min  | 1 min  |
| Game actions  | 30/min  | 1 min  |
| Market        | 20/min  | 1 min  |
| Payments      | 5/min   | 1 min  |
| Global        | 100/min | 1 min  |

### Input Validation

```typescript
// All inputs validated with class-validator
class PlantCropDto {
  @IsString()
  @IsIn(['sorghum', 'maize', 'millet', ...])
  cropType: string;

  @IsUUID()
  seedId: string;
}
```

### CORS Configuration

```typescript
// Only allow known origins
app.enableCors({
  origin: ['https://molemisi.com', 'http://localhost:3000'],
  credentials: true,
});
```

---

## 7. Data Protection

**NFR-SEC-007**

### Sensitive Data

| Data            | Protection                     |
| --------------- | ------------------------------ |
| Passwords       | Hashed (Supabase Auth)         |
| JWT secrets     | Environment variable           |
| API keys        | Environment variable           |
| Webhook secrets | Environment variable           |
| Payment data    | Never stored, provider handles |

### Secrets Management

- All secrets in environment variables
- Never commit secrets to git
- Use `.env.example` for documentation
- Rotate secrets periodically

---

## 8. Audit Logging

**NFR-SEC-008**

### Audit Trail

All sensitive operations logged:

```typescript
async function auditLog(userId: string, action: string, details: any) {
  await db.auditLogs.create({
    userId,
    action,
    resourceType: details.resourceType,
    resourceId: details.resourceId,
    oldValues: details.oldValues,
    newValues: details.newValues,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
  });
}
```

### Actions Logged

- Login/logout
- Currency changes
- Inventory changes
- Building operations
- Market transactions
- Payment operations
- Admin actions

---

## 9. Abuse Prevention

**NFR-SEC-009**

### Anti-Abuse Rules

| Abuse Type           | Detection                    | Response            |
| -------------------- | ---------------------------- | ------------------- |
| Bot behavior         | Request pattern analysis     | Rate limit, CAPTCHA |
| Account sharing      | Multiple IP analysis         | Warning, lock       |
| Economy manipulation | Transaction pattern analysis | Flag, review        |
| Payment fraud        | Provider alerts              | Block, investigate  |

### Account Lockout

```typescript
// Lock account after 5 failed login attempts
if (failedAttempts >= 5) {
  await lockAccount(userId, duration: 15 * 60 * 1000); // 15 minutes
}
```
