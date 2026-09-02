-- ============================================
-- MOLEMISI SEED DATA
-- Development seed data for testing
-- ============================================

-- Note: This seed data assumes a test user has been created via Supabase Auth
-- The user ID should be replaced with an actual auth user ID

-- Example seed data (run after creating a test user):
-- Replace 'YOUR_AUTH_USER_ID' with the actual UUID from auth.users

-- ============================================
-- TEST PROFILE
-- ============================================
-- INSERT INTO public.profiles (id, display_name, farm_name, currency)
-- VALUES ('YOUR_AUTH_USER_ID', 'Test Farmer', 'Sunny Acres', 1000);

-- ============================================
-- TEST FARM
-- ============================================
-- INSERT INTO public.farms (id, user_id, name, plot_count)
-- VALUES ('YOUR_FARM_ID', 'YOUR_AUTH_USER_ID', 'Sunny Acres', 6);

-- ============================================
-- TEST PLOTS
-- ============================================
-- INSERT INTO public.farm_plots (farm_id, slot_index, state)
-- VALUES
--   ('YOUR_FARM_ID', 0, 'EMPTY'),
--   ('YOUR_FARM_ID', 1, 'EMPTY'),
--   ('YOUR_FARM_ID', 2, 'EMPTY'),
--   ('YOUR_FARM_ID', 3, 'EMPTY'),
--   ('YOUR_FARM_ID', 4, 'EMPTY'),
--   ('YOUR_FARM_ID', 5, 'EMPTY');

-- ============================================
-- TEST INVENTORY
-- ============================================
-- INSERT INTO public.inventory (farm_id, item_type, item_category, quantity, quality)
-- VALUES
--   ('YOUR_FARM_ID', 'sorghum_seed', 'seed', 10, 'normal'),
--   ('YOUR_FARM_ID', 'maize_seed', 'seed', 5, 'normal');

-- ============================================
-- MARKET PRICES (server-only table)
-- ============================================
INSERT INTO public.market_prices (item_type, base_price, current_price)
VALUES
  ('sorghum', 15, 15),
  ('maize', 20, 20),
  ('millet', 12, 12),
  ('cowpeas', 18, 18),
  ('groundnuts', 25, 25),
  ('sesame', 35, 35),
  ('watermelon', 40, 40),
  ('tomatoes', 22, 22),
  ('pepper', 45, 45),
  ('herbs', 80, 80),
  ('saffron', 200, 200),
  ('egg', 5, 5),
  ('goat_milk', 15, 15),
  ('cow_milk', 15, 15),
  ('truffle', 50, 50),
  ('flour', 3, 3),
  ('butter', 5, 5),
  ('cheese', 20, 20),
  ('bread', 3, 3),
  ('leather', 20, 20)
ON CONFLICT (item_type) DO NOTHING;
