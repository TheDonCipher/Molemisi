/**
 * 04 §9.1 — the real Botswana calendar, and the 22-hour bug it caused.
 *
 * THE DEFECT THIS SUITE PINS. Three chapter helpers read `getUTCMonth()`
 * directly. Botswana is CAT = UTC+2 with no DST, so a calendar boundary in
 * Gaborone happens at 22:00 UTC the PREVIOUS day. Reading UTC therefore rolled
 * every chapter, the Mophane window and the cycle key over 22 hours early: for
 * most of every day a Gaborone player was placed in the chapter that had just
 * ended. The failure is invisible at UTC midday and only appears in the evening
 * band, which is exactly why it survived — so the tests below deliberately probe
 * INSIDE that 22:00–24:00 UTC band rather than sampling round hours.
 *
 * The reference instant used throughout is the boundary the brief called out:
 *   2026-02-01T21:30:00Z  is  2026-02-01T23:30 CAT  — still 1 February.
 *   2026-02-01T22:00:00Z  is  2026-02-02T00:00 CAT  — 2 February begins exactly here.
 * Anything at or after 22:00Z on the last day of a month is already the new
 * month in Botswana; the same instant read as UTC is still the old month.
 */
import {
  botswanaNow,
  botswanaMonth,
  botswanaYear,
  botswanaDay,
  botswanaDayStart,
  botswanaDayStart as dayStart,
  botswanaHoursIntoDay,
  BOTSWANA_OFFSET_MS,
} from './botswanaTime';
import { chapterForDate, isMophaneSeason, daysUntilChapterEnd, chapterForMonth } from './chapters';
import { cycleKey } from './chargeYear';

const Z = (s: string) => new Date(s);

describe('the offset itself', () => {
  it('is UTC+2 in milliseconds, with no DST anywhere in the year', () => {
    expect(BOTSWANA_OFFSET_MS).toBe(2 * 60 * 60 * 1000);
  });

  it('shifts an instant without changing WHICH instant it is', () => {
    // +2 h, never +1 h in winter: Botswana has never observed daylight saving.
    for (const iso of ['2026-01-15T12:00:00Z', '2026-07-15T12:00:00Z']) {
      expect(botswanaNow(Z(iso)).getTime() - Z(iso).getTime()).toBe(BOTSWANA_OFFSET_MS);
    }
  });
});

describe('botswanaMonth — the boundary the brief names', () => {
  it('agrees with UTC in the middle of a month', () => {
    expect(botswanaMonth(Z('2026-02-10T12:00:00Z'))).toBe(2);
    expect(botswanaMonth(Z('2026-06-10T12:00:00Z'))).toBe(6);
  });

  it('reads 2026-02-01T21:30:00Z as 1 February — same answer as UTC', () => {
    // 21:30 UTC + 2 h = 23:30 CAT, still 1 February. The two agree HERE.
    expect(botswanaMonth(Z('2026-02-01T21:30:00Z'))).toBe(2);
    expect(Z('2026-02-01T21:30:00Z').getUTCMonth() + 1).toBe(2);
  });

  it('reads 2026-01-31T22:00:00Z as 1 February while UTC still says 31 January', () => {
    // THE boundary. 22:00Z on 31 Jan is 00:00 CAT on 1 Feb. UTC has 2 hours to go,
    // so the two calendars genuinely disagree about which MONTH it is.
    expect(botswanaMonth(Z('2026-01-31T22:00:00Z'))).toBe(2);
    expect(Z('2026-01-31T22:00:00Z').getUTCMonth() + 1).toBe(1);
  });

  it('is one month ahead of UTC for the whole 22:00-24:00 band', () => {
    // Every half hour of the band in which the two calendars disagree.
    for (const t of ['22:00', '22:30', '23:00', '23:30']) {
      expect(`${t} cat=${botswanaMonth(Z(`2026-01-31T${t}:00Z`))}`).toBe(`${t} cat=2`);
      expect(`${t} utc=${Z(`2026-01-31T${t}:00Z`).getUTCMonth() + 1}`).toBe(`${t} utc=1`);
    }
  });

  it('agrees again once UTC has rolled over at 00:00', () => {
    expect(botswanaMonth(Z('2026-02-01T00:00:00Z'))).toBe(2);
    expect(botswanaMonth(Z('2026-02-01T02:00:00Z'))).toBe(2);
  });

  it('reads the day of month on the same calendar', () => {
    expect(botswanaDay(Z('2026-01-31T22:00:00Z'))).toBe(1);
    expect(botswanaDay(Z('2026-01-31T21:59:59Z'))).toBe(31);
  });

  it('rolls the YEAR at 22:00Z on 31 December, not at 00:00Z', () => {
    expect(botswanaYear(Z('2026-12-31T21:59:00Z'))).toBe(2026);
    expect(botswanaYear(Z('2026-12-31T22:00:00Z'))).toBe(2027);
  });
});

