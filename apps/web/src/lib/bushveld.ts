'use client';

/**
 * Bushveld data layer — wires the four-screen UI to the finished Bushveld backend
 * (05 §P6; 04 §4.2 / §7.2 / §8 / §9.3). Server is authoritative: Kagiso is
 * recomputed on read, the two 409s are distinct, and restoration stage comes from
 * the API. This hook keeps Bushveld state local to the screen and reads `farmId`
 * + `showToast` from the shared game context.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';
import { recordDiscovery } from './discoveries';

export interface BushveldScene {
  slug: string;
  name: string;
  unlocked: boolean;
  kagiso: number;
  kagisoMax: number;
  secondsToNextPip: number;
  findsDiscovered: number;
  findsTotal: number;
  restorationStage: number;
  restorationAssetKey: string;
}

export interface BushveldHotspot {
  id: string;
  tell: string;
  x: number;
  y: number;
  spriteKey: string;
  kagisoCost: number;
  state: 'ready' | 'resting' | 'scene_not_settled';
  etaSeconds?: number;
  isSparklingToday: boolean;
  isSeasonalActiveToday: boolean;
}

interface BushveldSceneResponse {
  scene: BushveldScene;
  hotspots: BushveldHotspot[];
}

export interface BushveldReward {
  item?: string;
  qty: number;
  discovery: string;
  name: string;
  setswana: string;
  rarity: string;
}

export interface BushveldCollectResult {
  reward: BushveldReward;
  isNewDiscovery: boolean;
  kagisoRemaining: number;
  restorationStage: number;
  restorationStageChanged: boolean;
  restorationAssetKey: string;
}

export function useBushveld() {
  const { farmId, showToast } = useGame();
  const [scenes, setScenes] = useState<BushveldScene[]>([]);
  const [active, setActive] = useState<BushveldScene | null>(null);
  const [hotspots, setHotspots] = useState<BushveldHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectScene = useCallback(
    async (slug: string, silent = false) => {
      if (!farmId) return;
      if (!silent) setLoading(true);
      try {
        const data = await apiFetch<BushveldSceneResponse>(
          'GET',
          `/farms/${farmId}/bushveld/scenes/${slug}`,
        );
        setActive(data.scene);
        setHotspots(data.hotspots);
      } catch (e: any) {
        showToast('Bushveld', e?.message || 'Could not load scene', '⚠️', 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [farmId, showToast],
  );

  const loadScenes = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const data = await apiFetch<BushveldScene[]>('GET', `/farms/${farmId}/bushveld/scenes`);
      setScenes(data);
      const first = data.find((s) => s.unlocked);
      if (first) {
        const detail = await apiFetch<BushveldSceneResponse>(
          'GET',
          `/farms/${farmId}/bushveld/scenes/${first.slug}`,
        );
        setActive(detail.scene);
        setHotspots(detail.hotspots);
      }
    } catch (e: any) {
      showToast('Bushveld', e?.message || 'Could not load scenes', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [farmId, showToast]);

  const collect = useCallback(
    async (hotspot: BushveldHotspot) => {
      if (!farmId) return;
      setBusy(true);
      try {
        const data = await apiFetch<BushveldCollectResult>(
          'POST',
          `/farms/${farmId}/bushveld/hotspots/${hotspot.id}/collect`,
        );
        const r = data.reward;
        // Field Journal: remember the find so the journal can render Mogolo's
        // line for it (server reports only counts; §6 forbids a list endpoint).
        recordDiscovery({
          slug: r.discovery,
          name: r.name,
          setswana: r.setswana,
          rarity: r.rarity,
        });
        if (data.isNewDiscovery) {
          showToast(
            'New Discovery!',
            `${r.name} (${r.setswana}) — Field Journal updated`,
            '✨',
            'success',
          );
        } else {
          showToast('Gathered', `Found ${r.qty}× ${r.name}`, '🌿', 'success');
        }
        // Re-read the scene silently so Kagiso, restoration stage and the just-
        // rested hotspot all reflect server state. No optimistic local math.
        if (active) await selectScene(active.slug, true);
      } catch (e: any) {
        if (e?.status === 409) {
          const m = e.body?.message;
          if (m?.reason === 'hotspot_resting') {
            const mins = Math.ceil((m.etaSeconds ?? 0) / 60);
            showToast('Resting', `This spot is resting — try again in ~${mins} min.`, '🌙', 'warning');
          } else {
            showToast(
              'Not settled',
              `Need ${hotspot.kagisoCost} Kagiso to gather here.`,
              '🌿',
              'warning',
            );
          }
          return;
        }
        showToast('Gather failed', e?.message || 'Something went wrong', '⚠️', 'error');
      } finally {
        setBusy(false);
      }
    },
    [farmId, active, selectScene, showToast],
  );

  useEffect(() => {
    if (farmId) loadScenes();
  }, [farmId, loadScenes]);

  return { scenes, active, hotspots, loading, busy, selectScene, collect };
}
