/**
 * Botswana wall-clock time — the ONE place a "what day/month is it in the game"
 * question is answered.
 *
 * WHY THIS FILE EXISTS. 04 §9.1 says the year is REAL: every player experiences
 * the same weeks, and the real Botswana calendar is one of the three things a
 * competitor cannot copy. Real Botswana time is **CAT = UTC+2 with no daylight
 * saving** (the country has never observed DST, so the offset genuinely is a
 * constant — `BOTSWANA_UTC_OFFSET` in ./economy and `startOfBotswanaDay` in
 * WalletService both already hardcode +02:00 for the same reason).
 *
 * THE BUG THIS CLOSES. Three chapter helpers read `getUTCMonth()` directly, so
 * every one of them rolled over at **00:00 UTC — 22 hours before** the chapter
 * actually begins in Gaborone. For two thirds of every day a player was in the
 * chapter that just ended: at 23:30 on 31 January Gaborone is already February,
 * so `chapterForDate` reported Pula (which ends 31 January) and the Almanac
 * countdown ran against the wrong chapter. The seeded calendar, the Mophane
 * window and the chapter countdown were all 22 h early against real time.
 *
 * Everything reads through here instead. The helpers return the SHIFTED date so
 * that ordinary `getUTC*()` accessors on the result read as Botswana wall-clock
 * fields — that is the whole trick, and it is why there is exactly one offset
 * constant to get wrong instead of three call sites.
 */

/** CAT = UTC+2, no DST (see module header). 2 h expressed in milliseconds. */
export const BOTSWANA_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * The same instant, shifted so `getUTC*()` reads as Botswana wall-clock time.
 * NOT a different moment — a different reading of the same one. Never pass this
 * to a timestamp, an ISO string or a database column: it is 2 h in the future.
 */
export function botswanaNow(at: Date = new Date()): Date {
  return new Date(at.getTime() + BOTSWANA_OFFSET_MS);
}

/** Real calendar month (1–12) in Botswana, where the chapter boundaries fall. */
export function botswanaMonth(at: Date = new Date()): number {
  return botswanaNow(at).getUTCMonth() + 1;
}

/** Real calendar year in Botswana — differs from UTC only at New Year, 22:00–24:00. */
export function botswanaYear(at: Date = new Date()): number {
  return botswanaNow(at).getUTCFullYear();
}

/** Real calendar day-of-month in Botswana. */
export function botswanaDay(at: Date = new Date()): number {
  return botswanaNow(at).getUTCDate();
}

/**
 * Midnight CAT on the Botswana day containing `at`, returned as the UTC instant
 * it actually occurs — 22:00 UTC on the PREVIOUS day. Same value the wallet's
 * `startOfBotswanaDay` produces, so per-day caps and calendar rollovers cannot
 * disagree about where a day begins.
 */
export function botswanaDayStart(at: Date = new Date()): Date {
  const b = botswanaNow(at);
  return new Date(
    Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - BOTSWANA_OFFSET_MS,
  );
}

/** Whole days from the start of `at`'s Botswana day to the start of the next one (0 or 1). */
export function botswanaHoursIntoDay(at: Date = new Date()): number {
  return (at.getTime() - botswanaDayStart(at).getTime()) / (60 * 60 * 1000);
}