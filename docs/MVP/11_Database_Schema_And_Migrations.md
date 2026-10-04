# 11 — Database Schema & Migrations

> Companion to `09`. Normative anchors: `05 §P2/P3/P8/P9` (baseline SQL), `04 §10` (Bushveld model), `07_Database_Design_Specification.md` (long-form), `DEVELOPMENT_STATE.md` §Database (as-built).
> **The baseline is what exists today.** This document specifies the *entity model*, the *migration strategy*, and the *delta* (new tables) — it does not restate migrations already live.

---

## 1. Migration state of record

**49 migration files** in `supabase/migrations/`. **All 49 are committed, pushed, and applied live** to `nyapfgawanqvnkkjudxb`.

> ⚠️ **Supersedes the "51 files / 10 untracked" figure in `README.md` and `DEVELOPMENT_STATE.md`.** Verified against the working tree on 2026-10-04: `git ls-files supabase/migrations` = 49, `git status` shows **no** untracked migrations. Commit **`bf235be`** (2026-10-03, *"all 10 pending migrations apply on live"*) landed the M-series hardening, the atomic helpers, and `spend_chapter_tokens`, and the commit message records that "both now show Remote timestamps; all 10 migrations are applied live." The earlier "10 untracked/unpushed" state was true on 2026-10-03 **before** that commit; it is stale now.

Consequently the runtime objects `inventory_take`, `botho_credit_capped`, `spend_chapter_tokens`, the widened `ledger_entries.currency` CHECK, and the M-series RLS closures **exist on live** — the `DEVELOPMENT_STATE.md` warning that they "do not exist on the live server yet" is also stale.

> **Verify, don't trust:** run `supabase migration list --linked` and confirm every migration shows a Remote timestamp. A blank Remote column = rolled back and unrecorded (see §4.2).

---

## 2. Entity model

### 2.1 Identity & authority

```
auth.users (Supabase-managed)
  │ 1:1
  ▼
profiles
  id                UUID PK = auth.users.id
  role              TEXT  — player | admin | dev      ← SERVER-MANAGED (trigger)
  is_admin          BOOL                               ← SERVER-MANAGED (trigger)
  display_name      TEXT   ← client-writable
  avatar_url        TEXT   ← client-writable
  farm_name         TEXT   ← client-writable (nullable; D4 — farm name editable)
  banned            BOOL
  updated_at        TIMESTAMPTZ
```

**Guard trigger.** `trg_profiles_guard_role` calls `guard_profiles_role()`, which `RAISE`s on any write to `role`/`is_admin` unless the session GUC `molemisi.role_sync` is set. Only `set_role()` and `set_admin()` set that GUC, and both are `REVOKE`d from `anon`/`authenticated`. Table-level `UPDATE` was revoked and re-granted only for `display_name`, `avatar_url`, `farm_name`, `updated_at`.

> **Never** try to promote a user with a plain `UPDATE profiles SET role=…`. It will raise. Use `scripts/create-admin.mjs` / `create-dev.mjs`, which call the RPCs.

### 2.2 Wallet, ledger, money

```
player_wallets
  player_id               UUID PK → auth.users.id
  pula_balance            INT  NOT NULL DEFAULT 0     -- soft
  botho_points            INT  NOT NULL DEFAULT 0     -- CANONICAL Botho (R6/C7)
  madi_balance            NUMERIC(10,2) NOT NULL DEFAULT 0   -- added 20261001000003
  subscription_status     TEXT DEFAULT 'free'
  subscription_expires_at TIMESTAMPTZ
  updated_at              TIMESTAMPTZ

ledger_entries                     -- append-only; the audit trail
  id              UUID PK
  player_id       UUID → auth.users.id
  currency        TEXT  -- 'pula' | 'botho' | 'madi' | 'chapter_token'
  amount          NUMERIC(12,2)
  balance_after   NUMERIC(12,2)
  source          TEXT  -- 'coop_sale' | 'craft_fee' | 'topup' | ...
  ref_id          UUID  -- idempotency key for (source, ref_id)
  created_at      TIMESTAMPTZ

real_world_transactions
  id              UUID PK
  player_id       UUID → auth.users.id
  provider        TEXT
  provider_tx_id  TEXT UNIQUE NOT NULL      -- ← the idempotency guard (I3)
  amount_bwp      NUMERIC(10,2)
  currency        TEXT  -- 'madi' in v1
  status          TEXT  -- pending | completed | failed
  created_at      TIMESTAMPTZ
```

