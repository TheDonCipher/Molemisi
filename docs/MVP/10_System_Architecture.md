# 10 — System Architecture

> Companion to `09` (index). Normative anchors: `02 §2` (Withdrawal Funding Rule), `03 §8` (server authority), `06 §2` (invariants), `docs/02_System_Architecture_Specification.md` (the long-form as-built architecture), `docs/ARCHITECTURE_OVERVIEW.md`.
> This document specifies **backend systems and their contracts only**. The React `/game` shell is assumed to exist and is not redesigned here.

---

## 1. Architectural shape

Molemisi is a **modular monolith** — one NestJS process, one Postgres. It is deliberately not microservices: the whole game is a single economic loop, and splitting the wallet from the farm from the market would turn every transaction into a distributed-systems problem for no benefit at this scale.

```
Player browser (React PWA, :3000)
    │  fetch  /api/v1/*          (bearer token in Authorization)
    ▼
Next.js 14 shell (:3000)  ──  serve /game, /admin, /dev, PWA
    │
    │  (v1: CORS_ORIGIN; recommended P0: Next rewrite /api/* → :3001)
    ▼
NestJS 10 (apps/api, :3001, prefix /api/v1)
    │   AuthGuard → RoleGuard(AdminGuard | DevGuard) → controller → service
    │
    ▼
Supabase PostgreSQL (service-role client; RLS as defence-in-depth)
    + Supabase Auth (verifyToken() = auth.getUser(token))
```

**Two deployment invariants:**

1. **The API is the sole authority on value.** The client supplies *intent* (`plant this plot`, `sell these goods`), never *fact* (`this crop is ready`, `this price`, `this quantity`). Enforced by `03 §8` and invariant **I7**.
2. **`WalletService` is the sole writer of balances.** No other service column-updates a currency. Enforced by invariant **I2** and by the `launch-readiness.spec.ts` static check (`05 §P2`).

---

## 2. Module map

Each module below is a NestJS module under `apps/api/src/`. "Owns" = the tables it is the sole writer of. "Public contract" = the service methods other modules may call (everything else is private).

### 2.1 Platform modules

| Module | Responsibility | Owns | Public contract |
|---|---|---|---|
| `auth` | Registration, login, logout, `verifyToken`, `AuthGuard` | `auth.users`, `profiles` (via RPC only) | `AuthService.verifyToken(token)`, `AuthService.requirePlayer(userId)` |
| `profile` | `GET /profile`, display name, avatar selection | `profiles` (non-privileged columns) | — |
| `config` | Read/write `game_config`, audit log | `game_config`, `game_config_audit` | `ConfigService.get(key)`, `getNumber(key)` |
| `common` | Guards, interceptors, filters, `BotswanaTime` | — | `AdminGuard`, `DevGuard`, `HttpErrorFilter` |
| `database` | Supabase client provider, migration helpers | — | `SUPABASE_ADMIN` injection token |
| `health` | Liveness | — | — |

> **Role writes are server-managed.** `profiles.role` and `is_admin` are guarded by the `trg_profiles_guard_role` trigger, which `RAISE`s on any client write unless the `molemisi.role_sync` GUC is set (set only by `set_role()` / `set_admin()`, both revoked from `anon`/`authenticated`). Table-level `UPDATE` on `profiles` was revoked and re-granted only for `display_name`, `avatar_url`, `farm_name`, `updated_at`.

### 2.2 Core game modules

