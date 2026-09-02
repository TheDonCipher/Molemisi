-- ============================================
-- MOLEMISI DATABASE SCHEMA
-- Initial migration: Core tables
-- ============================================

-- Enable UUID extension

-- ============================================
-- PROFILES (extends Supabase Auth users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL DEFAULT 'Farmer',
  avatar_url VARCHAR(500),
  farm_name VARCHAR(100) DEFAULT 'My Farm',
  farm_level INTEGER NOT NULL DEFAULT 1,
  farm_xp INTEGER NOT NULL DEFAULT 0,
  farming_skill INTEGER NOT NULL DEFAULT 1,
  farming_skill_xp INTEGER NOT NULL DEFAULT 0,
  husbandry_skill INTEGER NOT NULL DEFAULT 1,
  husbandry_skill_xp INTEGER NOT NULL DEFAULT 0,
  trading_skill INTEGER NOT NULL DEFAULT 1,
  trading_skill_xp INTEGER NOT NULL DEFAULT 0,
  currency INTEGER NOT NULL DEFAULT 100,
  energy INTEGER NOT NULL DEFAULT 100,
  max_energy INTEGER NOT NULL DEFAULT 100,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_simulated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- FARMS
-- ============================================
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'My Farm',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  plot_count INTEGER NOT NULL DEFAULT 4,
  max_plots INTEGER NOT NULL DEFAULT 20,
  weather_state VARCHAR(20) NOT NULL DEFAULT 'clear',
  weather_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  season VARCHAR(20) NOT NULL DEFAULT 'spring',
  season_day INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- ============================================
-- FARM PLOTS
-- ============================================
CREATE TABLE public.farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'EMPTY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, slot_index),
  CHECK (slot_index >= 0 AND slot_index < 20)
);

-- ============================================
-- CROP INSTANCES
-- ============================================
CREATE TABLE public.crop_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES public.farm_plots(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  crop_type VARCHAR(50) NOT NULL,
  growth_stage INTEGER NOT NULL DEFAULT 0,
  max_growth_stages INTEGER NOT NULL,
  hydration REAL NOT NULL DEFAULT 0.5,
  health REAL NOT NULL DEFAULT 1.0,
  fertilizer_active BOOLEAN NOT NULL DEFAULT FALSE,
  fertilizer_bonus REAL NOT NULL DEFAULT 0,
  disease_events INTEGER NOT NULL DEFAULT 0,
  pest_events INTEGER NOT NULL DEFAULT 0,
  planted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_watered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BUILDINGS
-- ============================================
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  building_type VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  capacity INTEGER NOT NULL,
  wear REAL NOT NULL DEFAULT 0,
  construction_started_at TIMESTAMPTZ,
  construction_ends_at TIMESTAMPTZ,
  last_maintained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- LIVESTOCK
-- ============================================
CREATE TABLE public.livestock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  animal_type VARCHAR(50) NOT NULL,
  name VARCHAR(50),
  hunger REAL NOT NULL DEFAULT 0.8,
  health REAL NOT NULL DEFAULT 1.0,
  happiness REAL NOT NULL DEFAULT 0.7,
  product_ready BOOLEAN NOT NULL DEFAULT FALSE,
  product_timer TIMESTAMPTZ,
  last_fed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_pet_at TIMESTAMPTZ,
  is_sick BOOLEAN NOT NULL DEFAULT FALSE,
  sick_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  item_category VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  quality VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, item_type, quality)
);

-- ============================================
-- GAME LEDGER ENTRIES (audit trail)
-- ============================================
CREATE TABLE public.game_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id),
  entry_type VARCHAR(30) NOT NULL,
  reference_type VARCHAR(30),
  reference_id UUID,
  currency_change INTEGER NOT NULL DEFAULT 0,
  currency_balance_after INTEGER NOT NULL,
  item_type VARCHAR(50),
  item_quantity_change INTEGER,
  item_quality VARCHAR(20),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_farms_user_id ON public.farms(user_id);
CREATE INDEX idx_farm_plots_farm_id ON public.farm_plots(farm_id);
CREATE INDEX idx_crop_instances_plot_id ON public.crop_instances(plot_id);
CREATE INDEX idx_crop_instances_farm_id ON public.crop_instances(farm_id);
CREATE INDEX idx_crop_instances_expected_ready ON public.crop_instances(expected_ready_at) WHERE expected_ready_at IS NOT NULL;
CREATE INDEX idx_buildings_farm_id ON public.buildings(farm_id);
CREATE INDEX idx_buildings_state ON public.buildings(farm_id, state);
CREATE INDEX idx_livestock_farm_id ON public.livestock(farm_id);
CREATE INDEX idx_inventory_farm_id ON public.inventory(farm_id);
CREATE INDEX idx_inventory_category ON public.inventory(farm_id, item_category);
CREATE INDEX idx_game_ledger_farm_id ON public.game_ledger_entries(farm_id);
CREATE INDEX idx_game_ledger_created_at ON public.game_ledger_entries(created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_ledger_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: Players can only read/update their own
CREATE POLICY "players_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "players_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Farms: Players can only access their own
CREATE POLICY "players_read_own_farm" ON public.farms
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "players_update_own_farm" ON public.farms
  FOR UPDATE USING (user_id = auth.uid());

-- Farm plots: Via farm ownership
CREATE POLICY "players_read_own_plots" ON public.farm_plots
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

CREATE POLICY "players_update_own_plots" ON public.farm_plots
  FOR UPDATE USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Crop instances: Via farm ownership
CREATE POLICY "players_read_own_crops" ON public.crop_instances
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Buildings: Via farm ownership
CREATE POLICY "players_read_own_buildings" ON public.buildings
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Livestock: Via farm ownership
CREATE POLICY "players_read_own_livestock" ON public.livestock
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Inventory: Via farm ownership
CREATE POLICY "players_read_own_inventory" ON public.inventory
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );

-- Ledger: Via farm ownership (read-only for players)
CREATE POLICY "players_read_own_ledger" ON public.game_ledger_entries
  FOR SELECT USING (
    farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
  );
