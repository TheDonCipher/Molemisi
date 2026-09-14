# Molemisi — MVP Implementation Plan

Engineering-ready detail for the eight MVP phases: schema, API surface, background jobs, and testable done-criteria for each. Grounded in the corrected numbers from the Core Systems v2 and Economy v2 specifications — every dollar figure below matches those documents exactly, not a rounded approximation.

---

## Phase 1 — Stabilize the Existing Build

**Depends on:** nothing; runs in parallel with everything else.

**Tasks:**
- Next.js rewrites config routing `/api/*` to the NestJS service — removes the current cross-port CORS setup.
- Wire `POST /auth/logout` into the Settings screen; clear the stored token client-side on response.
- Add `AdminGuard` to `PUT /config` and `PUT /config/:key` — currently authenticated but not admin-gated.
- Fix or remove `pnpm db:seed` (currently points at a missing file).
- Visual pass on existing generated assets in the React `/game` screens.

**Done when:** a new player can sign up, play, log out, and log back in with no dead ends, and no non-admin account can write to `/config`.

---

## Phase 2 — Inventory, Crafting, Storage

**Depends on:** Phase 1 not required, but sequenced first among content phases since everything else reads from inventory.

**Schema:**
```sql
CREATE TABLE item_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_value_pula INT NOT NULL,
  max_stack INT DEFAULT 99,
  is_tool BOOLEAN DEFAULT FALSE
);

CREATE TABLE player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_def_id UUID REFERENCES item_definitions(id),
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE storage_tiers (
  tier INT PRIMARY KEY,
  name TEXT NOT NULL,          -- Storage Basket / Storage Shed / Storehouse
  slot_cap INT NOT NULL,       -- 24 / 48 / 96
  upgrade_cost_pula INT,
  upgrade_cost_materials JSONB
);

CREATE TABLE crafting_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- poleto, thapo, setene, bupi, borotho
  output_item_id UUID REFERENCES item_definitions(id),
  output_qty INT DEFAULT 1,
  inputs JSONB NOT NULL,               -- [{item_id, qty}]
  fee_pula INT NOT NULL,
  duration_minutes INT NOT NULL,
  unlock_condition JSONB               -- null = available from start; {botho_gte: 100} for Bupi
);

CREATE TABLE crafting_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  recipe_id UUID REFERENCES crafting_recipes(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  collected_at TIMESTAMPTZ
);
```

**Seed data:** the full item list (seeds/crops/livestock products/Bushveld materials/crafted materials/processed goods/tools/rare finds) and the five recipes at the corrected values from Economy v2 §8.1 — Poleto P7, Thapo P18, Setene P11, Bupi P20, Borotho P60 sale values, fees and times as specified. Bupi's `unlock_condition = {botho_gte: 100}`; Borotho has none explicitly (naturally gated by needing Bupi as an input).

**API:**
- `GET /inventory` — current player's items with quantities
- `GET /crafting/recipes` — available recipes, filtered server-side by unlock condition
- `POST /crafting/start` `{recipeId}` — checks inputs owned + fee affordable, deducts both, creates a `crafting_jobs` row
- `POST /crafting/:jobId/collect` — checks `now() - started_at >= duration_minutes`, else 409; credits output; sets `collected_at`
- `POST /farms/:farmId/storage/upgrade` — checks Pula + materials, increments stored tier
- `POST /market/sell` — patch existing handler to apply the flat 5% tax if not already present

**Done when:** each of the five recipes can be crafted end to end and nets the exact margin in Economy v2 §8.1 after tax; storage upgrade raises the enforced inventory cap; Bupi is unreachable below 100 Botho via direct API call, not just hidden in the UI.

---

## Phase 3 — Three Pillars Progression

