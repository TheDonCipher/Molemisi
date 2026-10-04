# 12 — API Endpoint Specification

> Companion to `09`. Normative anchors: `04 §11` (Bushveld API), `08_API_Specification.md` (long-form; note its §15 NPC section is **stale**), `DEVELOPMENT_STATE.md` §API (as-built route inventory).
> **Prefix:** all routes are `/api/v1`. **Auth:** Supabase bearer token. **Authority:** the client sends intent, never fact (`10 §6`).
> **This document is a contract.** Route paths, methods, status codes and error `code`s are stable; the client switches on `code`, never the message.

---

## 1. Conventions

| Aspect | Rule |
|---|---|
| Base path | `/api/v1` |
| Auth header | `Authorization: Bearer <supabase access token>` |
| Auth check | `verifyToken()` = `auth.getUser(token)`; `AuthGuard` blocks banned players except on `/admin/` |
| Roles | `profiles.role ∈ player \| admin \| dev`; claimed from the DB row, **not** from a token claim |
| Content type | `application/json` |
| Money | Pula as `INT` (whole pula); Madi as `NUMERIC(10,2)`; amounts are always **server-computed** |
| Errors | `{ statusCode, code, message, details? }` — see `10 §5.2` |
| Idempotency | Any POST that credits value is idempotent on a natural key (`provider_tx_id`, `(source, ref_id)`, chapter id) |
| Pagination | `?limit=&cursor=` on list endpoints (helpers in `packages/shared`) |

---

## 2. Public routes

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | `/health` | — | `{ status, version }` | No auth |
| POST | `/auth/register` | `{ email, password, farmName? }` | `{ user, token }` | Creates auth user + profile (`STARTING_PULA` 250) + farm (4 plots) + starter seeds. **`/auth/register` is the only bootstrap path** — email confirm is off, but `mailer_autoconfirm:false` on live means SMTP limits can block real signups (launch blocker). |
| POST | `/auth/login` | `{ email, password }` | `{ user, token }` | Client stores `molemisi_token` + `token` |
| GET | `/payments/store` | — | `{ packs, pass }` | Catalog only. **No boosts.** |

---

## 3. Auth & profile

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/auth/logout` | — | `204` |
| GET | `/auth/me` | — | `{ id, email, role, isAdmin }` |
| GET | `/profile` | — | `{ displayName, avatarUrl, farmName, role }` |

`.test` and `+` aliases are rejected by GoTrue — use `@example.com` for test accounts.

---

## 4. Farm, crops, water

| Method | Path | Request | Response | Invariants |
|---|---|---|---|---|
| GET | `/farms/current` | — | Full farm snapshot | **Runs elapsed-time simulation first** (`14 §3`) |
| GET | `/farms/:farmId/plots` | — | `[{ plotId, plotIndex, state, crop? }]` | — |
| POST | `/farms/:farmId/plots/:plotId/plant` | `{ cropType }` | `{ plot, inventory }` | Server validates seed in stock **and** in season; consumes a seed atomically |
| POST | `/farms/:farmId/plots/:plotId/harvest` | — | `{ yield, inventory, plot }` | Server computes readiness; client never asserts it (I7) |
| GET | `/farms/:farmId/water` | — | `{ units, capacity, unitPrice, fullRefillCost }` | — |
| POST | `/farms/:farmId/water/refill` | `{ units? }` | `{ units, balanceAfter }` | Debit via `WalletService`; cost scales by chapter (`13 §5`) |
| POST | `/farms/:farmId/storage/upgrade` | — | `{ tier, slotCap, balanceAfter }` | Enforces ladder; rejects at max |

**Plant (server sequence):**

```
plant(playerId, plotId, cropType):
  1. assert plot is empty                            else 409 plot_occupied
  2. assert cropType ∈ SEEDS_STOCKED(currentChapter) else 403 out_of_season
  3. InventoryService.removeItem(playerId, seedSlug, 1)   → inventory_take RPC
  4. insert crop_instances(state=GROWING, growth_progress=0, planted_at=now)
  5. commit (2–4 atomic)
