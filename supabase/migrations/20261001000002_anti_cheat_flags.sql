-- ============================================================================
-- Anti-cheat flagging (13 §4, §9, §8)
--
-- `anti_cheat_flags` records REVIEW signals, never verdicts. Detection is
-- separate from action: writing a flag never mutates player state, and the
-- response to a flag (warn / suspend / ignore) is a human decision.
--
-- Defence in depth:
--   * RLS enabled with NO player policy — players cannot read their own flags
--     (the flag set itself is intelligence an attacker would like to have), and
--     nothing writes from the client.
--   * The NestJS service writes with the service-role key, which bypasses RLS.
--   * Detection also logs to the Nest logger, so the trail survives a truncated
--     table (13 §8 "Actions logged").
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.anti_cheat_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id     UUID        REFERENCES public.farms(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'medium'
              CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  evidence    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 'open' until a reviewer decides. Explicitly NOT auto-acted on.
  resolution  TEXT        NOT NULL DEFAULT 'open'
              CHECK (resolution IN ('open', 'confirmed', 'false_positive', 'escalated')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query paths: "recent flags", "flags for one player", "open critical flags".
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_detected
  ON public.anti_cheat_flags (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_player
  ON public.anti_cheat_flags (player_id, detected_at DESC)
  WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anti_cheat_flags_kind
  ON public.anti_cheat_flags (kind, severity)
  WHERE resolution = 'open';
-- One open flag of the same kind for the same target: stop a hammering client
-- from flooding the table with thousands of identical rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_anti_cheat_flags_open
  ON public.anti_cheat_flags (kind, COALESCE(player_id, '00000000-0000-0000-0000-000000000000'::uuid),
                              COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE resolution = 'open';

ALTER TABLE public.anti_cheat_flags ENABLE ROW LEVEL SECURITY;

-- Players read nothing here. Admins reach the table through the service role
-- (`GET /api/v1/admin/anti-cheat/flags`), which bypasses RLS by design.
DROP POLICY IF EXISTS "anti_cheat_no_client_access" ON public.anti_cheat_flags;
CREATE POLICY "anti_cheat_no_client_access" ON public.anti_cheat_flags
  FOR ALL USING (false) WITH CHECK (false);

COMMIT;
