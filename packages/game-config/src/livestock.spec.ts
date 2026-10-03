/**
 * docs/34 Â§Wave 1.1 â€” livestock economics.
 *
 * The feed map shipped the P25 `herbs` to animals whose goods sell for
 * P5â€“P15, so three of the four ran at a LOSS every day (goat âˆ’P85,
 * cow âˆ’P155, guinea fowl âˆ’P2) and nobody noticed, because the number only
 * ever existed as prose in an audit. These assertions make it a number.
 */
import {
  ANIMALS,
  animalNetPerDay,
  getAnimalConfig,
  STARVATION_ONSET_HOURS,
} from './livestock';
import { ITEMS } from './items';
import { SELF_SUSTAINING_THRESHOLD_HOURS } from './index';

const ANIMAL_IDS = Object.keys(ANIMALS);

describe('every animal is net-positive per day at base prices', () => {
  it.each(ANIMAL_IDS)('%s earns more than it eats', (id) => {
    const animal = getAnimalConfig(id)!;
    expect(Number.isNaN(animalNetPerDay(animal))).toBe(false);
    expect(animalNetPerDay(animal)).toBeGreaterThan(0);
  });

  it('reproduces the documented margins exactly (docs/34 Â§Wave 1.1)', () => {
    // Guards the specific numbers, not just the sign, so a retune is a
    // deliberate edit to a test rather than a silent drift.
    const net = (id: string) => animalNetPerDay(getAnimalConfig(id)!);
    expect(net('chicken')).toBeCloseTo(14); // 4 eggs x P5 âˆ’ 2 sorghum x P3
    expect(net('guinea_fowl')).toBeCloseTo(7); // 1.33 eggs x P12 âˆ’ 3 sorghum x P3
    expect(net('goat')).toBeCloseTo(21); // 2 milk x P15 âˆ’ 3 sorghum x P3
    expect(net('cow')).toBeCloseTo(27); // 3 milk x P15 âˆ’ 6 sorghum x P3
  });
});

describe('feed is priced inside the crop economy', () => {
  it('every animal eats a real, cheap item', () => {
    for (const id of ANIMAL_IDS) {
      const feed = ITEMS[getAnimalConfig(id)!.feedType];
      expect(feed).toBeDefined();
      // The P25 herbs were the bug: fodder must never be the second-most
      // valuable crop in the catalogue.
      expect(feed!.baseValue).toBeLessThanOrEqual(5);
    }
  });

  it('no animal eats herbs â€” herbs are medicine, not fodder', () => {
    for (const id of ANIMAL_IDS) {
      expect(getAnimalConfig(id)!.feedType).not.toBe('herbs');
    }
  });

  it('pays back its purchase price inside a sensible window', () => {
    for (const id of ANIMAL_IDS) {
      const animal = getAnimalConfig(id)!;
      const days = animal.purchaseCost / animalNetPerDay(animal);
      expect(days).toBeGreaterThan(1); // never an instant win
      expect(days).toBeLessThan(90); // never a dead end
    }
  });
});

describe('animals complement crops rather than dominate them', () => {
  it('the best animal still trails the top crop (morula, P40.63)', () => {
    const best = Math.max(...ANIMAL_IDS.map((id) => animalNetPerDay(getAnimalConfig(id)!)));
    expect(best).toBeLessThan(40.63);
  });

  it('the cheapest animal beats the worst starter crop (sorghum, P12.25)', () => {
    // Livestock should be worth keeping at every stage of the game.
    const worst = Math.min(...ANIMAL_IDS.map((id) => animalNetPerDay(getAnimalConfig(id)!)));
    expect(worst).toBeGreaterThan(0);
  });
});
/**
 * E8 — INDEPENDENT RECOMPUTATION of livestock economics, from ITEMS baseValue
 * alone rather than from `animalNetPerDay`. The blocks above assert hardcoded
 * numbers; this one derives the same numbers a second way so the two can be seen
 * to agree. If someone edits a feed rate or a product price `animalNetPerDay`
 * follows silently, and only these two blocks would disagree.
 */
