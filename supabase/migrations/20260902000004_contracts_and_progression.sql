-- Create active_contracts table
CREATE TABLE IF NOT EXISTS public.active_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contract_id VARCHAR(100) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_active_contracts_farm_id ON public.active_contracts(farm_id);
CREATE INDEX idx_active_contracts_user_id ON public.active_contracts(user_id);
CREATE INDEX idx_active_contracts_completed ON public.active_contracts(farm_id, completed);

-- Add xp column to profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