**Depends on:** Phase 2 (Bupi's gate needs Botho to check against).

**Schema change:** `player_wallets.botho_points` (created in Phase 5, but if Phase 3 lands first, add it early and have Phase 5 build around it) becomes the single canonical Botho number — migrate whatever the existing Kgotla reputation score currently is into this column and repoint all reads/writes there. No second counter anywhere.

**API:**
- `GET /progression` — rewritten to return `{ pula: {...building/land costs}, botho: {current, thresholds: [100,300,500,1000], next}, journal: {pagesComplete, totalPages} }`
- `POST /farms/:farmId/letsema` — checked: `botho_points >= 500` AND not used in the last 7 days; instantly completes every ready-to-harvest plot
- `GET /kgotla/elder/tip` — reads tank level, current weather, `botho_points`; returns one line from a small rules table, not a hardcoded dialogue tree
- Deep Bushveld's scene row (Phase 4) checks `botho_points >= 300` and returns a "coming soon" flag rather than a 403 — it's a real unlock, just with no content behind it yet

**Done when:** Letsema is unusable below 500 Botho or more than once per 7 days, checked server-side; the Elder's tip changes correctly when tank/weather/Botho state changes; nothing reads the old Level/XP fields anymore.

---

## Phase 4 — Bushveld: Hotspots and the Field Journal

**Depends on:** nothing structurally, but Deep Bushveld's gate needs Phase 3's Botho field to exist.

**Schema:**
```sql
CREATE TABLE bushveld_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- open_bush, riverbank, rocky_outcrop, deep_bushveld
  name TEXT NOT NULL,
  background_asset_key TEXT,
  unlock_condition JSONB               -- null, or {botho_gte: 300}
);

CREATE TABLE bushveld_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES bushveld_scenes(id),
  x INT, y INT,
  sprite_key TEXT,
  loot_table_id UUID,
  respawn_minutes INT NOT NULL,
  seasonal_loot_table_id UUID,
  active_months INT[]                  -- e.g. {4,12} for the Mophane hotspot
);

CREATE TABLE player_hotspot_state (
  player_id UUID REFERENCES auth.users(id),
  hotspot_id UUID REFERENCES bushveld_hotspots(id),
  last_collected_at TIMESTAMPTZ,
  PRIMARY KEY (player_id, hotspot_id)
);

CREATE TABLE daily_sparkle (
  date DATE PRIMARY KEY,
  hotspot_id UUID REFERENCES bushveld_hotspots(id)
);

CREATE TABLE field_journal_entries (
  player_id UUID REFERENCES auth.users(id),
  discovery_slug TEXT NOT NULL,
  scene_id UUID REFERENCES bushveld_scenes(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (player_id, discovery_slug)
);
```

**API:**
- `GET /bushveld/scenes/:sceneId` — hotspots with `state: ready|resting`, `eta_seconds` if resting, `is_sparkling_today`, `is_seasonal_active_today`
- `POST /bushveld/hotspots/:id/collect` — checks `now() - last_collected_at >= respawn_minutes` (409 if not), rolls the loot table (seasonal table if the current real-world month is in `active_months`, boosted further if today's `daily_sparkle` points at this hotspot), updates `last_collected_at`, inserts into `field_journal_entries` on first-time finds, returns `{reward, is_new_discovery, discovery?}`

**Cron:** one small daily job (midnight, server local time) picks one random currently-ready hotspot across all unlocked scenes and writes today's `daily_sparkle` row. Nothing else here needs a scheduled job — respawn state is computed on read from `last_collected_at`, and the Mophane check is a plain `new Date().getMonth()` comparison against `active_months` inside the collect handler, deliberately decoupled from whatever clock drives the farm's simulated seasons.

**Seed data:** three starting scenes (Open Bush, Riverbank, Rocky Outcrop) with their tells and rarity tiers; Deep Bushveld's row exists with `unlock_condition = {botho_gte: 300}` and zero hotspots — the client shows "coming soon" when a scene has an unlock condition met but no hotspots yet.

**Done when:** every ready Hotspot resolves in one API call with the correct reward and journal write; a second collect attempt before the respawn window returns 409; exactly one hotspot system-wide carries the sparkle badge each day; the named Open Bush Mophane hotspot's loot table only changes in real-world April and December.

---

## Phase 5 — Real-Money Wallet and Ledger

**Depends on:** nothing structurally; should start early since Phases 6–7 both need it.

**Schema:**
```sql
CREATE TABLE real_world_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  provider_tx_id TEXT UNIQUE NOT NULL,   -- idempotency guard
  amount_bwp DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,                  -- pending | completed | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE player_wallets (
  player_id UUID PRIMARY KEY REFERENCES auth.users(id),
  pula_balance INT NOT NULL DEFAULT 0,
  botho_points INT NOT NULL DEFAULT 0,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration:** audit wherever Pula currency and Botho/reputation currently live, and migrate both into this table in one pass — this is the single highest-blast-radius change in the whole plan, since every player's progress lives in whatever field holds it today. Write and run a reconciliation check (sum of old balances == sum of new balances) before cutting over reads.

**Service layer:** a `WalletService` with `credit(playerId, amount, source)` / `debit(playerId, amount, source)` as the *only* functions permitted to touch `pula_balance`, each wrapped in a transaction and each writing a ledger row. No function in the codebase accepts two distinct player IDs and moves balance between them — this is enforced by the function signatures themselves, not just a code-review convention.

**Done when:** a duplicated webhook delivery (same `provider_tx_id`, replayed) credits a wallet exactly once; an automated test attempts every plausible "move currency between two players" code path and confirms none exist.

---

## Phase 6 — Top-Ups, Subscription, Premium Boosts

**Depends on:** Phase 5 (wallet must exist), Phase 2 (Fertility Shell and Breath of the Land act on inventory/crafting state Phase 2 builds).

**Schema:**
```sql
CREATE TABLE top_up_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- starter, farmer, harvest, cattle, export
  price_bwp DECIMAL(10,2) NOT NULL,
  granted_pula INT NOT NULL         -- 5, 50, 105, 265, 540
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL DEFAULT 'guild',
  price_bwp DECIMAL(10,2) NOT NULL DEFAULT 49.00,
  benefits JSONB NOT NULL
);

CREATE TABLE premium_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- pula_stone, ancestral_ward, fertility_shell, breath_of_the_land
  price_pula INT NOT NULL,
  effect JSONB NOT NULL             -- e.g. {type: 'next_sale_bonus_pct', value: 50} for Fertility Shell
);
```

**API:**
- `GET /payments/store` — packs, subscription plan, boosts
- `POST /payments/topup` `{packId}` → creates a `pending` `real_world_transactions` row, returns a provider-hosted checkout reference
- `POST /payments/webhook` — per-provider signature verification, then `WalletService.credit`, idempotent on `provider_tx_id`
- `POST /payments/subscribe` / `POST /payments/subscription/cancel`
- `POST /market/boosts/:id/purchase` — deducts `pula_balance` (not a real-money flow — Pula sink, same atomic-transaction pattern as any other spend), applies the boost's effect
- `GET /payments/history`

**Cron:**
- Daily: flip `subscription_status` to `'free'` where `now() > subscription_expires_at`
- Weekly: grant the Pula Stone item to every currently-active subscriber

**Auto-Collector:** implemented inside the existing offline-elapsed-time simulation that already runs on farm load — for a subscriber, ready-to-harvest plots and ready livestock products are collected automatically as part of that same pass, instead of being left in a "ready" state; **this collection path must never call whatever function increments Botho points** — that's a hard rule, not a style preference, and it needs its own test asserting it, checked in CI on every change to either the Auto-Collector or the Botho-accrual code path.

**Done when:** a P100 Harvest Pack purchase credits exactly 105 Pula after webhook confirmation, once; a subscriber's Auto-Collector runs and their Botho total is unaffected by it; a lapsed subscription immediately stops the Auto-Collector, the storage bonus, and cosmetic access.

---

## Phase 7 — Monthly Community Prize

**Depends on:** Phase 3 (Botho ≥ 1000 eligibility), Phase 5 (wallet), Phase 6 (subscription revenue feeds the pool formula, and the Botho-decoupling test from Phase 6 must already be green before this ships).

**Schema:**
```sql
CREATE TABLE community_prize_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period DATE NOT NULL,             -- first-of-month marker
  player_id UUID REFERENCES auth.users(id),
  botho_points INT NOT NULL,
  rank INT NOT NULL,
  payout_amount DECIMAL(10,2) NOT NULL,
  kyc_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);