| Module | Responsibility | Owns | Public contract |
|---|---|---|---|
| `wallet` | **Only** balance writer. Ledger. Caps. | `player_wallets`, `ledger_entries`, `real_world_transactions` | `credit(playerId, currency, amount, source, refId?)`, `debit(...)`, `getBalance(playerId)`, `spendChapterTokens(...)` → see `13 §3` |
| `farms` | Farm root, plots, planting, harvesting, storage, land | `farms`, `plots`, `crop_instances`, `storage_state` | `FarmService.getFarm(playerId)`, `plant(...)`, `harvest(...)` |
| `water` | Jojo tank, growth advance, refill | `farm_water`, `water_ledger` | `WaterService.advanceFarmGrowth(farmId, elapsed)` — **the growth clock**, see `14 §4` |
| `crops` | Crop lifecycle reads | (none — reads `crop_instances`) | `CropService.getPlots(farmId)` |
| `inventory` | Item holdings, storage caps, sanctioned removal | `player_inventory` | `InventoryService.addItem(...)`, `removeItem(...)` (**calls `inventory_take` RPC**), `getStorageCount(...)` |
| `livestock` | Animals, feeding, production, decay | `livestock` | `LivestockService.advance(farmId, elapsed)` |
| `buildings` | Construction, upgrades, maintenance | `buildings` | `BuildingService.advanceMaintenance(...)` |
| `market` | Co-op sales, price band, quote | `market_prices`, `market_transactions`, `market_events` | `MarketService.sell(playerId, items)`, `quote(items)` |
| `crafting` | **v1.1-facing.** Jobs, slots, timers. Route exposure gated by D7 — see `09 §5`. | `crafting_jobs` | `CraftingService.start(...)`, `collect(...)` |
| `contracts` | Co-op contracts (Pula/Botho) | `contracts`, `active_contracts` | `ContractsService.accept(...)`, `complete(...)` |
| `kgotla` | NPCs, Charges, community projects, Letsema, regard | `kgotla_charges`, `kgotla_projects`, `kgotla_contributions`, `kgotla_regard` | `KgotlaService.acceptCharge(...)`, `donate(...)`, `letsema(...)` |
| `bushveld` | Scenes, hotspots, Kagiso, loot, Journal | `bushveld_*`, `player_scene_state`, `player_hotspot_state`, `field_journal_entries`, `daily_sparkle` | `BushveldService.collect(playerId, hotspotId)` |
| `progression` | Aggregated read: Pula/Botho/Journal | (read-only) | `ProgressionService.get(playerId)` |
| `chapters` | Chapter state, token rollover, Almanac | `chapters`, `player_chapter_state` | `ChapterService.getCurrent()`, `rollover()`, `spendTokens(...)` |
| `world-events` | Weather, seasons, chapter market events | `world_events` | `WorldEventService.getEffects(...)` |

### 2.3 Economy & trust modules

| Module | Responsibility | Owns |
|---|---|---|
| `simulation` | Offline elapsed-time engine (`engine/` = pure, seeded) + live read path | `engine/*` is pure; live path persists via other modules |
| `anti-cheat` | Passive/active rules → review flags (**never verdicts**) | `anti_cheat_flags` |
| `economy` | Admin read-only metrics | `economy_price_snapshots` |
| `monetisation` | Top-up packs, Village Pass, both cosmetic shelves | `top_up_packs`, `subscription_plans`, `player_cosmetics`, `player_subscriptions` |
| `payments` | PSP adapter, webhook, idempotency | `real_world_transactions` (shared with wallet) |
| `admin` | Player search, moderation, currency history | (read + moderation writes) |
| `dev` | Dev-only affordances | — |
| `analytics` | Event ingest | `analytics_events` |
| `notifications` | In-app notifications | `notifications` |

---

## 3. Critical service boundaries

These four boundaries are load-bearing. Crossing one is a bug, not a style choice.

### 3.1 `WalletService` — the money boundary

```ts
// The ONLY functions permitted to change a balance. Both transactional.
// Both write exactly one ledger_entries row in the same transaction.
credit(playerId: UUID, currency: Currency, amount: number,
       source: LedgerSource, refId?: UUID): Promise<WalletSnapshot>
debit (playerId: UUID, currency: Currency, amount: number,
       source: LedgerSource, refId?: UUID): Promise<WalletSnapshot>

// INVARIANT I2: neither function may accept two distinct player IDs.
// Enforced by signature + by launch-readiness.spec.ts, not by convention.
```

**Rules:**