**Reconciliation checkpoint (P2, highest blast radius).** Before cutting reads over to `player_wallets`, run `sum(old pula holders) == sum(new pula_balance)`. The legacy holders are `profiles.pula` and the old Kgotla standing score; the old standing column is migrated into `botho_points` and then deleted (no second counter — I10).

### 2.3 Farm, crops, water

```
farms
  id, player_id → auth.users.id, name (nullable, D4), plots_unlocked INT

plots
  id, farm_id → farms.id, plot_index INT, state TEXT, crop_instance_id UUID NULL

crop_instances
  id, plot_id, crop_type TEXT, planted_at TIMESTAMPTZ,
  growth_progress NUMERIC, watered_at TIMESTAMPTZ,
  fertilized_until_stage INT NULL,
  state TEXT   -- GROWING | READY | HARVESTED

farm_water
  farm_id PK → farms.id, units INT, capacity INT DEFAULT 60, updated_at

water_ledger
  id, farm_id, delta INT, reason TEXT, created_at
```

**Water rule (P4, `03 §1.2`).** An empty tank **halts** the growth clock server-side; it never kills a crop. Water is drawn **only while a crop is `GROWING`** — never while `READY` (F5). Rain events credit the tank.

### 2.4 Inventory, storage, crafting

```
item_definitions
  id UUID PK, slug TEXT UNIQUE, name TEXT, category TEXT,
  base_value_pula INT, max_stack INT, is_tool BOOL DEFAULT FALSE

player_inventory
  id, player_id, item_def_id, quantity INT,
  UNIQUE (player_id, item_def_id)
  -- removals ONLY via inventory_take(player,item,qty) RPC (atomic)

storage_tiers         -- seeded from config
  tier INT PK, name TEXT, slot_cap INT, listing_slots INT, upgrade_cost_pula INT

crafting_recipes      -- seeded; v1.1-facing (D7)
  id, slug TEXT UNIQUE, output_item_id, output_qty INT,
  inputs JSONB,          -- substitution groups, not a flat list
  fee_pula INT, duration_minutes INT, unlock_condition JSONB

crafting_jobs
  id, player_id, recipe_id, slot_index INT, qty INT,
  started_at, collected_at,
  UNIQUE (player_id, slot_index) WHERE collected_at IS NULL
```

**Category is a checked enum.** `DIPHOLOGOLO` (livestock — C2) and the slug `setena` (C3) are exact; a mismatch silently drops items from client filters. There is **no `Special` category** (C4/R3).

### 2.5 Market

```
market_prices
  item_def_id → item_definitions.id, base_value, current_multiplier,
  last_recomputed_at TIMESTAMPTZ

market_transactions
  id, player_id, item_def_id, quantity, gross NUMERIC, tax NUMERIC,
  net NUMERIC, band_multiplier NUMERIC, created_at

market_events
  id, name, chapter_slug, multiplier NUMERIC, starts_at, ends_at
```

`market_prices` was reconciled to the catalogue by `20260924000000` (fixed 13 unsellable items, 23 stale prices, 14 orphans; seeds are blocked from sale). Chapter events self-seed via `ensureActiveChapterEvent()` — idempotent, de-duped by name.

### 2.6 Kgotla

```
kgotla_charges          -- Year-layer table, live (20261002000000)
  id, npc_id, slug, requirements JSONB, regard INT, season TEXT

kgotla_projects
  id, slug, name, goal_pula INT, contributed_pula INT, chapter_slug

kgotla_contributions
  id, player_id, project_id, amount_pula INT, botho_granted INT, created_at

kgotla_regard
  player_id, npc_id, regard INT, PRIMARY KEY (player_id, npc_id)
```

**Botho from donations is capped.** `BOTHO_PER_PULA_DONATED = 1`, through the capped credit path (`botho_credit_capped` RPC). At 2/Pula a funded player hits the 50/day cap for P25 — that reads as "buying standing" and is forbidden (`13 §6`).

### 2.7 Bushveld

Per `04 §10` — the authoritative model:

```
bushveld_scenes
  id, slug, name, background_asset_key,
  kagiso_max INT,                    -- 6
  kagiso_regen_minutes INT,          -- 240 (tuning range 180–480)
  unlock_condition JSONB,            -- null | {botho_gte: 300}
  restoration_asset_keys JSONB,      -- [degraded, partial, recovered, full]
  restoration_thresholds JSONB       -- [0.4, 0.7, 1.0]

bushveld_hotspots
  id, scene_id, x, y, sprite_key, loot_table_id,
  kagiso_cost INT,                   -- 1 common/material | 2 uncommon/rare/seasonal
  rest_minutes INT,                  -- 60
  seasonal_loot_table_id UUID NULL,
  active_months INT[] NULL           -- e.g. {4,12} for Setlhare sa Phane

player_scene_state
  player_id, scene_id, kagiso INT, kagiso_updated_at TIMESTAMPTZ
  PRIMARY KEY (player_id, scene_id)

player_hotspot_state
  player_id, hotspot_id, last_collected_at TIMESTAMPTZ
  PRIMARY KEY (player_id, hotspot_id)

daily_sparkle
  date DATE PK, hotspot_id

field_journal_entries
  player_id, discovery_slug, scene_id, discovered_at
  PRIMARY KEY (player_id, discovery_slug)
```

**Seed requirement (v1).** Four scenes (3 available from start + Deep Bushveld Botho-300-gated), 5–8 hotspots each, all journal lines, exactly one seasonal hotspot with `active_months = [4,12]`. A rare find never creates an inventory row.

### 2.8 Live service

```
chapters
  id, slug TEXT UNIQUE, name TEXT, starts_on DATE, ends_on DATE

player_chapter_state
  player_id, chapter_id, chapter_tokens INT DEFAULT 0,
  almanac_progress JSONB, PRIMARY KEY (player_id, chapter_id)
```

`ledger_entries.currency` must accept `'chapter_token'` — the live CHECK constraint was **rejecting** it (SQLSTATE 23514), which destroyed season stamps on spend (`DEVELOPMENT_STATE.md`). The `spend_chapter_tokens` migration is the fix; it **landed committed and pushed live on 2026-10-03** (commit `bf235be`, applied as `20261003000020_spend_chapter_tokens`). *(Corrected 2026-10-04 — an earlier draft of this doc called it untracked/unpushed.)*

### 2.9 Monetisation & cosmetics (see `15`)

```
top_up_packs          -- slug, price_bwp, granted_madi, granted_pula=0
subscription_plans    -- village_pass, M50/mo, benefits JSONB
cosmetic_skus         -- NEW (D10): data-driven SKU manifest
  slug TEXT PK, slot TEXT, shelf TEXT, price INT, currency TEXT,
  asset_key TEXT, is_earned BOOL, unlock_condition JSONB
player_cosmetics      -- player_id, cosmetic_slug, acquired_at, equipped BOOL
player_subscriptions  -- player_id, plan, expires_at
player_achievements   -- NEW (B2): player_id, achievement_slug, attained_at
achievements          -- NEW (B2): slug, rung TEXT, milestone JSONB
```

**Boosts are absent.** `premium_boosts` may exist as a legacy table but `BOOSTS` config is empty and no boost may appear in any store response (`store.spec.ts` asserts the three historical slugs are absent **by name**).

---

## 3. New tables required by the 2026-10-04 rulings

The nine rulings add net-new scope (`08 §0.2`). Four are schema:

| Table | Decision | Columns | Notes |
|---|---|---|---|
| `cosmetic_skus` | D10 | `slug, slot, shelf, price, currency, asset_key, is_earned, unlock_condition` | Data-driven SKU manifest; adding a cosmetic = a data row, no code change |
| `player_achievements` | D5 | `player_id, achievement_slug, attained_at` | Drives the honorific ladder (Molemi → Mokgosi) |
| `achievements` | D5 | `slug, rung, name, milestone JSONB` | Catalog; each entry maps to a ladder rung |
| `events` / `event_grants` | D6/D8 | `slug, chapter_slug, starts_at, ends_at, reward_tokens, grant_item_slug, grant_qty` | Events live service — grants Bupi/Borotho so MVP players (no crafting) can fulfil Kgotla demand |

**`farms.name`** — a small, safe addition (the D4 farm-name feature). Nullable, filtered server-side.

> **Schema-review flag (D4 open item 2).** The four new tables + `farms.name` are **additive** (no ALTER of existing columns except `farms.name`). Since all 49 existing migrations are already live, they can ship as a new batch at any point — but the ordering relative to the §3 addendum must be explicit in the sprint plan.

---

## 4. Migration strategy

### 4.1 File-naming and prefix uniqueness

