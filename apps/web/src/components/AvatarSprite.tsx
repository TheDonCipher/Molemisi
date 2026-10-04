'use client';

import React, { useState } from 'react';
import { AVATAR_HAT } from '@molemisi/game-config';

/**
 * The 3-layer avatar sprite (08 §10 / D10, B4).
 *
 * Draw order is bottom-up and is NOT configurable:
 *
 *   1. base   — the Setswana attire body chosen once at creation
 *   2. outfit — the cosmetic overlay the store swaps
 *   3. hat    — the signature Farmer's Hat, ALWAYS on top
 *
 * The hat is drawn last on purpose: it is the player's permanent silhouette cue,
 * so no purchased outfit may ever occlude it. There is deliberately no prop to
 * hide it.
 *
 * GRACEFUL DEGRADATION. The avatar art is still being generated (see
 * `Asset_Manifest_MVP.md` §2). A missing layer must never leave a broken-image
 * icon in the Kgotla, so each layer falls back independently:
 *   - a missing base renders an initials crest (the same treatment NpcPortrait
 *     uses, AC-13);
 *   - a missing outfit simply does not draw — the body and hat still look right;
 *   - a missing hat is the one case that must be loud-ish, so it falls back to a
 *     simple amber hat glyph rather than nothing at all.
 *
 * REDUCED MOTION. This component draws static frames only — there is no ambient
 * loop on the avatar in v1 — so it is automatically safe under
 * `prefers-reduced-motion` / Particles-OFF (`22 §11.5`). The breathing loops the
 * D1 second-pass ruling added are for NPCs and livestock, not the player avatar.
 */

/** A single transparent PNG layer that hides itself if it 404s. */
function Layer({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ imageRendering: 'pixelated' as const }}
      onError={() => setBroken(true)}
    />
  );
}

export interface AvatarSpriteProps {
  /** Layer 1 path from `AVATAR_BASES` / the server's `base.sprite`. */
  baseSprite: string;
  /** Layer 2 — an outfit cosmetic id, or null to wear none. */
  outfitKey?: string | null;
  /** Layer 3 override; defaults to the Farmer's Hat. Never removable. */
  hatSprite?: string;
  /** Display name, used for the initials fallback. */
  name?: string;
  /** Integer-ish pixel width; height is always 2x (the 32x64 footprint). */
  size?: number;
  className?: string;
}

export function AvatarSprite({
  baseSprite,
  outfitKey,
  hatSprite = AVATAR_HAT.sprite,
  name = '?',
  size = 64,
  className = '',
}: AvatarSpriteProps) {
  const [baseBroken, setBaseBroken] = useState(false);
  const [hatBroken, setHatBroken] = useState(false);

  const height = size * 2; // 32x64 source footprint
  const layer = 'absolute inset-0 w-full h-full object-contain';

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height }}
      aria-hidden="true"
    >
      {baseBroken ? (
        // Initials crest — a deliberate, readable placeholder rather than a
        // broken-image glyph, matching NpcPortrait's AC-13 treatment.
        <div
          className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-container font-headline"
          style={{ fontSize: size * 0.5, lineHeight: 1 }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <img
          src={baseSprite}
          alt=""
          className={layer}
          style={{ imageRendering: 'pixelated' as const }}
          onError={() => setBaseBroken(true)}
        />
      )}

      {/* Layer 2 — the swappable cosmetic overlay. */}
      {outfitKey && <Layer src={`/assets/sprites/avatar/outfits/${outfitKey}.png`} alt="" className={layer} />}

      {/* Layer 3 — the always-worn Farmer's Hat, drawn on top of everything. */}
      {hatBroken ? (
        <div
          className="absolute left-0 right-0 top-0 flex justify-center"
          style={{ height: size * 0.45 }}
        >
          <span style={{ fontSize: size * 0.34, lineHeight: 1 }}>🎩</span>
        </div>
      ) : (
        <img
          src={hatSprite}
          alt=""
          className="absolute left-0 right-0 top-0 w-full object-contain"
          style={{ height: size * 0.45, imageRendering: 'pixelated' as const }}
          onError={() => setHatBroken(true)}
        />
      )}
    </div>
  );
}