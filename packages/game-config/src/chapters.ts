/**
 * Chapters and the seed calendar.
 *
 * 04 §9.1 — the year is REAL. Every player experiences the same weeks. This is the
 * real Botswana calendar, not a simulated clock, and it is one of the three things a
 * competitor cannot copy.
 *
 * 02 §6.1 / F6 — the seed calendar is load-bearing and was previously unspecified.
 * It does four jobs at once:
 *   1. replaces the retired level gate as the crop discovery mechanism (C12 / D6)
 *   2. prevents tomato monoculture (F2)
 *   3. makes water matter (F5)
 *   4. makes the real Botswana calendar felt
 * Six seeds stocked per chapter. Thirsty crops cluster in the rainy chapters,
 * drought crops in the dry ones, so the calendar FORCES rotation.
 */

import type { CropId } from './crops';

export type ChapterSlug = 'pula' | 'phane' | 'moriti' | 'letlhafula';

export interface Chapter {
  slug: ChapterSlug;
  /** Chapter number, 1–4. */
  index: number;
  name: string;
  setswana: string;
  /** Real calendar months (1–12) this chapter covers. */
  months: number[];
  character: string;
  /** Share of crop water demand covered by rain. Used by scripts/balance_verify.py. */
  rainCoverage: number;
  /** Chapter Token theme name (02 §3.3). */
  tokenName: string;
  /** Seeds stocked — exactly six (02 §6.1). */
  seeds: CropId[];
}

export const CHAPTERS: Chapter[] = [
  {
    slug: 'pula',
    index: 1,
    name: 'Season of Rain',
    setswana: 'Sekala sa Pula',
    months: [11, 12, 1],
    character: 'Rains. Planting. Water plentiful, the Jojo tank fills itself.',
    rainCoverage: 0.8,
    tokenName: 'Sekala sa Pula',
    seeds: ['sorghum', 'maize', 'tomatoes', 'cowpeas', 'groundnuts', 'millet'],
  },
  {
    slug: 'phane',
    index: 2,
    name: 'Season of Mophane',
    setswana: 'Sekala sa Phane',
    months: [2, 3, 4],
    character: 'Late rains, long growth. The April phane window closes it.',
    rainCoverage: 0.5,
    tokenName: 'Sekala sa Phane',
    seeds: ['maize', 'watermelon', 'tomatoes', 'groundnuts', 'sesame', 'pepper'],
  },
  {
    slug: 'moriti',
    index: 3,
    name: 'Season of Shade',
    setswana: 'Sekala sa Moriti',
    months: [5, 6, 7],
    character: 'Dry and cold. Water is the whole game.',
    rainCoverage: 0.05,
    tokenName: 'Sekala sa Moriti',
    seeds: ['sorghum', 'millet', 'cowpeas', 'sesame', 'herbs', 'morula'],
  },
  {
    slug: 'letlhafula',
    index: 4,
    name: 'Season of Harvest',
    setswana: 'Sekala sa Letlhafula',
    months: [8, 9, 10],
    character: 'Harvest, wind, preparation.',
    rainCoverage: 0.15,
    tokenName: 'Sekala sa Letlhafula',
    seeds: ['millet', 'sorghum', 'watermelon', 'pepper', 'herbs', 'morula'],
  },
];

/** 04 §9.1 — the Setswana year. */
export const SETSWANA_MONTHS = [
  'Ferikgong',
  'Tlhakole',
  'Mopitlwe',
  'Moranang',
  'Motsheganong',
  'Seetebosigo',
  'Phukwe',
  'Phatwe',
  'Lwetse',
  'Diphalane',
  'Ngwanatsele',
  'Sedimonthole',
] as const;

export function chapterForMonth(month: number): Chapter {
  return CHAPTERS.find((c) => c.months.includes(month)) ?? CHAPTERS[0]!;
}

export function chapterForDate(date: Date): Chapter {
  return chapterForMonth(date.getUTCMonth() + 1);
}

export function getChapter(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}

/** Is this seed stocked right now? The replacement for the retired level gate (D6). */
export function isSeedInSeason(cropId: CropId, date = new Date()): boolean {
  return chapterForDate(date).seeds.includes(cropId);
}

/**
 * When will this seed next be stocked? The planting sheet greys out-of-season seeds
 * with "available in Moriti" rather than hiding them (07 §7.3).
 */
export function nextSeasonFor(cropId: CropId, date = new Date()): Chapter {
  const current = chapterForDate(date);
  for (let i = 1; i <= 4; i++) {
    const next = CHAPTERS[(current.index - 1 + i) % 4]!;
    if (next.seeds.includes(cropId)) return next;
  }
  return current;
}

/**
 * 04 §9.3 — the Mophane event. Two real annual windows, roughly Moranang (April) and
 * Sedimonthole (December). Deliberately DECOUPLED from the chapter clock: a real-calendar
 * event and a chapter boundary are two different things and must be allowed to disagree.
 * The December window falls in Chapter 1 and the April window in Chapter 2 — that
 * mismatch is a feature, not a bug.
 */
export const MOPHANE_MONTHS = [4, 12] as const;

export function isMophaneSeason(date = new Date()): boolean {
  return (MOPHANE_MONTHS as readonly number[]).includes(date.getUTCMonth() + 1);
}

/** Days until this chapter ends — drives the Almanac countdown (07 §7.6). */
export function daysUntilChapterEnd(date = new Date()): number {
  const ch = chapterForDate(date);
  const year = date.getUTCFullYear();
  const lastMonth = ch.months[ch.months.length - 1]!;
  // Chapter months are contiguous in calendar order, but Pula wraps the year (11,12,1).
  const endYear = lastMonth < ch.months[0]! ? year + 1 : year;
  const end = new Date(Date.UTC(endYear, lastMonth, 0)); // last day of last month
  return Math.max(0, Math.ceil((end.getTime() - date.getTime()) / 86400000));
}
