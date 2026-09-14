-- ============================================
-- P4 — server-authoritative crop growth + Jojo-tank water gate
-- (03 §1.1, §1.2; 05 §P4). Replaces the 12-minute placeholder planted by the P3
-- migration with real hour-based growth that only advances while the Jojo tank has
-- water. An empty tank HALTS growth; it never kills a crop. Refilling resumes from
-- the stored progress.
-- ============================================

-- 1. The Jojo tank's current water level lives on the water_source building.
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS water_level REAL NOT NULL DEFAULT 0;

-- 2. Per-crop growth progress (hours of growth credit accumulated) + the last tick
--    we advanced it. `growth_stage` / `expected_ready_at` remain as derived display
--    values; the authoritative "is it ready" test is growth_progress_hours >= growthHours.
ALTER TABLE public.crop_instances
  ADD COLUMN IF NOT EXISTS growth_progress_hours REAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_growth_tick_at TIMESTAMPTZ;

-- 3. Every farm gets exactly one Jojo Tank (water_source), ACTIVE and full. Without
--    this, a brand-new player (STARTING_PULA = 250) cannot afford the 800-Pula build
--    cost and would be hard-softlocked on farming — the tank is the water mechanic,
--    so it exists from day one; maintenance is the ongoing cost.
INSERT INTO public.buildings (
  farm_id, building_type, level, state, capacity, wear, water_level, last_maintained_at
)
SELECT f.id, 'water_source', 1, 'ACTIVE', 60, 0, 60, NOW()
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1 FROM public.buildings b
  WHERE b.farm_id = f.id AND b.building_type = 'water_source'
);

-- 4. Existing crops start their growth clock at planting time so they don't all
--    instantly jump to READY on the first P4 tick.
UPDATE public.crop_instances
SET last_growth_tick_at = planted_at
WHERE last_growth_tick_at IS NULL;

-- 5. Replace the P3 placeholder (12 minutes) with real hour-based growth. The crop's
--    growthHours now comes from the caller (game-config, the single source of truth)
--    rather than being hard-coded in SQL.
CREATE OR REPLACE FUNCTION public.plant_crop_transaction(
  p_farm_id UUID,
  p_plot_id UUID,
  p_crop_type VARCHAR,
  p_user_id UUID,
  p_growth_hours NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plot RECORD;
  v_seed RECORD;
  v_crop_id UUID;
  v_player_id UUID;
  v_seed_slug VARCHAR;
  v_now TIMESTAMPTZ := NOW();
  v_expected_ready TIMESTAMPTZ;
BEGIN
  -- 1. Resolve the player that owns this farm (one farm per player).
  SELECT user_id INTO v_player_id FROM public.farms WHERE id = p_farm_id;
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Farm not found';
  END IF;

  -- 2. Verify plot ownership and state.
  SELECT fp.* INTO v_plot
  FROM public.farm_plots fp
  WHERE fp.id = p_plot_id
    AND fp.farm_id = p_farm_id
    AND fp.farm_id IN (SELECT id FROM public.farms WHERE user_id = p_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plot not found';
  END IF;

  IF v_plot.state != 'EMPTY' THEN
    RAISE EXCEPTION 'Plot is not empty';
  END IF;

  -- 3. Check the seed exists in the canonical store (player_inventory).
  v_seed_slug := p_crop_type || '_seed';
  SELECT pi.* INTO v_seed
  FROM public.player_inventory pi
  JOIN public.item_definitions id ON id.id = pi.item_def_id
  WHERE pi.player_id = v_player_id
    AND id.slug = v_seed_slug
    AND pi.quantity > 0
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seed not found in inventory';
  END IF;

  -- 4. Real hour-based growth timer (P4). p_growth_hours is the crop's growthHours
  --    from game-config. The tank gate is enforced by the growth engine on read, not
  --    here — this only records the nominal "full tank" estimate for display.
  v_expected_ready := v_now + (p_growth_hours || ' hours')::interval;

  -- 5. All validations passed - execute the transaction.
  UPDATE public.farm_plots
  SET state = 'PLANTED', updated_at = v_now
  WHERE id = p_plot_id;

  INSERT INTO public.crop_instances (
    id, plot_id, farm_id, crop_type, growth_stage, max_growth_stages,
    hydration, health, planted_at, last_watered_at, last_growth_tick_at,
    growth_progress_hours, expected_ready_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_plot_id, p_farm_id, p_crop_type, 0, 4,
    0.5, 1.0, v_now, v_now, v_now, 0.0, v_expected_ready,
    v_now, v_now
  ) RETURNING id INTO v_crop_id;

  -- 6. Deduct one seed from player_inventory; remove the row at zero.
  UPDATE public.player_inventory
  SET quantity = quantity - 1, updated_at = v_now
  WHERE id = v_seed.id;

  DELETE FROM public.player_inventory WHERE id = v_seed.id AND quantity <= 0;

  RETURN jsonb_build_object(
    'success', true,
    'crop_id', v_crop_id,
    'plot_id', p_plot_id,
    'crop_type', p_crop_type,
    'state', 'PLANTED'
  );
END;
$$;