describe('botswanaDayStart — the same value the wallet charges caps against', () => {
  it('is 22:00 UTC of the PREVIOUS calendar day', () => {
    expect(botswanaDayStart(Z('2026-02-01T21:30:00Z')).toISOString()).toBe(
      '2026-01-31T22:00:00.000Z',
    );
  });

  it('moves forward exactly at the Botswana midnight', () => {
    expect(botswanaDayStart(Z('2026-02-01T21:59:59Z')).toISOString()).toBe(
      '2026-01-31T22:00:00.000Z',
    );
    expect(botswanaDayStart(Z('2026-02-01T22:00:00Z')).toISOString()).toBe(
      '2026-02-01T22:00:00.000Z',
    );
  });

  it('is never UTC midnight, in any month including a leap February', () => {
    for (const iso of ['2026-01-15T12:00:00Z', '2026-03-31T12:00:00Z', '2028-02-29T12:00:00Z']) {
      expect(botswanaDayStart(Z(iso)).getTime() % 86400000).not.toBe(0);
      expect(botswanaHoursIntoDay(Z(iso))).toBe(14); // 12:00Z is 14:00 CAT
    }
  });

  it('reports 0 hours into the day at the boundary and ~24 just before', () => {
    expect(botswanaHoursIntoDay(Z('2026-02-01T22:00:00Z'))).toBe(0);
    expect(botswanaHoursIntoDay(Z('2026-02-01T21:59:59Z'))).toBeCloseTo(23.9997, 3);
  });

  it('aliases cleanly — two names, one implementation', () => {
    expect(dayStart).toBe(botswanaDayStart);
  });
});

describe('chapterForDate reads the Botswana calendar', () => {
  it('enters the new chapter at 22:00Z the previous evening, not at 00:00Z', () => {
    // 31 Jan 2027 22:00Z = 1 Feb 00:00 CAT. Phane must ALREADY be current.
    expect(chapterForDate(Z('2027-01-31T22:00:00Z')).slug).toBe('phane');
    // 21:59Z is still 23:59 CAT on 31 January — Pula, correctly, until midnight.
    expect(chapterForDate(Z('2027-01-31T21:59:00Z')).slug).toBe('pula');
  });

  it('reads every chapter boundary on the Botswana midnight', () => {
    const cases: Array<[string, string]> = [
      ['2026-10-31T22:00:00Z', 'pula'],
      ['2027-01-31T22:00:00Z', 'phane'],
      ['2026-04-30T22:00:00Z', 'moriti'],
      ['2026-07-31T22:00:00Z', 'letlhafula'],
    ];
    for (const [iso, slug] of cases) {
      expect(`${iso} ${chapterForDate(Z(iso)).slug}`).toBe(`${iso} ${slug}`);
    }
  });

  it('is one chapter ahead of the plain UTC month lookup across the evening band', () => {
    for (const t of ['22:00', '22:59', '23:59']) {
      expect(`${t} ${chapterForDate(Z(`2027-01-31T${t}:00Z`)).slug}`).toBe(`${t} phane`);
      // The raw UTC month would still have said Pula at every one of these.
      expect(chapterForMonth(Z(`2027-01-31T${t}:00Z`).getUTCMonth() + 1).slug).toBe('pula');
    }
  });

  it('agrees with the plain month lookup at midday', () => {
    expect(chapterForDate(Z('2026-06-15T12:00:00Z')).slug).toBe('moriti');
  });
});

describe('isMophaneSeason reads the Botswana calendar', () => {
  it('opens the window at 22:00Z on 31 March, not at 00:00Z on 1 April', () => {
    expect(isMophaneSeason(Z('2026-03-31T21:59:00Z'))).toBe(false);
    expect(isMophaneSeason(Z('2026-03-31T22:00:00Z'))).toBe(true);
  });

  it('opens the December window on the same 22:00Z rule', () => {
    expect(isMophaneSeason(Z('2026-11-30T21:59:00Z'))).toBe(false);
    expect(isMophaneSeason(Z('2026-11-30T22:00:00Z'))).toBe(true);
  });

  it('closes at 22:00Z on the last day of the month', () => {
    expect(isMophaneSeason(Z('2026-04-30T21:59:00Z'))).toBe(true);
    expect(isMophaneSeason(Z('2026-04-30T22:00:00Z'))).toBe(false);
  });
});

/**
 * THREE separate bugs lived in this one function, and only the first is the
 * 22-hour one the brief describes. The other two are worse and are pinned here.
 */
