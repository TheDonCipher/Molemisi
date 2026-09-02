-- Create world_events table
CREATE TABLE IF NOT EXISTS public.world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  event_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  effects JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_world_events_farm_id ON public.world_events(farm_id);
CREATE INDEX idx_world_events_ends_at ON public.world_events(ends_at);
