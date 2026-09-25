/**
 * Inventory item view-model — resolves an item slug into everything the Item
 * Detail card shows. All facts come from @molemisi/game-config; this file only
 * turns the structured relations into display strings. (Pattern: journalVoice.ts.)
 */
import {
  ANIMALS,
  CHAPTERS,
  CROPS,
  INTENT_GROUP_LABELS,
  RECIPES,
  SCENES,
  SETSWANA_MONTHS,
  buildingsUsingItem,
  getItemDef,
  intentGroup,
  recipeProducingItem,
  recipesUsingItem,
  sourcesForItem,
  type BuildingItemUse,
  type IntentGroup,
  type ItemDef,
  type ItemSource,
  type RecipeDef,
} from '@molemisi/game-config';

export interface ItemSourceLine {
  kind: ItemSource['kind'];
  /** Main label, e.g. "Open Bush — Deadfall" or "Molepolole Co-op · Kanye". */
  text: string;
  /** Secondary qualifier, e.g. seasonal months. */
  sub?: string;
}

export interface ItemBuildingUseLine {
  slug: string;
  name: string;
  setswana: string;
  uses: BuildingItemUse[];
}

export interface ItemInfo {
  def: ItemDef;
  intent: IntentGroup;
  sources: ItemSourceLine[];
  producedBy: RecipeDef | null;
  usedInRecipes: RecipeDef[];
  usedByBuildings: ItemBuildingUseLine[];
}

function sourceLine(source: ItemSource): ItemSourceLine {
  switch (source.kind) {
    case 'grow': {
      const crop = CROPS[source.cropId];
      const seed = getItemDef(`${source.cropId}_seed`);
      return { kind: 'grow', text: crop ? crop.name : source.cropId, sub: seed?.setswana };
    }
    case 'forage': {
      const scene = SCENES.find((s) => s.slug === source.scene);
      const months = source.months
        ?.map((m) => SETSWANA_MONTHS[m - 1])
        .filter((name): name is (typeof SETSWANA_MONTHS)[number] => Boolean(name));
      return {
        kind: 'forage',
        text: scene ? `${scene.name} — ${source.tell}` : source.tell,
        sub: months && months.length > 0 ? months.join(' & ') : undefined,
      };
    }
    case 'raise': {
      const animal = Object.values(ANIMALS).find((a) => a.id === source.animalId);
      return { kind: 'raise', text: animal?.name ?? source.animalId };
    }
    case 'craft': {
      const recipe = RECIPES[source.recipeSlug];
      return {
        kind: 'craft',
        text: recipe ? `${recipe.setswana} (${recipe.name})` : source.recipeSlug,
      };
    }
    case 'buy': {
      const names = source.chapters.map(
        (slug) => CHAPTERS.find((c) => c.slug === slug)?.name ?? slug,
      );
      return { kind: 'buy', text: names.join(' · ') };
    }
  }
}

/** Full detail for one item, or null when the slug isn't in the catalogue. */
export function getItemInfo(itemType?: string | null): ItemInfo | null {
  const def = itemType ? getItemDef(itemType) : undefined;
  if (!def) return null;
  return {
    def,
    intent: intentGroup(def),
    sources: sourcesForItem(def.slug).map(sourceLine),
    producedBy: recipeProducingItem(def.slug) ?? null,
    usedInRecipes: recipesUsingItem(def.slug),
    usedByBuildings: buildingsUsingItem(def.slug).map((u) => ({
      slug: u.building.id,
      name: u.building.name,
      setswana: u.building.setswana,
      uses: u.uses,
    })),
  };
}

/** Intent chip copy, in the player's language ('en' | 'tn'). */
export function intentLabel(intent: IntentGroup, language: string): string {
  return language === 'tn' ? INTENT_GROUP_LABELS[intent].tn : INTENT_GROUP_LABELS[intent].en;
}
