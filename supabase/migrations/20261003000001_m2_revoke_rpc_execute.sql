-- ============================================================================
-- M2 — Close the EXECUTE grant on the SECURITY DEFINER money/ledger RPCs
--
-- THE FINDING
--   Postgres grants EXECUTE on a newly created function to PUBLIC by default
--   (the "PUBLIC" pseudo-role). Supabase exposes every function in the `public`
--   schema through PostgREST at POST /rest/v1/rpc/<name>, so any function left
--   executable by PUBLIC is callable by the *anon* key with no authentication
--   at all. Three mutating functions were never revoked:
--
--     public.wallet_apply(UUID,TEXT,NUMERIC,TEXT,UUID)
--         The single writer for player balances. SECURITY DEFINER runs as the
--         migration owner and is therefore NOT bound by the RLS policies on
--         player_wallets (those are SELECT-own-row only — there is no client
--         write policy). Callable by anon this is a direct "credit yourself
--         Pula" primitive: wallet_apply(<any uuid>,'pula',1000000,'gift',NULL).
--         Highest-value REVOKE in this migration set.
--
--     public.plant_crop_transaction(UUID,UUID,VARCHAR,UUID,NUMERIC)
--         SECURITY DEFINER; writes farm_plots + crop_instances and deducts a
--         seed from player_inventory. It does check ownership itself, so the
--         blast radius is smaller than wallet_apply — but "the database
--         arbitrates" is enforced by RLS and function grants, not by the fact
--         that a function happens to validate its arguments.
--
--     public.economy_snapshot_prices()
--         SECURITY DEFINER writer for economy_price_snapshots. Snapshots are an
--         INPUT to the economy simulator; an anon client able to append and
--         prune them corrupts the inflation history every tuning decision is
--         based on. Zero arguments, so trivially callable with body `{}`.
--
-- WHY THIS IS SAFE TO APPLY
--   Every sanctioned caller runs on the service-role client:
--     WalletService       -> .rpc('wallet_apply', ...)
--     CropsService        -> .rpc('plant_crop_transaction', ...)
--     EconomyService/sim  -> .rpc('economy_snapshot_prices', ...)
--   service_role bypasses RLS by design and is granted EXECUTE explicitly in
--   §4 below, so revoking PUBLIC does not touch the application path.
--
--   Revoking from `anon` alone would NOT be enough: it would leave every
--   signed-in player (`authenticated`) able to call these. PUBLIC is the grant
--   that has to go.
--
--   PRECEDENT: set_role/set_admin (20260902000015, 20260911000021,
--   20261002000001), inventory_take (20261002000002) and spend_chapter_tokens
--   (20261003000020) are already locked down this way.
--
--   Nothing is dropped or altered here — the functions stay callable by the
--   server; only the client-facing path closes.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. wallet_apply — the one true money writer.
--    The argument list must match the declaration in 20260908000016 EXACTLY
--    (uuid, text, numeric, text, uuid). A mismatched signature is not an error
--    here — REVOKE would silently affect nothing and report success.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.wallet_apply(UUID, TEXT, NUMERIC, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. plant_crop_transaction — the 5-arg form from 20260908000040. The two
--    obsolete overloads were dropped in 20260916000030, so this is the only
--    one left. p_crop_type is VARCHAR and p_growth_hours is unconstrained
--    NUMERIC, hence explicit casts rather than bare `text`/`numeric`.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.plant_crop_transaction(UUID, UUID, VARCHAR, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. economy_snapshot_prices — no arguments.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.economy_snapshot_prices()
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Re-grant to the service role.
--
--    NOT REDUNDANT: revoking from PUBLIC removes the default-privilege EXECUTE
--    from every role that inherited it, and service_role is no exception — it
--    is an ordinary role that merely holds BYPASSRLS. Without this grant the
--    API would start returning `permission denied for function wallet_apply`
--    on the very next purchase, the most expensive possible failure mode for
--    a money migration.
--
--    Guarded on the role existing: replayed against a vanilla Postgres with no
--    Supabase `service_role`, an unguarded GRANT aborts the whole transaction
--    and silently un-applies the three REVOKEs above with it.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.wallet_apply(UUID, TEXT, NUMERIC, TEXT, UUID)
      TO service_role;
    GRANT EXECUTE ON FUNCTION public.plant_crop_transaction(UUID, UUID, VARCHAR, UUID, NUMERIC)
      TO service_role;
    GRANT EXECUTE ON FUNCTION public.economy_snapshot_prices()
      TO service_role;
    RAISE NOTICE 'M2: EXECUTE re-granted to service_role on 3 RPCs.';
  ELSE
    RAISE NOTICE
      'M2: role service_role absent on this server — REVOKEs applied, no re-grant needed.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Make the new posture legible in the catalogue so the next auditor does
--    not have to re-derive it from pg_proc.
-- ----------------------------------------------------------------------------
COMMENT ON FUNCTION public.wallet_apply(UUID, TEXT, NUMERIC, TEXT, UUID) IS
  'M2 — the ONLY writer of player_wallets. SECURITY DEFINER, therefore not bound '
  'by the wallets RLS policies. EXECUTE revoked from PUBLIC/anon/authenticated '
  '2026-10-03; callable only by service_role (WalletService). Never re-grant to '
  'anon — it is an unauthenticated mint primitive.';

COMMENT ON FUNCTION public.plant_crop_transaction(UUID, UUID, VARCHAR, UUID, NUMERIC) IS
  'M2 — plants a crop, deducts the seed from player_inventory and flips the plot '
  'state, atomically. EXECUTE revoked from PUBLIC/anon/authenticated 2026-10-03; '
  'callable only by service_role (CropsService).';

COMMENT ON FUNCTION public.economy_snapshot_prices() IS
  'M2 — appends today''s market_prices to economy_price_snapshots and prunes rows '
  'older than 90 days. EXECUTE revoked from PUBLIC/anon/authenticated 2026-10-03; '
  'callable only by service_role. Snapshot history is an INPUT to the economy '
  'simulator and must not be client-writable.';

COMMIT;