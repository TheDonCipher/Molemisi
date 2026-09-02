-- Create npc_reputation table
CREATE TABLE IF NOT EXISTS public.npc_reputation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  npc_id VARCHAR(50) NOT NULL,
  reputation INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, npc_id)
);

CREATE INDEX idx_npc_reputation_farm_id ON public.npc_reputation(farm_id);

-- Create kgotla_projects table
CREATE TABLE IF NOT EXISTS public.kgotla_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  project_id VARCHAR(50) NOT NULL,
  current_contributions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, project_id)
);

CREATE INDEX idx_kgotla_projects_farm_id ON public.kgotla_projects(farm_id);
