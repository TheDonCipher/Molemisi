-- Migration: Account role tiers (player / admin / dev)
-- Adds a single source-of-truth `role` column to profiles, replacing the ad-hoc
-- is_admin boolean as the canonical account tier. `is_admin` is kept for
-- back-compat (AdminGuard honours either) but new code should use `role`.
--
-- Dev accounts are a DISTINCT tier from admin (separate /dev tooling area),
-- so the AdminGuard must NOT grant devs /admin access.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player'
  CHECK (role IN ('player', 'admin', 'dev'));

COMMENT ON COLUMN public.profiles.role IS
  'Account tier: player (default), admin (/admin panel + admin API routes), dev (separate /dev tooling area).';

-- Backfill: any existing admin (is_admin=true) becomes role='admin'.
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND role <> 'admin';

-- Helper: set a user's role. Usage: SELECT public.set_role('uuid-here', 'dev');
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
  UPDATE public.profiles SET role = r WHERE id = user_id;
END;
$$;

-- REVOKE public execute so it can't be called by anon/authenticated clients;
-- only service role and superusers.
REVOKE EXECUTE ON FUNCTION public.set_role(uuid, text) FROM PUBLIC, anon, authenticated;
