'use client';

/**
 * Achievements & the honorific ladder — data layer (08 §5 / D5, B2).
 *
 * The ladder (Molemi -> Molemi-Morui -> Moagi -> Motsadi -> Mokgosi) is the ONLY
 * rank signal in the game, and it is EARNED. The client renders it and never
 * computes it: `title` comes from the server, and the ladder definitions come
 * from `@molemisi/game-config` so the display order cannot drift from the
 * catalog. Nothing here can buy a rung.
 */

import { useCallback, useEffect, useState } from 'react';
import { ACHIEVEMENTS, HONORIFIC_LADDER, type Honorific } from '@molemisi/game-config';
import { apiFetch, useGame } from './gameState';

export interface AchievementView {
  slug: string;
  rung: string;
  name: string;
  description: string;
  attained: boolean;
  attainedAt: string | null;
}

export type TitleView = Pick<Honorific, 'rung' | 'index' | 'title' | 'meaning'>;

export function useAchievements() {
  const { showToast } = useGame();
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [title, setTitle] = useState<TitleView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, t] = await Promise.all([
        apiFetch<AchievementView[]>('GET', '/achievements'),
        apiFetch<TitleView>('GET', '/achievements/title'),
      ]);
      if (Array.isArray(list)) setAchievements(list);
      if (t) setTitle(t);
    } catch (e: any) {
      showToast('Honours', e?.message || 'Could not load your honours', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /**
   * Re-evaluate attainment from live game signals. The server decides what has
   * been earned; this only asks it to look again.
   */
  const evaluate = useCallback(async () => {
    try {
      const data = await apiFetch<{ attained: AchievementView[]; title: TitleView }>(
        'POST',
        '/achievements/evaluate',
      );
      if (data) {
        if (Array.isArray(data.attained)) setAchievements(data.attained);
        if (data.title) setTitle(data.title);
      }
    } catch (e: any) {
      showToast('Honours', e?.message || 'Could not refresh your honours', '⚠️', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const attainedCount = achievements.filter((a) => a.attained).length;

  return {
    achievements,
    /** The full ladder, in order, with this player's attainment overlaid. */
    ladder: HONORIFIC_LADDER.map((h) => ({
      ...h,
      attained: achievements.some((a) => a.rung === h.rung && a.attained),
    })),
    title,
    attainedCount,
    total: ACHIEVEMENTS.length,
    loading,
    evaluate,
    reload: load,
  };
}