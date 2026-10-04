/**
 * Achievements & the honorific ladder (08 §5, D5 — RULED 2026-10-04).
 *
 * The ladder — Molemi · Molemi-Morui · Moagi · Motsadi · Mokgosi — is the ONLY
 * rank signal in the game. Rank is ATTAINED, never purchased (D10): no Madi or
 * Pula spend can move a player up a rung, and no rung grants any advantage. It
 * is a display-only social marker.
 *
 * This module is pure: it holds the catalog + the attainment predicate so the
 * catalog is machine-checkable and unit-testable with no database. The
 * AchievementService reads live signals (Botho, livestock, buildings, Events
 * won) and applies `attainedAchievements` to decide what has been earned.
 *
 * Botho THRESHOLDS inform the milestones (they already gate real features —
 * Bupi 100, Deep Bushveld / Auto-Feeder 300, Letsema / Auto-Helper 500) but the
 * RUNG is the achievement, not a raw number.
 */

/** The five rungs, in order. Index is 1-based and load-bearing for comparison. */
export type HonorificRung = 'molemi' | 'molemi_morui' | 'moagi' | 'motsadi' | 'mokgosi';

export interface Honorific {
  rung: HonorificRung;
  /** 1 = lowest. Used to find the highest attained rung. */
  index: number;
  /** Display title (Setswana). */
  title: string;
  /** What the title means, in one line (for the title card). */
  meaning: string;
}

export const HONORIFIC_LADDER: readonly Honorific[] = [
  { rung: 'molemi', index: 1, title: 'Molemi', meaning: 'Farmer — you have taken up the land.' },
  {
    rung: 'molemi_morui',
    index: 2,
    title: 'Molemi-Morui',
    meaning: 'Farmer-Rearer — you keep animals as well as crops.',
  },
  { rung: 'moagi', index: 3, title: 'Moagi', meaning: 'Builder — you have raised something that lasts.' },
  {
    rung: 'motsadi',
    index: 4,
    title: 'Motsadi',
    meaning: 'Elder — a steady hand in the community’s work.',
  },
  { rung: 'mokgosi', index: 5, title: 'Mokgosi', meaning: 'Leader — the village follows what you build.' },
] as const;

/** The signals an achievement milestone is measured against. */
export interface AchievementSignals {
  /** Canonical Botho (player_wallets.botho_points) — never a second counter (I10). */
  botho: number;
  /** Living animals on the player's farm. */
  livestock: number;
  /** Standing buildings on the player's farm. */
  buildings: number;
  /** Events the player has completed (rows in event_grants). */
  eventsWon: number;
}

export type MilestoneKind = keyof AchievementSignals;

export interface Milestone {
  kind: MilestoneKind;
  /** Inclusive lower bound. */
  threshold: number;
}

export interface Achievement {
  slug: string;
  /** The rung this achievement awards. */
  rung: HonorificRung;
  name: string;
  description: string;
  /** ALL milestones must be met for the achievement to be attained. */
  milestones: Milestone[];
}

/**
 * The catalog. One achievement per rung, each with checkable milestones. The
 * slugs are stable (a player's `player_achievements` rows reference them), so
 * they are never renamed.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    slug: 'first_roots',
    rung: 'molemi',
    name: 'First Roots',
    description: 'Break ground and take up the land.',
    milestones: [{ kind: 'botho', threshold: 0 }],
  },
  {
    slug: 'keeper_of_animals',
    rung: 'molemi_morui',
    name: 'Keeper of Animals',
    description: 'Keep livestock and earn the village’s early trust.',
    milestones: [
      { kind: 'livestock', threshold: 1 },
      { kind: 'botho', threshold: 100 },
    ],
  },
  {
    slug: 'raises_what_lasts',
    rung: 'moagi',
    name: 'Raises What Lasts',
    description: 'Raise a building of your own.',
    milestones: [
      { kind: 'buildings', threshold: 1 },
      { kind: 'botho', threshold: 100 },
    ],
  },
  {
    slug: 'steady_hand',
    rung: 'motsadi',
    name: 'Steady Hand',
    description: 'Stand among the elders by sustaining Botho and serving the ward.',
    milestones: [
      { kind: 'botho', threshold: 300 },
      { kind: 'eventsWon', threshold: 1 },
    ],
  },
  {
    slug: 'village_leader',
    rung: 'mokgosi',
    name: 'Village Leader',
    description: 'The village follows what you build — the top rung of the ladder.',
    milestones: [
      { kind: 'botho', threshold: 500 },
      { kind: 'eventsWon', threshold: 3 },
    ],
  },
] as const;

/** Is one milestone met by the current signals? */
export function isMilestoneMet(m: Milestone, signals: AchievementSignals): boolean {
  return (signals[m.kind] ?? 0) >= m.threshold;
}

export function isAchievementAttained(a: Achievement, signals: AchievementSignals): boolean {
  return a.milestones.every((m) => isMilestoneMet(m, signals));
}

/** Every achievement whose milestones are all met right now. */
export function attainedAchievements(signals: AchievementSignals): Achievement[] {
  return ACHIEVEMENTS.filter((a) => isAchievementAttained(a, signals));
}

/** The rung for an achievement slug, or the bottom rung for an unknown slug. */
export function rungForAchievement(slug: string): Honorific {
  const a = ACHIEVEMENTS.find((x) => x.slug === slug);
  return honorificForRung(a?.rung ?? 'molemi');
}

export function honorificForRung(rung: HonorificRung): Honorific {
  return HONORIFIC_LADDER.find((h) => h.rung === rung) ?? HONORIFIC_LADDER[0]!;
}

/**
 * The highest rung the signals justify. Always at least `molemi` — breaking
 * ground is itself the first rung (its milestone is Botho ≥ 0).
 */
export function highestHonorific(signals: AchievementSignals): Honorific {
  const attained = attainedAchievements(signals);
  let best = HONORIFIC_LADDER[0]!;
  for (const a of attained) {
    const h = honorificForRung(a.rung);
    if (h.index > best.index) best = h;
  }
  return best;
}
