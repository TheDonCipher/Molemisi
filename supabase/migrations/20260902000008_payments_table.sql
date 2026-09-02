-- Migration: Add payments table for monetization system
-- Supports payment provider abstraction with idempotency

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Product info
  sku TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents (smallest currency unit)
  currency TEXT NOT NULL DEFAULT 'BWP',
  
  -- Provider info
  provider TEXT NOT NULL DEFAULT 'stub',
  provider_payment_id TEXT,
  status payment_status NOT NULL DEFAULT 'PENDING',
  
  -- Entitlement tracking
  entitlement_type TEXT NOT NULL,
  entitlement_data JSONB NOT NULL DEFAULT '{}',
  
  -- Idempotency
  idempotency_key TEXT NOT NULL UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON public.payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments(idempotency_key);

-- RLS: Players can only see their own payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

-- Players cannot directly insert payments (must go through API)
-- No INSERT policy = direct inserts blocked by RLS

COMMENT ON TABLE public.payments IS 'Store purchases and payment transactions. Managed by payment provider abstraction.';
COMMENT ON COLUMN public.payments.amount IS 'Amount in cents (smallest currency unit)';
COMMENT ON COLUMN public.payments.entitlement_type IS 'Type of virtual good: currency, cosmetic, convenience, premium';
COMMENT ON COLUMN public.payments.idempotency_key IS 'Unique key to prevent duplicate payment processing';