```

**Harvest (server sequence):**

```
harvest(playerId, plotId):
  1. crop = load(plotId); assert playerId owns the farm          else 403
  2. elapsed = now − planted_at, gated by tank state              (14 §4)
  3. assert growthStage(crop, elapsed) == READY                   else 409 not_ready
  4. yield = seededRand(seed, cropInstanceId) → [yieldMin, yieldMax]
  5. InventoryService.addItem(cropSlug, yield)  (respect stack cap)
  6. plot.state = EMPTY; crop_instances.state = HARVESTED
  7. commit (5–6 atomic) — "bank before clear"
```

---

## 5. Buildings & livestock

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/farms/:farmId/buildings` | — | `[{ buildingId, slug, state, maintenanceDueAt }]` |
| GET | `/farms/:farmId/buildings/available` | — | constructed-or-not per slug |
| POST | `/farms/:farmId/buildings/construct` | `{ slug }` | `{ building, balanceAfter }` |
| POST | `/farms/:farmId/buildings/:buildingId/upgrade` | — | `{ building, balanceAfter }` |
| POST | `/farms/:farmId/buildings/:buildingId/maintain` | — | `{ building, balanceAfter }` — 30-day bill (`13 §8`) |
| GET | `/farms/:farmId/livestock` | — | `[{ animalId, type, hunger, health, happiness, produceReadyAt }]` |
| GET | `/farms/:farmId/livestock/available` | — | purchasable types + prices |
| POST | `/farms/:farmId/livestock/purchase` | `{ type }` | `{ animal, balanceAfter }` |
| POST | `/farms/:farmId/livestock/:animalId/feed` | `{ feedType? }` | `{ animal, inventory }` — one tap feeds the kraal; atomic per `15 §P3` pattern |
| POST | `/farms/:farmId/livestock/:animalId/collect` | — | `{ produce, inventory }` |
| POST | `/farms/:farmId/livestock/:animalId/pet` | — | `{ happiness }` — cosmetic, no value |

**Livestock decay:** 72-h window (`14 §5`). Net-positive per day asserted per animal (`docs/30` P0-2). All four animals eat `sorghum` — never herbs.

---

## 6. Inventory & crafting

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/farms/:farmId/inventory` | — | `{ slotsUsed, slotCap, groups, items[] }` — grouped **by use** (Plant·Sell·Craft·Build), Setswana names on items |
| GET | `/farms/:farmId/crafting` | — | `{ slots, slotsUnlocked, recipes[] }` filtered server-side by unlock |
| GET | `/farms/:farmId/crafting/jobs` | — | `[{ jobId, slotIndex, recipe, readyAt, ready }]` |
| POST | `/farms/:farmId/crafting/start` | `{ recipeSlug, qty }` | `{ job, inventory, balanceAfter }` |
| POST | `/farms/:farmId/crafting/:jobId/collect` | — | `{ outputs, inventory }` |

> **D7 gate.** MVP ships **farming-only**. These crafting routes must **not be exposed to players** in v1 (`09 §5`, `08 §7` open item 1 — pending explicit sign-off). They may remain in the codebase behind a `DevGuard` for testing, or be omitted entirely. Do not build a crafting UI.

**Craft invariants:** timers 2–6 h, never minutes; a third job is rejected while only two slots are unlocked; `POST /crafting/start` rejects on missing inputs **or** unaffordable fee with **no partial deduction**; `collect` returns `409 not_ready` before the timer and credits exactly once on repeat calls.

---

## 7. Market (Co-op)

| Method | Path | Request | Response | Invariants |
|---|---|---|---|---|
| GET | `/market/prices` | — | `[{ item, base, current, multiplier }]` | — |
| GET | `/market/events` | — | active chapter event | — |
| GET | `/market/quote` | `?items=slug:qty,…` | `{ gross, tax, net, band }` | Read-only preview |
| POST | `/market/sell` | `{ items: [{ itemType, quantity }] }` | `{ gross, tax, net, balanceAfter }` | **I7, I8** |
| POST | `/market/buy` | `{ itemType, quantity }` | `{ item, balanceAfter }` | Seeds only, in season |

**Sell (server sequence) — the canonical value path:**

```
sell(playerId, items):
  1. for each item: assert sellable (seeds are NOT sellable)
  2. multiplier = raw/foraged ? bandFromCycle(now, 6h) → [0.5, 2.0]
                 : crafted/processed ? clamp(1.0, ±0.10)
  3. gross = Σ base_value × multiplier × quantity        (client price IGNORED)
  4. InventoryService.removeItem(item, qty) per item      → inventory_take (atomic)
  5. tax = round(gross × 0.05)
     net = round(gross − tax)
  6. WalletService.credit(playerId, 'pula', net, 'coop_sale')
  7. commit (4–6 atomic)
