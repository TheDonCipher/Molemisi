-- Create market_prices table if it doesn't exist (with supply/demand columns)
CREATE TABLE IF NOT EXISTS public.market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL UNIQUE,
  item_name VARCHAR(100) NOT NULL,
  base_price INTEGER NOT NULL,
  current_price INTEGER NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'crop',
  supply INTEGER NOT NULL DEFAULT 0,
  demand INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add supply/demand columns if table existed but columns are missing
ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS supply INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demand INTEGER NOT NULL DEFAULT 0;

-- Seed market prices if empty
INSERT INTO public.market_prices (item_type, item_name, base_price, current_price, category) VALUES
  ('sorghum_seed', 'Sorghum Seed', 10, 10, 'seed'),
  ('sorghum', 'Sorghum', 25, 25, 'crop'),
  ('maize_seed', 'Maize Seed', 15, 15, 'seed'),
  ('maize', 'Maize', 35, 35, 'crop'),
  ('millet_seed', 'Millet Seed', 12, 12, 'seed'),
  ('millet', 'Millet', 28, 28, 'crop'),
  ('cowpeas_seed', 'Cowpeas Seed', 12, 12, 'seed'),
  ('cowpeas', 'Cowpeas', 30, 30, 'crop'),
  ('groundnuts_seed', 'Groundnuts Seed', 14, 14, 'seed'),
  ('groundnuts', 'Groundnuts', 32, 32, 'crop'),
  ('sesame_seed', 'Sesame Seed', 18, 18, 'seed'),
  ('sesame', 'Sesame', 40, 40, 'crop'),
  ('watermelon_seed', 'Watermelon Seed', 20, 20, 'seed'),
  ('watermelon', 'Watermelon', 45, 45, 'crop'),
  ('tomatoes_seed', 'Tomatoes Seed', 16, 16, 'seed'),
  ('tomatoes', 'Tomatoes', 38, 38, 'crop'),
  ('pepper_seed', 'Pepper Seed', 15, 15, 'seed'),
  ('pepper', 'Pepper', 36, 36, 'crop'),
  ('herbs_seed', 'Herbs Seed', 10, 10, 'seed'),
  ('herbs', 'Herbs', 22, 22, 'crop'),
  ('saffron_seed', 'Saffron Seed', 80, 80, 'seed'),
  ('saffron', 'Saffron', 200, 200, 'crop'),
  ('egg', 'Egg', 15, 15, 'product'),
  ('milk', 'Milk', 30, 30, 'product'),
  ('wool', 'Wool', 25, 25, 'product'),
  ('honey', 'Honey', 50, 50, 'product'),
  ('wood', 'Wood', 8, 8, 'material'),
  ('stone', 'Stone', 6, 6, 'material'),
  ('herb_bundle', 'Herb Bundle', 20, 20, 'material'),
  ('wild_saffron', 'Wild Saffron', 100, 100, 'rare')
ON CONFLICT (item_type) DO NOTHING;

-- Create market_transactions table if missing
CREATE TABLE IF NOT EXISTS public.market_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('SELL', 'BUY')),
  item_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  quality VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create market_events table for random price modifiers
CREATE TABLE IF NOT EXISTS public.market_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  effect VARCHAR(50) NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_events_ends_at ON public.market_events(ends_at);
CREATE INDEX IF NOT EXISTS idx_market_transactions_farm_id ON public.market_transactions(farm_id);
CREATE INDEX IF NOT EXISTS idx_market_transactions_created ON public.market_transactions(created_at);

-- RLS for market tables
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market prices" ON public.market_prices FOR SELECT USING (true);

CREATE POLICY "Players read own transactions" ON public.market_transactions
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Seed events
INSERT INTO public.market_events (name, description, effect, multiplier, started_at, ends_at) VALUES
  ('Drought Warning', 'Grain prices rising due to dry conditions', 'grain', 1.5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('Harvest Festival', 'Food prices boosted by celebration', 'food', 1.3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;
