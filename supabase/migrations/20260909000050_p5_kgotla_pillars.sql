-- ============================================
-- P5 — Kgotla and the Three Pillars
-- (02 §6.4 progression thresholds, 02 §9, 03 §7; 05 §P5)
--
-- Two additions, both additive:
--   1. player_wallets.letsema_last_used_at — the 7-day cooldown for Letsema.
--   2. field_journal_entries — one row per first-time find (04 §11, C9).
-- ============================================

-- ----------------------------------------------------------------------------
-- 1. Letsema cooldown
--
-- Letsema (Botho >= 500) is one free full harvest per 7 days. The cooldown lives
-- on the wallet rather than in a new table because WalletService is the sole
-- writer of player_wallets (05 §P2, invariant 3) — putting it anywhere else would
-- mean a second owner of player state and a second thing to keep in sync.
--
-- Nullable: NULL means "never used", which is exactly the state of every player
-- who has not reached 500 Botho yet. No backfill needed.
-- ----------------------------------------------------------------------------
ALTER TABLE public.player_wallets
  ADD COLUMN IF NOT EXISTS letsema_last_used_at TIMESTAMPTZ;

COMMENT ON COLUMN public.player_wallets.letsema_last_used_at IS
  '05 §P5 — Letsema (Botho >= 500) may be used once per LETSEMA_COOLDOWN_DAYS. NULL = never used.';

-- ----------------------------------------------------------------------------
-- 2. field_journal_entries (04 §11, C9)
--
-- One row per discovery per player, inserted on FIRST find only. The composite
-- primary key is the whole anti-duplication mechanism: a repeat find collides and
-- is ignored rather than needing a read-before-write.
--
-- This is the Journal's only reward mechanism (R5/C6 — page buffs were removed).
-- A completed page restores the scene's art; there is no numeric bonus.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_journal_entries (
  player_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discovery_slug TEXT NOT NULL,
  scene_id       TEXT NOT NULL,
  discovered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, discovery_slug)
);

COMMENT ON TABLE public.field_journal_entries IS
  'R3/C4 — rare finds are journal Discoveries only, never inventory rows.';

-- Pages are counted per scene, so the read path groups by (player, scene).
CREATE INDEX IF NOT EXISTS idx_journal_player_scene
  ON public.field_journal_entries (player_id, scene_id);

-- ============================================
-- ROW LEVEL SECURITY — owner-scoped. The server uses the admin client (bypasses
-- RLS) for all writes, so this is defence-in-depth, not the primary control.
-- ============================================
ALTER TABLE public.field_journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_owner" ON public.field_journal_entries;
CREATE POLICY "journal_owner" ON public.field_journal_entries
  FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
