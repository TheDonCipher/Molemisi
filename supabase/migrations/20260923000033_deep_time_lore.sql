-- ============================================
-- Deep Time Lore & Cozy Progression — 000140
-- (docs/Molemisi LORE FINAL.txt — Doc 11 §6/§7)
--
-- Three additive changes, all positive-only state:
--   1. profiles.is_guardian_of_sesana — set once when the Field Journal is at
--      100% pages AND Botho >= 500; never unset (an honour is permanent).
--   2. lore_entries — one row per Water Whisper listened to (and other lore
--      moments). `is_original` marks the FIRST listener of a given quote,
--      enforced by a partial unique index so the server needs no
--      read-before-write to know who was first.
--   3. buildings.slot_index — where a placed building sits on the plot grid.
--      The Heritage Tree (setlhare_sa_boswa) needs a position so the four
--      plots immediately around it can drink at the Water Memory multiplier
--      (0.8), tying the endgame back to the "water remembers" theme.
--
-- NOTE on filename: this repo date-stamps migrations so `supabase db push`
-- applies them in creation order (see 20260923000032_*). The requested
-- `000140_deep_time_lore.sql` would sort BEFORE the initial schema and fail to
-- apply; this file carries the same "000140" tag in its header, with a
-- sortable name.
-- ============================================

-- ----------------------------------------------------------------------------
-- 1. Guardian of Sesana (Doc 11 §6)
--
-- The title is written by the SERVER the first time it observes
-- (journal pages complete) AND (Botho >= 500). It is never cleared: purely
-- positive mechanics have no downgrades. profiles is owner-scoped already; the
-- server writes through the admin client, so this column is read-only to
-- clients by the existing RLS posture.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_guardian_of_sesana BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_guardian_of_sesana IS
  'Doc 11 §6 — set ONCE by the server when Field Journal pages = 100% AND Botho >= 500. Never unset: an honour is permanent.';

-- ----------------------------------------------------------------------------
-- 2. lore_entries (Doc 11 §3 — Water Whisper Journal progress)
--
-- One row per listened-to whisper. The Field Journal's page counts stay on
-- field_journal_entries (discovery finds); lore_entries is the "quiet moments"
-- ledger that Doc 11 §3 counts as Journal Progress (+1 per listen). It is a
-- record of attention, not a resource: rows can never be spent, traded or lost.
--
-- is_original: exactly ONE player is the first to hear each quote. The partial
-- unique index below IS the mechanism — the first INSERT with is_original=true
-- succeeds; every later one collides and is recorded with is_original=false.
-- No read-before-write, no race at2 listeners.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lore_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'water_whisper' | 'tsholofelo_gift' | 'village_feast' | 'guardian_of_sesana'
  kind        TEXT NOT NULL,
  -- Stable slug of the line/event (e.g. water_whisper_deep_roots). Never changes
  -- even if the quote text is reworded.
  slug        TEXT NOT NULL,
  -- The exact text as it was heard, so history survives rewording.
  quote       TEXT,
  -- TRUE for the FIRST player ever to log this slug. One original per slug.
  is_original BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lore_entries IS
  'Doc 11 §3/§7 — Deep Time lore: whispers listened to, feasts shared, honours received. Purely additive: nothing here can be lost or spent.';

CREATE INDEX IF NOT EXISTS idx_lore_player_kind
  ON public.lore_entries (player_id, kind);

-- Exactly one ORIGINAL row per quote, whatever the concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS ux_lore_entries_original_slug
  ON public.lore_entries (slug)
  WHERE is_original;

-- Owner-scoped (defence-in-depth: the server writes via the admin client, which
-- bypasses RLS — same posture as field_journal_entries).
ALTER TABLE public.lore_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lore_owner" ON public.lore_entries;
CREATE POLICY "lore_owner" ON public.lore_entries
  FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- ----------------------------------------------------------------------------
-- 3. buildings.slot_index — Heritage Tree placement (Doc 11 §6)
--
-- The tree is planted ON a plot slot; the four plots immediately surrounding it
-- (cross adjacency on the 4-column Farm Screen grid) get the Water Memory
-- multiplier: water demand × 0.8. NULL = the building does not sit on the plot
-- grid (tank, kraal, workshop, storage — every pre-existing row stays NULL).
-- ----------------------------------------------------------------------------
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS slot_index INTEGER;

COMMENT ON COLUMN public.buildings.slot_index IS
  '0-based farm_plots.slot_index for grid-placed buildings (Setlhare sa Boswa). NULL = off-grid (tank, kraal, workshop, storage).';

CREATE INDEX IF NOT EXISTS idx_buildings_slot
  ON public.buildings (farm_id, slot_index)
  WHERE slot_index IS NOT NULL;
