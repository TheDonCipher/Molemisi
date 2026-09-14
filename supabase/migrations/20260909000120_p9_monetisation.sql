-- ============================================================================
-- P9 — Monetisation (05 §P9)
-- Source: docs/MVP/05_Implementation_Plan.md §P9, 02_Economy_And_Currencies.md §6.6–6.7
--
-- THREE catalog tables are the spec's canonical store (matched 1:1 by the code in
-- packages/game-config/src/economy.ts). They are seeded here, idempotently, so the
-- database holds the same numbers the client is told to show. Two ownership tables
-- record what a player actually BOUGHT (Pula-priced boosts + cosmetics) and what the
-- Guild subscription GRANTED them weekly (the Pula Stone).
--
-- WHY OWNERSHIP TABLES, NOT A BALANCE
--   Boosts and cosmetics are items, not currency. A boost is consumed or expires; a
--   cosmetic is owned forever. Neither belongs on player_wallets (Pula/Botho only),
--   so they get their own append-style tables. Server authority still holds: the
--   client never writes them (RLS below), only the MonetisationService does.
--
-- IDEMPOTENT WEEKLY GRANT
--   player_boosts.week_start + the partial unique index make the weekly Pula Stone
--   grant safe to re-run: one stone per player per (UTC+2) week, the second run is a
--   no-op. The service layer ALSO de-dupes in code (read-then-insert) so the same
--   holds under the in-memory test mock, which has no unique index.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. top_up_packs — real-money Pula purchases (Pula is 1:1 with BWP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.top_up_packs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,   -- starter | farmer | harvest | cattle | export
  price_bwp    NUMERIC(10,2) NOT NULL CHECK (price_bwp > 0),
  granted_pula INT  NOT NULL CHECK (granted_pula > 0)
);

-- ----------------------------------------------------------------------------
-- 2. subscription_plans — the Guild subscription (one plan in v1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL DEFAULT 'guild',
  price_bwp  NUMERIC(10,2) NOT NULL DEFAULT 49.00 CHECK (price_bwp > 0),
  benefits   JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ----------------------------------------------------------------------------
-- 3. premium_boosts — THREE ONLY (R8). Fertility Shell is NOT seeded.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.premium_boosts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,   -- pula_stone | ancestral_ward | breath_of_the_land
  price_pula INT  NOT NULL CHECK (price_pula > 0),
  effect     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- 4. player_boosts — what a player owns: purchased boosts + weekly guild stones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_boosts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('purchase', 'guild_weekly', 'admin')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,            -- Ancestral Ward: 3-day shield window
  used_at    TIMESTAMPTZ,            -- one-shot consumables clear this when applied
  week_start DATE,                   -- set for guild_weekly; NULL for purchases
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity >= 1)
);

COMMENT ON COLUMN public.player_boosts.week_start IS
  'NULL for purchased boosts. Set to the UTC+2 Monday for guild_weekly grants so the '
  'partial unique index below makes the weekly Pula Stone grant idempotent.';

CREATE INDEX IF NOT EXISTS idx_player_boosts_player
  ON public.player_boosts (player_id);

-- Idempotent weekly grant: one Pula Stone per player per week. The WHERE clause
-- leaves purchased (week_start IS NULL) rows out of the uniqueness check entirely,
-- so a player may own many purchased boosts but only one un-claimed weekly stone.
CREATE UNIQUE INDEX IF NOT EXISTS uq_player_boosts_weekly
  ON public.player_boosts (player_id, slug, week_start)
  WHERE week_start IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. player_cosmetics — owned cosmetic ids (permanent; Pula sink, F7)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_cosmetics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_id TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_player_cosmetics_player
  ON public.player_cosmetics (player_id);

-- ----------------------------------------------------------------------------
-- 6. Seed the catalog from config (mirrors packages/game-config/src/economy.ts)
--    ON CONFLICT (slug) DO NOTHING => re-running this migration is a no-op.
-- ----------------------------------------------------------------------------
INSERT INTO public.top_up_packs (slug, price_bwp, granted_pula) VALUES
  ('starter', 5.00,   5),
  ('farmer',  50.00,  50),
  ('harvest', 100.00, 105),
  ('cattle',  250.00, 265),
  ('export',  500.00, 540)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.subscription_plans (slug, price_bwp, benefits) VALUES
  ('guild', 49.00, '["auto_collector","storage_bonus_50","cosmetics","weekly_pula_stone","ad_free"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.premium_boosts (slug, price_pula, effect) VALUES
  ('pula_stone',        20, '{"refill_tank_pct":50,"guarantee_rain_hours":24}'::jsonb),
  ('ancestral_ward',    25, '{"shield_days":3,"blocks":["wildlife_raid"]}'::jsonb),
  ('breath_of_the_land',15, '{"completes":["crafting_timer","building_timer"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security — players read their own, never write from the client
-- ----------------------------------------------------------------------------
ALTER TABLE public.top_up_packs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_boosts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_boosts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_cosmetics    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "top_up_packs_public_read" ON public.top_up_packs;
CREATE POLICY "top_up_packs_public_read" ON public.top_up_packs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "premium_boosts_public_read" ON public.premium_boosts;
CREATE POLICY "premium_boosts_public_read" ON public.premium_boosts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "player_boosts_read_own" ON public.player_boosts;
CREATE POLICY "player_boosts_read_own" ON public.player_boosts
  FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "player_cosmetics_read_own" ON public.player_cosmetics;
CREATE POLICY "player_cosmetics_read_own" ON public.player_cosmetics
  FOR SELECT USING (auth.uid() = player_id);

COMMIT;