```

**Cron:** on the 1st of each month — query players with `botho_points >= 1000`, rank by `botho_points`, take the top 3, compute the pool as `clamp(10% × trailing-month Guild subscription revenue, 350, 1500)` (Economy v2 §8.5), split it 4:2:1 across the three ranks, insert one `community_prize_entries` row per winner at `kyc_status = 'pending'`.

**API:**
- `POST /admin/prize/:entryId/verify-kyc` — matches the winner's in-game phone number against their mobile money account
- `POST /admin/prize/:entryId/payout` — only callable when `kyc_status = 'verified'`; sends airtime via the provider, sets `paid_at`

**Done when:** an automated test confirms the computed pool never exceeds P1,500 regardless of leaderboard size or subscriber count; no payout endpoint succeeds while `kyc_status != 'verified'`.

---

## Phase 8 — Launch Readiness

**Depends on:** all previous phases.

**Checklist:**
- Full scripted walkthrough: signup → farm → craft → sell (5% tax visible) → Bushveld hotspot loop → Botho milestone → top-up → subscribe → premium boost purchase, in one sitting, on both desktop and mobile browser widths.
- Confirm PWA install works from both platforms without a Play Store dependency.
- Confirm in production configuration, not just in tests: no withdrawal endpoint exists anywhere; no P2P Pula transfer path exists anywhere; the 5% Market Tax is live; the community-prize pool formula's floor/ceiling are the values in Economy v2 §8.5, not placeholder test values; daily top-up cap (P500) is enforced server-side.

**Done when:** the checklist above passes in the actual production environment, not just in a staging or test run.