describe('daysUntilChapterEnd — three separate bugs', () => {
  it('counts JANUARY correctly (the YEAR-long bug)', () => {
    // Pula runs 11/12/1, so it WRAPS the year. In January 2027 the chapter ends
    // on 31 January 2027 — 17 days after 15 January. The old code compared the
    // last month against the chapter's FIRST month (1 < 11) and added a year,
    // reporting 381 days. This is the assertion that catches it.
    expect(daysUntilChapterEnd(Z('2027-01-15T12:00:00Z'))).toBe(17);
    expect(daysUntilChapterEnd(Z('2027-01-31T12:00:00Z'))).toBe(1);
  });

  it('counts November and December into the FOLLOWING year', () => {
    // 15 Nov 2026 14:00 CAT -> 1 Feb 2027 00:00 CAT = 77 d 10 h -> 78 days.
    expect(daysUntilChapterEnd(Z('2026-11-15T12:00:00Z'))).toBe(78);
    // 31 Dec 2026 14:00 CAT -> 1 Feb 2027 00:00 CAT = 31 d 10 h -> 32 days.
    expect(daysUntilChapterEnd(Z('2026-12-31T12:00:00Z'))).toBe(32);
  });

  it('keeps JANUARY in Pula — it is Pula’s third month, not Phane’s first', () => {
    // The wrap makes this easy to get backwards. 31 Dec 22:00Z is already
    // 1 Jan 2027 in Gaborone, and January belongs to Pula (11/12/1), so the
    // chapter does NOT change at New Year — it changes on 1 February.
    expect(chapterForDate(Z('2026-12-31T22:00:00Z')).slug).toBe('pula');
    expect(daysUntilChapterEnd(Z('2026-12-31T22:00:00Z'))).toBe(31);
  });

  it('includes the chapter’s last day rather than stopping at its midnight', () => {
    // 30 April 14:00 CAT is 10 hours before Phane ends -> 1 day left, not 0.
    // The old `Date.UTC(y, m, 0)` boundary reported 0 for the whole final day.
    expect(daysUntilChapterEnd(Z('2026-04-30T12:00:00Z'))).toBe(1);
  });

  it('reads 1 as the floor — the last hour of a chapter still counts as 1 day', () => {
    expect(daysUntilChapterEnd(Z('2026-04-30T21:59:00Z'))).toBe(1); // 23:59 CAT
  });

  it('re-derives the chapter at the rollover, so the countdown jumps, never inverts', () => {
    // At 22:00Z on 30 April it IS 1 May in Gaborone: Moriti (May-Jun-Jul),
    // so the count restarts at 92 days rather than continuing Phane's.
    expect(chapterForDate(Z('2026-04-30T22:00:00Z')).slug).toBe('moriti');
    expect(daysUntilChapterEnd(Z('2026-04-30T22:00:00Z'))).toBe(92);
  });

  it('never returns a negative number at any hour of any boundary day', () => {
    for (const day of ['2026-04-30', '2026-07-31', '2026-10-31', '2027-01-31']) {
      for (let h = 0; h < 24; h++) {
        const v = daysUntilChapterEnd(Z(`${day}T${String(h).padStart(2, '0')}:30:00Z`));
        expect(`${day}T${h}:30Z=${v}`).toBe(`${day}T${h}:30Z=${Math.max(0, v)}`);
      }
    }
  });

  it('gives the non-wrapping chapters their true month lengths', () => {
    // Measured from 12:00Z = 14:00 CAT, so each is (chapter length - 14 h) rounded up.
    expect(daysUntilChapterEnd(Z('2026-02-01T12:00:00Z'))).toBe(89); // Feb28+Mar31+Apr30 = 89
    expect(daysUntilChapterEnd(Z('2026-05-01T12:00:00Z'))).toBe(92); // May31+Jun30+Jul31 = 92
    expect(daysUntilChapterEnd(Z('2026-08-01T12:00:00Z'))).toBe(92); // Aug31+Sep30+Oct31 = 92
  });

  it('is monotonically non-increasing across a whole chapter', () => {
    let prev = Number.POSITIVE_INFINITY;
    const end = new Date('2027-01-31T12:00:00Z');
    for (let d = new Date('2026-11-01T12:00:00Z'); d <= end; d = new Date(d.getTime() + 86400000)) {
      const n = daysUntilChapterEnd(d);
      expect(`${d.toISOString().slice(0, 10)}=${n}`).toBe(`${d.toISOString().slice(0, 10)}=${Math.min(n, prev)}`);
      prev = n;
    }
    expect(prev).toBe(1);
  });
});

describe('cycleKey reads the same calendar (the year starts 1 November, Gaborone)', () => {
  it('still keys the documented dates the same way', () => {
    expect(cycleKey(Z('2026-11-01T12:00:00Z'))).toBe('2026/27');
    expect(cycleKey(Z('2027-01-15T12:00:00Z'))).toBe('2026/27');
    expect(cycleKey(Z('2027-10-31T12:00:00Z'))).toBe('2026/27');
    expect(cycleKey(Z('2027-11-01T12:00:00Z'))).toBe('2027/28');
  });

  it('rolls the cycle at 22:00Z on 31 October, not at 00:00Z on 1 November', () => {
    expect(cycleKey(Z('2027-10-31T21:59:00Z'))).toBe('2026/27');
    expect(cycleKey(Z('2027-10-31T22:00:00Z'))).toBe('2027/28');
  });
});