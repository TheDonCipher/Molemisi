# Document 18: Admin and Operations Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Draft
> Last Updated: 2026-09-02

---

## 1. Admin Dashboard

**NFR-ADM-001**

### Dashboard Features

| Feature | Description |
|---------|-------------|
| Player Management | View, search, inspect players |
| Farm Inspection | View any player's farm state |
| Transaction Monitoring | View all market/payment transactions |
| Economy Dashboard | Currency supply, inflation, prices |
| Game Configuration | Edit game balance values |
| Event Management | Create/manage market events |
| Moderation | Ban/unban players |
| Audit Logs | View all admin actions |

### Authentication

- Admin login requires separate admin credentials
- Admin JWT contains `role: 'admin'`
- All admin actions logged to audit_logs

---

## 2. Player Inspection

**NFR-ADM-002**

### Player Detail View

```
┌─────────────────────────────────────────┐
│ Player: Farmer John (uuid)              │
│ Email: john@example.com                 │
│ Farm Level: 5 | Currency: 1,250 P       │
│ Last Active: 2026-09-02 10:00           │
│ Created: 2026-08-15                     │
├─────────────────────────────────────────┤
│ [Overview] [Farm] [Inventory] [History] │
├─────────────────────────────────────────┤
│ Farm: Sunny Acres                       │
│ Plots: 12/20 | Buildings: 5             │
│ Animals: 3 | Level: 5                   │
│                                         │
│ Plots:                                  │
│  1: Sorghum (Ready)                     │
│  2: Maize (Growing 2/5)                 │
│  3: Empty                               │
│  ...                                    │
│                                         │
│ Buildings:                              │
│  Well (Level 1) - Active                │
│  Coop (Level 1) - Active                │
│  Barn (Level 2) - Maintenance Needed    │
└─────────────────────────────────────────┘
```

---

## 3. Economy Monitoring

**NFR-ADM-003**

### Economy Dashboard

| Metric | Value | Trend |
|--------|-------|-------|
| Total Currency | 500,000 P | ↑ |
| Avg Farm Wealth | 3,333 P | ↑ |
| Daily Transactions | 150 | → |
| Inflation Rate | 2.1% | → |
| Top Crop | Sorghum | → |

### Price Monitoring

| Item | Base | Current | Change |
|------|------|---------|--------|
| Sorghum | 15 | 17 | +13% |
| Maize | 20 | 18 | -10% |
| Eggs | 5 | 6 | +20% |

---

## 4. Game Configuration

**NFR-ADM-004**

### Configuration Editor

Admins can modify game configuration through the admin interface:

| Config Type | Editable Fields |
|------------|-----------------|
| Crops | Growth time, yield, prices, costs |
| Animals | Feed cost, production, prices |
| Buildings | Costs, capacity, maintenance |
| Market | Price bounds, update frequency |
| Weather | Probabilities, season modifiers |

### Configuration Change Rules

1. All changes logged to audit_logs
2. Changes take effect within 5 minutes (cache TTL)
3. Major changes require confirmation
4. Changes can be rolled back

---

## 5. Moderation

**NFR-ADM-005**

### Moderation Actions

| Action | Description | Reversible |
|--------|-------------|------------|
| Warn | Send warning notification | N/A |
| Mute | Disable chat (future) | Yes |
| Ban | Disable account | Yes |
| Unban | Re-enable account | N/A |
| Reset Farm | Reset farm to starting state | No |

### Ban Process

1. Admin selects player
2. Admin provides ban reason
3. System disables player account
4. System logs ban action
5. Player receives ban notification

---

## 6. Audit Logs

**NFR-ADM-006**

### Audit Log Query

```sql
SELECT * FROM audit_logs
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

### Audit Log Fields

| Field | Description |
|-------|-------------|
| id | Unique identifier |
| user_id | Admin who performed action |
| action | Action type |
| resource_type | What was affected |
| resource_id | Specific resource |
| old_values | Previous state |
| new_values | New state |
| ip_address | Admin's IP |
| created_at | When action occurred |