Supabase orders migrations by **14-digit filename prefix** and de-duplicates by it. Two files sharing a prefix break ordering — this happened on 2026-10-03 (`*_harden_profile_privilege_columns`, `*_atomic_inventory_take`) and the sets were merged into the tracked filenames. **All 51 prefixes must remain unique.**

### 4.2 One balanced transaction per file

The proven pattern:

```sql
BEGIN;

CREATE TABLE ...;
CREATE FUNCTION ...;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... ;
REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated;

COMMIT;
```

> ⚠️ **An unbalanced `BEGIN;`/`COMMIT;` makes `db push` print "Finished" while leaving the migration rolled back and unrecorded.** A stray `COMMIT;` with no open transaction, or a `BEGIN;` with no matching `COMMIT;`, silently no-ops the file. After every push, verify with `supabase migration list --linked` — a blank **Remote** column means the migration did **not** apply.

### 4.3 SQL gotchas

- **`COMMENT ON … IS 'a' || 'b'` is rejected** (SQLSTATE 42601). Use adjacent string literals: `IS 'a' 'b'`.
- **`is_admin` must always be called as `is_admin(auth.uid())`** inside RLS policies. The bare zero-arg form is a `42883` at `CREATE POLICY` time, which aborts the transaction and leaves the file unapplied.
- **Postgres is 17.6.1** on live.

### 4.4 The push procedure

```
1. git status                     -- know what is untracked
2. supabase migration list --linked
      → if only YOUR migrations show a blank Remote column, a root push is safe
      → if others' migrations are also pending, stop and coordinate
3. supabase db push               (prompts for the DB password)
4. supabase migration list --linked
      → every migration must now show a Remote timestamp. Blank = rolled back.
```

> Do **not** use `supabase db dump --schema-only` — it is not a valid flag (the CLI prints help and exits 0). A live schema dump needs Docker, which is unavailable headless.

### 4.5 Applying to live: the seeded-config path

Config seeding and schema migrations are separate concerns:

- **Schema** moves via `supabase db push`.
- **Config** materialises via `pnpm db:seed`, which writes `game-config` → `item_definitions`, `crafting_recipes`, `bushveld_*`, `storage_tiers`, `top_up_packs`, `cosmetic_skus`, `achievements`. It must be **idempotent**: a second run changes nothing (`06` P1).

> `pnpm db:seed` is currently **broken** — the root script delegates to `pnpm --filter @molemisi/api db:seed`, which runs `ts-node src/database/seed.ts`, and that file does not exist (`DEVELOPMENT_STATE.md`). Fixing or removing it is P0/P1 work.

---

## 5. Reconciliation checkpoints

Three reconciliations must pass before their cutover:

| # | Checkpoint | When | Assertion |
|---|---|---|---|
| **REC-1** | Wallet migration | P2, before reads cut over | `sum(legacy pula holders) == sum(player_wallets.pula_balance)` |
| REC-2 | Botho migration | P2 | old Kgotla standing score migrated into `botho_points`; old column deleted (I10) |
| REC-3 | Historical top-up rows | P9 | 27 historical `topup` payments credited **Pula** (P395) before the Madi contract. **Not rewritten** — a reconciliation note is raised for an operator ruling (`DEVELOPMENT_STATE.md`) |

---

## 6. Delta summary for a coding agent

**Already done (verified 2026-10-04):** all 49 migrations are live, including the M-series hardening and the atomic helpers (`inventory_take`, `botho_credit_capped`, `spend_chapter_tokens`). Run `supabase migration list --linked` to confirm; if every row shows a Remote timestamp, there is no schema delta to land.

**Do now:** fix or remove `db:seed`; run REC-1/REC-2 before any wallet read cutover on a fresh environment.

**Do in the phase that needs it:**

| Phase | Schema work |
|---|---|
| P1 | None (config only). Ensure `item_definitions` seeding is idempotent. |
| P3 | None new — `item_definitions`/`player_inventory` exist. Verify `inventory_take` is live. |
| P5 | None — `botho_points` is canonical. Verify `botho_credit_capped` is live. |
| P6 | Verify `bushveld_*` rows; add the 4th scene's hotspot rows (already content-complete since G5). |
| P8 | Verify `ledger_entries.currency` accepts `'chapter_token'`. |
| P9 | Add `cosmetic_skus` seed; verify `top_up_packs.granted_madi`. |
| D5/D6/D10 (new scope) | Add `achievements`, `player_achievements`, `events`, `event_grants`, `cosmetic_skus`, `farms.name`. |

*End of `11`. Proceed to `12_API_Endpoint_Specification.md`.*
