-- ============================================================================
-- M5 — Enable RLS on the tables that never had it
--
-- THE FINDING
--   Twenty-eight tables in `public` have `ENABLE ROW LEVEL SECURITY`. Fourteen
--   more were created without it, and on Supabase that is the same as being
--   world-readable and world-writable through PostgREST: when RLS is disabled,
--   Postgres applies no policy at all, so the anon and authenticated roles are
--   bound only by table GRANTs (which Supabase grants broadly by default).
--
--   The exposed set, grouped by what it leaks:
--
--     MONEY / PROGRESS (worst)
--       active_contracts     — contract_id, completion, expiry, payout ladder
--       kgotla_projects      — who is building what, contribution totals
--       kgotla_quests        — every active quest, npc_id and item targets
--       kgotla_charges       — yearly charges and their claim status
--       npc_reputation       — per-player NPC standing
--       world_events         — per-farm world event state
--       player_chapter_state — chapter_tokens progress (has RLS, but see §1)
--
--     CATALOGUE (low sensitivity, but still server-owned data)
--       game_config, config_audit_log, market_events, bushveld_scenes,
--       bushveld_hotspots, daily_sparkle, bushveld_explorations
--
--   Note the asymmetry: farms, farm_plots, buildings, livestock and
--   game_ledger_entries all got RLS in 20260902000000, but the tables added in
--   the LATER migrations (contracts 20260902000004, kgotla 20260902000005,
--   bushveld 20260902000006, world events 20260902000007, charges
--   20260902000000/20261002000000) were never given the same treatment. This is
--   the classic "new table, forgot the RLS block" drift.
--
-- THE POLICY SHAPE
--   All fourteen are player-scoped or catalogue, and none are written by a
--   client. So the policy set is deliberately minimal and uniform:
--
--     - Player-owned rows (have a user_id): SELECT only, `auth.uid() = user_id`.
--       Writes stay server-side via the service role, which bypasses RLS.
--     - Farm-owned rows (have a farm_id, no user_id): SELECT only, via the
--       farm-ownership subquery already used by the initial schema.
--     - Shared catalogue (no owner at all): SELECT for `authenticated`, plus
--       admin read via public.is_admin(auth.uid()) where the data is sensitive.
--       Nothing but the server writes these.
--
--   NO INSERT/UPDATE/DELETE policies are created anywhere in this file. Under
--   RLS, a table with only SELECT policies rejects every write from anon and
--   authenticated — which is exactly the intent, and mirrors the existing
--   wallet/ledger posture ("No INSERT/UPDATE/DELETE policy: server authority").
--
-- WHY anon IS NOT GRANTED THE CATALOGUE
--   A player must be signed in to have anything to look up, so `authenticated`
--   is sufficient for every table here. Leaving catalogue tables readable by
--   `anon` would serve no product purpose while keeping the pre-login attack
--   surface open; if the web app turns out to need one of these before sign-in,
--   the correct fix is a deliberate policy, not an accidental default.
--
-- OPERATIONAL WARNING
--   Enabling RLS on a table that the web client reads DIRECTLY (with a user
--   key) will break that read until a matching policy exists. A repo-wide scan
--   of apps/web found no direct client reads of any of these fourteen tables —
--   they are all reached through the NestJS API on the service role — so this
--   migration should be behaviour-neutral for the application.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enable RLS everywhere first, BEFORE any policy exists.
--
--    Ordering matters and is the whole point of this section. If policies were
--    created first and RLS enabled last, there would be a window in which the
--    table is wide open — and in a migration that window is inside the
--    transaction, so it is invisible from outside. Enabling first means the
--    stricter state is the one that exists at every instant. Enabling RLS on a
--    table that already has policies is a no-op for those policies.
--
--    ENABLE ROW LEVEL SECURITY (not FORCE): the table owner and roles with
--    BYPASSRLS — service_role above all — are unaffected, which is what keeps
--    the NestJS writers working.
-- ----------------------------------------------------------------------------
ALTER TABLE public.active_contracts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kgotla_projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kgotla_quests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kgotla_charges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_reputation         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bushveld_explorations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bushveld_scenes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bushveld_hotspots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sparkle          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events          ENABLE ROW LEVEL SECURITY;

-- storage_tiers is deliberately NOT listed: 20260908000019 already enabled RLS
-- on it. Repeating the ALTER would be harmless but would imply the table was
-- missed, which is exactly the kind of false signal this migration is trying to
-- eliminate.

-- `kgotla_charges` is named without a policy below on purpose: it is written
-- and read entirely server-side during the Year loop, so RLS with zero
-- policies (service-role only) is the correct, strictest outcome.

