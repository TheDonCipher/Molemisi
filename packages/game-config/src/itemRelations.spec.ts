/**
 * Item relations & lore — the Item Detail card's facts must always be derivable
 * from the config tables. If a recipe, hotspot, chapter or building changes, the
 * relations change with it; a test pinned to a value the spec changed is a bug
 * in the test, so these assert STRUCTURE and AGREEMENT, not hardcoded balance.
 */
import {
  ANIMALS,
  CHAPTERS,
  DEEP_BUSHVELD_HOTSPOTS,
  HOTSPOTS,
  ITEMS,
  PRODUCT_ITEM,
  RECIPES,
  buildingsUsingItem,
  productValuePula,
  recipeProducingItem,
  recipesUsingItem,
  sourcesForItem,
} from './index';

describe('Item lore — narrative voice (docs/MOLEMISI_Field_Journal_Narrative_Voice_v1)', () => {
  it('every item carries an elder-voiced lore line', () => {
    const all = Object.values(ITEMS);
    expect(all.length).toBeGreaterThanOrEqual(40);
    for (const item of all) {
      expect(item.lore.trim().length).toBeGreaterThanOrEqual(24);
    }
  });

  it('lore never talks mechanics — no prices, counts or system words', () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.lore).not.toMatch(/pula|botho|kagiso|\d/i);
    }
  });
});

