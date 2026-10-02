/**
 * docs/36 §8 — verification of the Kgotla Year data spine.
 * Proves the P915 faucet, the §5.1 reward formula, the ratio bands, Botho/stamp
 * amounts, the cycle key, and that every ask is obtainable in its own chapter.
 */
import {
  CHARGE_YEAR,
  CHARGE_YEAR_PULA_FAUCET,
  CHARGE_YEAR_BOTHO_TOTAL,
  COUNCIL_PROJECTS,
  chargeForMonth,
  chargesForChapter,
  chargeBaseValue,
  computeChargePula,
  cycleKey,
  projectForChapter,
  CHARGE_NPC_IDS,
  type ChargeYearEntry,
  type GoodCategory,
} from './chargeYear';
import { CHAPTERS, chapterForMonth, type ChapterSlug } from './chapters';

const CHAPTER_SLUGS: ChapterSlug[] = ['pula', 'phane', 'moriti', 'letlhafula'];

describe('faucet size (docs/36 §8.1 / docs/38 §0)', () => {
  it('pays exactly P915 a year across the 12 Charges', () => {
    expect(CHARGE_YEAR).toHaveLength(12);
    expect(CHARGE_YEAR_PULA_FAUCET).toBe(915);
  });

  it('grants exactly 120 Botho a year (well under the 150 prize floor)', () => {
    expect(CHARGE_YEAR_BOTHO_TOTAL).toBe(120);
    CHARGE_YEAR.forEach((c) => expect(c.botho).toBe(10));
  });

  it('grants exactly 1 season stamp and 1 Almanac quest per Charge', () => {
    CHARGE_YEAR.forEach((c) => {
      expect(c.stamp).toBe(1);
      expect(c.almanacQuests).toBe(1);
    });
  });
});

describe('reward formula (docs/36 §5.1)', () => {
  it('recomputes each reward from base × premium, rounded to nearest P5', () => {
    // Base totals per Charge from §8.1, in order.
    const expectedBases = [30, 30, 48, 66, 64, 89, 48, 75, 92, 68, 87, 48];
    const expectedRewards = [40, 40, 60, 85, 70, 110, 60, 95, 115, 85, 95, 60];

    CHARGE_YEAR.forEach((c, i) => {
      expect(chargeBaseValue(c.asks)).toBe(expectedBases[i]!);
      expect(computeChargePula(c.asks)).toBe(expectedRewards[i]!);
      expect(c.pulaReward).toBe(expectedRewards[i]!);
    });
  });

  it('rounds the half-way cases to the §8.1 figures (37.5→40, 82.5→85, 93.75→95)', () => {
    expect(computeChargePula([{ item: 's', qty: 10, base: 3, category: 'grown' }])).toBe(40);
    expect(computeChargePula([{ item: 'w', qty: 6, base: 11, category: 'grown' }])).toBe(85);
    expect(computeChargePula([{ item: 'h', qty: 3, base: 25, category: 'grown' }])).toBe(95);
  });

  it('keeps every ratio inside its §5.1 band', () => {
    const GROWN_BAND: [number, number] = [1.15, 1.35];
    const CRAFTED_BAND: [number, number] = [1.05, 1.15];
    CHARGE_YEAR.forEach((c) => {
      const ratio = c.pulaReward / chargeBaseValue(c.asks);
      const categories = new Set<GoodCategory>(c.asks.map((a) => a.category));
      // A Charge is uniformly grown/gathered OR uniformly crafted (docs/36 §5.1).
      if (categories.has('crafted')) {
        expect(ratio).toBeGreaterThanOrEqual(CRAFTED_BAND[0]);
        expect(ratio).toBeLessThanOrEqual(CRAFTED_BAND[1]);
      } else {
        expect(ratio).toBeGreaterThanOrEqual(GROWN_BAND[0]);
        expect(ratio).toBeLessThanOrEqual(GROWN_BAND[1]);
      }
    });
  });
});

