-- ============================================================================
-- B4 — the player avatar (08 §10 / D10, RULED 2026-10-04)
--
-- The 3-layer avatars model stores only what is SWAPPABLE:
--   base_key        chosen once at creation; not a cosmetic, never bought
--   equipped_outfit the cosmetic overlay; the ONLY layer the store changes
--
-- The Farmer's Hat is deliberately NOT a column. It is a fixed render layer that
-- is always drawn on top, so there is no state that could remove it and no SKU
-- that could sell it. Adding an outfit is a data change (a new `outfit` SKU), so
-- no schema change is needed to expand the wardrobe.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_avatar (
  player_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  base_key        TEXT NOT NULL,
  equipped_outfit TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.player_avatar IS
  'B4 — the 3-layer avatar (D10). `base_key` is set once at creation and is not '
  'editable from the store; `equipped_outfit` is the swappable cosmetic layer. '
  'The Farmer''s Hat is a fixed render layer and is intentionally not stored.';

ALTER TABLE public.player_avatar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_avatar_owner_read" ON public.player_avatar;
CREATE POLICY "player_avatar_owner_read" ON public.player_avatar
  FOR SELECT USING (player_id = auth.uid());

COMMIT;
