-- Add supply/demand columns to market_prices for dynamic pricing
ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS supply INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demand INTEGER NOT NULL DEFAULT 0;

-- Create market_events table for random price modifiers
CREATE TABLE IF NOT EXISTS public.market_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  effect VARCHAR(50) NOT NULL, -- 'grain', 'food', 'materials', item_type, or 'all'
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0, -- e.g. 1.5 = +50% price
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_events_ends_at ON public.market_events(ends_at);

-- Insert some initial seed events (disabled by default, ends in past)
INSERT INTO public.market_events (name, description, effect, multiplier, started_at, ends_at) VALUES
  ('Drought Warning', 'Grain prices rising due to dry conditions', 'grain', 1.5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('Harvest Festival', 'Food prices boosted by celebration', 'food', 1.3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