describe('serial structure (docs/36 §4, K1)', () => {
  it('reveals one Charge per real month, with unique months and ids', () => {
    const months = CHARGE_YEAR.map((c) => c.month).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const ids = CHARGE_YEAR.map((c) => c.chargeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns every Charge to a known NPC id', () => {
    CHARGE_YEAR.forEach((c) => expect(CHARGE_NPC_IDS).toContain(c.npcId));
  });

  it('gives each chapter exactly 3 Charges', () => {
    CHAPTER_SLUGS.forEach((slug) => {
      expect(chargesForChapter(slug)).toHaveLength(3);
    });
  });

  it('reads the right Charge for a month', () => {
    expect(chargeForMonth(11)?.chargeId).toBe('straight_rows');
    expect(chargeForMonth(7)?.chargeId).toBe('long_promise');
    expect(chargeForMonth(13)).toBeUndefined();
  });
});

describe('in-chapter feasibility (docs/36 §8.2, K5)', () => {
  it('requests only goods obtainable in the Charge’s own chapter', () => {
    CHARGE_YEAR.forEach((c: ChargeYearEntry) => {
      const chapter = chapterForMonth(c.month);
      const seeds = new Set(chapter.seeds);
      c.asks.forEach((a) => {
        if (a.category === 'grown') {
          // Grown crops must be stocked that chapter.
          expect(seeds.has(a.item as never)).toBe(true);
        } else if (a.category === 'gathered') {
          // Phane is gathered only in the December Mophane window (docs/36 §4 note).
          expect(a.item).toBe('phane');
          expect(c.month).toBe(12);
        } else {
          // Crafted (plank/rope/brick) — ungated, obtainable in any chapter.
          expect(['plank', 'rope', 'brick']).toContain(a.item);
        }
      });
    });
  });
});

describe('cycle key (docs/36 §5.5)', () => {
  it('keys the year by its 1-November start', () => {
    expect(cycleKey(new Date(Date.UTC(2026, 10, 1)))).toBe('2026/27'); // 1 Nov 2026
    expect(cycleKey(new Date(Date.UTC(2027, 0, 15)))).toBe('2026/27'); // 15 Jan 2027
    expect(cycleKey(new Date(Date.UTC(2027, 9, 31)))).toBe('2026/27'); // 31 Oct 2027
    expect(cycleKey(new Date(Date.UTC(2027, 10, 1)))).toBe('2027/28'); // 1 Nov 2027
  });
});

describe('Council Projects (docs/36 §4 / docs/38 §0, I-3)', () => {
  it('schedules the four projects at 100/150/150/200 Pula and 5/8/8/12 stamps', () => {
    expect(COUNCIL_PROJECTS).toHaveLength(4);
    const byId = Object.fromEntries(COUNCIL_PROJECTS.map((p) => [p.projectId, p]));
    expect(byId.water_reservoir).toMatchObject({ chapter: 'pula', thresholdPula: 100, stampReward: 5 });
    expect(byId.mophane_festival).toMatchObject({ chapter: 'phane', thresholdPula: 150, stampReward: 8 });
    expect(byId.water_store).toMatchObject({ chapter: 'moriti', thresholdPula: 150, stampReward: 8 });
    expect(byId.school).toMatchObject({ chapter: 'letlhafula', thresholdPula: 200, stampReward: 12 });
  });

  it('places exactly one project per chapter and resolves by chapter', () => {
    CHAPTER_SLUGS.forEach((slug) => {
      const proj = projectForChapter(slug);
      expect(proj).toBeDefined();
      expect(proj!.chapter).toBe(slug);
    });
    const ids = COUNCIL_PROJECTS.map((p) => p.projectId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries no market_square (retired, docs/38 T-6)', () => {
    expect(COUNCIL_PROJECTS.map((p) => p.projectId)).not.toContain('market_square');
  });
});

describe('chapter ranges agree with the calendar spec (docs/35 §2.3)', () => {
  it('maps months to chapters in the expected order', () => {
    const expectMap: Record<number, ChapterSlug> = {
      11: 'pula', 12: 'pula', 1: 'pula',
      2: 'phane', 3: 'phane', 4: 'phane',
      5: 'moriti', 6: 'moriti', 7: 'moriti',
      8: 'letlhafula', 9: 'letlhafula', 10: 'letlhafula',
    };
    Object.entries(expectMap).forEach(([m, slug]) => {
      expect(chapterForMonth(Number(m)).slug).toBe(slug);
    });
  });

  it('exposes four chapters with the documented month sets', () => {
    expect(CHAPTERS).toHaveLength(4);
    expect(CHAPTERS.map((c) => c.months.join(','))).toEqual([
      '11,12,1', '2,3,4', '5,6,7', '8,9,10',
    ]);
  });
});
