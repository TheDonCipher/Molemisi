-- ============================================================================
-- A1 — Chapter Token spending is atomic, and 'chapter_token' is a real currency
--
-- THE BUG (two of them, and they compounded)
--   1. `ledger_entries.currency` is `CHECK (currency IS NULL OR currency IN
--      ('pula','botho','madi'))` (20260908000016). `ChapterService.spendTokens`
--      wrote `currency: 'chapter_token'`, so the ledger INSERT was rejected by
--      Postgres with SQLSTATE 23514 (check_violation) EVERY SINGLE TIME.
--   2. The service decremented `player_chapter_state.chapter_tokens` FIRST and
--      wrote the ledger SECOND. Because the ledger write always failed, every
--      souvenir purchase DESTROYED 25 stamps and granted nothing — and because
--      the two writes were separate round trips, any other failure between them
--      destroyed the stamps silently too.
--
-- THE FIX
--   a. Widen the CHECK to include 'chapter_token'. The column is deliberately
--      NULLable and un-enumerated (the file header of 20260908000016 §0.3) for
--      exactly this reason; this migration is that foresight being spent.
--   b. `spend_chapter_tokens()` does the decrement AND the ledger row in ONE
--      transaction, with a conditional UPDATE (`... AND chapter_tokens >= p_amount`)
--      so a zero-row result RAISES instead of leaving a partial state. Same shape
--      as `inventory_take` (20261002000002) and `wallet_apply` (20260908000016):
--      the database arbitrates, not the application.
--
-- WHY THE PURPOSE IS NOT IN `ref_id`
--   `ledger_entries.ref_id` is a UUID and a souvenir SKU ('season_souvenir') is
--   not one, so the old code could not have stored it there even if the INSERT
--   had worked. The SKU goes into a JSONB `metadata` bag instead, which keeps
--   the audit trail complete without lying about the column's type.
--
-- DEPENDENCY NOTE
--   `ChapterService.spendTokens` calls this function unconditionally. Until this
--   migration is applied the RPC does not exist and every souvenir purchase
--   fails loudly with "spend_chapter_tokens not found" — which is the correct
--   failure: a loud refusal, not a silent stamp incinerator.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 3. The one sanctioned way to spend Chapter Tokens
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_chapter_tokens(
  p_player_id UUID,
  p_chapter_id UUID,
  p_amount    INT,
  p_purpose   TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INT;
BEGIN
  IF p_player_id IS NULL OR p_chapter_id IS NULL THEN
    RAISE EXCEPTION 'spend_chapter_tokens: player_id and chapter_id are required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'spend_chapter_tokens: amount must be a positive integer (got %)', p_amount;
  END IF;

  -- CONDITIONAL decrement. The `chapter_tokens >= p_amount` predicate is the
  -- whole point: Postgres holds a row lock for the statement, so a concurrent
  -- spend either sees the committed remainder or matches zero rows. The old
  -- service computed `have - amount` in JS and wrote the absolute result, which
  -- is the same TOCTOU that `inventory_take` was written to kill.
  UPDATE public.player_chapter_state
     SET chapter_tokens = chapter_tokens - p_amount
   WHERE player_id      = p_player_id
     AND chapter_id     = p_chapter_id
     AND chapter_tokens >= p_amount
  RETURNING chapter_tokens INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'spend_chapter_tokens: insufficient Chapter Tokens (player %, chapter %, amount %)',
      p_player_id, p_chapter_id, p_amount;
  END IF;

  -- Audit row in the SAME transaction. If this INSERT fails for ANY reason the
  -- function rolls back and the stamps are never taken — which is the exact
  -- failure the old two-step code turned into guaranteed data loss.
  INSERT INTO public.ledger_entries
    (player_id, currency, amount, balance_after, source, ref_id, metadata)
  VALUES
    (p_player_id, 'chapter_token', -p_amount, v_remaining, 'chapter_spend', NULL,
     jsonb_build_object('chapter_id', p_chapter_id, 'purpose', p_purpose));

  RETURN v_remaining;
END;
$$;

COMMENT ON FUNCTION public.spend_chapter_tokens(UUID, UUID, INT, TEXT) IS
  'A1 — the only sanctioned way to spend Chapter Tokens. Decrements atomically '
  'with WHERE chapter_tokens >= p_amount and writes the audit row in the same '
  'transaction. Returns the remaining balance, or raises.';

-- Only the service role (ChapterService) may call it; never a client.
REVOKE EXECUTE ON FUNCTION public.spend_chapter_tokens(UUID, UUID, INT, TEXT)
  FROM PUBLIC, anon, authenticated;

COMMIT;

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Widen the currency CHECK
-- ----------------------------------------------------------------------------
ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_currency_check;

ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_currency_check
  CHECK (currency IS NULL OR currency IN ('pula', 'botho', 'madi', 'chapter_token'));

COMMENT ON CONSTRAINT ledger_entries_currency_check ON public.ledger_entries IS
  'A1 — ''chapter_token'' added 2026-10-03. A NON-monetary cosmetic currency '
  '(02 §3.3: never convertible to Madi, never withdrawable), ledgered for audit '
  'only and deliberately NOT accepted by wallet_apply().';

-- ----------------------------------------------------------------------------
-- 2. A JSONB bag on the ledger so a non-UUID reference can still be recorded
-- ----------------------------------------------------------------------------
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN public.ledger_entries.metadata IS
  'Free-form context for rows whose `ref_id` (UUID) cannot express the reference '
  '— e.g. a chapter-souvenir SKU.';
