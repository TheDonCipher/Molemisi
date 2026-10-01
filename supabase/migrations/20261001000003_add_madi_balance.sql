-- ============================================================================
-- docs/34 Wave 2 — the Madi balance.
--
-- DECIDED 2026-10-01 (docs/33 §2): Pula is EARNED-ONLY and never sold
-- (MVP/02 §3.1). Real money buys MADI, which buys decorations and the Village
-- Pass and nothing else. The anti-pay-to-win switch is structural, not a
-- promise: with no Pula<->Madi conversion anywhere, no amount of real money can
-- shorten the land ladder.
--
-- ADDITIVE ONLY. Nothing is dropped and no balance is rewritten.
--
-- Relies on two pieces of foresight already in 20260908000016:
--   * ledger_entries.currency is TEXT with a CHECK that already permitted
--     'madi' (B2, PSP vs self-custody), so the ledger needs no change.
--   * wallet_apply() takes the currency as TEXT, so it can be taught a third
--     value without a signature change.
--
-- NOTE ON wallet_apply: this replaces 20260908000018_wallet_pula_floor.sql,
-- which added the Pula floor. That floor is preserved verbatim for Pula and
-- Botho and extended to Madi. Do NOT re-issue from 20260908000016 as the base --
-- you would silently drop the floor. (docs/34 §2.1)
-- ============================================================================

ALTER TABLE public.player_wallets
  ADD COLUMN IF NOT EXISTS madi_balance INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'player_wallets_madi_non_negative'
  ) THEN
    ALTER TABLE public.player_wallets
      ADD CONSTRAINT player_wallets_madi_non_negative CHECK (madi_balance >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.player_wallets.madi_balance IS
  'DECIDED 2026-10-01 (docs/33 §2, docs/34 §2). Spend-only premium currency. '
  '1 Madi = BWP 1.00. 1:1 backed by deposits. NEVER converts to Pula, NEVER '
  'withdrawable, NEVER transferred between players. Pula is never sold.';

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
  IF p_currency IS NULL OR p_currency NOT IN ('pula', 'botho', 'madi') THEN
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
       SET pula_balance = pula_balance + p_amount, updated_at = NOW()
     WHERE player_id = p_player_id
    RETURNING pula_balance INTO v_balance;
    -- Pula gates real-money top-ups and, in v1.1, the withdrawable Madi. A
    -- negative balance is an accounting error and an exploit surface.
    IF v_balance < 0 THEN
      v_have := v_balance - p_amount;
      RAISE EXCEPTION 'wallet_apply: insufficient Pula (player %, requested %, have %)',
        p_player_id, p_amount, v_have;
    END IF;

  ELSIF p_currency = 'botho' THEN
    UPDATE public.player_wallets
       SET botho_points = botho_points + p_amount::INT, updated_at = NOW()
     WHERE player_id = p_player_id
    RETURNING botho_points INTO v_balance;
    -- Botho can never go negative: it gates a real-money prize (I4).
    IF v_balance < 0 THEN
      RAISE EXCEPTION 'wallet_apply: botho would go negative (player %, amount %)',
        p_player_id, p_amount;
    END IF;

  ELSE -- 'madi'
    UPDATE public.player_wallets
       SET madi_balance = madi_balance + p_amount::INT, updated_at = NOW()
     WHERE player_id = p_player_id
    RETURNING madi_balance INTO v_balance;
    -- Madi is 1:1 backed by deposits, so a negative balance would mean the house
    -- owes a currency it never received money for. There is no drawdown path in
    -- v1, so this should be unreachable -- which is why it is enforced here
    -- rather than left to the caller.
    IF v_balance < 0 THEN
      RAISE EXCEPTION 'wallet_apply: insufficient Madi (player %, requested %, have %)',
        p_player_id, p_amount, (v_balance - p_amount);
    END IF;
  END IF;

  INSERT INTO public.ledger_entries
    (player_id, currency, amount, balance_after, source, ref_id)
  VALUES (p_player_id, p_currency, p_amount, v_balance, p_source, p_ref_id);

  RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION public.wallet_apply IS
  'The only sanctioned way to move a balance. One player per call, by design. '
  'Pula, Botho and Madi all floored at 0. Madi is spend-only (docs/33 §2).';

-- The guard rail, stated as data: there is deliberately NO conversion helper
-- here. The absence is the feature. money -> Madi -> (nothing). Adding a
-- madi_to_pula() later would silently re-open pay-to-progress, so it must be a
-- separate, argued migration.
COMMENT ON TABLE public.player_wallets IS
  'One row per player. pula_balance is EARNED-ONLY and never sold (docs/33 §2). '
  'madi_balance is the spend-only premium currency bought with mobile money. '
  'No conversion between them exists, by design.';