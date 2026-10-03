-- ============================================================================
-- M6 — Mark the reporting views SECURITY INVOKER
--
-- THE FINDING
--   Seven views in `public` were created with a bare CREATE OR REPLACE VIEW and
--   no `security_invoker` option. Under Postgres defaults a view runs with the
--   privileges of its OWNER, not of the caller. That means:
--
--     1. RLS on the underlying tables is NOT applied through the view. The
--        view executes as the (typically privileged, migration-owning) role and
--        sees every row.
--     2. The caller needs only SELECT on the view itself, which is how PostgREST
--        exposes it — no direct grants on the base tables required.
--
--   Applied to the specific views here, the concrete leak is:
--
--     economy_currency_supply        — SUM(pula_balance), SUM(botho_points),
--                                      wallet_count across EVERY wallet. With
--                                      security_definer (the default) this hands
--                                      any single signed-in player the entire
--                                      economy's money supply and the exact
--                                      number of wallets.
--     economy_wealth_distribution    — mean, p25/p50/p75/p90, MAX(pula) and the
--                                      Gini coefficient of the whole population.
--     economy_transaction_velocity   — per-day, per-currency counts and volume
--                                      plus DISTINCT active player counts.
--     economy_item_price_drift       — the live market price of every item.
--     economy_crop_supply            — a filter over the above.
--     v_wallet_mirror_drift          — joins player_wallets to profiles and
--                                      exposes BOTH the canonical balance and the
--                                      legacy mirror, per player.
--
--   Each of those is an admin/analyst view. MVP/02 and the analytics panel want
--   them visible to staff, and the header comment on 20261001000001 says they
--   exist "so a BI/dashboard tool can read the same numbers". They were simply
--   never fenced off, so `authenticated` got the same read as an admin.
--
-- WHY PG 17 MAKES THIS SAFE TO APPLY UNCONDITIONALLY
--   `security_invoker` on views landed in PostgreSQL 15. The linked project runs
--   17.6.1, so the option is available and no version guard is needed. It is
--   still written idempotently below: the options are re-asserted on every run,
--   so replaying this file on a database where a view was recreated without the
--   option (or where the flag was silently lost) re-fixes it.
--
-- WHAT BREAKS, AND WHY THAT IS THE POINT
--   After this migration those views return only what the caller may already see
--   through the base tables' RLS:
--     - economy_currency_supply / economy_wealth_distribution read
--       player_wallets, whose policy is SELECT-own-row. A player now sees their
--       own wallet, not the population. Correct.
--     - v_wallet_mirror_drift joins profiles, whose policy permits reading
--       profiles. Admins using a service-role client are unaffected (service_role
--       holds BYPASSRLS, so it still sees everything).
--     - The BI/dashboard consumer must use the service role. That is the correct
--       dependency for an analytics view and was already implicit.
--
--   If a staff-facing dashboard currently authenticates as a normal `authenticated`
--   user and relies on these views returning global aggregates, it will start
--   returning that user's own rows instead. That is a deliberate, visible
--   narrowing of access rather than a silent one, and the admin dashboards in
--   apps/api already use the service-role client.
--
-- ALTERNATIVE CONSIDERED AND REJECTED
--   Revoking SELECT on the views from `authenticated` would also close the hole,
--   but it breaks the legitimate own-row read a player has via the base tables and
--   it papers over the real defect: the view was authored without an access model.
--   Setting security_invoker makes the views inherit whatever the schema already
--   decided, so the policies stay in one place.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Set security_invoker on every affected view.
--
--    ALTER VIEW ... SET (security_invoker = true) is used rather than
--    CREATE OR REPLACE VIEW ... WITH (security_invoker = true) on purpose.
--    Re-declaring each view would mean re-typing the entire SELECT list — the
--    Gini expression alone is a dozen lines of window functions — and any
--    transcription slip would silently change what the metric MEANS. The ALTER
--    form touches only the access model and leaves the query text provably
--    untouched, which is the only defensible way to make a security change to a
--    view someone else's dashboard depends on.
--
--    Guarded on to_regclass so a replay against a database missing one of the
--    views (an older schema, or a partial apply) skips it with a NOTICE instead
--    of aborting the transaction and taking the other six down with it.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_view TEXT;
  v_found TEXT;
BEGIN
  FOREACH v_view IN ARRAY ARRAY[
    'economy_currency_supply',
    'economy_wealth_distribution',
    'economy_transaction_velocity',
    'economy_item_price_drift',
    'economy_crop_supply',
    'v_wallet_mirror_drift'
  ]
  LOOP
    v_found := to_regclass(format('public.%I', v_view))::TEXT;

    IF v_found IS NULL THEN
      RAISE NOTICE
        'M6: view public.% does not exist on this database — skipped.', v_view;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
    RAISE NOTICE 'M6: security_invoker enabled on public.%', v_view;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Verify the option actually stuck, rather than assuming it did.
--
--    `reloptions` is where Postgres persists the per-relation options set by
--    ALTER VIEW/ALTER TABLE ... SET. A single NOT LIKE filter turns "did this
--    apply?" into a pass/fail the operator can see in the migration log instead
--    of a belief. The check is deliberately a RAISE WARNING and not an
--    exception: a view that refuses the option is a finding to report, not a
--    reason to leave the other five views unfenced.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_view TEXT;
  v_opts TEXT[];
  v_ok   BOOLEAN;
BEGIN
  FOREACH v_view IN ARRAY ARRAY[
    'economy_currency_supply',
    'economy_wealth_distribution',
    'economy_transaction_velocity',
    'economy_item_price_drift',
    'economy_crop_supply',
    'v_wallet_mirror_drift'
  ]
  LOOP
    SELECT c.reloptions INTO v_opts
    FROM pg_class c
    WHERE c.oid = to_regclass(format('public.%I', v_view));

    v_ok := COALESCE(
      'security_invoker=true' = ANY (COALESCE(v_opts, ARRAY[]::TEXT[])), FALSE);

    IF NOT v_ok THEN
      RAISE WARNING
        'M6: public.% does NOT report security_invoker=true (reloptions = %). '
        'It may still be RLS-bypassing — verify before trusting this view.',
        v_view, COALESCE(v_opts::TEXT, 'NULL');
    ELSE
      RAISE NOTICE 'M6: verified security_invoker=true on public.%', v_view;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Document the new access model on the two views that carry the most
--    aggregate value, since those are the ones a reader is most likely to
--    misread as global.
-- ----------------------------------------------------------------------------
COMMENT ON VIEW public.economy_currency_supply IS
  'M6 — SECURITY INVOKER as of 2026-10-03. Reads only what the caller may read '
  'through player_wallets RLS (own row for authenticated; everything for '
  'service_role). For the population-wide money supply, query with the service '
  'role — the aggregate you see here is scoped to your own visibility.';

COMMENT ON VIEW public.economy_wealth_distribution IS
  'M6 — SECURITY INVOKER as of 2026-10-03. The percentiles and the Gini '
  'coefficient are computed over the rows the caller can see. Under a normal '
  'player key that is a single wallet, so the Gini is 0 by construction and '
  'must not be presented as a population metric. BI/analytics consumers must '
  'use the service role.';

COMMENT ON VIEW public.v_wallet_mirror_drift IS
  'M6 — SECURITY INVOKER as of 2026-10-03. Should always be empty: any row means '
  'the legacy profiles.currency mirror and the canonical wallet disagree '
  '(20260908000017). Run it with the service role, not a player key.';

COMMIT;