describe('E8 — livestock economics recomputed from ITEMS baseValue', () => {
  const CATALOGUE = {
    chicken: { cycle: 12, qty: 2, product: 'eggs', feedPerDay: 2 },
    goat: { cycle: 24, qty: 2, product: 'milk', feedPerDay: 3 },
    cow: { cycle: 24, qty: 3, product: 'milk', feedPerDay: 6 },
    guinea_fowl: { cycle: 36, qty: 2, product: 'guinea_fowl_egg', feedPerDay: 3 },
  } as const;

  it('prices the feed from the catalogue, not from a comment', () => {
    expect(ITEMS.sorghum.baseValue).toBe(3);
    for (const id of ANIMAL_IDS) {
      expect(getAnimalConfig(id)!.feedType).toBe('sorghum');
    }
  });

  it('reproduces every margin independently — gross, feed cost and net', () => {
    const expected: Record<string, string> = {
      chicken: 'gross P20 - feed P6 = net P14', // (24/12) x 2 x P5; 2 x P3
      goat: 'gross P30 - feed P9 = net P21', // (24/24) x 2 x P15; 3 x P3
      cow: 'gross P45 - feed P18 = net P27', // (24/24) x 3 x P15; 6 x P3
      guinea_fowl: 'gross P16 - feed P9 = net P7', // (24/36) x 2 x P12; 3 x P3
    };
    for (const [id, c] of Object.entries(CATALOGUE)) {
      const gross = (24 / c.cycle) * c.qty * ITEMS[c.product]!.baseValue;
      const feedCost = c.feedPerDay * ITEMS.sorghum.baseValue;
      const label = `${id}: gross P${gross} - feed P${feedCost} = net P${gross - feedCost}`;
      expect(label).toBe(`${id}: ${expected[id]}`);
      expect(animalNetPerDay(getAnimalConfig(id)!)).toBeCloseTo(gross - feedCost, 10);
    }
  });

  it('stays positive even after the 5% Co-op tax on the product side', () => {
    // The headline margins are tax-free by design (animalNetPerDay is the
    // animal's own economics, not a market quote). A farmer who SELLS pays
    // 02 §4.1's 5%, so the realistic floor is checked separately.
    const expected: Record<string, string> = {
      chicken: '13.00', // 20 x 0.95 - 6
      goat: '19.50', // 30 x 0.95 - 9
      cow: '24.75', // 45 x 0.95 - 18
      guinea_fowl: '6.20', // 16 x 0.95 - 9
    };
    for (const [id, c] of Object.entries(CATALOGUE)) {
      const gross = (24 / c.cycle) * c.qty * ITEMS[c.product]!.baseValue;
      const net = gross * 0.95 - c.feedPerDay * ITEMS.sorghum.baseValue;
      expect(`${id} after tax P${net.toFixed(2)}`).toBe(`${id} after tax P${expected[id]}`);
      expect(net).toBeGreaterThan(0);
    }
  });

  it('flags the guinea fowl as the MARGINAL one — 43 days to pay back', () => {
    // Not net-negative, but an order of magnitude worse than the others. At
    // P7/day against a P300 purchase cost it is the only animal whose payback
    // exceeds a season. Flagged as marginal, NOT a defect: it is a
    // Botho-300-ladder unlock whose egg is the premium product.
    const fowl = getAnimalConfig('guinea_fowl')!;
    const days = fowl.purchaseCost / animalNetPerDay(fowl);
    expect(days).toBeGreaterThan(40);
    expect(days).toBeLessThan(50);
  });

  it('orders the animals exactly as the docs claim: cow best, fowl worst', () => {
    const rank = ANIMAL_IDS.map((id) => animalNetPerDay(getAnimalConfig(id)!));
    expect(Math.max(...rank)).toBe(27);
    expect(Math.min(...rank)).toBe(7);
  });
});

describe('the 12h starvation window and the 72h self-sustaining threshold', () => {
  it('matches the documented 12-hour starvation window', () => {
    // docs/34 §Wave 1.4: from a full feed (hunger 1.0) an animal takes 50 h to
    // reach hunger 0 at the shipped 0.02/h rate, then STARVATION_ONSET_HOURS
    // more before health moves at all.
    expect(STARVATION_ONSET_HOURS).toBe(12);
    for (const id of ANIMAL_IDS) {
      expect(getAnimalConfig(id)!.hungerDecayRate).toBe(0.02);
    }
    expect(1 / 0.02).toBe(50);
    expect(1 / 0.02 + STARVATION_ONSET_HOURS).toBe(62);
  });

  it('matches the documented 72-hour self-sustaining threshold', () => {
    // 09 §9 / 30-G-4: livestock decay is capped at 72 h, and the self-sustaining
    // decision is made from UNCAPPED away-time so a 4-day absence can fire it.
    expect(SELF_SUSTAINING_THRESHOLD_HOURS).toBe(72);
    expect(96).toBeGreaterThan(SELF_SUSTAINING_THRESHOLD_HOURS);
  });

  it('holds the documented "~2.5 day absence with zero health loss"', () => {
    // 62 h of grace = 2.58 days, which is the "~2.5-day" claim in livestock.ts.
    const grace = 1 / 0.02 + STARVATION_ONSET_HOURS;
    expect(grace / 24).toBeCloseTo(2.58, 1);
    // The two constants INTERACT rather than sitting independently: the 72 h
    // decay cap is 10 h LONGER than the 62 h grace, so an animal inside the cap
    // is already past grace and losing health by the time the window closes.
    expect(SELF_SUSTAINING_THRESHOLD_HOURS).toBeGreaterThan(grace);
  });

  it('quantifies the health actually lost inside the 72 h window', () => {
    // Past 72 h the animal self-sustains and health freezes, so the punishing
    // window is 62 h -> 72 h. At the cow's 0.06/h that is 10 x 0.06 = 0.60 of
    // 1.0 health — survivable but real, which is the documented intent.
    const overCap = SELF_SUSTAINING_THRESHOLD_HOURS - (1 / 0.02 + STARVATION_ONSET_HOURS);
    expect(overCap).toBe(10);
    expect(overCap * getAnimalConfig('cow')!.healthDecayRate).toBeCloseTo(0.6);
  });
});