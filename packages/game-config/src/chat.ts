/**
 * Global Kgotla chat — configuration (08 §5, D5).
 *
 * "Mafoko otlhe a lekgotla a mantle" — all the words of the kgotla are sweet.
 * The chat is a peaceful, global community channel in the Kgotla.
 *
 * RULING (2026-10-04, third pass): **no chat moderation.** There is no profanity
 * list, no mute/block, no report queue, and no trust-and-safety sign-off blocks
 * the build. The moderation subsystem originally specified for B1 is withdrawn.
 *
 * What is configured here is deliberately NOT moderation — it is anti-flood
 * hygiene (`20 §5.4`: the target audience is on mobile data, so a stuck send
 * loop must not become an unbounded request storm). It constrains HOW OFTEN a
 * player posts, never WHAT they may say.
 */

/** The languages a message may be composed in. */
export type ChatLanguage = 'tn' | 'en';
export const CHAT_LANGUAGES: readonly ChatLanguage[] = ['tn', 'en'];

/** The chat channel. Global for v1 (D5) — one shared Kgotla. */
export const CHAT_CHANNEL = 'kgotla' as const;

/** How many messages a read returns by default. */
export const CHAT_PAGE_SIZE = 50;

/**
 * Anti-flood limits, per player. These are payload/traffic guards and do not
 * inspect message content.
 */
export const CHAT_RATE_LIMITS = {
  /** Seconds that must pass between two consecutive messages. */
  minSecondsBetween: 5,
  /** Rolling window length, in seconds. */
  windowSeconds: 60,
  /** Maximum messages allowed inside `windowSeconds`. */
  maxPerWindow: 10,
  /** Longest single message body, in characters (a payload guard, not a filter). */
  maxLength: 280,
} as const;

/**
 * The payload guard: empty messages and over-long messages are rejected before
 * they touch the database. Length is a transport limit, not content policy.
 */
export function isPostable(body: string): 'empty' | 'too_long' | 'ok' {
  const text = (body ?? '').trim();
  if (!text) return 'empty';
  if (text.length > CHAT_RATE_LIMITS.maxLength) return 'too_long';
  return 'ok';
}

