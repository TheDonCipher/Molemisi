-- ============================================================================
-- B1 — global Kgotla chat (08 §5 / D5)
--
-- RULING (2026-10-04, third pass): **NO CHAT MODERATION.** The mute / block /
-- report tables that this migration originally carried are WITHDRAWN, together
-- with the profanity filter and the trust-and-safety sign-off that gated it.
-- The chat ships as one plain, global community channel.
--
-- The only server-side guard left is the anti-flood rate limit enforced in the
-- service (one shared line on mobile data, `20 §5.4`), which constrains how
-- often a player posts and never inspects what they say. That is traffic
-- hygiene, so it lives in code and needs no schema.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.kgotla_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The Kgotla identity is the PLAYER name + avatar, never the farm name (D4).
  display_name TEXT NOT NULL,
  body         TEXT NOT NULL,
  language     TEXT NOT NULL DEFAULT 'en',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

COMMENT ON TABLE public.kgotla_messages IS
  'B1 — global Kgotla chat (D5). One shared channel for all players; author line '
  'is the PLAYER identity (display_name), never the farm name (D4). Soft-deleted '
  'via deleted_at. No moderation tables — ruled out 2026-10-04.';

CREATE INDEX IF NOT EXISTS idx_kgotla_messages_recent
  ON public.kgotla_messages (created_at DESC);

ALTER TABLE public.kgotla_messages ENABLE ROW LEVEL SECURITY;

-- Chat is a shared space: any authenticated player may read it.
DROP POLICY IF EXISTS "kgotla_messages_read" ON public.kgotla_messages;
CREATE POLICY "kgotla_messages_read" ON public.kgotla_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMIT;