- Pula and Botho and Madi all route through the same two functions. There is no `creditBotho` that bypasses the cap — Botho credits use the `botho_credit_capped` RPC path (`13 §6`).
- No service may `UPDATE player_wallets SET pula_balance = …` directly. The `launch-readiness.spec.ts` gate statically forbids `.from('profiles').update(... currency ...)` and equivalent patterns.
- Every credit/debit is idempotent **when given a `refId`**: the same `(source, refId)` pair must not double-apply (`16 §5`).
- `game_ledger_entries` is **retired**. Never write it. The live table is `ledger_entries`.

### 3.2 `InventoryService` — the sanctioned-removal boundary

```ts
// addItem: increments player_inventory, enforcing stack caps (13 §7).
// removeItem: MUST call the inventory_take(player, item, qty) RPC, which is
//   atomic (WHERE quantity >= qty) and RAISEs on shortfall.
//   A select-then-update is the C3 TOCTOU bug. Do not reintroduce it.
```

**Rules:**

- All removals go through `inventory_take`. All additions honour stack caps and storage-tier caps server-side.
- Tools never occupy a storage slot (`03 §2`, F15) — `getStorageCount` excludes `is_tool` items.
- Inventory writes are rejected *at* cap, never truncated silently (`03 §2.1`).

### 3.3 `SimulationEngine` — the determinism boundary

```ts
// Pure. No clock reads, no global RNG, no I/O. A captured input replays to
// an identical output. This is what makes offline progression auditable.
runSimulation(input: SimulationInput): SimulationOutput
```

**Rules:**

- `input.now` and `input.seed` are the only sources of time and randomness. Nothing inside reads `Date.now()` or `Math.random()`.
- Per-system offline windows are resolved in one place, `engine/time.ts::resolveTimeWindows()`. Adding a system means adding a row there, not a call-site cap.
- The **live** read path (`SimulationService`, inside `GET /farms/current`) may persist; the **pure** engine may not. See `14` for the full contract.

### 3.4 `PaymentsModule` — the idempotency boundary

```ts
// THROWS at boot if NODE_ENV=production resolves the stub provider.
// handleWebhook() requires provider + amount + currency to match the stored
//   real_world_transactions row before crediting.
// Idempotent on provider_tx_id: a replayed webhook credits exactly once.
```

**Rules:**