```

> The client never supplies the price. A fuzz test must confirm no client-supplied price is ever honoured (`06` P7).

---

## 8. Kgotla

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/farms/:farmId/kgotla/npcs` | — | 5 NPCs + regard |
| POST | `/farms/:farmId/kgotla/npcs/:npcId/talk` | — | `{ line, regard }` — rules-table Elder tip (`13 §10`) |
| POST | `/farms/:farmId/kgotla/npcs/:npcId/quest` | — | accept/advance a Charge |
| GET | `/farms/:farmId/kgotla/projects` | — | community projects + progress |
| POST | `/farms/:farmId/kgotla/projects/:projectId/donate` | `{ amount }` | `{ bothoGranted, balanceAfter }` |

**Donate (server sequence) — the Botho-cap path:**

```
donate(playerId, projectId, amount):
  1. assert amount ≤ KGOTLA_DAILY_CONTRIBUTION_CAP remaining today
  2. WalletService.debit(playerId, 'pula', amount, 'project_donation')
  3. botho = amount × BOTHO_PER_PULA_DONATED (=1)
     granted = botho_credit_capped(playerId, botho)   ← RPC enforces 50/day (I4)
  4. insert kgotla_contributions
  5. commit (2–4 atomic)
```

**Botho is capped per player per day (50)** — a *legal* control, not a balance one (C20 / I4).

---

## 9. Bushveld

Per `04 §11` — verbatim contract:

```
GET  /bushveld/scenes
  → unlocked scenes with kagiso, kagiso_max, seconds_to_next_pip,
    finds_discovered, finds_total, restoration_stage

GET  /bushveld/scenes/:sceneId
  → hotspots with: position, sprite_key, kagiso_cost,
    state (ready | resting | scene_not_settled),
    eta_seconds if resting,
    is_sparkling_today, is_seasonal_active_today

POST /bushveld/hotspots/:id/collect
  → server recomputes and persists kagiso for the scene
  → 409 if kagiso < hotspot.kagiso_cost        (reason: scene_not_settled)
  → 409 if now - last_collected_at < rest_minutes (reason: hotspot_resting)
  → rolls loot table (seasonal table if current month ∈ active_months;
    rarity weights scaled by kagiso per 04 §4.2; boosted further if sparkling)
  → debits kagiso, updates last_collected_at
  → inserts field_journal_entries on a first-time find
  → recomputes restoration stage
  → returns { reward, is_new_discovery, discovery?, kagiso_remaining,
              restoration_stage_changed? }
```

**Two distinct 409 reasons** — `scene_not_settled` (Kagiso) vs `hotspot_resting` (60-min cooldown). The client must be able to tell them apart. Mophane month check is a plain `month ∈ active_months` comparison, **decoupled from the farm's season clock**. The client never supplies quantity, rarity or reward.

---

