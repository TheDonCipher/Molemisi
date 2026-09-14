-- ============================================================================
-- P2 hardening — Pula must never go negative
--
-- Discovered during the Kgotla→wallet cutover. `wallet_apply()` guarded Botho
-- against going negative but left Pula unbounded, so a spend larger than the
-- balance would drive it negative and effectively mint Pula. Because every balance
-- movement — including wallet.spendPula — goes through wallet_apply(), this
-- function is the single correct chokepoint for the floor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wallet_apply(
  p_player_id UUID,
  p_currency  TEXT,
  p_amount    NUMERIC(12,2),
  p_source    TEXT,
  p_ref_id    UUID DEFAULT NULL
) RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12,2);
  v_have    NUMERIC(12,2);
BEGIN
  IF p_player_id IS NULL THEN
    RAISE EXCEPTION 'wallet_apply: player_id is required';
  END IF;

  IF p_currency IS NULL OR p_currency NOT IN ('pula', 'botho') THEN
    RAISE EXCEPTION 'wallet_apply: unsupported currency %', p_currency;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'wallet_apply: amount must be non-zero (got %)', p_amount;
  END IF;

  -- A wallet row always exists before we touch it.
  INSERT INTO public.player_wallets (player_id)
  VALUES (p_player_id)
  ON CONFLICT (player_id) DO NOTHING;

  IF p_currency = 'pula' THEN
    UPDATE public.player_wallets
       SET pula_balance = pula_balance + p_amount,
           updated_at   = NOW()
     WHERE player_id = p_player_id
    RETURNING pula_balance INTO v_balance;

    -- Pula gates real-money top-ups and, in v1.1, the withdrawable Madi. A negative
    -- balance is an accounting error we could not explain and an exploit surface.
    IF v_balance < 0 THEN
      v_have := v_balance - p_amount;
      RAISE EXCEPTION 'wallet_apply: insufficient Pula (player %, requested %, have %)',
        p_player_id, p_amount, v_have;
    END IF;

  ELSE -- 'botho'
    UPDATE public.player_wallets
       SET botho_points = botho_points + p_amount::INT,
           updated_at   = NOW()
     WHERE player_id = p_player_id
    RETURNING botho_points INTO v_balance;

    -- Botho can never go negative: it gates a real-money prize (I4), and a
    -- negative standing would be an accounting error we could not explain.
    IF v_balance < 0 THEN
      RAISE EXCEPTION 'wallet_apply: botho would go negative (player %, amount %)',
        p_player_id, p_amount;
    END IF;
  END IF;

  INSERT INTO public.ledger_entries
    (player_id, currency, amount, balance_after, source, ref_id)
  VALUES
    (p_player_id, p_currency, p_amount, v_balance, p_source, p_ref_id);

  RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION public.wallet_apply IS
  'The only sanctioned way to move a balance. One player per call, by design. Pula and Botho both floored at 0.';
