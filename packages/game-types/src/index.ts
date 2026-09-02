// ============================================
// GAME STATE TYPES
// ============================================

export type PlotState = 'EMPTY' | 'PLANTED' | 'GROWING' | 'READY' | 'WITHERED';
export type BuildingState = 'CONSTRUCTION' | 'ACTIVE' | 'MAINTENANCE_NEEDED' | 'DISABLED';
export type ContractStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';
export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm' | 'drought';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type ItemCategory = 'seed' | 'feed' | 'fertilizer' | 'medicine' | 'material' | 'product' | 'processed' | 'tool' | 'decoration';
export type QualityTier = 'poor' | 'normal' | 'good' | 'excellent';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// ============================================
// DATABASE ENTITY TYPES
// ============================================

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  farm_name: string;
  farm_level: number;
  farm_xp: number;
  farming_skill: number;
  farming_skill_xp: number;
  husbandry_skill: number;
  husbandry_skill_xp: number;
  trading_skill: number;
  trading_skill_xp: number;
  currency: number;
  energy: number;
  max_energy: number;
  last_active_at: string;
  last_simulated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  level: number;
  xp: number;
  plot_count: number;
  max_plots: number;
  weather_state: WeatherType;
  weather_changed_at: string;
  season: SeasonType;
  season_day: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FarmPlot {
  id: string;
  farm_id: string;
  slot_index: number;
  state: PlotState;
  created_at: string;
  updated_at: string;
}

export interface CropInstance {
  id: string;
  plot_id: string;
  farm_id: string;
  crop_type: string;
  growth_stage: number;
  max_growth_stages: number;
  hydration: number;
  health: number;
  fertilizer_active: boolean;
  fertilizer_bonus: number;
  disease_events: number;
  pest_events: number;
  planted_at: string;
  last_watered_at: string;
  expected_ready_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Livestock {
  id: string;
  farm_id: string;
  animal_type: string;
  name: string | null;
  hunger: number;
  health: number;
  happiness: number;
  product_ready: boolean;
  product_timer: string | null;
  last_fed_at: string;
  last_pet_at: string | null;
  is_sick: boolean;
  sick_since: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Building {
  id: string;
  farm_id: string;
  building_type: string;
  level: number;
  state: BuildingState;
  capacity: number;
  wear: number;
  construction_started_at: string | null;
  construction_ends_at: string | null;
  last_maintained_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InventoryItem {
  id: string;
  farm_id: string;
  item_type: string;
  item_category: ItemCategory;
  quantity: number;
  quality: QualityTier;
  created_at: string;
  updated_at: string;
}

export interface GameLedgerEntry {
  id: string;
  farm_id: string;
  entry_type: string;
  reference_type: string | null;
  reference_id: string | null;
  currency_change: number;
  currency_balance_after: number;
  item_type: string | null;
  item_quantity_change: number | null;
  item_quality: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface PlantCropRequest {
  cropType: string;
  seedId: string;
}

export interface PlantCropResponse {
  plot: FarmPlot & { crop: CropInstance };
  inventoryDeduction: { itemId: string; quantity: number };
  xpGained: number;
}

export interface WaterCropResponse {
  plot: FarmPlot & { crop: { hydration: number; lastWateredAt: string } };
  waterUsed: number;
  xpGained: number;
}

export interface HarvestCropResponse {
  plot: FarmPlot & { crop: null };
  harvest: {
    cropType: string;
    yield: number;
    quality: QualityTier;
    qualityScore: number;
    xpGained: number;
  };
  inventoryAddition: {
    itemType: string;
    quantity: number;
    quality: QualityTier;
  };
}
