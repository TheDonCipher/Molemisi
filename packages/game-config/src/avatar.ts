/**
 * The avatar — the 3-layer model (08 §10, D10 — RULED 2026-10-04).
 *
 * An avatar is composed, top-up, as THREE layers that share a 32×64 footprint
 * and anchor:
 *
 *   1. `avatar_base`  — a gender/attire variant, chosen ONCE at creation.
 *                       Not a cosmetic, not purchasable, not editable in store.
 *   2. `avatar_outfit`— the cosmetic overlay. This is the ONLY layer the store
 *                       swaps. New outfits are new `outfit`-slot SKUs (data only).
 *   3. `avatar_hat`   — the signature Farmer's Hat. Worn ALWAYS, drawn on top so
 *                       it is never occluded. Non-removable, non-purchasable,
 *                       deliberately NOT a SKU.
 *
 * The base-variant COUNT and naming are a [DISCRETION] for the art pass; three
 * Setswana-attire-grounded bases ship in MVP (not a binary gender toggle — the
 * choice is "which look do you start in", and it is started, not spent).
 */

export type AvatarBaseKey = 'base_sesana' | 'base_kgale' | 'base_phane';

export interface AvatarBase {
  key: AvatarBaseKey;
  /** Display name (Setswana first, per 03 §2.1). */
  setswana: string;
  name: string;
  description: string;
  /** Where the base sprite lives in the asset tree. */
  sprite: string;
}

export const AVATAR_BASES: readonly AvatarBase[] = [
  {
    key: 'base_sesana',
    setswana: 'Mo Sesana',
    name: 'Sesana Field Hand',
    description: 'Everyday working clothes — the plainest start.',
    sprite: 'sprites/avatar/base_sesana.png',
  },
  {
    key: 'base_kgale',
    setswana: 'Mo Kgale',
    name: 'Old Village Cut',
    description: 'A wrap and shoulder cloth in the old way.',
    sprite: 'sprites/avatar/base_kgale.png',
  },
  {
    key: 'base_phane',
    setswana: 'Mo Phane',
    name: 'Mophane Season',
    description: 'Light cloth for the long, warm months.',
    sprite: 'sprites/avatar/base_phane.png',
  },
] as const;

export const DEFAULT_AVATAR_BASE: AvatarBaseKey = 'base_sesana';

/**
 * The always-worn Farmer's Hat. A FIXED layer, not a slot and not a SKU — the
 * store can never remove or sell it. Rendering draws it last, on top of the
 * outfit, so no purchased cosmetic can hide the silhouette.
 */
export const AVATAR_HAT = {
  key: 'farmers_hat',
  setswana: 'Hutshe ya Molemi',
  name: "Farmer's Hat",
  sprite: 'sprites/avatar/hat_farmers.png',
} as const;

/** The three layers, in draw order (bottom to top). */
export const AVATAR_LAYERS = ['base', 'outfit', 'hat'] as const;
export type AvatarLayer = (typeof AVATAR_LAYERS)[number];

export function getAvatarBase(key: string): AvatarBase | undefined {
  return AVATAR_BASES.find((b) => b.key === key);
}

export function isAvatarBaseKey(key: string): key is AvatarBaseKey {
  return AVATAR_BASES.some((b) => b.key === key);
}
