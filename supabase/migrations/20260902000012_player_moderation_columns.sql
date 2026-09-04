-- Add moderation columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_warning_message TEXT;

-- Index for quick banned-player checks during auth
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned) WHERE is_banned = TRUE;

COMMENT ON COLUMN public.profiles.is_banned IS 'Admin-set flag to disable player login';
COMMENT ON COLUMN public.profiles.ban_reason IS 'Reason for the ban';
COMMENT ON COLUMN public.profiles.warning_count IS 'Total number of warnings issued';
COMMENT ON COLUMN public.profiles.last_warning_message IS 'Most recent warning message';
