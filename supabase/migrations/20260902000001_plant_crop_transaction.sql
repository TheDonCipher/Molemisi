-- ============================================
-- PLANT CROP TRANSACTION
-- Wraps multi-step planting in a single transaction
-- ============================================

CREATE OR REPLACE FUNCTION public.plant_crop_transaction(
  p_farm_id UUID,
  p_plot_id UUID,
  p_crop_type VARCHAR,
  p_seed_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plot RECORD;
  v_seed RECORD;
  v_crop_config RECORD;
  v_crop_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_expected_ready TIMESTAMPTZ;
BEGIN
  -- 1. Verify plot ownership and state
  SELECT fp.* INTO v_plot
  FROM public.farm_plots fp
  JOIN public.farms f ON f.id = fp.farm_id
  WHERE fp.id = p_plot_id
    AND fp.farm_id = p_farm_id
    AND f.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plot not found';
  END IF;

  IF v_plot.state != 'EMPTY' THEN
    RAISE EXCEPTION 'Plot is not empty';
  END IF;

  -- 2. Check seed exists in inventory
  SELECT * INTO v_seed
  FROM public.inventory
  WHERE id = p_seed_id
    AND farm_id = p_farm_id
    AND item_type = p_crop_type || '_seed'
    AND quantity > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seed not found in inventory';
  END IF;

  -- 3. Calculate expected ready time (simplified - no crop_config lookup needed)
  -- We use a default of 12 minutes (4 stages * 3 min) for sorghum
  v_expected_ready := v_now + INTERVAL '12 minutes';

  -- 4. All validations passed - execute transaction
  -- Update plot state
  UPDATE public.farm_plots
  SET state = 'PLANTED', updated_at = v_now
  WHERE id = p_plot_id;

  -- Create crop instance
  v_crop_id := gen_random_uuid();
  INSERT INTO public.crop_instances (
    id, plot_id, farm_id, crop_type, growth_stage, max_growth_stages,
    hydration, health, planted_at, last_watered_at, expected_ready_at,
    created_at, updated_at
  ) VALUES (
    v_crop_id, p_plot_id, p_farm_id, p_crop_type, 0, 4,
    0.5, 1.0, v_now, v_now, v_expected_ready,
    v_now, v_now
  );

  -- Deduct seed from inventory
  UPDATE public.inventory
  SET quantity = quantity - 1, updated_at = v_now
  WHERE id = p_seed_id;

  -- Remove inventory entry if quantity reaches 0
  DELETE FROM public.inventory
  WHERE id = p_seed_id AND quantity <= 0;

  -- Record ledger entry
  INSERT INTO public.game_ledger_entries (
    farm_id, entry_type, currency_change, currency_balance_after,
    item_type, item_quantity_change, description, created_at
  ) VALUES (
    p_farm_id, 'SEED_PURCHASE', 0, 0,
    p_crop_type || '_seed', -1, 'Planted ' || p_crop_type, v_now
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'crop_id', v_crop_id,
    'plot_id', p_plot_id,
    'crop_type', p_crop_type,
    'state', 'PLANTED'
  );
END;
$$;
