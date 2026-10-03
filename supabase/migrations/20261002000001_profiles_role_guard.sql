-- ============================================================================
-- SECURITY H6 — profiles.role / profiles.is_admin must not be client-writable
--
-- THE HOLE
--   `players_update_own_profile` (20260902000000, line 199) is column-agnostic:
--       CREATE POLICY "players_update_own_profile" ON public.profiles
--         FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
--   Any authenticated player may therefore PATCH ANY column of their own row
--   through PostgREST — including `role` and `is_admin`. Both guards read those
--   columns on every request (admin.guard.ts, dev.guard.ts), so a single
--       PATCH /rest/v1/profiles?id=eq.<self>  {"role":"dev"}
--   with the public anon key + the player's own JWT is a full privilege
--   escalation to administrator.
--
-- THE FIX — two independent layers, so neither alone is the whole defence:
--   1. RLS row scope stays (auth.uid() = id).
--   2. Column privileges narrow WHAT may be written: the blanket table-level
--      UPDATE grant to `authenticated` is revoked and replaced with a
--      column-level grant covering only cosmetic/profile fields.
--   3. A BEFORE UPDATE OF role, is_admin trigger refuses the write even from a
--      service-role connection, unless the sanctioned helper signalled via a
--      transaction-local GUC (same pattern as the currency mirror guard).
--
-- This is additive and non-destructive. Confirm before pushing to the live
-- project (schema changes on nyapfgawanqvnkkjudxb are one-way).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Trigger: only the sanctioned helpers may move the tier columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- `true` = local to the current transaction, so it cannot leak across a
  -- pooled connection (the same reason the currency mirror uses it).
  IF COALESCE(current_setting('molemisi.role_sync', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION
      'profiles.role / profiles.is_admin are server-controlled. '
      'Use public.set_role(user_id, role) from a service-role context.'
      USING ERRCODE = '42501',
            HINT = 'This exception marks a client-side privilege-escalation attempt.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_profile_privilege_columns IS
  'H6 — blocks client writes to the account-tier columns. Cleared only by a '
  'transaction-local molemisi.role_sync=1 set by set_role()/set_admin().';

DROP TRIGGER IF EXISTS trg_profiles_guard_privilege ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privilege
  BEFORE UPDATE OF role, is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_columns();

-- ---------------------------------------------------------------------------
-- 2. Re-issue the sanctioned helpers so they signal the guard.
--    Signatures are preserved, so no caller changes.
-- ---------------------------------------------------------------------------
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
  UPDATE public.profiles SET role = r, updated_at = NOW() WHERE id = user_id;
  PERFORM set_config('molemisi.role_sync', '', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin(user_id uuid, admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('molemisi.role_sync', '1', true);
  UPDATE public.profiles
     SET is_admin = admin,
         -- Keep `role` as the canonical source of truth: promoting also sets the
         -- role, demoting returns it to 'player' unless it is 'dev'.
         role = CASE
                  WHEN admin THEN 'admin'
                  WHEN role = 'dev' THEN 'dev'
                  ELSE 'player'
                END,
         updated_at = NOW()
   WHERE id = user_id;
  PERFORM set_config('molemisi.role_sync', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Column-scoped write grant (RLS decides WHICH ROWS, GRANT decides WHICH
--    COLUMNS — Postgres has no column-level RLS policy).
-- ---------------------------------------------------------------------------
REVOKE UPDATE ON public.profiles FROM authenticated, anon;

GRANT UPDATE (
  display_name,
  avatar_url,
  farm_name,
  last_active_at,
  updated_at
) ON public.profiles TO authenticated;

-- Row scope is unchanged and still required — the grant narrows columns only.
DROP POLICY IF EXISTS "players_update_own_profile" ON public.profiles;
CREATE POLICY "players_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Defence in depth: a stale `is_admin = true` row must not silently keep
-- admin rights now that `role` is canonical.
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND role <> 'admin';
UPDATE public.profiles SET role = 'player' WHERE is_admin = false AND role = 'admin';

COMMIT;