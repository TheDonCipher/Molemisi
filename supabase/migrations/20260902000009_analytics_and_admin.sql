-- Migration: Add analytics events table and admin support
-- Analytics tracks gameplay, engagement, and economy events
-- Admin views are database-level access controls for inspection

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_player_id ON public.analytics_events(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON public.analytics_events(event, created_at);

-- RLS: Only service role can access analytics (admin only)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- No read/write policies = blocked by RLS for regular users
-- Admin access goes through NestJS service role client

COMMENT ON TABLE public.analytics_events IS 'Gameplay and engagement analytics events. Admin-only access.';
COMMENT ON COLUMN public.analytics_events.event IS 'Event name: farm_loaded, crop_planted, payment_completed, etc.';
COMMENT ON COLUMN public.analytics_events.properties IS 'Event-specific properties as JSON';
