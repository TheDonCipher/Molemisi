-- ============================================================================
-- P2 cutover — make profiles.currency a read-only mirror of the wallet
-- Source: docs/MVP/05_Implementation_Plan.md §P2 ("migrate whatever currently
--         holds Pula ... in one pass")
--
-- WHY THIS EXISTS
--   Eight services currently read and write `profiles.currency` directly. Rewriting
--   all of them in one commit is the right destination but a bad first step: any
--   site I miss would silently diverge from the wallet, and the divergence would
--   look like a balance bug rather than a migration bug.
--
--   So: `profiles.currency` becomes a MIRROR.
--     - Reads keep working exactly as before, everywhere, with no code change.
--       That means the cutover can happen service by service, in separate commits,
--       with the app running correctly the whole way.
--     - Writes are blocked. A direct `UPDATE profiles SET currency = ...` now
--       raises. Every un-migrated call site becomes a loud, immediate, greppable
--       failure instead of a quiet corruption, so the migration finishes itself.
--
--   The only permitted writer is the sync trigger below, which fires when the
--   wallet changes. One direction, one source of truth.
--
--   WHEN THE CUTOVER IS DONE: drop `profiles.currency` and delete this file's
--   objects. Do not leave the mirror in place permanently — a mirror that nobody
--   is migrating off is just a second source of truth with extra steps.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Mirror: wallet -> profiles.currency
--
--    Fires on insert and update so the mirror is correct from the moment a wallet
--    exists. ROUNDs because `profiles.currency` is INTEGER while the wallet is
--    NUMERIC(12,2); see the deviation note in 20260908000016.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_legacy_currency_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Signal to the guard that this write is the sanctioned one. `true` = local to
  -- the current transaction, so it cannot leak across pooled connections.
  PERFORM set_config('molemisi.currency_sync', '1', true);

  UPDATE public.profiles
     SET currency = ROUND(NEW.pula_balance)::INT
   WHERE id = NEW.player_id;

  PERFORM set_config('molemisi.currency_sync', '', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_sync_legacy_currency ON public.player_wallets;
CREATE TRIGGER trg_wallet_sync_legacy_currency
  AFTER INSERT OR UPDATE OF pula_balance ON public.player_wallets
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_currency_mirror();

-- ----------------------------------------------------------------------------
-- 2. Guard: nothing writes the mirror directly
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_legacy_currency_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency
     AND COALESCE(current_setting('molemisi.currency_sync', true), '') <> '1'
  THEN
    RAISE EXCEPTION
      'profiles.currency is a read-only mirror of player_wallets.pula_balance. '
      'Use wallet_apply(player_id, ''pula'', amount, source) or WalletService instead.'
      USING HINT = 'This exception marks an un-migrated call site. Route it through WalletService.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_currency ON public.profiles;
CREATE TRIGGER trg_profiles_guard_currency
  BEFORE UPDATE OF currency ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_currency_mirror();

-- ----------------------------------------------------------------------------
-- 3. Bring the mirror into agreement right now
--
--    The backfill in 016 copied profiles -> wallets, but any profile created or
--    changed since then is not reflected. This makes the mirror correct for every
--    existing row before the guard starts mattering.
-- ----------------------------------------------------------------------------
UPDATE public.profiles p
   SET currency = ROUND(w.pula_balance)::INT
  FROM public.player_wallets w
 WHERE w.player_id = p.id
   AND p.currency IS DISTINCT FROM ROUND(w.pula_balance)::INT;

-- ----------------------------------------------------------------------------
-- 4. A view for finding what is left to migrate
--
--    Any row here is a wallet with no matching profile balance, i.e. a place the
--    mirror and the truth disagree. Should be empty at all times.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_wallet_mirror_drift AS
SELECT w.player_id,
       w.pula_balance                    AS wallet_pula,
       p.currency                        AS mirror_pula,
       w.pula_balance - p.currency::NUMERIC AS drift
  FROM public.player_wallets w
  JOIN public.profiles p ON p.id = w.player_id
 WHERE w.pula_balance <> p.currency::NUMERIC;

COMMENT ON VIEW public.v_wallet_mirror_drift IS
  'Should always be empty. Any row means the legacy mirror and the wallet disagree.';

COMMIT;
