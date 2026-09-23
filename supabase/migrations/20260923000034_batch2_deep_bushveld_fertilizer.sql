-- ============================================
-- 00034 — batch 2 (G1/G5/G6/G7): hardwood, fertilizer window, new hotspots
-- ============================================
-- Companion to the game-config + API batch-2 gap fixes:
--   G5  `hardwood` item (Deep Bushveld signature find) + Deep Bushveld hotspots
--   G7  riverbank `rv_driftwood` (wood's second scene)
--   G1  `crop_instances.fertilized_until_stage` — the stage window the fertilize
--       endpoint arms and `advanceFarmGrowth` enforces (the fertilizer_active /
--       fertilizer_bonus columns already existed since the initial schema).
-- Idempotent: safe to re-run.

-- -------------------------------------------- G5: the hardwood item
INSERT INTO public.item_definitions
  (slug, name, setswana, category, base_value_pula, max_stack, is_tool, use_text, sprite)
VALUES
  ('hardwood', 'Hardwood', 'Dikgong tse Diropa', 'DITSHIMOLOGO TSA NAGENG', 8, 50, false,
   'Go rekisa. Dense deep-bush timber — the Co-op pays well.', 'ui/items/material_wood.png')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  setswana = EXCLUDED.setswana,
  category = EXCLUDED.category,
  base_value_pula = EXCLUDED.base_value_pula,
  max_stack = EXCLUDED.max_stack,
  is_tool = EXCLUDED.is_tool,
  use_text = EXCLUDED.use_text,
  sprite = EXCLUDED.sprite;

-- -------------------------------------------- G1: the fertilize stage window
ALTER TABLE public.crop_instances
  ADD COLUMN IF NOT EXISTS fertilized_until_stage INTEGER;

-- -------------------------------------------- G5/G7: hotspot rows
-- The API serves hotspots from game-config (config is the authority); the
-- seeded table keeps parity with p6, including sprite/position for the client.
-- Sprites reuse existing art until dedicated Deep Bushveld / driftwood art lands.
INSERT INTO public.bushveld_hotspots
  (id, scene_id, x, y, sprite_key, kagiso_cost, rest_minutes, active_months)
VALUES
  ('rv_driftwood', 'riverbank', 10, 70, 'sprites/hotspots/open_bush_deadfall.png', 1, 60, NULL),
  ('db_deadfall', 'deep_bushveld', 24, 62, 'sprites/hotspots/open_bush_deadfall.png', 1, 60, NULL),
  ('db_heartwood', 'deep_bushveld', 60, 40, 'sprites/hotspots/open_bush_deadfall.png', 1, 60, NULL),
  ('db_kopje', 'deep_bushveld', 36, 72, 'sprites/hotspots/rocky_outcrop_glint.png', 1, 60, NULL),
  ('db_spoor', 'deep_bushveld', 78, 58, 'sprites/hotspots/open_bush_tracks.png', 2, 60, NULL)
ON CONFLICT (id) DO UPDATE SET
  scene_id = EXCLUDED.scene_id,
  x = EXCLUDED.x,
  y = EXCLUDED.y,
  sprite_key = EXCLUDED.sprite_key,
  kagiso_cost = EXCLUDED.kagiso_cost,
  rest_minutes = EXCLUDED.rest_minutes,
  active_months = EXCLUDED.active_months;