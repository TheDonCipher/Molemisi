# Document 18: Admin and Operations Specification

> **Molemisi Farm Management Simulator**
> Version: 1.0.0
> Status: Design spec (target), **reconciled to the as-built admin system 2026-10-02**
> Last Updated: 2026-10-02
> Implementation: Next.js `/admin` + `AdminGuard` on `/api/v1/admin/*`, plus a new
> `/api/v1/admin/economy/*` metrics surface and `/api/v1/admin/anti-cheat/*` flag review.
> Bootstrap: `scripts/create-admin.mjs` (admin), `scripts/create-dev.mjs` (dev),
> `scripts/create-player.mjs` (plain player test tier).

---

## 1. Admin Dashboard

**NFR-ADM-001**

### Dashboard Features

| Feature | Description | As built |
| --- | --- | --- |
| Player Management | View, search, inspect players | ✅ `/admin`, `/admin/players/[id]` |
| Farm Inspection | View any player's farm state | ✅ on the player detail page |
| Transaction Monitoring | View market/payment transactions | ✅ `/admin/audit` (ledger) |
| Economy Dashboard | Currency supply, inflation, prices | ✅ **new** — 8 endpoints, see §3 |
| Game Configuration | Edit game balance values | ✅ `/admin/config`; **now `AdminGuard`-gated** |
| Event Management | Create/manage market events | ➖ chapter events are **self-seeding**, not hand-authored |
| Moderation | Ban/unban players | ✅ plus warn and reset-farm |
| Audit Logs | View all admin actions | ✅ config audit log; a general `audit_logs` table is *not* implemented |

### Authentication — corrected

> ⚠️ Earlier revisions of this document said "Admin JWT contains `role: 'admin'`". **There is no
> nested-JWT role claim and no Nest JWT module at all.** Auth is Supabase Auth: the token is
> verified with `auth.getUser(token)`, and the account tier is read from the **`profiles` table on
> every request**. The token carries an identity, nothing more.

```typescript
// apps/api/src/common/guards/admin.guard.ts — the whole rule
const isAdmin =
  profile?.is_admin === true ||   // legacy boolean (migration 20260902000015)
  profile?.role === 'admin' ||   // canonical tier (migration 20260911000021)
  profile?.role === 'dev';       // dev is the TOP tier and IS admitted here
```

| Tier | `/admin` API + UI | `/dev` tooling | Player routes |
| --- | --- | --- | --- |
| `player` | ❌ 403 | ❌ 403 | ✅ |
| `admin` | ✅ | ✅ | ✅ |
| `dev` | ✅ (top tier) | ✅ | ✅ |

`DevGuard` is the mirror image: `role='dev'` OR `role='admin'` OR `is_admin`. Dev is admitted to
`/admin` deliberately — the dev test account must be able to do and test anything, which is the
whole reason the tier exists.

There is **no separate admin login**. `/admin/login` is the same `/auth/login`, after which the
client probes `GET /admin/economy` to decide whether to render the dashboard.

**Known gap:** there is no general-purpose `audit_logs` table. Admin actions are recorded where
they belong (`ledger_entries` for money, `game_config_audit` for config, `anti_cheat_flags` for
flags, `analytics_events` for the rest) but there is no single admin-action log to query.

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

This section was aspirational for most of the project's life. It is now **implemented** as a
read-only metrics API — `apps/api/src/economy/`, backed by `economy_price_snapshots`
(migration `20261001000001`).

### Endpoints

All under `AuthGuard` + `AdminGuard`, all read-only, none of them mutating player state:

| Endpoint | Answers |
| --- | --- |
| `GET /admin/economy/overview` | The dashboard roll-up |
| `GET /admin/economy/currency` | Pula / **Botho / Madi** supply and distribution |
| `GET /admin/economy/wealth` | Farm wealth distribution, average per farm |
| `GET /admin/economy/velocity` | How fast currency moves — the sink/source balance |
| `GET /admin/economy/prices` | Current price band per item |
| `GET /admin/economy/inflation` | Price drift over time |
| `GET /admin/economy/crop-supply` | Per-crop stock and listings |
| `GET /admin/economy/progression` | Land-tier and chapter distribution |

`/admin/economy` in the web client is the human surface for these; the metrics module is
**admin-only by design**, because a player who could read aggregate supply and velocity would
have a direct exploit surface.

> ⚠️ **Not yet wired into the `/admin` UI.** The endpoints exist and are tested
> (`economy.service.spec.ts`, `economy.metrics.spec.ts`); the dashboard page does not yet call
> them. See `KNOWN_LIMITATIONS.md`.

### Dashboard shape

The mock-up below is **illustrative** — the figures are placeholders, not live output. The
metric *set* is now real.

| Metric | Value | Trend |
| --- | --- | --- |
| Total Pula supply | 500,000 P | ↑ |
| Total **Madi** supply | 12,400 M | ↑ |
| Total Botho | 88,100 | ↑ |
| Avg farm wealth | 3,333 P | ↑ |
| Daily transactions | 150 | → |
| Inflation rate | 2.1 % | → |
| Top crop | Sorghum | → |

### Price Monitoring

Prices live in `market_prices` and drift on a **6-hour** cycle
(`MARKET_PRICE_UPDATE_INTERVAL_HOURS`) inside a **0.5×–2.0×** band of the catalogue
`baseValue`. Migration `20260924000000_reconcile_market_prices_to_catalogue.sql` reconciled the
table to the catalogue — 13 items were unsellable, 23 carried prices 4–8× the catalogue, and 14
rows referenced slugs that no longer existed (`docs/27`–`28`).