describe('sourcesForItem', () => {
  it('returns [] for unknown slugs', () => {
    expect(sourcesForItem('no_such_item')).toEqual([]);
  });

  it('crops are grown from their seed', () => {
    expect(sourcesForItem('sorghum')).toEqual([{ kind: 'grow', cropId: 'sorghum' }]);
  });

  it('seeds are bought at the Co-op in exactly the chapters that stock them (04 §9.2)', () => {
    const expected = CHAPTERS.filter((c) => (c.seeds as string[]).includes('sorghum')).map(
      (c) => c.slug,
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(sourcesForItem('sorghum_seed')).toEqual([{ kind: 'buy', chapters: expected }]);
  });

  it('livestock products come from the animals that produce them', () => {
    expect(sourcesForItem('eggs')).toEqual([{ kind: 'raise', animalId: 'chicken' }]);
    const milkAnimals = sourcesForItem('milk')
      .map((s) => (s.kind === 'raise' ? s.animalId : ''))
      .sort();
    expect(milkAnimals).toEqual(['cow', 'goat']);
    expect(sourcesForItem('truffle')).toEqual([{ kind: 'raise', animalId: 'pig' }]);
  });

  it('G1: manure comes from every animal — the byproduct of a collect (03 §5)', () => {
    const raised = sourcesForItem('manure').filter((s) => s.kind === 'raise');
    // Not one animal's product — every animal's muck-out.
    expect(raised).toHaveLength(Object.keys(ANIMALS).length);
  });

  it('G2/G3: every animal product maps to a real item whose baseValue IS the price of record', () => {
    // AnimalConfig.baseProductPrice is deleted — this pins the single source
    // so the two-price disagreement (eggs 3 vs 5, milk 5 vs 15) cannot return.
    for (const animal of Object.values(ANIMALS)) {
      const slug = PRODUCT_ITEM[animal.productType];
      if (!slug) throw new Error(`${animal.id} product '${animal.productType}' maps to no item`);
      if (!ITEMS[slug]) throw new Error(`item '${slug}' does not exist`);
      expect(productValuePula(animal)).toBe(ITEMS[slug]!.baseValue);
    }
    // The resolved ruling: the AnimalConfig prices won (payback math was tuned on them).
    expect(ITEMS.eggs!.baseValue).toBe(5);
    expect(ITEMS.milk!.baseValue).toBe(15);
    expect(ITEMS.truffle!.baseValue).toBe(50);
  });

  it('bushveld materials name their scene, hotspot and tell', () => {
    const wood = sourcesForItem('wood');
    expect(wood.length).toBeGreaterThanOrEqual(2); // both deadfall hotspots drop it
    for (const s of wood) {
      if (s.kind !== 'forage') throw new Error('wood should only be foraged');
      // G5/G7 — wood grows in Open Bush, on the riverbank, and (batch 2) in the
      // Deep Bushveld's deadfall.
      expect(['open_bush', 'riverbank', 'deep_bushveld']).toContain(s.scene);
      expect(s.tell.length).toBeGreaterThan(0);
      expect(s.months).toBeUndefined(); // everyday wood is never tagged seasonal
    }
  });

  it('G7/G5: wood has two scenes; hardwood grows only in the Deep Bushveld', () => {
    const woodScenes = sourcesForItem('wood')
      .filter((s) => s.kind === 'forage')
      .map((s) => (s as { scene: string }).scene);
    expect(woodScenes).toContain('open_bush');
    expect(woodScenes).toContain('riverbank');

    expect(ITEMS['hardwood']).toBeDefined();
    const hardwoodScenes = sourcesForItem('hardwood')
      .filter((s) => s.kind === 'forage')
      .map((s) => (s as { scene: string }).scene);
    expect(hardwoodScenes.length).toBeGreaterThan(0);
    expect(hardwoodScenes.every((sc) => sc === 'deep_bushveld')).toBe(true);
    // None of the three base scenes may drop it.
    expect(HOTSPOTS.some((h) => h.loot.some((l) => l.item === 'hardwood'))).toBe(false);
    expect(DEEP_BUSHVELD_HOTSPOTS.some((h) => h.loot.some((l) => l.item === 'hardwood'))).toBe(
      true,
    );
  });

  it('seasonal loot carries its real-calendar months (phane: Moranang & Sedimonthole)', () => {
    expect(sourcesForItem('phane')).toEqual([
      {
        kind: 'forage',
        scene: 'open_bush',
        hotspotId: 'ob_setlhare_sa_phane',
        tell: 'Stripped deadfall',
        months: [4, 12],
      },
    ]);
  });

  it('crafted goods come from their recipe', () => {
    expect(sourcesForItem('poleto')).toEqual([{ kind: 'craft', recipeSlug: 'poleto' }]);
    expect(sourcesForItem('borotho')).toEqual([{ kind: 'craft', recipeSlug: 'borotho' }]);
  });

  it('starter tools have no config source — the card falls back to lore alone', () => {
    expect(sourcesForItem('mogoma')).toEqual([]);
  });
});

describe('recipesUsingItem / recipeProducingItem', () => {
  it('raw materials point at their recipes', () => {
    expect(recipesUsingItem('wood').map((r) => r.slug)).toEqual(['poleto']);
    expect(recipesUsingItem('palm_fiber').map((r) => r.slug)).toEqual(['thapo']);
    expect(recipesUsingItem('clay').map((r) => r.slug)).toContain('setena');
    expect(recipesUsingItem('stone').map((r) => r.slug)).toContain('setena');
  });

  it('substitution groups resolve back to the recipe', () => {
    // F8: Setena takes any two of clay/stone — both inputs must find it.
    expect(recipesUsingItem('sorghum').map((r) => r.slug)).toContain('bupi');
    expect(recipesUsingItem('millet').map((r) => r.slug)).toContain('bupi');
  });

  it('intermediate goods point both ways (bupi: made from grain, baked into borotho)', () => {
    expect(recipeProducingItem('bupi')?.slug).toBe('bupi');
    expect(recipesUsingItem('bupi').map((r) => r.slug)).toContain('borotho');
  });

  it('every recipe output is a real item whose sources include that recipe', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(ITEMS[recipe.output]).toBeDefined();
      expect(sourcesForItem(recipe.output)).toContainEqual({
        kind: 'craft',
        recipeSlug: recipe.slug,
      });
    }
  });

  it('returns nothing for unknown slugs', () => {
    expect(recipesUsingItem('no_such_item')).toEqual([]);
    expect(recipeProducingItem('no_such_item')).toBeUndefined();
  });
});

describe('buildingsUsingItem', () => {
  it('crafted materials keep their demand — construction and maintenance (03 §3.5 / C21)', () => {
    for (const slug of ['poleto', 'thapo', 'setena']) {
      expect(buildingsUsingItem(slug).length).toBeGreaterThan(0);
    }
    const kraal = buildingsUsingItem('thapo').find((u) => u.building.id === 'kraal');
    expect(kraal?.uses).toContain('maintenance');
  });

  it('G6: thatch is a building input; the other raw materials are not', () => {
    // Thatch joined the costs (storage upgrades + the kraal's build), which is
    // what makes foraged reeds demand rather than a dead-end.
    const storage = buildingsUsingItem('thatch').find((u) => u.building.id === 'storage');
    expect(storage?.uses).toContain('upgrade');
    const kraal = buildingsUsingItem('thatch').find((u) => u.building.id === 'kraal');
    expect(kraal?.uses).toContain('construction');
    // Everything else raw stays out of the build sheet.
    expect(buildingsUsingItem('wood')).toEqual([]);
    expect(buildingsUsingItem('clay')).toEqual([]);
    expect(buildingsUsingItem('no_such_item')).toEqual([]);
  });
});
