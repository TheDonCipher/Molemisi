-- ============================================================================
-- SECURITY H4 — the Kgotla pool (3 charges/farm/day) must survive concurrency
--
-- THE HOLE
--   KgotlaService.acceptCharge() counts today's rows in Node and inserts when
--   the count is below KGOTLA_DAILY_CHARGE_POOL. Concurrent accepts to
--   DIFFERENT elders all read a pre-insert count and all insert, oversubscribing
--   the pool. The UNIQUE(farm_id, npc_id, accepted_on) index stops the same
--   elder being served twice, but nothing stops 4+ elders being served in one
--   day. The pool is a deliberate scarcity control (five elders, three
--   charges), so oversubscription is a balance break.
--
-- THE FIX
--   A SERIALISER: one transaction that (1) takes a per-farm-day advisory lock,
--   (2) counts, and (3) inserts or raises. Advisory locks are
--   transaction-scoped (xact), keyed on (farm_id, day), and never touch table
--   locks — so concurrent accepts to the same farm serialise exactly where it
--   matters and nowhere else.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.kgotla_accept_charge(
  p_farm_id     UUID,
  p_user_id     UUID,
  p_npc_id      TEXT,
  p_quest_type  TEXT,
  p_item_slug   TEXT,
  p_target_qty  INT,
  p_accepted_on DATE,
  p_created_at  TIMESTAMPTZ,
  p_pool        INT
) RETURNS public.kgotla_quests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INT;
  v_row  public.kgotla_quests%ROWTYPE;
BEGIN
  IF p_pool IS NULL OR p_pool <= 0 THEN
    RAISE EXCEPTION 'kgotla_accept_charge: invalid pool %', p_pool
      USING ERRCODE = '22023';
  END IF;
  IF p_target_qty IS NULL OR p_target_qty <= 0 THEN
    RAISE EXCEPTION 'kgotla_accept_charge: invalid target qty %', p_target_qty
      USING ERRCODE = '22023';
  END IF;

  -- Serialise per (farm, day). xact-scoped: released automatically at commit or
  -- rollback, so a crashed caller cannot poison later accepts. The two-int
  -- form hashes (farm, day) directly — no bigint folding needed.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_farm_id::text),
    hashtext(p_accepted_on::text)
  );

  SELECT COUNT(*) INTO v_used
    FROM public.kgotla_quests
   WHERE farm_id     = p_farm_id
     AND accepted_on = p_accepted_on;

  IF v_used >= p_pool THEN
    RAISE EXCEPTION 'kgotla_accept_charge: pool exhausted (farm %, day %, used % of %)',
      p_farm_id, p_accepted_on, v_used, p_pool
      USING ERRCODE = 'P0001';
  END IF;

  -- Belt and braces: the UNIQUE(farm_id, npc_id, accepted_on) index would raise
  -- on the duplicate anyway, but failing with a named, catchable message keeps
  -- the API error contract stable instead of leaking a constraint name.
  PERFORM 1
    FROM public.kgotla_quests
   WHERE farm_id     = p_farm_id
     AND npc_id      = p_npc_id
     AND accepted_on = p_accepted_on;
  IF FOUND THEN
    RAISE EXCEPTION 'kgotla_accept_charge: elder already served today (%, %, %)',
      p_farm_id, p_npc_id, p_accepted_on
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.kgotla_quests (
    farm_id, user_id, npc_id, quest_type, item_slug, target_qty,
    status, accepted_on, created_at
  ) VALUES (
    p_farm_id, p_user_id, p_npc_id, p_quest_type, p_item_slug, p_target_qty,
    'active', p_accepted_on, p_created_at
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.kgotla_accept_charge IS
  'H4 — atomic Kgotla charge accept. Count and insert are behind a per-farm-day '
  'advisory lock, so the 3-charges/day pool holds under concurrency.';

REVOKE EXECUTE ON FUNCTION public.kgotla_accept_charge(uuid, uuid, text, text, text, int, date, timestamptz, int)
  FROM PUBLIC, anon, authenticated;

COMMIT;