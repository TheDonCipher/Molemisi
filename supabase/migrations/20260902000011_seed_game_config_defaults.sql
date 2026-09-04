-- Seed game_config with values that match packages/game-config/src exactly
-- Uses ON CONFLICT DO UPDATE to overwrite any stale values

-- ============================================================
-- FARM SETTINGS
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('STARTING_PLOTS', '4'::jsonb, 'farm', 'Number of plots a new farm starts with', 1, 50),
  ('MAX_PLOTS', '20'::jsonb, 'farm', 'Maximum plots a farm can have', 4, 100),
  ('STARTING_CURRENCY', '100'::jsonb, 'farm', 'Starting Pula for new players', 0, 100000),
  ('STARTING_WATER', '85'::jsonb, 'farm', 'Starting water level in liters', 0, 1000),
  ('MAX_WATER', '100'::jsonb, 'farm', 'Maximum water capacity in liters', 50, 10000),
  ('STARTING_ENERGY', '100'::jsonb, 'farm', 'Starting energy for bushveld exploration', 0, 500),
  ('MAX_ENERGY', '100'::jsonb, 'farm', 'Maximum energy capacity', 50, 500)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- ECONOMY SETTINGS
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('PRICE_FLUCTUATION', '15'::jsonb, 'economy', 'Maximum price change percentage per market tick', 0, 100),
  ('MARKET_UPDATE_HOURS', '6'::jsonb, 'economy', 'Hours between market price updates', 1, 72),
  ('SELL_TAX_RATE', '5'::jsonb, 'economy', 'Percentage tax on market sales', 0, 50),
  ('CONTRACT_BONUS', '20'::jsonb, 'economy', 'Bonus percentage for contract completion', 0, 200),
  ('MARKET_OPEN_HOUR', '6'::jsonb, 'economy', 'Hour market opens (game time)', 0, 23),
  ('MARKET_CLOSE_HOUR', '20'::jsonb, 'economy', 'Hour market closes (game time)', 0, 23)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- PROGRESSION SETTINGS
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('XP_PER_LEVEL', '3000'::jsonb, 'progression', 'XP required per level', 100, 100000),
  ('XP_PLANT', '5'::jsonb, 'progression', 'XP awarded for planting a crop', 0, 500),
  ('XP_WATER', '2'::jsonb, 'progression', 'XP awarded for watering', 0, 200),
  ('XP_HARVEST', '10'::jsonb, 'progression', 'XP awarded for harvesting', 0, 500),
  ('XP_FORAGE', '5'::jsonb, 'progression', 'XP awarded for bushveld foraging', 0, 200),
  ('XP_CONTRACT', '25'::jsonb, 'progression', 'XP awarded for completing a contract', 0, 500),
  ('XP_BUILDING', '15'::jsonb, 'progression', 'XP awarded for constructing a building', 0, 500),
  ('LEVEL_UP_REWARD', '50'::jsonb, 'progression', 'Pula bonus on level up', 0, 10000)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- WEATHER SETTINGS (matches packages/game-config/src/weather.ts)
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('CLEAR_PROB', '35'::jsonb, 'weather', 'Clear weather probability percentage', 0, 100),
  ('CLOUDY_PROB', '25'::jsonb, 'weather', 'Cloudy weather probability percentage', 0, 100),
  ('RAIN_PROB', '25'::jsonb, 'weather', 'Rain weather probability percentage', 0, 100),
  ('STORM_PROB', '15'::jsonb, 'weather', 'Storm weather probability percentage', 0, 100),
  ('DROUGHT_CHANCE', '5'::jsonb, 'weather', 'Drought chance percentage', 0, 50),
  ('WEATHER_CHANGE_HOURS', '6'::jsonb, 'weather', 'Hours between weather changes', 1, 48),
  ('SEASON_DURATION_WEEKS', '4'::jsonb, 'weather', 'Weeks per season', 1, 12),
  ('FROST_RISK_WINTER', '15'::jsonb, 'weather', 'Frost risk in winter percentage', 0, 100),
  ('SPRING_GROWTH_MOD', '1.1'::jsonb, 'weather', 'Spring growth speed multiplier', 0.1, 3.0),
  ('SUMMER_GROWTH_MOD', '1.0'::jsonb, 'weather', 'Summer growth speed multiplier', 0.1, 3.0),
  ('AUTUMN_GROWTH_MOD', '1.05'::jsonb, 'weather', 'Autumn growth speed multiplier', 0.1, 3.0),
  ('WINTER_GROWTH_MOD', '0.8'::jsonb, 'weather', 'Winter growth speed multiplier', 0.1, 3.0)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- SIMULATION SETTINGS
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('SIMULATION_INTERVAL', '300'::jsonb, 'simulation', 'Simulation tick interval in seconds', 30, 3600),
  ('GROWTH_PER_TICK', '0.1'::jsonb, 'simulation', 'Crop growth per tick (0-1 scale)', 0.01, 1),
  ('HYDRATION_DECAY', '0.05'::jsonb, 'simulation', 'Hydration decay per tick', 0, 1),
  ('ENERGY_REGEN', '10'::jsonb, 'simulation', 'Energy regenerated per hour', 0, 200),
  ('ANIMAL_HUNGER_DECAY', '0.12'::jsonb, 'simulation', 'Animal hunger decay rate per hour', 0, 1),
  ('ANIMAL_HEALTH_DECAY', '0.08'::jsonb, 'simulation', 'Animal health decay rate per hour', 0, 1),
  ('ANIMAL_HAPPINESS_DECAY', '0.04'::jsonb, 'simulation', 'Animal happiness decay rate per hour', 0, 1),
  ('BUILDING_WEAR_RATE', '0.005'::jsonb, 'simulation', 'Building wear per hour', 0, 0.1),
  ('MAINTENANCE_INTERVAL_DAYS', '14'::jsonb, 'simulation', 'Days between maintenance checks', 1, 90)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- CROP CONFIGURATIONS (matches packages/game-config/src/crops.ts exactly)
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description) VALUES
  ('CROP_sorghum', '{
    "id": "sorghum",
    "name": "Sorghum",
    "unlockLevel": 1,
    "growthStages": 4,
    "timePerStage": 3,
    "waterDecayRate": 0.1,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.05,
    "pestChancePerStage": 0.03,
    "yieldMin": 3,
    "yieldMax": 5,
    "seedCost": 5,
    "basePrice": 15,
    "totalGrowthMinutes": 12
  }'::jsonb, 'crops', 'Sorghum: hardy grain, staple of Botswana agriculture'),

  ('CROP_maize', '{
    "id": "maize",
    "name": "Maize",
    "unlockLevel": 1,
    "growthStages": 5,
    "timePerStage": 4,
    "waterDecayRate": 0.15,
    "waterPerAction": 2,
    "diseaseChancePerStage": 0.08,
    "pestChancePerStage": 0.06,
    "yieldMin": 4,
    "yieldMax": 6,
    "seedCost": 8,
    "basePrice": 20,
    "totalGrowthMinutes": 20
  }'::jsonb, 'crops', 'Maize: versatile grain for food and feed'),

  ('CROP_millet', '{
    "id": "millet",
    "name": "Millet",
    "unlockLevel": 2,
    "growthStages": 4,
    "timePerStage": 2.5,
    "waterDecayRate": 0.08,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.04,
    "pestChancePerStage": 0.02,
    "yieldMin": 2,
    "yieldMax": 4,
    "seedCost": 4,
    "basePrice": 12,
    "totalGrowthMinutes": 10
  }'::jsonb, 'crops', 'Millet: fast-growing, drought resistant'),

  ('CROP_cowpeas', '{
    "id": "cowpeas",
    "name": "Cowpeas",
    "unlockLevel": 3,
    "growthStages": 4,
    "timePerStage": 3.5,
    "waterDecayRate": 0.1,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.05,
    "pestChancePerStage": 0.03,
    "yieldMin": 3,
    "yieldMax": 5,
    "seedCost": 6,
    "basePrice": 18,
    "totalGrowthMinutes": 14
  }'::jsonb, 'crops', 'Cowpeas: nutritious legume, fixes nitrogen'),

  ('CROP_groundnuts', '{
    "id": "groundnuts",
    "name": "Groundnuts",
    "unlockLevel": 4,
    "growthStages": 5,
    "timePerStage": 5,
    "waterDecayRate": 0.12,
    "waterPerAction": 2,
    "diseaseChancePerStage": 0.07,
    "pestChancePerStage": 0.08,
    "yieldMin": 4,
    "yieldMax": 7,
    "seedCost": 10,
    "basePrice": 25,
    "totalGrowthMinutes": 25
  }'::jsonb, 'crops', 'Groundnuts: valuable oilseed crop'),

  ('CROP_sesame', '{
    "id": "sesame",
    "name": "Sesame",
    "unlockLevel": 5,
    "growthStages": 4,
    "timePerStage": 4,
    "waterDecayRate": 0.09,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.04,
    "pestChancePerStage": 0.03,
    "yieldMin": 2,
    "yieldMax": 3,
    "seedCost": 15,
    "basePrice": 35,
    "totalGrowthMinutes": 16
  }'::jsonb, 'crops', 'Sesame: premium oilseed, high value'),

  ('CROP_watermelon', '{
    "id": "watermelon",
    "name": "Watermelon",
    "unlockLevel": 6,
    "growthStages": 6,
    "timePerStage": 5,
    "waterDecayRate": 0.18,
    "waterPerAction": 3,
    "diseaseChancePerStage": 0.1,
    "pestChancePerStage": 0.06,
    "yieldMin": 2,
    "yieldMax": 4,
    "seedCost": 20,
    "basePrice": 40,
    "totalGrowthMinutes": 30
  }'::jsonb, 'crops', 'Watermelon: refreshing fruit, high water need'),

  ('CROP_tomatoes', '{
    "id": "tomatoes",
    "name": "Tomatoes",
    "unlockLevel": 7,
    "growthStages": 5,
    "timePerStage": 3,
    "waterDecayRate": 0.14,
    "waterPerAction": 2,
    "diseaseChancePerStage": 0.09,
    "pestChancePerStage": 0.06,
    "yieldMin": 5,
    "yieldMax": 8,
    "seedCost": 12,
    "basePrice": 22,
    "totalGrowthMinutes": 15
  }'::jsonb, 'crops', 'Tomatoes: popular vegetable, versatile'),

  ('CROP_pepper', '{
    "id": "pepper",
    "name": "Pepper",
    "unlockLevel": 8,
    "growthStages": 4,
    "timePerStage": 4,
    "waterDecayRate": 0.1,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.06,
    "pestChancePerStage": 0.04,
    "yieldMin": 3,
    "yieldMax": 5,
    "seedCost": 25,
    "basePrice": 45,
    "totalGrowthMinutes": 16
  }'::jsonb, 'crops', 'Pepper: spicy crop, high market value'),

  ('CROP_herbs', '{
    "id": "herbs",
    "name": "Herbs",
    "unlockLevel": 9,
    "growthStages": 3,
    "timePerStage": 6,
    "waterDecayRate": 0.08,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.03,
    "pestChancePerStage": 0.02,
    "yieldMin": 1,
    "yieldMax": 3,
    "seedCost": 40,
    "basePrice": 80,
    "totalGrowthMinutes": 18
  }'::jsonb, 'crops', 'Herbs: medicinal and culinary herbs'),

  ('CROP_saffron', '{
    "id": "saffron",
    "name": "Saffron",
    "unlockLevel": 10,
    "growthStages": 5,
    "timePerStage": 8,
    "waterDecayRate": 0.07,
    "waterPerAction": 1,
    "diseaseChancePerStage": 0.04,
    "pestChancePerStage": 0.03,
    "yieldMin": 1,
    "yieldMax": 2,
    "seedCost": 80,
    "basePrice": 200,
    "totalGrowthMinutes": 40
  }'::jsonb, 'crops', 'Saffron: precious spice, extremely valuable')

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- BUILDING CONFIGURATIONS (matches packages/game-config/src/buildings.ts)
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description) VALUES
  ('BUILDING_well', '{
    "id": "well",
    "name": "Well",
    "unlockLevel": 1,
    "baseCost": {"currency": 200, "stone": 10},
    "upgradeCosts": [{"currency": 400, "stone": 20}, {"currency": 800, "stone": 40}],
    "constructionTime": 30,
    "upgradeTimes": [45, 60],
    "capacity": -1,
    "capacityType": "water",
    "maintenanceCost": 50,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Well: provides unlimited water for your farm'),

  ('BUILDING_coop', '{
    "id": "coop",
    "name": "Chicken Coop",
    "unlockLevel": 1,
    "baseCost": {"currency": 150, "wood": 5},
    "upgradeCosts": [{"currency": 300, "wood": 10}, {"currency": 600, "wood": 20}],
    "constructionTime": 20,
    "upgradeTimes": [30, 45],
    "capacity": 10,
    "capacityType": "chicken",
    "maintenanceCost": 37,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Chicken Coop: cozy shelter for chickens'),

  ('BUILDING_barn', '{
    "id": "barn",
    "name": "Barn",
    "unlockLevel": 2,
    "baseCost": {"currency": 500, "wood": 20, "stone": 10},
    "upgradeCosts": [{"currency": 1000, "wood": 40, "stone": 20}, {"currency": 2000, "wood": 80, "stone": 40}],
    "constructionTime": 60,
    "upgradeTimes": [90, 120],
    "capacity": 50,
    "capacityType": "storage",
    "maintenanceCost": 125,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Barn: storage for harvested crops and materials'),

  ('BUILDING_goat_pen', '{
    "id": "goat_pen",
    "name": "Goat Pen",
    "unlockLevel": 3,
    "baseCost": {"currency": 300, "wood": 10},
    "upgradeCosts": [{"currency": 600, "wood": 20}, {"currency": 1200, "wood": 40}],
    "constructionTime": 30,
    "upgradeTimes": [45, 60],
    "capacity": 5,
    "capacityType": "goat",
    "maintenanceCost": 75,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Goat Pen: shelter for goats'),

  ('BUILDING_mill', '{
    "id": "mill",
    "name": "Mill",
    "unlockLevel": 4,
    "baseCost": {"currency": 400, "stone": 15, "wood": 5},
    "upgradeCosts": [{"currency": 800, "stone": 30, "wood": 10}, {"currency": 1600, "stone": 60, "wood": 20}],
    "constructionTime": 45,
    "upgradeTimes": [60, 90],
    "capacity": 5,
    "capacityType": "production",
    "maintenanceCost": 100,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Mill: process grain into flour'),

  ('BUILDING_paddock', '{
    "id": "paddock",
    "name": "Paddock",
    "unlockLevel": 5,
    "baseCost": {"currency": 800, "wood": 30, "stone": 15},
    "upgradeCosts": [{"currency": 1600, "wood": 60, "stone": 30}, {"currency": 3200, "wood": 120, "stone": 60}],
    "constructionTime": 90,
    "upgradeTimes": [120, 150],
    "capacity": 3,
    "capacityType": "cow",
    "maintenanceCost": 200,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Paddock: open area for cattle'),

  ('BUILDING_pig_pen', '{
    "id": "pig_pen",
    "name": "Pig Pen",
    "unlockLevel": 6,
    "baseCost": {"currency": 600, "wood": 20, "stone": 10},
    "upgradeCosts": [{"currency": 1200, "wood": 40, "stone": 20}, {"currency": 2400, "wood": 80, "stone": 40}],
    "constructionTime": 60,
    "upgradeTimes": [90, 120],
    "capacity": 4,
    "capacityType": "pig",
    "maintenanceCost": 150,
    "maintenanceIntervalDays": 14
  }'::jsonb, 'buildings', 'Pig Pen: enclosed area for pigs')

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- LIVESTOCK CONFIGURATIONS (matches packages/game-config/src/livestock.ts)
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description) VALUES
  ('ANIMAL_chicken', '{
    "id": "chicken",
    "name": "Chicken",
    "unlockLevel": 1,
    "feedPerDay": 2,
    "feedType": "grain",
    "productionCycleHours": 12,
    "productType": "egg",
    "productQuantity": 2,
    "baseProductPrice": 5,
    "purchaseCost": 50,
    "hungerDecayRate": 0.15,
    "healthDecayRate": 0.1,
    "happinessDecayRate": 0.05,
    "buildingRequired": "coop"
  }'::jsonb, 'livestock', 'Chicken: friendly, lays eggs daily'),

  ('ANIMAL_goat', '{
    "id": "goat",
    "name": "Goat",
    "unlockLevel": 3,
    "feedPerDay": 4,
    "feedType": "hay",
    "productionCycleHours": 24,
    "productType": "goat_milk",
    "productQuantity": 1,
    "baseProductPrice": 15,
    "purchaseCost": 150,
    "hungerDecayRate": 0.12,
    "healthDecayRate": 0.08,
    "happinessDecayRate": 0.04,
    "buildingRequired": "goat_pen"
  }'::jsonb, 'livestock', 'Goat: hardy, produces milk'),

  ('ANIMAL_cow', '{
    "id": "cow",
    "name": "Cow",
    "unlockLevel": 5,
    "feedPerDay": 8,
    "feedType": "hay",
    "productionCycleHours": 24,
    "productType": "cow_milk",
    "productQuantity": 3,
    "baseProductPrice": 15,
    "purchaseCost": 400,
    "hungerDecayRate": 0.1,
    "healthDecayRate": 0.06,
    "happinessDecayRate": 0.03,
    "buildingRequired": "paddock"
  }'::jsonb, 'livestock', 'Cow: dairy cow, produces milk'),

  ('ANIMAL_pig', '{
    "id": "pig",
    "name": "Pig",
    "unlockLevel": 6,
    "feedPerDay": 6,
    "feedType": "mixed_feed",
    "productionCycleHours": 48,
    "productType": "truffle",
    "productQuantity": 1,
    "baseProductPrice": 50,
    "purchaseCost": 300,
    "hungerDecayRate": 0.13,
    "healthDecayRate": 0.07,
    "happinessDecayRate": 0.04,
    "buildingRequired": "pig_pen"
  }'::jsonb, 'livestock', 'Pig: occasionally finds truffles')

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================
-- BUSHVELD CONFIGURATION
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('BUSHVELD_ENERGY_COST', '5'::jsonb, 'bushveld', 'Energy cost for bushveld foraging', 0, 50),
  ('BUSHVELD_REST_RESTORE', '15'::jsonb, 'bushveld', 'Energy restored by resting at baobab grove', 0, 100),
  ('BUSHVELD_MINE_COST', '10'::jsonb, 'bushveld', 'Energy cost for mining at granite outcrop', 0, 50),
  ('BUSHVELD_RARE_FIND_CHANCE', '8'::jsonb, 'bushveld', 'Chance percentage for rare discovery', 0, 50),
  ('BUSHVELD_MAX_SLOTS', '50'::jsonb, 'bushveld', 'Max inventory slots for bushveld finds', 10, 200)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- KGOTLA / CONTRACTS CONFIGURATION
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description, min_value, max_value) VALUES
  ('CONTRACT_MAX_ACTIVE', '3'::jsonb, 'kgotla', 'Maximum active contracts per player', 1, 10),
  ('CONTRACT_DURATION_HOURS', '48'::jsonb, 'kgotla', 'Default contract duration in hours', 1, 168),
  ('CONTRACT_REPUTATION_GAIN', '50'::jsonb, 'kgotla', 'Reputation gained for completing contract', 0, 500),
  ('CONTRACT_REPUTATION_LOSS', '25'::jsonb, 'kgotla', 'Reputation lost for failing contract', 0, 500),
  ('KGOTLA_REP_MAX', '1000'::jsonb, 'kgotla', 'Maximum community reputation', 100, 10000)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  updated_at = NOW();

-- ============================================================
-- NARRATIVE / LOCALIZATION
-- ============================================================
INSERT INTO game_config (config_key, config_value, category, description) VALUES
  ('LOCALE_DEFAULT', '"en"'::jsonb, 'localization', 'Default language locale'),
  ('LOCALE_SUPPORTED', '["en", "tn"]'::jsonb, 'localization', 'Supported language locales'),
  ('SEASONS_NAMES', '{"spring": "Spring", "summer": "Summer", "autumn": "Autumn", "winter": "Winter"}'::jsonb, 'localization', 'Season display names'),
  ('SEASONS_NAMES_TN', '{"spring": "Septula", "summer": "Newa", "autumn": "Dikgatsi", "winter": "Newula"}'::jsonb, 'localization', 'Season display names in Setswana')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();
