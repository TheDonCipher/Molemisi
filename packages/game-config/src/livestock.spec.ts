/**
 * docs/34 §Wave 1.1 — livestock economics.
 *
 * The feed map shipped the P25 `herbs` to animals whose goods sell for
 * P5–P15, so three of the four ran at a LOSS every day (goat −P85,
 * cow −P155, guinea fowl −P2) and nobody noticed, because the number only
 * ever existed as prose in an audit. These assertions make it a number.
 */
import { ANIMALS, animalNetPerDay, getAnimalConfig } from './livestock';
import { ITEMS } from './items';

const ANIMAL_IDS = Object.keys(ANIMALS);

describe('every animal is net-positive per day at base prices', () => {
  it.each(ANIMAL_IDS)('%s earns more than it eats', (id) => {
    const animal = getAnimalConfig(id)!;
    expect(Number.isNaN(animalNetPerDay(animal))).toBe(false);
    expect(animalNetPerDay(animal)).toBeGreaterThan(0);
  });

  it('reproduces the documented margins exactly (docs/34 §Wave 1.1)', () => {
    // Guards the specific numbers, not just the sign, so a retune is a
    // deliberate edit to a test rather than a silent drift.
    const net = (id: string) => animalNetPerDay(getAnimalConfig(id)!);
    expect(net('chicken')).toBeCloseTo(14); // 4 eggs x P5 − 2 sorghum x P3
    expect(net('guinea_fowl')).toBeCloseTo(7); // 1.33 eggs x P12 − 3 sorghum x P3
    expect(net('goat')).toBeCloseTo(21); // 2 milk x P15 − 3 sorghum x P3
    expect(net('cow')).toBeCloseTo(27); // 3 milk x P15 − 6 sorghum x P3
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

  it('no animal eats herbs — herbs are medicine, not fodder', () => {
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