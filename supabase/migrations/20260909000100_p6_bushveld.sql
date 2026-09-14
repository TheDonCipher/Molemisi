-- ============================================================================
-- P6 — The Bushveld: Kagiso, scenes, hotspots, player state, Daily Sparkle.
-- Source: docs/MVP/04_Bushveld.md (§10 data model, §11 API).
--
-- `field_journal_entries` already exists (P5 migration 20260909000050) — its
-- composite PK (player_id, discovery_slug) is the anti-duplication mechanism, so
-- the collect handler simply inserts and lets the conflict be a no-op.
--
-- Content lives in `packages/game-config`; the scene + hotspot seed below is
-- AUTO-GENERATED from that config (scripts/_gen_bushveld_seed.cjs) so the two
-- cannot drift (principle 6, 01 §4).
--
-- NOT changed here on purpose: the legacy `bushveld_explorations` table and the
-- `profiles.energy` / `profiles.xp` / `profiles.level` columns. The old
-- BushveldService wrote them; P6's service writes none of them. Flagged for
-- Princess Eugenia — they are now orphaned and should be dropped once nothing
-- reads them (that is a destructive change and needs a green light first).
-- ============================================================================

-- ---------------------------------------------------------------- scenes
CREATE TABLE IF NOT EXISTS public.bushveld_scenes (
  id                       TEXT PRIMARY KEY,            -- = scene slug
  name                     TEXT NOT NULL,
  background_asset_key     TEXT NOT NULL DEFAULT '',
  kagiso_max              INT  NOT NULL DEFAULT 6,
  kagiso_regen_minutes    INT  NOT NULL DEFAULT 240,  -- +1 pip / 240 min
  unlock_condition         JSONB,                       -- null | {"botho_gte":300}
  restoration_asset_keys  JSONB NOT NULL DEFAULT '[]'::jsonb,
  restoration_thresholds  JSONB NOT NULL DEFAULT '[0.4,0.7,1]'::jsonb
);

-- ---------------------------------------------------------------- hotspots
CREATE TABLE IF NOT EXISTS public.bushveld_hotspots (
  id              TEXT PRIMARY KEY,                    -- = config hotspot id
  scene_id        TEXT NOT NULL REFERENCES public.bushveld_scenes(id) ON DELETE CASCADE,
  x               INT  NOT NULL,                       -- position % (0-100)
  y               INT  NOT NULL,
  sprite_key      TEXT NOT NULL DEFAULT '',
  kagiso_cost     INT  NOT NULL DEFAULT 1,            -- 1 common/material | 2 premium
  rest_minutes    INT  NOT NULL DEFAULT 60,           -- per-hotspot personal cooldown
  active_months   INT[]                                -- NULL or e.g. {4,12} (04 §9.3)
);

-- --------------------------------------------------- per-player scene state
-- Kagiso is computed on READ from kagiso_updated_at, never by a cron (04 §4.2).
CREATE TABLE IF NOT EXISTS public.player_scene_state (
  player_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scene_id           TEXT NOT NULL REFERENCES public.bushveld_scenes(id) ON DELETE CASCADE,
  kagiso             INT  NOT NULL DEFAULT 6,         -- starting value = settled
  kagiso_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, scene_id)
);

-- ------------------------------------------------- per-player hotspot state
CREATE TABLE IF NOT EXISTS public.player_hotspot_state (
  player_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotspot_id         TEXT NOT NULL REFERENCES public.bushveld_hotspots(id) ON DELETE CASCADE,
  last_collected_at  TIMESTAMPTZ,                     -- NULL = never tapped
  PRIMARY KEY (player_id, hotspot_id)
);

-- ------------------------------------------------------- Daily Sparkle
-- Exactly one row per date = exactly one sparkling hotspot per day (04 §8).
CREATE TABLE IF NOT EXISTS public.daily_sparkle (
  sparkle_date  DATE PRIMARY KEY,
  hotspot_id    TEXT NOT NULL REFERENCES public.bushveld_hotspots(id) ON DELETE CASCADE
);

-- --------------------------------------------------------- indexes
CREATE INDEX IF NOT EXISTS idx_hotspots_scene ON public.bushveld_hotspots (scene_id);

-- --------------------------------------------------------- RLS
ALTER TABLE public.player_scene_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_hotspot_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bushveld_scene_owner ON public.player_scene_state;
CREATE POLICY bushveld_scene_owner ON public.player_scene_state
  FOR ALL USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS bushveld_hotspot_owner ON public.player_hotspot_state;
CREATE POLICY bushveld_hotspot_owner ON public.player_hotspot_state
  FOR ALL USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);

-- ============================================================ SEED (config-generated)
INSERT INTO public.bushveld_scenes
  (id, name, background_asset_key, kagiso_max, kagiso_regen_minutes, unlock_condition, restoration_asset_keys, restoration_thresholds)
