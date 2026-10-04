-- ============================================================================
-- B2 — Achievements & the honorific ladder (08 §5 / D5, RULED 2026-10-04)
--
-- `achievements` is a data-driven CATALOG (one row per slug), seeded from
-- `@molemisi/game-config` (see apps/api/src/database/seed.ts). `player_achievements`
-- records what a player has EARNED. Both are additive, one balanced transaction.
--
-- RANK IS NEVER PURCHASED (D10): nothing here reads a wallet. Attainment is
-- written only by AchievementService from live game signals.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.achievements (
  slug        TEXT PRIMARY KEY,
  rung        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  milestones  JSONB NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.achievements IS
  'B2 — the achievement catalog (D5). Data-driven: adding a rung/achievement is '
  'a config change plus a re-seed, never a schema change.';

CREATE TABLE IF NOT EXISTS public.player_achievements (
  player_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL REFERENCES public.achievements(slug) ON DELETE CASCADE,
  rung             TEXT NOT NULL,
  attained_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, achievement_slug)
);

COMMENT ON TABLE public.player_achievements IS
  'B2 — attained achievements. DISPLAY-ONLY: grants no mechanical advantage and '
  'is never transferable. The (player_id, achievement_slug) PK is the idempotency '
  'guard, so re-evaluating a milestone cannot duplicate a row.';

CREATE INDEX IF NOT EXISTS idx_player_achievements_player
  ON public.player_achievements (player_id);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- Catalog is public reference data.
DROP POLICY IF EXISTS "achievements_public_read" ON public.achievements;
CREATE POLICY "achievements_public_read" ON public.achievements
  FOR SELECT USING (true);

-- A player reads their own attainment; the server (admin client) writes it.
DROP POLICY IF EXISTS "player_achievements_owner_read" ON public.player_achievements;
CREATE POLICY "player_achievements_owner_read" ON public.player_achievements
  FOR SELECT USING (player_id = auth.uid());

COMMIT;
