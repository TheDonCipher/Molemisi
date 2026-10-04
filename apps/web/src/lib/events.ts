'use client';

/**
 * Events — the seasonal live service (08 §6 / D6 + D8, B3).
 *
 * The Event GRANTS the goods (Bupi / Borotho) because crafting is deferred in
 * MVP (D7), and the Kgotla pays Chapter Tokens for the turn-in. The client never
 * decides whether a claim is valid: the server asserts the window, the once-only
 * claim guard and the grant, and returns what actually happened.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';

export interface EventView {
  id?: string;
  slug: string;
  name: string;
  setswana: string;
  description: string;
  chapterSlug: string;
  startsAt: string;
  endsAt: string;
  grantItem: string;
  grantQty: number;
  chapterTokenReward: number;
  claimed?: boolean;
}

export interface EventClaimResult {
  claimed: boolean;
  alreadyClaimed: boolean;
  itemSlug: string;
  quantity: number;
  chapterTokens: number;
  message: string;
}

export function useEvents() {
  const { showToast, refresh } = useGame();
  const [events, setEvents] = useState<EventView[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<EventView[]>('GET', '/events');
      if (Array.isArray(data)) setEvents(data);
    } catch (e: any) {
      showToast('Kgotla', e?.message || 'Could not load the ward events', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = useCallback(
    async (eventId: string): Promise<EventClaimResult | null> => {
      setClaiming(eventId);
      try {
        const res = await apiFetch<EventClaimResult>('POST', `/events/${eventId}/claim`);
        if (res?.claimed) {
          showToast('Event', res.message, '🎁', 'success');
        } else if (res?.alreadyClaimed) {
          showToast('Event', res.message, 'ℹ️', 'info');
        }
        await load();
        // Botho/Chapter Tokens and the inventory may have moved.
        await refresh();
        return res;
      } catch (e: any) {
        showToast('Event', e?.message || 'Could not claim that', '⚠️', 'error');
        return null;
      } finally {
        setClaiming(null);
      }
    },
    [load, refresh, showToast],
  );

  return { events, loading, claiming, claim, reload: load };
}