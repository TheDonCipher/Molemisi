import {
  ACHIEVEMENTS,
  attainedAchievements,
  HONORIFIC_LADDER,
  highestHonorific,
  honorificForRung,
  isMilestoneMet,
  type AchievementSignals,
} from './achievements';

/**
 * D5 — the honorific ladder is data, so its shape and its attainment predicate
 * are asserted here, away from any database.
 */
describe('the honorific ladder (D5)', () => {
  const noSignals: AchievementSignals = { botho: 0, livestock: 0, buildings: 0, eventsWon: 0 };

  it('has exactly five rungs in ascending order', () => {
    expect(HONORIFIC_LADDER).toHaveLength(5);
    expect(HONORIFIC_LADDER.map((h) => h.index)).toEqual([1, 2, 3, 4, 5]);
    expect(HONORIFIC_LADDER.map((h) => h.title)).toEqual([
      'Molemi',
      'Molemi-Morui',
      'Moagi',
      'Motsadi',
      'Mokgosi',
    ]);
  });

  it('has exactly one achievement per rung', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.rung)).size).toBe(HONORIFIC_LADDER.length);
  });

  it('gives a brand-new player the bottom rung and no further', () => {
    const attained = attainedAchievements(noSignals);
    expect(attained.map((a) => a.slug)).toEqual(['first_roots']);
    expect(highestHonorific(noSignals).rung).toBe('molemi');
  });

  it('requires EVERY milestone of an achievement, not any one', () => {
    const keeper = ACHIEVEMENTS.find((a) => a.slug === 'keeper_of_animals')!;
    // Botho met, livestock not -> not attained.
    expect(
      isMilestoneMet({ kind: 'botho', threshold: 100 }, { ...noSignals, botho: 200 }),
    ).toBe(true);
    expect(attainedAchievements({ ...noSignals, botho: 500 })).not.toContainEqual(keeper);
  });

  it('climbs to Mokgosi only when every milestone across the ladder is met', () => {
    const full: AchievementSignals = { botho: 500, livestock: 3, buildings: 2, eventsWon: 3 };
    expect(highestHonorific(full).rung).toBe('mokgosi');
    // Same estate, but no Events won — the two top rungs need community acts,
    // so Botho alone must stall the player below them.
    expect(highestHonorific({ ...full, eventsWon: 0 }).rung).toBe('moagi');
  });

  it('resolves an unknown slug to the bottom rung rather than throwing', () => {
    expect(honorificForRung('molemi').index).toBe(1);
  });
});
