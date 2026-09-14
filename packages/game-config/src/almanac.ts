/**
 * The Almanac — a season-long reward track (05 §P8; 01 §114 "Almanac (free + Guild track)").
 *
 * It is one of the Pula/Botho faucets (02 § faucets list) and the canonical source of
 * Chapter Tokens (02 §3.3). Each chapter (3 months) the player progresses a free track
 * and, if subscribed, a Guild track; claiming a tier grants its reward and marks it
 * claimed in `player_chapter_state.almanac_progress`.
 *
 * IMPORTANT — PROVISIONAL VALUES. The reward amounts below are NOT pinned down in
 * 02/05. They are reasonable scaffolding so the machinery is real and shippable; the
 * actual tuning (tier count, requirements, payouts) needs Princess Eugenia's sign-off
 * before launch. Everything lives here in the numbers layer by design — nothing is
 * hardcoded in application code.
 */

export type AlmanacTrack = 'free' | 'guild';

/** What a tier's requirement means to the UI. Actual activity-gating is a follow-up
 * (the progress-collection system that would measure these does not exist yet); for
 * now tiers are claimable in sequence once unlocked, and the Guild track requires an
 * active subscription. */
export type AlmanacRequirementKind =
  | 'logins'
  | 'quests'
  | 'community'
  | 'bushveld'
  | 'harvest';

export interface AlmanacReward {
  pula?: number;
  botho?: number;
  /** Chapter Tokens (02 §3.3) — the in-chapter currency. */
  chapterTokens?: number;
  /** A cosmetic unlock key (resolved by the cosmetics catalogue, P9). */
  cosmetic?: string;
}

export interface AlmanacTier {
  /** 1-based, sequential. Tiers must be claimed in order. */
  tier: number;
  requirement: { kind: AlmanacRequirementKind; count: number };
  reward: AlmanacReward;
}

export interface AlmanacConfig {
  freeTrack: AlmanacTier[];
  guildTrack: AlmanacTier[];
}

export const ALMANAC: AlmanacConfig = {
  // Free track — earnable by any player through the season. Modest, steady.
  freeTrack: [
    { tier: 1, requirement: { kind: 'logins', count: 3 }, reward: { pula: 30 } },
    { tier: 2, requirement: { kind: 'quests', count: 2 }, reward: { chapterTokens: 10 } },
    { tier: 3, requirement: { kind: 'community', count: 1 }, reward: { pula: 50, botho: 5 } },
    { tier: 4, requirement: { kind: 'bushveld', count: 5 }, reward: { chapterTokens: 20 } },
    { tier: 5, requirement: { kind: 'harvest', count: 10 }, reward: { pula: 80, chapterTokens: 20 } },
  ],
  // Guild track — subscriber-only, richer, includes a cosmetic.
  guildTrack: [
    { tier: 1, requirement: { kind: 'logins', count: 5 }, reward: { pula: 60 } },
    { tier: 2, requirement: { kind: 'quests', count: 4 }, reward: { chapterTokens: 30 } },
    { tier: 3, requirement: { kind: 'community', count: 2 }, reward: { pula: 100, botho: 10 } },
    { tier: 4, requirement: { kind: 'bushveld', count: 10 }, reward: { chapterTokens: 50, cosmetic: 'guild_frame_1' } },
    { tier: 5, requirement: { kind: 'harvest', count: 20 }, reward: { pula: 150, chapterTokens: 50 } },
  ],
};

export function getAlmanacTier(
  track: AlmanacTrack,
  tier: number,
): AlmanacTier | undefined {
  const list = track === 'guild' ? ALMANAC.guildTrack : ALMANAC.freeTrack;
  return list.find((t) => t.tier === tier);
}
