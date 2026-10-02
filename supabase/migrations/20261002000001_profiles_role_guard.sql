-- ============================================================================
-- H6 — close the profile self-promotion hole (security audit 2026-10-02)
--
-- THE BUG
--   `players_update_own_profile` (20260902000000) is COLUMN-AGNOSTIC:
--       CREATE POLICY "players_update_own_profile" ON public.profiles
--         FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
--   PostgREST exposes the table to any authenticated client, so a player with
--   the anon key and their own JWT could simply:
--       PATCH /rest/v1/profiles?id=eq.<self>   {"role":"dev"}
--   and become a full administrator — `AdminGuard` and `DevGuard` read
--   `role`/`is_admin` on every request. `set_role()` was correctly REVOKEd from
--   anon/authenticated (20260911000021), but that protected the FUNCTION, not
--   the TABLE. Nothing guarded the columns.
--
-- THE FIX
--   Mirror `trg_profiles_guard_currency` (20260908000017), which already proves
--   this pattern works: a BEFORE UPDATE trigger that RAISES unless the current
--   transaction has signalled intent through a GUC. The sanctioned writers
--   (`set_role`, `set_admin`) set that GUC; a client PATCH never can, because
--   `set_config(..., true)` is transaction-local and only reachable from inside
--   a SECURITY DEFINER function running as the table owner.
--
--   The service role bypasses RLS but NOT triggers, which is why the trigger —
--   not a policy edit — is the enforcement point. It also keeps `role` and
--   `is_admin` in agreement with each other, which a column-scoped GRANT cannot.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Guard: nothing writes role / is_admin without signalling intent
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin)
     AND COALESCE(current_setting('molemisi.role_sync', true), '') <> '1'
  THEN
    RAISE EXCEPTION
      'profiles.role / profiles.is_admin are server-managed and may not be changed by a client.'
      USING HINT = 'Use public.set_role()/set_admin() or the service role. A client PATCH here is a privilege-escalation attempt.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role
  BEFORE UPDATE OF role, is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_role();

COMMENT ON FUNCTION public.guard_profiles_role() IS
  'H6 — blocks client writes to profiles.role / is_admin (self-promotion). Sanctioned writers set molemisi.role_sync.';

-- ----------------------------------------------------------------------------
-- 2. The sanctioned writers must signal the guard
--    set_role() was plpgsql already; set_admin() was SQL and is recreated as
--    plpgsql so it can PERFORM set_config. Both stay SECURITY DEFINER and both
--    stay REVOKEd from anon/authenticated.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_role(user_id uuid, r text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF r NOT IN ('player', 'admin', 'dev') THEN
    RAISE EXCEPTION 'Invalid role: %', r;
  END IF;
  PERFORM set_config('molemisi.role_sync', '1', true);
  UPDATE public.profiles SET role = r WHERE id = user_id;
  PERFORM set_config('molemisi.role_sync', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_role(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_admin(user_id uuid, admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('molemisi.role_sync', '1', true);
  UPDATE public.profiles SET is_admin = admin WHERE id = user_id;
  PERFORM set_config('molemisi.role_sync', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Defence in depth — column-level privileges
--
--    Nothing in the app writes `profiles` through PostgREST (verified: the web
--    client has no `from('profiles').update(...)` call; all profile writes go
--    through the Nest API on the service role). So we can safely drop the
--    table-wide UPDATE grant the client held and hand back only the columns a
--    future client could legitimately own. Even if a policy mistake reappears,
--    the grant no longer covers role/is_admin/currency/is_banned.
--
--    Table-level UPDATE must be revoked first: in Postgres a table-level grant
--    subsumes every column, so a bare column REVOKE would be a no-op.
-- ----------------------------------------------------------------------------
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (display_name, avatar_url, farm_name, updated_at)
  ON public.profiles TO authenticated;

COMMIT;
