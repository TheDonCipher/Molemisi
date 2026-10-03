-- ============================================================================
-- LEGAL CONTROL I4 / H1 — the Botho daily cap must survive concurrency
--
-- THE HOLE
--   WalletService.creditBothoCapped() reads `bothoEarnedToday()`, computes the
--   remainder in Node, then calls wallet_apply(). Two simultaneous manual acts
--   (a project donation, a Village Feast, and a charge turn-in are three
--   different endpoints) all read a PRE-cap total and all award. The 50/day cap
--   is a compliance control that gates a real-money prize, so "fail open under
--   concurrency" is not acceptable — the existing comment conceded it.
--
-- THE FIX
--   Move the sum-and-cap into Postgres, inside one transaction that takes a
--   row lock on the wallet first (`FOR UPDATE`). Concurrent callers serialise on
--   that lock; the second one re-reads the post-award ledger and sees the cap
--   already consumed.
--
--   The cap and the award arithmetic are passed in from game-config
--   (BOTHO_DAILY_CAP) so the number is still single-sourced in TypeScript —
--   the DB does not restate it.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.botho_credit_capped(
  p_player_id  UUID,
  p_requested  INT,
  p_source     TEXT,
  p_ref_id     UUID        DEFAULT NULL,
  p_day_start  TIMESTAMPTZ DEFAULT NULL,
  p_cap        INT         DEFAULT 50
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earned NUMERIC(12,2);
  v_award  INT;
BEGIN
  IF p_player_id IS NULL THEN
    RAISE EXCEPTION 'botho_credit_capped: player_id is required';
  END IF;
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;
  IF p_day_start IS NULL THEN
    RAISE EXCEPTION 'botho_credit_capped: p_day_start is required';
  END IF;
  IF p_cap IS NULL OR p_cap < 0 THEN
    RAISE EXCEPTION 'botho_credit_capped: invalid cap %', p_cap;
  END IF;

  -- The wallet row is the serialisation point for this player's Botho. Any
  -- concurrent capped credit blocks here until the other transaction commits,
  -- so the ledger sum below is read AFTER the previous award.
  INSERT INTO public.player_wallets (player_id) VALUES (p_player_id)
    ON CONFLICT (player_id) DO NOTHING;

  PERFORM 1 FROM public.player_wallets WHERE player_id = p_player_id FOR UPDATE;

  -- Only POSITIVE Botho ledger rows count toward the cap (spends must not
  -- hand back headroom).
  SELECT COALESCE(SUM(amount), 0)
    INTO v_earned
    FROM public.ledger_entries
   WHERE player_id  = p_player_id
     AND currency   = 'botho'
     AND amount     > 0
     AND created_at >= p_day_start;

  v_award := LEAST(p_requested, GREATEST(0, FLOOR(p_cap - v_earned)::INT));

  IF v_award <= 0 THEN
    RETURN 0;
  END IF;

  PERFORM public.wallet_apply(p_player_id, 'botho', v_award, p_source, p_ref_id);
  RETURN v_award;
END;
$$;

COMMENT ON FUNCTION public.botho_credit_capped IS
  'I4/H1 — the only sanctioned act-earned Botho credit. Sum, cap and award are '
  'one transaction behind a wallet row lock, so the 50/day cap holds under '
  'concurrency. p_cap comes from BOTHO_DAILY_CAP in game-config.';

REVOKE EXECUTE ON FUNCTION public.botho_credit_capped(uuid, int, text, uuid, timestamptz, int)
  FROM PUBLIC, anon, authenticated;

COMMIT;