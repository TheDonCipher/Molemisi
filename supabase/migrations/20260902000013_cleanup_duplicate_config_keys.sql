-- Remove old uppercase crop keys superseded by lowercase versions from seed migration
-- The canonical keys are lowercase: CROP_sorghum, CROP_maize, etc.
DELETE FROM game_config
WHERE config_key IN (
  'CROP_SORGHUM', 'CROP_MAIZE', 'CROP_MILLET', 'CROP_COWPEAS',
  'CROP_GROUNDNUTS', 'CROP_SESAME', 'CROP_WATERMELON', 'CROP_TOMATOES',
  'CROP_PEPPER', 'CROP_HERBS', 'CROP_SAFFRON'
);
