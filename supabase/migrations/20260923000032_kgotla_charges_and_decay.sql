-- ============================================================
-- Kgotla charge system + regard decay (SPEC §5, §4.1, 2026-09-23)
--
-- Two additive changes:
--   1. npc_reputation.last_charge_at — when the player last completed a charge
--      for that elder; powers §4.1 passive decay (−2 per full 7 days idle).
--   2. kgotla_quests — one row per accepted charge. The shared pool of three per
--      farm per Botswana day is enforced by counting rows where
--      accepted_on = today. Progress is DERIVED (inventory + ledger), so there
--      is deliberately no progress column — it can never drift.
--
-- This migration is additive and non-destructive. It is NOT APPLIED until the
-- Princess confirms; pushing schema on a live Supabase project is a one-way
-- act (memory: "Confirm before destructive or schema work").
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1. Regard decay tracking (SPEC §4.1)
--
-- last_charge_at is the timestamp of the most recent completed charge for this
-- elder. NULL on existing rows = "never charged"; their decay starts from NOW.
-- updated_at would not work — decay *writes* would bump updated_at and make the
-- decay self-resetting. A dedicated column is required.
-- ----------------------------------------------------------------------------
ALTER TABLE public.npc_reputation
  ADD COLUMN IF NOT EXISTS last_charge_at TIMESTAMPTZ;

COMMENT ON COLUMN public.npc_reputation.last_charge_at IS
  'SPEC §4.1 — timestamp of the player''s most recent completed Kgotla charge for this NPC. '
  'Drives passive regard decay (−2 per full 7-day period idle, floored at 0).';

-- ----------------------------------------------------------------------------
-- 2. The charge system (SPEC §5)
--
-- The shared pool of 3 charges per farm per Botswana day falls out of
-- "COUNT(*) WHERE farm_id = ? AND accepted_on = today".
--
-- UNIQUE(farm_id, npc_id, accepted_on) prevents the same elder from offering
-- twice in one day. The NPC roster has 5 elders; the day caps at 3 charges.
--
-- quest_type is constrained to the five elder types so a typo in the API
-- becomes a 500 instead of a silent garbage row. item_slug is NULL for the
-- community and trade charges (verified by project delta / ledger volume,
-- not by consuming goods). target_qty is the number of items or Pula the
-- charge requires.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kgotla_quests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id      UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  npc_id       VARCHAR(50) NOT NULL,
  quest_type   VARCHAR(20) NOT NULL
                 CHECK (quest_type IN ('community','trade','construction','gathering','farming')),
  item_slug    TEXT,
  target_qty   INTEGER NOT NULL CHECK (target_qty > 0),
  status       VARCHAR(12) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','claimed')),
  accepted_on  DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farm_id, npc_id, accepted_on)
);

-- The day query: "how many charges has this farm accepted today?"
CREATE INDEX IF NOT EXISTS idx_kgotla_quests_farm_day
  ON public.kgotla_quests (farm_id, accepted_on DESC);

-- Active-charge lookup for the board rendering (small, hot path).
CREATE INDEX IF NOT EXISTS idx_kgotla_quests_active
  ON public.kgotla_quests (farm_id) WHERE status = 'active';

-- ----------------------------------------------------------------------------
-- 3. Project reward idempotency (SPEC §6 / AC-04)
--
-- Community project bars are per-farm (UNIQUE farm_id, project_id), so the
-- reward is the farmer's own and may never promise a village-wide effect. The
-- reward is Chapter Tokens, granted ONCE when the bar first fills. Without a
-- marker column that grant could not be made idempotent — a second donation
-- past the threshold would pay out again.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kgotla_projects
  ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.kgotla_projects.reward_claimed_at IS
  'SPEC §6 — when this farm claimed the finished project''s Chapter Token reward. '
  'NULL = not yet claimed. Makes the one-off grant idempotent.';