| Item | Catalogue base | Current | Change |
| --- | --- | --- | --- |
| Sorghum (product) | 15 | 17 | +13 % |
| Maize (product) | 20 | 18 | −10 % |
| Egg | **5** | 6 | +20 % |
| Milk | **15** | — | — |

> ⚠️ `MVP/02 §6.2` still lists eggs **P3** and milk **P5**. That table is **stale** — the
> authoritative catalogue (`items.ts`, confirmed by `docs/26 §G3`) is eggs **P5** and milk **P15**,
> and `docs/26` is right. This matters for the livestock economics: the old numbers implied a
> loss-making cow that does not exist.

---

## 4. Game Configuration

**NFR-ADM-004**

### Configuration Editor

Admins edit live `game_config` rows through `/admin/config`:

| Config Type | Editable | Where the value actually lives |
| --- | --- | --- |
| Crops | ✅ | `game_config` overrides; defaults in `game-config/src/crops.ts` |
| Animals | ✅ | `game_config` overrides; defaults in `game-config/src/livestock.ts` |
| Buildings | ✅ | `game_config` overrides; defaults in `game-config/src/buildings.ts` |
| Market | ✅ | `game_config` overrides; defaults in `game-config/src/economy.ts` |
| Weather | ✅ | `game_config` overrides; defaults in `game-config/src/weather.ts` |

> A `game_config` row is an **override**, not the source of truth. The TypeScript constants in
> `packages/game-config/src` are the source of truth and are what the test suites assert
> against — an override that contradicts a constant will be reverted by the next test run, which
> is the intended behaviour but is worth knowing before you edit one.

### Configuration Change Rules

1. ✅ Every change is written to `game_config_audit` (readable at `GET /config/audit/log`)
2. ⚠️ "Takes effect within 5 minutes (cache TTL)" — there is **no cache**; values are read per
   request, so a change is effective immediately
3. ➖ "Major changes require confirmation" — not implemented (no admin UI confirmation step)
4. ➖ "Changes can be rolled back" — not implemented; the audit log records prior values but
   there is no revert endpoint

### Access control — corrected

`PUT /config` and `PUT /config/:key` both carry `@UseGuards(AdminGuard)`. Before the fix
(2026-09-28, SEC-06) a plain player's `PUT` threw a 500 because the guard was missing; now it
returns a clean 403. `GET /config` and `GET /config/:key` remain `AuthGuard`-only.

---

## 5. Moderation

**NFR-ADM-005**

### Moderation Actions

| Action | Endpoint | Reversible |
| --- | --- | --- |
| Warn | `POST /admin/players/:id/warn` | N/A (notifies) |
| Mute | *not implemented* | — |
| Ban | `POST /admin/players/:id/ban` | Yes (`/unban`) |
| Unban | `POST /admin/players/:id/unban` | N/A |
| Reset Farm | `POST /admin/players/:id/reset-farm` | No |

> ⚠️ **Banned users can still reach `/admin/` URLs at the guard layer.** `AuthGuard` blocks banned
> players on *player* routes but deliberately exempts `/admin/` URLs so admin tooling keeps
> working. This is intentional and documented, not an oversight — but it does mean a banned
> account holding an admin-tier `role` is still authenticated.

### Ban Process

1. Admin selects the player
2. Admin provides a reason
3. Ban flag written to `profiles` (migration `20260902000012`)
4. The action is logged
5. The player is blocked at `AuthGuard` on player routes and receives a notification

---

## 6. Audit Logs

**NFR-ADM-006**

There is **no single `audit_logs` table**, so the original `SELECT * FROM audit_logs` query
describes intent, not reality. What exists instead:

| Concern | Actual store | Query |
| --- | --- | --- |
| Money movement | `ledger_entries` | `GET /wallet/ledger` · `GET /admin/ledger` |
| Config changes | `game_config_audit` | `GET /config/audit/log` |
| Suspicious activity | `anti_cheat_flags` | `GET /admin/anti-cheat/flags` |
| General events | `analytics_events` | *(no HTTP API)* |
| Price history | `economy_price_snapshots` | `GET /admin/economy/prices` · `/inflation` |

Consolidating these into one admin-action log is a reasonable post-Alpha task; the current design
is defensible because each store is authoritative for its own concern and none of them can be
edited by a player.

---

## 7. Anti-Cheat Review (new, 2026-10-02)

**NFR-ADM-007**

| Endpoint | Purpose |
| --- | --- |
| `GET /admin/anti-cheat/flags` | List flags, filter by `kind` / `severity` / `resolution` |
| `POST /admin/anti-cheat/passive` | Run the passive pass over a snapshot |
| `POST /admin/anti-cheat/active` | Run the active pass over a trade/action window |

**The governing principle: detection is separate from action.** Writing a flag **never** mutates
player state, and the response to a flag — warn, suspend, ignore — is a human decision. A flag's
`resolution` moves `open → confirmed | false_positive | escalated`, and only a reviewer moves it.

This is why there is deliberately **no** "auto-ban on N flags" rule. An automated verdict on an
automated detection is how a false positive becomes a lost account, and a cozy farm game cannot
afford that.

Two operational details worth preserving:

- `anti_cheat_flags` has RLS enabled with **no** player policy. Players cannot read their own
  flags — the flag set is itself intelligence an attacker would like — and nothing writes from
  the client. Admins reach the table through the service role, which bypasses RLS by design.
- A **unique partial index** on `(kind, player_id, farm_id) WHERE resolution = 'open'` means a
  hammering client cannot flood the table with thousands of identical open rows. Resolving a flag
  is what re-opens the door for a repeat offence to be raised.

Detection also logs to the Nest logger, so the trail survives a truncated table.
