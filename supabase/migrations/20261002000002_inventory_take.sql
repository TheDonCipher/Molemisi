-- ============================================================================
-- C3 — atomic inventory removal (security audit 2026-10-02)
--
-- THE BUG
--   `InventoryService.removeItem` read the row, computed `quantity - qty` in JS,
--   then wrote the absolute result back with `.eq('id', ...)` and NO predicate on
--   the current quantity. Two concurrent removals both read the same `quantity`,
--   both computed the same `remaining`, and both wrote it. The items left the bag
--   ONCE while every caller (market sell, contract turn-in, Kgotla turn-in, feast,
--   crafting) credited as though they had left twice. For market sell that is
--   unbounded Pula minting — a classic TOCTOU double-credit.
--
-- THE FIX
--   One SQL function that decrements CONDITIONALLY:
--       UPDATE ... WHERE player_id = ? AND item_def_id = ? AND quantity >= qty
--   Postgres takes a row lock for the duration of the statement, so a second
--   concurrent call re-reads the committed value and either succeeds against the
--   real remainder or matches zero rows. Zero rows = insufficient stock, raised as
--   an exception so the caller cannot go on to credit. This mirrors
--   `plant_crop_transaction` and `wallet_apply` — the two other places the codebase
--   already trusts the database, not the application, to arbitrate.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.inventory_take(
  p_player_id   UUID,
  p_item_def_id UUID,
  p_qty         INT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INT;
BEGIN
  IF p_player_id IS NULL OR p_item_def_id IS NULL THEN
    RAISE EXCEPTION 'inventory_take: player_id and item_def_id are required';
  END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'inventory_take: qty must be a positive integer (got %)', p_qty;
  END IF;

  UPDATE public.player_inventory
     SET quantity   = quantity - p_qty,
         updated_at = NOW()
   WHERE player_id   = p_player_id
     AND item_def_id = p_item_def_id
     AND quantity    >= p_qty
  RETURNING quantity INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'inventory_take: insufficient stock (player %, item_def %, qty %)',
      p_player_id, p_item_def_id, p_qty;
  END IF;

  -- Preserve the old delete-on-empty behaviour so the table never accumulates
  -- zero-quantity rows that would consume a storage slot.
  IF v_remaining = 0 THEN
    DELETE FROM public.player_inventory
     WHERE player_id = p_player_id AND item_def_id = p_item_def_id;
  END IF;

  RETURN v_remaining;
END;
$$;

COMMENT ON FUNCTION public.inventory_take IS
  'C3 — the only sanctioned way to remove player_inventory stock. Decrements atomically with WHERE quantity >= qty and raises on insufficient stock.';

-- Clients may never call it directly; only the service role (InventoryService).
REVOKE EXECUTE ON FUNCTION public.inventory_take(UUID, UUID, INT)
  FROM PUBLIC, anon, authenticated;

COMMIT;