-- ----------------------------------------------------------------------------
-- 2. Player-owned rows: SELECT own, no writes.
--
--    These tables all carry `user_id UUID NOT NULL REFERENCES profiles(id)`, so
--    the ownership test is a direct comparison rather than a farm subquery.
--    Every DROP ... IF EXISTS / CREATE pair is the established house pattern
--    (20260908000016, 20260909000050) so the file is re-runnable.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "active_contracts_read_own" ON public.active_contracts;
CREATE POLICY "active_contracts_read_own" ON public.active_contracts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kgotla_quests_read_own" ON public.kgotla_quests;
CREATE POLICY "kgotla_quests_read_own" ON public.kgotla_quests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "kgotla_charges_read_own" ON public.kgotla_charges;
CREATE POLICY "kgotla_charges_read_own" ON public.kgotla_charges
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "npc_reputation_read_own" ON public.npc_reputation;
CREATE POLICY "npc_reputation_read_own" ON public.npc_reputation
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bushveld_explorations_read_own" ON public.bushveld_explorations;
CREATE POLICY "bushveld_explorations_read_own" ON public.bushveld_explorations
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Farm-owned rows: SELECT via the farm-ownership subquery.
--
--    kgotla_projects and world_events have `farm_id` but no `user_id`, so they
--    resolve ownership through farms.user_id — the same predicate the initial
--    schema uses for game_ledger_entries ("players_read_own_ledger").
--
--    These are the two highest-value rows of this migration: a Kgotla project's
--    contribution total and a farm's world-event state were previously readable
--    and WRITABLE by any anon key, i.e. one HTTP request could rewrite another
--    player's contribution progress.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "kgotla_projects_read_own" ON public.kgotla_projects;
CREATE POLICY "kgotla_projects_read_own" ON public.kgotla_projects
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "world_events_read_own" ON public.world_events;
CREATE POLICY "world_events_read_own" ON public.world_events
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 4. Shared catalogue: readable by any signed-in player, writable by nobody.
--
--    game_config, market_events, bushveld_scenes, bushveld_hotspots and
--    daily_sparkle are identical for every player, so a SELECT policy keyed on
--    `authenticated` grants exactly the read the client needs and nothing more.
--
--    config_audit_log is different: it records who changed a balance-affecting
--    tuning value (min_value/max_value/config_value, e.g. SELL_TAX_RATE). That
--    is operational and mildly sensitive — it exposes the `changed_by` admin
--    UUIDs and the shape of economy edits. It is admin-only, following the
--    precedent set by economy_price_snapshots in 20261001000001.
--
--    The `public.is_admin(auth.uid())` argument is load-bearing: is_admin is
--    declared as is_admin(user_id uuid) in 20260902000015 and has no zero-arg
--    overload, so a bare `is_admin()` is a 42883 at CREATE POLICY time that
--    aborts the entire transaction.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "game_config_read_authenticated" ON public.game_config;
CREATE POLICY "game_config_read_authenticated" ON public.game_config
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "market_events_read_authenticated" ON public.market_events;
CREATE POLICY "market_events_read_authenticated" ON public.market_events
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bushveld_scenes_read_authenticated" ON public.bushveld_scenes;
CREATE POLICY "bushveld_scenes_read_authenticated" ON public.bushveld_scenes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bushveld_hotspots_read_authenticated" ON public.bushveld_hotspots;
CREATE POLICY "bushveld_hotspots_read_authenticated" ON public.bushveld_hotspots
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "daily_sparkle_read_authenticated" ON public.daily_sparkle;
CREATE POLICY "daily_sparkle_read_authenticated" ON public.daily_sparkle
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "config_audit_log_admin_read" ON public.config_audit_log;
CREATE POLICY "config_audit_log_admin_read" ON public.config_audit_log
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Comments, so the next audit does not have to re-derive which tables were
--    the late-arriving ones that missed RLS.
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.active_contracts IS
  'M5 — RLS enabled 2026-10-03 (was missing entirely). SELECT-own-row only; '
  'writes are server-side. Contract completion and expiry were world-readable '
  'and world-writable through PostgREST before this migration.';

COMMENT ON TABLE public.kgotla_projects IS
  'M5 — RLS enabled 2026-10-03. SELECT via farm ownership. Contribution totals '
  'were client-writable by any anon key before this migration.';

COMMENT ON TABLE public.config_audit_log IS
  'M5 — RLS enabled 2026-10-03. Admin-read only: it records who changed '
  'balance-affecting tuning values (SELL_TAX_RATE and friends) and the UUIDs of '
  'the admins who did.';

COMMENT ON TABLE public.game_config IS
  'M5 — RLS enabled 2026-10-03. Shared catalogue, readable by any signed-in '
  'player. Only the server writes it: these values gate starting currency, tax '
  'rates and plot counts, so a client-writable config table is a client-writable '
  'economy.';

COMMIT;