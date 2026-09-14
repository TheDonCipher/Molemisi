-- ============================================
-- P8 — Live service: chapters and events
-- (05 §P8; 02 §3.3 Chapter Token; 04 §9.2 real calendar)
--
-- `chapters` is a FOUR-ROW TEMPLATE (slug UNIQUE), not one row per year. The
-- `starts_on` / `ends_on` columns hold the CURRENT occurrence window for each
-- slug and are advanced by the idempotent rollover job (chapter.service.ts). That
-- advance is what makes the token expiry naturally idempotent: once a chapter's
-- window has been rolled forward, `ends_on < now` is false, so a re-run touches
-- nothing. No separate "rolled_over_at" flag is needed.
-- ============================================

CREATE TABLE IF NOT EXISTS public.chapters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,         -- pula | phane | moriti | letlhafula
  name       TEXT NOT NULL,
  setswana   TEXT NOT NULL,
  starts_on  DATE NOT NULL,
  ends_on    DATE NOT NULL
);

COMMENT ON TABLE public.chapters IS
  '05 §P8 — four chapter templates. starts_on/ends_on are the CURRENT occurrence '
  'window and are advanced by the rollover job; tokens expire to zero at chapter end.';

CREATE TABLE IF NOT EXISTS public.player_chapter_state (
  player_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id     UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  chapter_tokens INT NOT NULL DEFAULT 0,
  -- Per-track claimed Almanac tiers, e.g. {"free":[1,2],"guild":[]}.
  almanac_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (player_id, chapter_id)
);

COMMENT ON TABLE public.player_chapter_state IS
  '05 §P8 — Chapter Tokens (02 §3.3) are scoped to one chapter and zeroed on rollover. '
  'Never convertible to Madi, never withdrawable.';

CREATE INDEX IF NOT EXISTS idx_chapters_window ON public.chapters (starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_pcs_player ON public.player_chapter_state (player_id);

-- Seed the four templates with their current-occurrence windows against the 2026
-- real calendar. Pula wraps the year (Nov–Jan), so its first occurrence is
-- 2025-11-01 → 2026-01-31; the rest are the 2026 occurrences. The rollover job
-- advances any ended window on first boot, so these exact years are not load-bearing.
INSERT INTO public.chapters (slug, name, setswana, starts_on, ends_on)
VALUES
  ('pula',       'Season of Rain',    'Sekala sa Pula',      '2025-11-01', '2026-01-31'),
  ('phane',      'Season of Mophane', 'Sekala sa Phane',     '2026-02-01', '2026-04-30'),
  ('moriti',     'Season of Shade',   'Sekala sa Moriti',    '2026-05-01', '2026-07-31'),
  ('letlhafula', 'Season of Harvest', 'Sekala sa Letlhafula','2026-08-01', '2026-10-31')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY — defence-in-depth. The server uses the admin client
-- (bypasses RLS) for all writes; chapters are public reference data, player state
-- is owner-scoped.
-- ============================================
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chapters_public_read" ON public.chapters;
CREATE POLICY "chapters_public_read" ON public.chapters
  FOR SELECT USING (true);

ALTER TABLE public.player_chapter_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pcs_owner" ON public.player_chapter_state;
CREATE POLICY "pcs_owner" ON public.player_chapter_state
  FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