VALUES
  ('open_bush', 'Open Bush', 'backgrounds/open_bush_stage_0.png', 6, 240, NULL, '["backgrounds/open_bush_stage_0.png","backgrounds/open_bush_stage_1.png","backgrounds/open_bush_stage_2.png","backgrounds/open_bush_stage_3.png"]'::jsonb, '[0.4,0.7,1]'::jsonb),
  ('riverbank', 'Riverbank', 'backgrounds/riverbank_stage_0.png', 6, 240, NULL, '["backgrounds/riverbank_stage_0.png","backgrounds/riverbank_stage_1.png","backgrounds/riverbank_stage_2.png","backgrounds/riverbank_stage_3.png"]'::jsonb, '[0.4,0.7,1]'::jsonb),
  ('rocky_outcrop', 'Rocky Outcrop', 'backgrounds/rocky_outcrop_stage_0.png', 6, 240, NULL, '["backgrounds/rocky_outcrop_stage_0.png","backgrounds/rocky_outcrop_stage_1.png","backgrounds/rocky_outcrop_stage_2.png","backgrounds/rocky_outcrop_stage_3.png"]'::jsonb, '[0.4,0.7,1]'::jsonb),
  ('deep_bushveld', 'Deep Bushveld', '', 6, 240, '{"botho_gte":300}', '[]'::jsonb, '[0.4,0.7,1]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  background_asset_key = EXCLUDED.background_asset_key,
  kagiso_max = EXCLUDED.kagiso_max,
  kagiso_regen_minutes = EXCLUDED.kagiso_regen_minutes,
  unlock_condition = EXCLUDED.unlock_condition,
  restoration_asset_keys = EXCLUDED.restoration_asset_keys,
  restoration_thresholds = EXCLUDED.restoration_thresholds;

INSERT INTO public.bushveld_hotspots
  (id, scene_id, x, y, sprite_key, kagiso_cost, rest_minutes, active_months)
VALUES
  ('ob_deadfall', 'open_bush', 24, 62, 'sprites/hotspots/open_bush_deadfall.png', 1, 60, NULL),
  ('ob_setlhare_sa_phane', 'open_bush', 68, 48, 'sprites/hotspots/open_bush_deadfall.png', 2, 60, '{4,12}'),
  ('ob_tracks', 'open_bush', 42, 78, 'sprites/hotspots/open_bush_tracks.png', 1, 60, NULL),
  ('ob_tracks_heavy', 'open_bush', 80, 70, 'sprites/hotspots/open_bush_tracks.png', 2, 60, NULL),
  ('ob_feather', 'open_bush', 56, 34, 'sprites/hotspots/open_bush_feather.png', 1, 60, NULL),
  ('ob_feather_dark', 'open_bush', 16, 28, 'sprites/hotspots/open_bush_feather.png', 2, 60, NULL),
  ('rv_clay', 'riverbank', 30, 66, 'sprites/hotspots/riverbank_clay.png', 1, 60, NULL),
  ('rv_palm', 'riverbank', 62, 44, 'sprites/hotspots/riverbank_palm.png', 1, 60, NULL),
  ('rv_reeds', 'riverbank', 78, 74, 'sprites/hotspots/riverbank_reeds.png', 1, 60, NULL),
  ('rv_ripple', 'riverbank', 46, 82, 'sprites/hotspots/riverbank_ripple.png', 1, 60, NULL),
  ('rv_ripple_bright', 'riverbank', 20, 52, 'sprites/hotspots/riverbank_ripple.png', 2, 60, NULL),
  ('rv_mud_tracks', 'riverbank', 68, 88, 'sprites/hotspots/riverbank_mud_tracks.png', 2, 60, NULL),
  ('rv_morula', 'riverbank', 86, 30, 'sprites/hotspots/riverbank_morula_tree.png', 2, 60, NULL),
  ('ro_glint', 'rocky_outcrop', 34, 70, 'sprites/hotspots/rocky_outcrop_glint.png', 1, 60, NULL),
  ('ro_quartz', 'rocky_outcrop', 72, 40, 'sprites/hotspots/rocky_outcrop_glint.png', 2, 60, NULL),
  ('ro_crevice', 'rocky_outcrop', 22, 44, 'sprites/hotspots/rocky_outcrop_crevice.png', 1, 60, NULL),
  ('ro_leopard', 'rocky_outcrop', 58, 84, 'sprites/hotspots/rocky_outcrop_crevice.png', 2, 60, NULL),
  ('ro_perch', 'rocky_outcrop', 82, 18, 'sprites/hotspots/rocky_outcrop_perch.png', 2, 60, NULL),
  ('ro_aloe', 'rocky_outcrop', 46, 58, 'sprites/hotspots/rocky_outcrop_aloe.png', 1, 60, NULL)
ON CONFLICT (id) DO UPDATE SET
  scene_id = EXCLUDED.scene_id,
  x = EXCLUDED.x,
  y = EXCLUDED.y,
  sprite_key = EXCLUDED.sprite_key,
  kagiso_cost = EXCLUDED.kagiso_cost,
  rest_minutes = EXCLUDED.rest_minutes,
  active_months = EXCLUDED.active_months;
