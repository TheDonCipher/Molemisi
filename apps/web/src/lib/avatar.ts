'use client';

/**
 * The 3-layer avatar — data layer (08 §10 / D10, B4).
 *
 * Layer 1 `baseKey`   a Setswana attire base, chosen ONCE at creation.
 * Layer 2 `outfitKey` the cosmetic overlay — the ONLY layer the store swaps.
 * Layer 3 `hat`       the signature Farmer's Hat, always on, never purchasable.
 *
 * The client mirrors that: `create` is offered only while `created === false`,
 * and `equip` only ever touches the outfit. There is no call that changes the
 * base, because the server refuses it too — "chosen once" is enforced on both
 * sides rather than by hiding a button.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';

export interface AvatarLayerInfo {
  key: string;
  setswana: string;
  name: string;
  sprite: string;
}

export interface AvatarView {
  baseKey: string;
  base: AvatarLayerInfo;
  outfitKey: string | null;
  hat: { key: string; setswana: string; name: string; sprite: string };
  /** Bottom-to-top draw order. */
  layers: readonly string[];
  /** Outfit cosmetics the player owns and may equip. */
  ownedOutfits: string[];
  /** False until the base has been chosen at creation. */
  created: boolean;
}

export function useAvatar() {
  const { showToast } = useGame();
  const [avatar, setAvatar] = useState<AvatarView | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AvatarView>('GET', '/avatar');
      if (data) setAvatar(data);
    } catch (e: any) {
      showToast('Avatar', e?.message || 'Could not load your avatar', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (baseKey: string): Promise<boolean> => {
      setBusy(true);
      try {
        const data = await apiFetch<AvatarView>('POST', '/avatar', { baseKey });
        if (data) setAvatar(data);
        return true;
      } catch (e: any) {
        showToast('Avatar', e?.message || 'Could not create your avatar', '⚠️', 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  /** `null` clears the outfit and leaves the base + hat. */
  const equip = useCallback(
    async (outfitKey: string | null): Promise<boolean> => {
      setBusy(true);
      try {
        const data = await apiFetch<AvatarView>('PUT', '/avatar/outfit', { outfitKey });
        if (data) setAvatar(data);
        return true;
      } catch (e: any) {
        showToast('Avatar', e?.message || 'Could not equip that', '⚠️', 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [showToast],
  );

  return { avatar, loading, busy, create, equip, reload: load };
}