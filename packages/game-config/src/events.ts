/**
 * Events — the seasonal live service (08 §6, D6/D8 — RULED 2026-10-04).
 *
 * Events run ON the real Setswana calendar (04 §9.2): one themed event per
 * chapter, materialised from the template below. Each event GRANTS the goods it
 * wants turned in — because D7 defers crafting, the player cannot bake Bupi or
 * Borotho, so the Event hands them over as a participation reward and the Kgotla
 * pays Chapter Tokens for the turn-in. That is how D6 is real in MVP with no
 * crafting system.
 *
 * Tokens are awarded BY ACHIEVEMENT (not purchase) and EXPIRE TO ZERO at chapter
 * end (I13) — the Event service uses the same `ChapterService.addTokens` path as
 * every other award, so the rollover stays the single owner of expiry.
 */

import type { ChapterSlug } from './chapters';

/** The two Event goods (02 §6.3 — the DIKUNO staples). */
export type EventGrantItem = 'bupi' | 'borotho';

export interface EventTemplate {
  /** Stable slug; `events.slug` is UNIQUE and derived from it. */
  slug: string;
  name: string;
  setswana: string;
  description: string;
  /** The chapter this Event opens in. */
  chapter: ChapterSlug;
  /** What the Event grants to each participant who claims it. */
  grantItem: EventGrantItem;
  grantQty: number;
  /**
   * Chapter Tokens paid on turn-in. Display-only currency (02 §3.3): never
   * convertible, never withdrawable, zeroed at chapter end.
   */
  chapterTokenReward: number;
  /**
   * A player may claim each Event once per occurrence. The `event_grants`
   * UNIQUE(player_id, event_id) is the idempotency guard (14 §9).
   */
  claimLimitPerPlayer: number;
}

export const EVENT_TEMPLATES: readonly EventTemplate[] = [
  {
    slug: 'pula_first_sowing',
    name: 'The First Sowing',
    setswana: 'Go Jala ga Ntlha',
    description:
      'The rains have come. The ward brings flour to the planting fire — turn yours in for a token.',
    chapter: 'pula',
    grantItem: 'bupi',
    grantQty: 4,
    chapterTokenReward: 2,
    claimLimitPerPlayer: 1,
  },
  {
    slug: 'phane_long_growth',
    name: 'The Long Growth',
    setswana: 'Go Gola ga Nako',
    description:
      'Late rains, long stalks. Bread for the workers who tend what grows slowly.',
    chapter: 'phane',
    grantItem: 'borotho',
    grantQty: 2,
    chapterTokenReward: 3,
    claimLimitPerPlayer: 1,
  },
  {
    slug: 'moriti_water_works',
    name: 'The Water Works',
    setswana: 'Tiro ya Metsi',
    description:
      'Dry and cold — water is the whole game. The ward keeps the Jojo full and shares the bread.',
    chapter: 'moriti',
    grantItem: 'borotho',
    grantQty: 2,
    chapterTokenReward: 3,
    claimLimitPerPlayer: 1,
  },
  {
    slug: 'letlhafula_harvest_turn_in',
    name: 'The Harvest Turn-In',
    setswana: 'Go Neela ga Letlhafula',
    description:
      'Harvest, wind, preparation. Bring the ward your flour before the fields are bare.',
    chapter: 'letlhafula',
    grantItem: 'bupi',
    grantQty: 4,
    chapterTokenReward: 2,
    claimLimitPerPlayer: 1,
  },
] as const;

export function getEventTemplate(slug: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((e) => e.slug === slug);
}

export function eventTemplatesForChapter(chapter: ChapterSlug): EventTemplate[] {
  return EVENT_TEMPLATES.filter((e) => e.chapter === chapter);
}
