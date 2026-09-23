/**
 * Item relationships — where a thing comes from and what it becomes.
 *
 * Everything here is DERIVED from the config tables (crops, chapters, livestock,
 * bushveld hotspots, recipes, buildings). Add a recipe, a hotspot or a building
 * and the relationships update themselves — nothing is hand-listed, so the Item
 * Detail card can never drift from the balance data.
 */
import { CROPS, type CropId } from './crops';
import { CHAPTERS, type ChapterSlug } from './chapters';
import { ANIMALS, PRODUCT_ITEM } from './livestock';
import { DEEP_BUSHVELD_HOTSPOTS, HOTSPOTS, type SceneSlug } from './bushveld';
import { RECIPES, type RecipeDef } from './crafting';
import { BUILDINGS, type BuildCost, type BuildingConfig } from './buildings';
import { getItemDef } from './items';

export type ItemSourceKind = 'grow' | 'forage' | 'raise' | 'craft' | 'buy';

/**
 * A single "where it comes from" fact. Structured, not pre-formatted —
 * resolving display strings is the client's job.
 */
export type ItemSource =
  | { kind: 'grow'; cropId: CropId }
  | { kind: 'forage'; scene: SceneSlug; hotspotId: string; tell: string; months?: number[] }
  | { kind: 'raise'; animalId: string }
  | { kind: 'craft'; recipeSlug: RecipeDef['slug'] }
  | { kind: 'buy'; chapters: ChapterSlug[] };

const ALL_HOTSPOTS = [...HOTSPOTS, ...DEEP_BUSHVELD_HOTSPOTS];

// The productType -> item slug bridge is PRODUCT_ITEM in ./livestock (G2/G3 —
// single-sourced next to the animals so the mapping and the price of record
// cannot drift).

/**
 * Every way a player can obtain the item. Returns [] when the config defines no
 * source (e.g. the starter tools) — the card falls back to lore alone.
 */
export function sourcesForItem(slug: string): ItemSource[] {
  const def = getItemDef(slug);
  if (!def) return [];
  const sources: ItemSource[] = [];

  // Seeds are bought at the Co-op, in the chapters that stock them (04 §9.2).
  if (def.category === 'DIPEO') {
    const cropId = slug.replace(/_seed$/, '') as CropId;
    if (CROPS[cropId]) {
      const chapters = CHAPTERS.filter((c) => (c.seeds as string[]).includes(cropId)).map(
        (c) => c.slug,
      );
      if (chapters.length > 0) sources.push({ kind: 'buy', chapters });
    }
    return sources;
  }

  // Crops are grown from their seed.
  if (def.category === 'DIJALO') sources.push({ kind: 'grow', cropId: slug as CropId });

  // Livestock products come from the animals that produce them.
  for (const animal of Object.values(ANIMALS)) {
    if (PRODUCT_ITEM[animal.productType] === slug) {
      sources.push({ kind: 'raise', animalId: animal.id });
    }
  }

  // Bushveld materials come from hotspots. Seasonal loot carries its real months
  // (04 §9.3); everyday loot is never tagged seasonal.
  for (const hotspot of ALL_HOTSPOTS) {
    if (hotspot.loot.some((entry) => entry.item === slug)) {
      sources.push({
        kind: 'forage',
        scene: hotspot.scene,
        hotspotId: hotspot.id,
        tell: hotspot.tell,
      });
      continue;
    }
    if ((hotspot.seasonalLoot ?? []).some((entry) => entry.item === slug)) {
      sources.push({
        kind: 'forage',
        scene: hotspot.scene,
        hotspotId: hotspot.id,
        tell: hotspot.tell,
        months: hotspot.activeMonths,
      });
    }
  }

  // Crafted goods come from their recipe.
  const recipe = recipeProducingItem(slug);
  if (recipe) sources.push({ kind: 'craft', recipeSlug: recipe.slug });

  return sources;
}

/** Every recipe that consumes the item (substitution groups included). */
export function recipesUsingItem(slug: string): RecipeDef[] {
  return Object.values(RECIPES).filter((recipe) =>
    recipe.inputs.some((group) => group.anyOf.includes(slug)),
  );
}

/** The recipe that produces the item, if it is craftable. */
export function recipeProducingItem(slug: string): RecipeDef | undefined {
  return Object.values(RECIPES).find((recipe) => recipe.output === slug);
}

export type BuildingItemUse = 'construction' | 'upgrade' | 'maintenance';

export interface BuildingItemUsage {
  building: BuildingConfig;
  uses: BuildingItemUse[];
}

/** BuildCost material columns ARE item slugs ('poleto' | 'thapo' | 'setena'). */
function costConsumes(cost: BuildCost | undefined, slug: string): boolean {
  if (!cost) return false;
  const amount = (cost as unknown as Record<string, number | undefined>)[slug];
  return typeof amount === 'number' && amount > 0;
}

/**
 * Buildings that consume the item, and how. Maintenance matters most
 * (03 §3.5 / C21 — it is what keeps Poleto, Thapo and Setena from going dead).
 */
export function buildingsUsingItem(slug: string): BuildingItemUsage[] {
  const usages: BuildingItemUsage[] = [];
  for (const building of Object.values(BUILDINGS)) {
    const uses: BuildingItemUse[] = [];
    if (costConsumes(building.baseCost, slug)) uses.push('construction');
    if (building.upgradeCosts.some((cost) => costConsumes(cost, slug))) uses.push('upgrade');
    if (costConsumes(building.maintenanceMaterials, slug)) uses.push('maintenance');
    if (uses.length > 0) usages.push({ building, uses });
  }
  return usages;
}
