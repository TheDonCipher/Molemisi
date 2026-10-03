-- ============================================================================
-- SECURITY C3 — atomic inventory consumption (fixes the market-sell TOCTOU)
--
-- THE HOLE
--   InventoryService.removeItem() is read-modify-write in application code:
--       SELECT id, quantity ... ; then
--       UPDATE player_inventory SET quantity = <have - qty> WHERE id = ...
--   The UPDATE carries no `quantity >= qty` predicate, so two concurrent calls
--   both read `have`, both compute the same `remaining`, and both succeed. Only
--   one unit leaves the bag but every caller proceeds to credit Pula.
--   Callers affected: market.sellItem, contracts.completeContract,
--   kgotla.turnInCharge, kgotla.donateVillageFeast, buildings maintenance,
--   crafting consumption.
--
-- THE FIX
--   One SECURITY DEFINER function that performs the check and the decrement in
--   a single statement. `WHERE ... AND quantity >= p_qty` makes the predicate
--   part of the write, so Postgres serialises concurrent callers on the row
--   lock: the loser matches zero rows and raises. This is the same shape as
--   wallet_apply(), which is what makes the wallet safe.
--
-- Also adds a non-negative CHECK (NOT VALID, so it does not fail the migration
-- on pre-existing corrupt rows) — new writes are enforced immediately.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The atomic taker
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inventory_take(
  p_player_id  UUID,
  p_item_def_id UUID,
  p_qty        INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INT;
BEGIN
  IF p_player_id IS NULL THEN
    RAISE EXCEPTION 'inventory_take: player_id is required';
  END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'inventory_take: qty must be positive (got %)', p_qty
      USING ERRCODE = '22023';
  END IF;

  -- The predicate lives INSIDE the UPDATE, so two concurrent takers cannot both
  -- pass a pre-check. Zero rows matched == insufficient stock.
  UPDATE public.player_inventory
     SET quantity   = quantity - p_qty,
         updated_at = NOW()
   WHERE player_id  = p_player_id
     AND item_def_id = p_item_def_id
     AND quantity   >= p_qty
  RETURNING quantity INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_take: insufficient items (player %, need %)',
      p_player_id, p_qty
      USING ERRCODE = '23514';
  END IF;

  -- An emptied stack is deleted, matching the old removeItem() contract, so the
  -- storage-slot count stays honest.
  IF v_remaining <= 0 THEN
    DELETE FROM public.player_inventory
     WHERE player_id = p_player_id AND item_def_id = p_item_def_id AND quantity <= 0;
    v_remaining := 0;
  END IF;

  RETURN v_remaining;
END;
$$;

COMMENT ON FUNCTION public.inventory_take IS
  'C3 — the ONLY sanctioned way to remove items. Check and decrement are one '
  'statement, so concurrent callers cannot double-spend the same stack.';

-- Only the service role may call it (matches set_role / set_admin).
REVOKE EXECUTE ON FUNCTION public.inventory_take(uuid, uuid, int)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Quantity can never go negative
--    NOT VALID: enforced on every new write, but does not abort the migration
--    if pre-existing corrupt rows exist. Run the validation block below after
--    cleaning any rows the anti-cheat sweep reports.
-- ---------------------------------------------------------------------------
ALTER TABLE public.player_inventory
  DROP CONSTRAINT IF EXISTS player_inventory_quantity_nonneg;
ALTER TABLE public.player_inventory
  ADD CONSTRAINT player_inventory_quantity_nonneg CHECK (quantity >= 0) NOT VALID;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.player_inventory
      VALIDATE CONSTRAINT player_inventory_quantity_nonneg;
    RAISE NOTICE 'player_inventory.quantity validated: no negative rows.';
  EXCEPTION WHEN check_violation THEN
    RAISE WARNING
      'player_inventory has negative-quantity rows; constraint left NOT VALID. '
      'Run: SELECT player_id, item_def_id, quantity FROM public.player_inventory '
      'WHERE quantity < 0; and reconcile via inventory_take/top-up before re-running.';
  END;
END $$;

COMMIT;