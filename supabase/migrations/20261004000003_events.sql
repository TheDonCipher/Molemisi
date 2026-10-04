-- ============================================================================
-- B3 — Events live service (08 §6 / D6, D8, RULED 2026-10-04)
--
-- `events` holds one materialised row per chapter occurrence (slug + window).
-- `event_grants` records a player's claim. The (player_id, event_id) UNIQUE is
-- the idempotency guard (14 §9): the Event GRANTS the goods (bupi/borotho) and
-- the Kgotla pays Chapter Tokens, and a second claim must be a no-op.
--
-- Chapter Tokens awarded here flow through ChapterService.addTokens, so the P8
-- rollover stays the single owner of "tokens expire to zero at chapter end" (I13).
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL,
  chapter_slug         TEXT NOT NULL,
  name                 TEXT NOT NULL,
  setswana             TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ NOT NULL,
  grant_item           TEXT NOT NULL,
  grant_qty            INT NOT NULL DEFAULT 1,
  chapter_token_reward INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per template per occurrence window.
  UNIQUE (slug, starts_at)
);

COMMENT ON TABLE public.events IS
  'B3 — chapter-scoped Events (D6/D8). Materialised from EVENT_TEMPLATES on the '
  'real Setswana calendar; a chapter rollover opens the next occurrence.';

CREATE TABLE IF NOT EXISTS public.event_grants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id       UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_slug      TEXT NOT NULL,
  quantity       INT NOT NULL DEFAULT 0,
  chapter_tokens INT NOT NULL DEFAULT 0,
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The idempotency guard: a player claims a given Event exactly once.
  UNIQUE (player_id, event_id)
);

COMMENT ON TABLE public.event_grants IS
  'B3 — one row per Event claim. The UNIQUE(player_id, event_id) constraint is '
  'the idempotency guard: a replayed claim inserts nothing and grants nothing.';

CREATE INDEX IF NOT EXISTS idx_events_window ON public.events (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_event_grants_player ON public.event_grants (player_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON public.events;
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_grants_owner_read" ON public.event_grants;
CREATE POLICY "event_grants_owner_read" ON public.event_grants
  FOR SELECT USING (player_id = auth.uid());

COMMIT;