## 10. Progression & chapters

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/progression` | — | `{ pula, botho: {current, thresholds, next}, journal: {pagesComplete, totalPages} }` |
| GET | `/progression/elder` | — | Elder tip from live state |
| GET | `/progression/scenes` | — | journal restoration per scene |
| GET | `/progression/farm/:farmId/elder` | — | farm-specific tip |
| GET | `/chapters` | — | four chapters |
| GET | `/chapters/current` | — | current chapter + token balance + almanac |
| POST | `/chapters/current/claim` | — | claim almanac reward |
| POST | `/chapters/tokens/spend` | `{ purpose, amount }` | spend season stamps on a souvenir SKU; server-validates `purpose` ∈ `SEASON_SOUVENIRS` and `amount == price` |
| POST | `/chapters/rollover` | — | **admin/dev only** — idempotent rollover (I13) |

**`GET /progression` must not read Level/XP fields** — they are deleted (C12). Any response reading `unlockLevel`/`xp`/`level` is a bug.

---

## 11. Wallet, store, payments

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/wallet` | — | `{ pula, botho, madi, subscription }` |
| GET | `/wallet/ledger` | `?limit=&cursor=` | `[{ amount, currency, source, balanceAfter, createdAt }]` |
| GET | `/store` | — | in-game cosmetics: `{ marketShelf, festivalShelf, pass }` — **no boosts** |
| POST | `/store/purchase` | `{ sku }` | `{ cosmetic, balanceAfter }` |
| POST | `/store/admin/flip-subscriptions` | — | admin cron |
| POST | `/store/admin/grant-weekly` | — | admin cron |
| POST | `/payments/create` | `{ packSlug }` | `{ paymentId, checkoutRef }` — **does NOT credit** |
| GET | `/payments/history` | — | `[{ amountBwp, grantedMadi, status, createdAt }]` |
| POST | `/payments/:paymentId/refund` | — | `{ payment, balanceAfter }` |
| POST | `/payments/webhook` | provider payload + signature | `200` — **credits only here** (I3) |

**Top-up (server sequence):**

```
create(playerId, packSlug):
  1. assert today's Botswana-day (UTC+2) total < DAILY_TOP_UP_CAP_BWP (500)  (C5, I12)
  2. insert real_world_transactions(status='pending', provider_tx_id=…)
  3. return checkout reference — do NOT credit

webhook(payload):
  1. verify HMAC (PAYMENT_WEBHOOK_SECRET)
  2. load real_world_transactions by provider_tx_id
  3. if status == 'completed' → 200 immediately (idempotent replay)  (I3)
  4. assert provider + amount + currency match the stored row
  5. status = 'completed'
     WalletService.credit(playerId, 'madi', grantedMadi, 'topup', row.id)
  6. 200
```

---

## 12. Admin & dev

| Guard | Method | Path |
|---|---|---|
| `AuthGuard`+`AdminGuard` | GET | `/admin/players`, `/admin/players/:id`, `/admin/players/:id/currency-history` |
| | GET | `/admin/economy`, `/admin/ledger` |
| | GET | `/admin/economy/{overview,currency,wealth,velocity,prices,inflation,crop-supply,progression}` |
| | GET | `/admin/anti-cheat/flags` |
| | POST | `/admin/anti-cheat/{passive,active}` |
| | POST | `/admin/players/:id/{ban,unban,warn,reset-farm}` |
| `AuthGuard`+`DevGuard` | GET | `/dev/status` |
| | POST | `/dev/inventory/grant` (spawn item — uses `inventory_take`'s inverse) |
| | POST | `/dev/date-jump` (sets `input.now` for the deterministic engine) |

> ⚠️ **`AdminGuard` and `DevGuard` are logically identical today** (`10 §5.1`, audit M1). Do not assume an admin-only surface exists until M1 is fixed.

---

## 13. Not implemented (explicit)

| Route | Status |
|---|---|
| Any withdrawal endpoint | **Must not exist in v1** (I15). It is the whole of I1 until v1.1. |
| P2P Pula transfer | Never — no function accepts two player IDs (I2) |
| Exchange listing/buy | v1.1 |
| Analytics query API | ingest only |
| Refresh-token route | None. `role` lives on `profiles`, not in the token. |
| Simulation HTTP controller | None — the engine runs inside `GET /farms/current` |
| Launch readiness | A Jest spec, not an endpoint |

*End of `12`. Proceed to `13_Economy_And_Balance_Engine.md`.*
