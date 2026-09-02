/**
 * Virtual Goods Configuration
 *
 * All purchasable items in the Molemisi store.
 * Organized by category with pricing in Pula (BWP).
 *
 * Monetization Strategy (from PRD):
 * 1. Cosmetics — skins, decorations, themes
 * 2. Convenience — speed boosts, extra plots, storage
 * 3. Premium content — exclusive crops, buildings
 *
 * No pay-to-win. All items must be achievable through gameplay eventually.
 */

export interface VirtualGood {
  sku: string;
  name: string;
  description: string;
  category: 'cosmetic' | 'convenience' | 'premium';
  /** Price in Pula (BWP) */
  price: number;
  /** Currency code */
  currency: string;
  /** Whether this item is consumable (one-time use) or permanent */
  consumable: boolean;
  /** Whether this item is currently available in the store */
  available: boolean;
  /** Seasonal restriction — null means always available */
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** What the player gets — used by the entitlement system */
  entitlement: VirtualEntitlement;
  /** Display order in store */
  displayOrder: number;
}

export type VirtualEntitlement =
  | { type: 'currency'; amount: number }
  | { type: 'decoration'; decorationId: string }
  | { type: 'plot_slots'; count: number }
  | { type: 'storage_slots'; count: number }
  | { type: 'cosmetic_theme'; themeId: string }
  | { type: 'speed_boost'; multiplier: number; durationHours: number }
  | { type: 'premium_crop'; cropId: string }
  | { type: 'premium_building'; buildingId: string };

export const VIRTUAL_GOODS: VirtualGood[] = [
  // ── Cosmetics ──────────────────────────────────────────────
  {
    sku: 'cosm_sunflower_deco',
    name: 'Sunflower Decoration',
    description: 'A cheerful sunflower patch for your farm.',
    category: 'cosmetic',
    price: 50,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'decoration', decorationId: 'sunflower_patch' },
    displayOrder: 1,
  },
  {
    sku: 'cosm_wooden_fence',
    name: 'Wooden Fence Set',
    description: 'Rustic wooden fencing around your plots.',
    category: 'cosmetic',
    price: 75,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'decoration', decorationId: 'wooden_fence' },
    displayOrder: 2,
  },
  {
    sku: 'cosm_rain_theme',
    name: 'Rainy Day Theme',
    description: 'A cozy rainy atmosphere for your farm.',
    category: 'cosmetic',
    price: 100,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'cosmetic_theme', themeId: 'rainy_day' },
    displayOrder: 3,
  },
  {
    sku: 'cosm_harvest_theme',
    name: 'Harvest Festival Theme',
    description: 'Warm autumn colors for your farm.',
    category: 'cosmetic',
    price: 100,
    currency: 'BWP',
    consumable: false,
    available: true,
    season: 'autumn',
    entitlement: { type: 'cosmetic_theme', themeId: 'harvest_festival' },
    displayOrder: 4,
  },

  // ── Convenience ────────────────────────────────────────────
  {
    sku: 'conv_500_pula',
    name: '500 Pula',
    description: 'A little extra to help your farm grow.',
    category: 'convenience',
    price: 25,
    currency: 'BWP',
    consumable: true,
    available: true,
    entitlement: { type: 'currency', amount: 500 },
    displayOrder: 10,
  },
  {
    sku: 'conv_1500_pula',
    name: '1,500 Pula',
    description: 'A generous boost for your farm.',
    category: 'convenience',
    price: 60,
    currency: 'BWP',
    consumable: true,
    available: true,
    entitlement: { type: 'currency', amount: 1500 },
    displayOrder: 11,
  },
  {
    sku: 'conv_5000_pula',
    name: '5,000 Pula',
    description: 'A major investment in your agricultural future.',
    category: 'convenience',
    price: 150,
    currency: 'BWP',
    consumable: true,
    available: true,
    entitlement: { type: 'currency', amount: 5000 },
    displayOrder: 12,
  },
  {
    sku: 'conv_speed_boost_1h',
    name: 'Growth Elixir (1h)',
    description: 'Doubles crop growth speed for 1 hour.',
    category: 'convenience',
    price: 80,
    currency: 'BWP',
    consumable: true,
    available: true,
    entitlement: { type: 'speed_boost', multiplier: 2, durationHours: 1 },
    displayOrder: 13,
  },
  {
    sku: 'conv_extra_plot_3',
    name: '3 Extra Plot Slots',
    description: 'Expand your farm with 3 additional planting plots.',
    category: 'convenience',
    price: 200,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'plot_slots', count: 3 },
    displayOrder: 14,
  },
  {
    sku: 'conv_extra_storage_20',
    name: '20 Extra Storage Slots',
    description: 'More room in your storage building.',
    category: 'convenience',
    price: 120,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'storage_slots', count: 20 },
    displayOrder: 15,
  },

  // ── Premium ────────────────────────────────────────────────
  {
    sku: 'prem_saffron_seed',
    name: 'Saffron Seed Pack',
    description: 'Rare saffron seeds — extremely valuable when harvested.',
    category: 'premium',
    price: 300,
    currency: 'BWP',
    consumable: true,
    available: true,
    entitlement: { type: 'premium_crop', cropId: 'saffron' },
    displayOrder: 20,
  },
  {
    sku: 'prem_greenhouse',
    name: 'Greenhouse Blueprint',
    description: 'Build a greenhouse that protects crops from weather.',
    category: 'premium',
    price: 500,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'premium_building', buildingId: 'greenhouse' },
    displayOrder: 21,
  },
  {
    sku: 'prem_irrigation_system',
    name: 'Irrigation System',
    description: 'Automated watering — crops stay hydrated without manual watering.',
    category: 'premium',
    price: 400,
    currency: 'BWP',
    consumable: false,
    available: true,
    entitlement: { type: 'premium_building', buildingId: 'irrigation_system' },
    displayOrder: 22,
  },
];

export function getVirtualGood(sku: string): VirtualGood | undefined {
  return VIRTUAL_GOODS.find((g) => g.sku === sku);
}

export function getAvailableGoods(
  season?: 'spring' | 'summer' | 'autumn' | 'winter',
): VirtualGood[] {
  return VIRTUAL_GOODS.filter((g) => {
    if (!g.available) return false;
    if (g.season && g.season !== season) return false;
    return true;
  });
}

export function getGoodsByCategory(
  category: VirtualGood['category'],
): VirtualGood[] {
  return VIRTUAL_GOODS.filter(
    (g) => g.category === category && g.available,
  );
}
