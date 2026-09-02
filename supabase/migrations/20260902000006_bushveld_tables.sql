-- Create bushveld_explorations table
CREATE TABLE IF NOT EXISTS public.bushveld_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone_id VARCHAR(50) NOT NULL,
  resources_gathered JSONB NOT NULL DEFAULT '[]',
  rare_discovery VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bushveld_explorations_farm_id ON public.bushveld_explorations(farm_id);
CREATE INDEX idx_bushveld_explorations_zone_id ON public.bushveld_explorations(zone_id);
