/**
 * @molemisi/game-config — the authoritative numbers and content for v1.
 * Source: docs/MVP/02_Economy_And_Currencies.md and friends.
 *
 * Nothing in application code may hardcode a number that appears in the spec.
 */

export * from './crops';
export * from './items';
export * from './itemRelations';
export * from './crafting';
export * from './economy';
export * from './chapters';
export * from './almanac';
export * from './bushveld';
export * from './buildings';
export * from './livestock';
export * from './weather';
export * from './store';
export * from './theme';
export * from './dialogue';

export const GAME_VERSION = '1.0.0-mvp';

/* ------------------------------------------------------------------ Game loop */
export const MAX_OFFLINE_HOURS = 24;
export const SELF_SUSTAINING_THRESHOLD_HOURS = 72;
/** 02 §4.1 — the Co-op price band drifts on a 6-hour cycle. */
export const MARKET_PRICE_UPDATE_INTERVAL_HOURS = 6;
export const MIN_PRICE_MULTIPLIER = 0.5;
export const MAX_PRICE_MULTIPLIER = 2.0;
