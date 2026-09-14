-- ============================================
-- P3 — plant_crop_transaction now deducts the seed from `player_inventory`
-- (the canonical store introduced in 00019), keyed by item slug, instead of the
-- legacy `public.inventory` table. The seed is identified by slug
-- (crop_type || '_seed'); the old p_seed_id row reference is dropped. The retired
-- game_ledger_entries write is removed — the wallet ledger is the only audit row.
--
-- NOTE: expected_ready_at is still a placeholder (12 min) owned by P4, which
-- installs real hour-based growth. P3 only changes WHERE the seed comes from.
-- ============================================

CREATE OR REPLACE FUNCTION public.plant_crop_transaction(
  p_farm_id UUID,
  p_plot_id UUID,
  p_crop_type VARCHAR,
  p_user_id UUID
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

  -- 3. Check the seed exists in the canonical store.
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

  -- 4. Placeholder growth time — replaced by P4's hour-based timer.
  v_expected_ready := v_now + INTERVAL '12 minutes';

  -- 5. All validations passed - execute the transaction.
  UPDATE public.farm_plots
  SET state = 'PLANTED', updated_at = v_now
  WHERE id = p_plot_id;

  INSERT INTO public.crop_instances (
    id, plot_id, farm_id, crop_type, growth_stage, max_growth_stages,
    hydration, health, planted_at, last_watered_at, expected_ready_at,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_plot_id, p_farm_id, p_crop_type, 0, 4,
    0.5, 1.0, v_now, v_now, v_expected_ready,
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
