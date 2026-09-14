-- ============================================================================
-- P2 — Wallet, ledger, server authority
-- Source: docs/MVP/05_Implementation_Plan.md §P2, 02_Economy_And_Currencies.md
--
-- THREE THINGS THIS MIGRATION ESTABLISHES:
--   1. One place a balance lives. `player_wallets` is canonical; `profiles.currency`
--      becomes a legacy mirror and is dropped at the end of P2.
--   2. One way a balance moves. `wallet_apply()` is the ONLY writer. It updates the
--      balance and writes the ledger row in the same transaction, so a balance can
--      never move without a record of why.
--   3. One player per call. `wallet_apply()` takes exactly one player_id. There is
--      no transfer signature, by design — v1 ships closed-loop (D12), so there is
--      no legitimate reason to move value between two players yet. When v1.1 adds
--      the Madi market, that gets its own explicit function and its own audit.
--
-- DEVIATION FROM THE SPEC DDL — READ THIS
--   The plan's DDL says `pula_balance INT`. This migration uses NUMERIC(12,2).
--   Reason: the Co-op takes a 5% tax (02 §4.1). 5% of P15 is P0.50. With an INT
--   column every fractional tax silently truncates, the error always favours the
--   player, and it compounds on every single sale — the economy leaks from day one
--   and no test on the crop table would ever catch it. `ledger_entries.amount` was
--   already NUMERIC(12,2) in the plan, so this makes the two columns agree rather
--   than introducing a new type. Botho stays INT (it is only ever whole points).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. player_wallets — the single source of truth for a player's balances
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_wallets (
  player_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pula_balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  botho_points           INT           NOT NULL DEFAULT 0
    CHECK (botho_points >= 0),
  subscription_status    TEXT          NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'guild')),
  subscription_expires_at TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.player_wallets.botho_points IS
  'R6/C7 — this column is canonical. Any other Botho-shaped column is a bug.';
COMMENT ON COLUMN public.player_wallets.pula_balance IS
  'NUMERIC(12,2), not INT — 5% Co-op tax produces fractional Pula. See file header.';

CREATE INDEX IF NOT EXISTS idx_player_wallets_subscription
  ON public.player_wallets (subscription_status)
  WHERE subscription_status <> 'free';

-- ----------------------------------------------------------------------------
-- 2. ledger_entries — every balance movement, append-only
--
--    §0.3: `currency` is NULLABLE and is not constrained to 'pula'. B2 (PSP vs
--    self-custody) is still open, and when it resolves this table has to absorb a
--    third currency without a migration. The cost of that foresight is one
--    nullable column; the cost of not doing it is a wallet migration under time
--    pressure with real money already in it.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency      TEXT CHECK (currency IS NULL OR currency IN ('pula', 'botho', 'madi')),
  amount        NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  source        TEXT NOT NULL,
  ref_id        UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.ledger_entries.currency IS
  'Nullable by design (§0.3). Never assume ''pula'' is the only row type.';

CREATE INDEX IF NOT EXISTS idx_ledger_player_created
  ON public.ledger_entries (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_source
  ON public.ledger_entries (source);
-- Supports the daily top-up cap (R4) without a table scan.
CREATE INDEX IF NOT EXISTS idx_ledger_topup_recent
  ON public.ledger_entries (player_id, created_at DESC)
  WHERE source = 'topup';

-- ----------------------------------------------------------------------------
-- 3. real_world_transactions — money that entered from outside the game
--
--    `provider_tx_id` is UNIQUE. That single constraint is what makes a replayed
--    webhook credit exactly once, which is P2's done-criterion. Do not drop it to
--    "fix" a duplicate-key error — a duplicate key means the webhook replayed, and
--    the correct response is to return the existing row, not to insert again.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.real_world_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider       TEXT NOT NULL,
  provider_tx_id TEXT NOT NULL UNIQUE,
  amount_bwp     NUMERIC(10,2) NOT NULL CHECK (amount_bwp > 0),
  status         TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  pack_slug      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rwt_player
  ON public.real_world_transactions (player_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. The one writer
--
--    SECURITY DEFINER because clients may never call it directly (RLS below blocks
--    table writes); it is invoked by WalletService with the service-role key, or
--    via a route that resolves the player from the JWT.
--
--    Signature takes ONE player_id. There is deliberately no two-player variant.
-- ----------------------------------------------------------------------------
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
  'The only sanctioned way to move a balance. One player per call, by design.';

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — players read, nobody writes from the client
-- ----------------------------------------------------------------------------
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_world_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_read_own" ON public.player_wallets;
CREATE POLICY "wallet_read_own" ON public.player_wallets
  FOR SELECT USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "ledger_read_own" ON public.ledger_entries;
CREATE POLICY "ledger_read_own" ON public.ledger_entries
  FOR SELECT USING (auth.uid() = player_id);

-- No INSERT/UPDATE/DELETE policy on wallets or ledger: server authority (03 §6).
-- The service role bypasses RLS, which is exactly how WalletService writes.

DROP POLICY IF EXISTS "rwt_read_own" ON public.real_world_transactions;
CREATE POLICY "rwt_read_own" ON public.real_world_transactions
  FOR SELECT USING (auth.uid() = player_id);

-- ----------------------------------------------------------------------------
-- 6. Every new profile gets a wallet, seeded from the spec's starting Pula
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_profile_created_seed_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.player_wallets (player_id, pula_balance, botho_points)
  VALUES (NEW.id, COALESCE(NEW.currency, 250)::NUMERIC(12,2), 0)
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_seed_wallet ON public.profiles;
CREATE TRIGGER trg_profile_seed_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_seed_wallet();

-- ----------------------------------------------------------------------------
-- 7. Backfill existing players from profiles.currency
-- ----------------------------------------------------------------------------
INSERT INTO public.player_wallets (player_id, pula_balance, botho_points)
SELECT p.id, COALESCE(p.currency, 0)::NUMERIC(12,2), 0
FROM public.profiles p
ON CONFLICT (player_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Reconciliation — abort the migration if the numbers do not tie out
--
--    P2 calls this "the highest-blast-radius change in the plan". A migration that
--    silently halves everyone's Pula is worse than a migration that fails loudly,
--    so this raises rather than warns.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_old_total NUMERIC(14,2);
  v_new_total NUMERIC(14,2);
  v_old_rows  INT;
  v_new_rows  INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(currency), 0)
    INTO v_old_rows, v_old_total
    FROM public.profiles;

  SELECT COUNT(*), COALESCE(SUM(pula_balance), 0)
    INTO v_new_rows, v_new_total
    FROM public.player_wallets;

  IF v_old_rows <> v_new_rows THEN
    RAISE EXCEPTION
      'wallet reconciliation failed: % profiles vs % wallets', v_old_rows, v_new_rows;
  END IF;

  IF v_old_total <> v_new_total THEN
    RAISE EXCEPTION
      'wallet reconciliation failed: profiles.currency total % <> player_wallets total %',
      v_old_total, v_new_total;
  END IF;

  RAISE NOTICE
    'wallet backfill reconciled: % players, % Pula total', v_new_rows, v_new_total;
END $$;

COMMIT;
