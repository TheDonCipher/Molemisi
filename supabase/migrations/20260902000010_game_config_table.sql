-- Game configuration table
-- Stores all tunable game parameters as key-value pairs
-- with JSON values for complex configs

CREATE TABLE IF NOT EXISTS game_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by category
CREATE INDEX IF NOT EXISTS idx_game_config_category ON game_config(category);

-- Insert default configuration values

-- Farm settings
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('STARTING_PLOTS', '4'::jsonb, 'farm', 'Number of plots a new farm starts with', 1, 50),
  ('MAX_PLOTS', '20'::jsonb, 'farm', 'Maximum plots a farm can have', 4, 100),
  ('STARTING_CURRENCY', '100'::jsonb, 'farm', 'Starting Pula for new players', 0, 100000),
  ('STARTING_WATER', '85'::jsonb, 'farm', 'Starting water level in liters', 0, 1000),
  ('MAX_WATER', '100'::jsonb, 'farm', 'Maximum water capacity in liters', 50, 10000)
ON CONFLICT (config_key) DO NOTHING;

-- Economy settings
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('PRICE_FLUCTUATION', '15'::jsonb, 'economy', 'Maximum price change percentage per tick', 0, 100),
  ('MARKET_UPDATE_HOURS', '6'::jsonb, 'economy', 'Hours between market price updates', 1, 72),
  ('SELL_TAX_RATE', '5'::jsonb, 'economy', 'Percentage tax on sales', 0, 50),
  ('CONTRACT_BONUS', '20'::jsonb, 'economy', 'Bonus percentage for contract completion', 0, 200)
ON CONFLICT (config_key) DO NOTHING;

-- Progression settings
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('XP_PER_LEVEL', '3000'::jsonb, 'progression', 'XP required per level', 100, 100000),
  ('XP_PLANT', '5'::jsonb, 'progression', 'XP awarded for planting', 0, 500),
  ('XP_WATER', '2'::jsonb, 'progression', 'XP awarded for watering', 0, 200),
  ('XP_HARVEST', '10'::jsonb, 'progression', 'XP awarded for harvesting', 0, 500),
  ('XP_FORAGE', '5'::jsonb, 'progression', 'XP awarded for foraging', 0, 200)
ON CONFLICT (config_key) DO NOTHING;

-- Weather settings
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('CLEAR_PROB', '35'::jsonb, 'weather', 'Clear weather probability percentage', 0, 100),
  ('CLOUDY_PROB', '25'::jsonb, 'weather', 'Cloudy weather probability percentage', 0, 100),
  ('RAIN_PROB', '25'::jsonb, 'weather', 'Rain weather probability percentage', 0, 100),
  ('STORM_PROB', '15'::jsonb, 'weather', 'Storm weather probability percentage', 0, 100),
  ('DROUGHT_CHANCE', '5'::jsonb, 'weather', 'Drought chance percentage', 0, 50)
ON CONFLICT (config_key) DO NOTHING;

-- Simulation settings
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('SIMULATION_INTERVAL', '300'::jsonb, 'simulation', 'Simulation tick interval in seconds', 30, 3600),
  ('GROWTH_PER_TICK', '0.1'::jsonb, 'simulation', 'Crop growth per tick (0-1)', 0.01, 1),
  ('HYDRATION_DECAY', '0.05'::jsonb, 'simulation', 'Hydration decay per tick', 0, 1),
  ('ENERGY_REGEN', '10'::jsonb, 'simulation', 'Energy regenerated per hour', 0, 200)
ON CONFLICT (config_key) DO NOTHING;

-- Crop configurations
INSERT INTO game_config (config_key, config_value, category, description) VALUES
  ('CROP_SORGHUM', '{"growthStages":4,"baseYield":3,"seedCost":15,"sellPrice":10,"waterNeeds":40,"xpReward":15}'::jsonb, 'crops', 'Sorghum crop configuration'),
  ('CROP_MAIZE', '{"growthStages":5,"baseYield":4,"seedCost":12,"sellPrice":12,"waterNeeds":60,"xpReward":18}'::jsonb, 'crops', 'Maize crop configuration'),
  ('CROP_MILLET', '{"growthStages":4,"baseYield":3,"seedCost":10,"sellPrice":8,"waterNeeds":30,"xpReward":12}'::jsonb, 'crops', 'Millet crop configuration'),
  ('CROP_COWPEAS', '{"growthStages":4,"baseYield":3,"seedCost":18,"sellPrice":14,"waterNeeds":45,"xpReward":20}'::jsonb, 'crops', 'Cowpeas crop configuration'),
  ('CROP_GROUNDNUTS', '{"growthStages":5,"baseYield":2,"seedCost":20,"sellPrice":18,"waterNeeds":50,"xpReward":22}'::jsonb, 'crops', 'Groundnuts crop configuration'),
  ('CROP_SESAME', '{"growthStages":4,"baseYield":2,"seedCost":16,"sellPrice":15,"waterNeeds":35,"xpReward":16}'::jsonb, 'crops', 'Sesame crop configuration'),
  ('CROP_WATERMELON', '{"growthStages":6,"baseYield":4,"seedCost":22,"sellPrice":20,"waterNeeds":80,"xpReward":25}'::jsonb, 'crops', 'Watermelon crop configuration'),
  ('CROP_TOMATOES', '{"growthStages":5,"baseYield":3,"seedCost":25,"sellPrice":22,"waterNeeds":70,"xpReward":28}'::jsonb, 'crops', 'Tomatoes crop configuration'),
  ('CROP_PEPPER', '{"growthStages":4,"baseYield":2,"seedCost":18,"sellPrice":16,"waterNeeds":55,"xpReward":18}'::jsonb, 'crops', 'Pepper crop configuration'),
  ('CROP_HERBS', '{"growthStages":3,"baseYield":4,"seedCost":14,"sellPrice":12,"waterNeeds":35,"xpReward":14}'::jsonb, 'crops', 'Herbs crop configuration'),
  ('CROP_SAFFRON', '{"growthStages":5,"baseYield":1,"seedCost":30,"sellPrice":35,"waterNeeds":40,"xpReward":40}'::jsonb, 'crops', 'Saffron crop configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Audit log for config changes
CREATE TABLE IF NOT EXISTS config_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_audit_key ON config_audit_log(config_key);
CREATE INDEX IF NOT EXISTS idx_config_audit_time ON config_audit_log(created_at DESC);