- Credit happens **only** on webhook confirmation, never on request (`05 §P9`).
- `provider_tx_id` is `UNIQUE`; the unique constraint *is* the idempotency guard (I3).
- Unsigned webhooks are rejected once `PAYMENT_WEBHOOK_SECRET` is set (H3's HMAC verifier); the stub accepts them unverified **in dev only**.

---

## 4. Data-flow patterns

### 4.1 The read path (farm load)

```
GET /farms/current
  → AuthGuard: verifyToken → playerId
  → SimulationService.advance(playerId)
       → resolveTimeWindows(awayHours)          [engine/time.ts]
       → runSimulation({now, seed, farmState})  [pure]
       → persist deltas: water, crop stages, livestock, maintenance
  → FarmService.getFarm(playerId)               [read]
  → response (advisory to client; server is truth)
```

### 4.2 The write path (a sale)

```
POST /market/sell  { items: [{itemType, quantity}] }
  → AuthGuard
  → MarketService.sell(playerId, items)
       1. server resolves the price from market_prices × band   (I7, I8)
       2. InventoryService.removeItem(...)  → inventory_take RPC (atomic)
       3. net = gross × (1 − COOP_TAX_RATE)                      (I8)
       4. WalletService.credit(playerId,'pula',net,'coop_sale')  (I2)
       — steps 2–4 in ONE transaction; failure rolls back all of them.
  → { gross, tax, net, balanceAfter }
```

### 4.3 The webhook path (a top-up)

```
POST /payments/webhook  { provider,_tx_id, amount, status, signature }
  → verify HMAC (PAYMENT_WEBHOOK_SECRET)
  → match stored real_world_transactions row (provider + amount + currency)
  → if status == 'completed' AND row.status != 'completed':
        real_world_transactions.status = 'completed'   ← the idempotency gate
        WalletService.credit(playerId,'madi',amount,'topup', row.id)
  → 200 (always 200 on a valid signature, so the PSP stops retrying)
```

### 4.4 The collect path (Bushveld)

```
POST /bushveld/hotspots/:id/collect
  → AuthGuard → BushveldService.collect(playerId, hotspotId)
       1. recompute kagiso from kagiso_updated_at (on read, no cron)  (14 §6)
       2. if kagiso < hotspot.kagiso_cost → 409 scene_not_settled
       3. if now − last_collected_at < rest_minutes → 409 hotspot_resting
       4. roll loot table (seasonal if month ∈ active_months;
                            rarity scaled by kagiso; boosted if sparkling)
       5. debit kagiso; update last_collected_at
       6. first-time find → insert field_journal_entries
       7. recompute restoration stage; swap background asset if crossed
  → { reward, is_new_discovery, discovery?, kagiso_remaining, restoration_stage_changed? }
```

---

## 5. Cross-cutting concerns

### 5.1 Auth & roles

- `verifyToken()` = `auth.getUser(token)` against Supabase Auth. `apiFetch` on the client reads `molemisi_token`.
- `/auth/me` → `{ id, email, role, isAdmin }`.
- **`AdminGuard` and `DevGuard` are currently logically identical** — both admit `admin` + `dev` + `is_admin`. This is audit **M1**, still open. If you need a genuine admin-only surface, do not assume `AdminGuard` provides it; fix M1 first.
- The webhook controller is documented public but currently sits behind `AuthGuard` — a known gap (`DEVELOPMENT_STATE.md`). Fixing it is part of the payments phase, not a new feature.

### 5.2 Error taxonomy

Every error response is `{ statusCode, code, message, details? }`. The `code` is a stable machine string; the client switches on `code`, never on the message.

| Code | HTTP | Meaning |
|---|---|---|
| `insufficient_funds` | 400 | Debit would go negative |
| `storage_full` | 409 | Write would exceed the storage cap |
| `scene_not_settled` | 409 | Kagiso below hotspot cost |
| `hotspot_resting` | 409 | Within the 60-min personal cooldown |
| `botho_below_threshold` | 403 | Direct API call below a progression gate (I9) |
| `letsema_on_cooldown` | 409 | Within the 7-day window |
| `daily_cap_exceeded` | 429 | Top-up cap (UTC+2); includes `resets_at` |
| `webhook_replay` | 200 | Already processed — returned as success to stop PSP retries |
| `chapter_closed` | 409 | Token spend after rollover |
| `withdrawal_not_available` | 404 | **v1: the route does not exist** (I15) |

### 5.3 Observability

- `analytics_events` is ingest-only in v1 (no query API).
- `economy_price_snapshots` powers the admin economy-metrics reads.
- **Madi velocity** (trades per deposited pula before withdrawal) is the launch KPI to instrument from day one (`02 §4.2` F10) — but it only becomes meaningful in v1.1.

### 5.4 Caching & connection discipline

- Target audience is mobile data. Batch calls, cache aggressively, **no chatty polling** (`01 §2`).
- The SW (`apps/web/public/sw.js`) is network-first and **skips `/api/`** — API responses are never cached by the service worker.
- Recommended P0 (from `05 §P0`): add a Next.js rewrite so `/api/*` → `:3001` and remove the cross-port CORS path from the browser flow.

---

## 6. What the client is allowed to send

A quick reference for the API author. Anything not on this list is a server decision.

| The client MAY send | The client may NEVER send |
|---|---|
| Item slug + quantity to sell | The sale price |
| Plot id to plant / harvest | Whether a crop is ready |
| Hotspot id to collect | Rarity, reward, or kagiso value |
| Recipe slug + batch size (v1.1) | Craft fee, timer, or output quantity |
| Item id + quantity to consume | Whether the player owns it |
| Donation amount to a project | Botho granted |
| Pack slug to top up | Madi credited |

---

*End of `10`. Proceed to `11_Database_Schema_And_Migrations.md`.*
