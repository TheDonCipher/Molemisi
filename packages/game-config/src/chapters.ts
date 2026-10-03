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
import { botswanaMonth, botswanaYear, BOTSWANA_OFFSET_MS } from './botswanaTime';

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
    name: 'Pula',
    setswana: 'Pula',
    months: [11, 12, 1],
    character: 'Rains. Planting. Water plentiful, the Jojo tank fills itself.',
    rainCoverage: 0.8,
    tokenName: 'Pula',
    seeds: ['sorghum', 'maize', 'tomatoes', 'cowpeas', 'groundnuts', 'millet'],
  },
  {
    slug: 'phane',
    index: 2,
    name: 'Letlhafula',
    setswana: 'Letlhafula',
    months: [2, 3, 4],
    character: 'Late rains, long growth. The April phane window closes it.',
    rainCoverage: 0.5,
    tokenName: 'Letlhafula',
    seeds: ['maize', 'watermelon', 'tomatoes', 'groundnuts', 'sesame', 'pepper'],
  },
  {
    slug: 'moriti',
    index: 3,
    name: 'Mariga',
    setswana: 'Mariga',
    months: [5, 6, 7],
    character: 'Dry and cold. Water is the whole game.',
    rainCoverage: 0.05,
    tokenName: 'Mariga',
    seeds: ['sorghum', 'millet', 'cowpeas', 'sesame', 'herbs', 'morula'],
  },
  {
    slug: 'letlhafula',
    index: 4,
    name: 'Dikgakologo',
    setswana: 'Dikgakologo',
    months: [8, 9, 10],
    character: 'Harvest, wind, preparation.',
    rainCoverage: 0.15,
    tokenName: 'Dikgakologo',
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

/**
 * 04 §9.1 — the chapter for a moment in time, read on the BOTSWANA calendar
 * (CAT, UTC+2, no DST) rather than UTC.
 *
 * The month comes from `botswanaMonth`, not `getUTCMonth()`. The two differ for
 * 22 hours a day: `getUTCMonth()` rolls to the new chapter at 00:00 UTC, which
 * is 22:00 the previous evening in Gaborone. For most of every day a Gaborone
 * player was therefore shown the PREVIOUS chapter — on 31 January, when it is
 * already February locally, `chapterForDate` returned Pula (which ends 31 Jan).
 * 38 §"chapter boundaries" already specified 00:00 Africa/Gaborone; this is the
 * code catching up to the spec.
 */
export function chapterForDate(date: Date): Chapter {
  return chapterForMonth(botswanaMonth(date));
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

/**
 * Is this the Mophane window right now? Read on the BOTSWANA calendar, same
 * reason as `chapterForDate`: the window is a real-world month in Botswana, and
 * it used to open 22 h early on the 1st of April and December.
 */
export function isMophaneSeason(date = new Date()): boolean {
  return (MOPHANE_MONTHS as readonly number[]).includes(botswanaMonth(date));
}

/**
 * Days until this chapter ends — drives the Almanac countdown (07 §7.6).
 *
 * Counted on the BOTSWANA calendar, and BOTH the year and the end instant are
 * computed there. Two bugs, one of them a year long, not 22 hours:
 *
 *  1. `getUTCFullYear()` reported the UTC year, so during 22:00–24:00 on 31
 *     December the year was already next year's while the month was still
 *     December's — an end instant a full year out.
 *  2. The chapter's LAST DAY was taken as midnight on that day (`Date.UTC(y, m,
 *     0)` is midnight on the last day, not its end), so the countdown hit 0 at
 *     00:00 on the final day instead of counting that day.
 *  3. Pula wraps the year (11, 12, 1). In January the "start month" 11 is
 *     GREATER than the current month 1, so `lastMonth < months[0]` was true and
 *     `endYear` became `botswanaYear + 1` — in January 2027 the Pula countdown
 *     read 381 days instead of 17. The wrap test has to compare the last month
 *     against the CURRENT month, not against the first month.
 *
 * The end is the start of the day AFTER the chapter's last day, which is what
 * makes the countdown reach 0 exactly when the chapter rolls over.
 */
export function daysUntilChapterEnd(date = new Date()): number {
  const ch = chapterForDate(date);
  const year = botswanaYear(date);
  const month = botswanaMonth(date);
  const lastMonth = ch.months[ch.months.length - 1]!;
  // Pula wraps the year (11, 12, 1). Its last month (January) falls in the SAME
  // year as a January date and in the FOLLOWING year as a November/December one.
  // So the test is "does this chapter wrap?" AND "am I in its first part?".
  const wrapsYear = ch.months[0]! > lastMonth;
  const endYear = wrapsYear && month >= ch.months[0]! ? year + 1 : year;
  // Date.UTC's month argument is 0-indexed, so passing `lastMonth` (1-indexed)
  // already means "the month AFTER the chapter's last month" — and lastMonth 12
  // rolls the year over to January automatically. Minus the offset makes that
  // instant 00:00 Botswana rather than 00:00 UTC.
  const endBotswanaMidnight = new Date(
    Date.UTC(endYear, lastMonth, 1) - BOTSWANA_OFFSET_MS,
  );
  // Compare like with like: both sides are UTC instants, so the +2 shift already
  // applied to the end date cancels out of the subtraction.
  return Math.max(0, Math.ceil((endBotswanaMidnight.getTime() - date.getTime()) / 86400000));
}
