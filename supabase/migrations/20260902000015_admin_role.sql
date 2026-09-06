-- Migration: Admin role support
-- Adds is_admin flag to profiles + helper functions for the AdminGuard.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS 'True for administrative accounts; grants access to /admin panel and API admin routes';

-- Helper: check admin status by auth user id (SECURITY DEFINER so RLS never blocks it)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = user_id),
    false
  );
$$;

-- Helper: promote/demote via SQL. Usage: SELECT public.set_admin('uuid-here', true);
CREATE OR REPLACE FUNCTION public.set_admin(user_id uuid, admin boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET is_admin = admin WHERE id = user_id;
$$;

-- REVOKE public execute so it can't be called by anon/authenticated clients;
-- only service role and superusers.
REVOKE EXECUTE ON FUNCTION public.set_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;
