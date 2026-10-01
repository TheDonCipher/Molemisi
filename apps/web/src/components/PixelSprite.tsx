'use client';

import React from 'react';

/**
 * 2.2 / doc 30 V-3 — the one place a pixel sprite is drawn.
 *
 * Before this existed, every screen hand-rolled an `<img>` and each chose its own
 * scale, so sprite sizes drifted (and a non-integer scale silently resamples the
 * art, which is what makes pixel art look muddy). This component centralises:
 *
 *   - **integer-only scale.** A `scale` of 1.5 is clamped to 2 — never fractional,
 *     so a sprite pixel always lands on a whole number of screen pixels and the
 *     `image-rendering: pixelated` hint actually does its job.
 *   - **bottom-centre anchoring** (`anchor="bottom"`), which crops and buildings
 *     need: a crop must grow *upward from the soil line* as its stage advances,
 *     not expand around its own middle.
 *   - **emoji fallback** via `onError`, so a not-yet-generated sprite degrades to
 *     a glyph instead of a broken-image icon (this is how the deferred kgaka art
 *     currently renders).
 *
 * The source dimensions come from the PNG's own intrinsic size; pass `nativeWidth`
 * (and optionally `nativeHeight`) when you already know it, so the box reserves the
 * right space *before* the image loads and the layout cannot jump.
 */
export interface PixelSpriteProps {
  /** Path under `/public`, e.g. `sprites/animals/chicken/idle.png` or `/assets/...`. */
  src: string;
  /** Integer zoom factor. Fractional values are floored to a whole number (min 1). */
  scale?: number;
  /** Intrinsic pixel width of the source art. Used to size the box before load. */
  nativeWidth?: number;
  /** Intrinsic pixel height. Defaults to `nativeWidth` (square) when omitted. */
  nativeHeight?: number;
  /**
   * `bottom` anchors the sprite by its bottom-centre (crops, buildings, props on a
   * ground line). `center` is the default for anything that sits in a slot.
   */
  anchor?: 'center' | 'bottom';
  /** Glyph shown if the sprite 404s. Omit to hide the element entirely on failure. */
  fallback?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Coerce any requested scale to a whole number >= 1.  */
export function integerScale(scale: number): number {
  if (!Number.isFinite(scale) || scale < 1) return 1;
  return Math.max(1, Math.floor(scale));
}

export function PixelSprite({
  src,
  scale = 1,
  nativeWidth,
  nativeHeight,
  anchor = 'center',
  fallback,
  alt = '',
  className,
  style,
}: PixelSpriteProps) {
  const [failed, setFailed] = React.useState(false);
  const s = integerScale(scale);

  // Normalise: callers may pass `assets/...` or `/assets/...`.
  const url = src.startsWith('/') || src.startsWith('http') ? src : `/${src}`;

  if (failed) {
    if (!fallback) return null;
    const glyphSize = (nativeWidth ?? 16) * s;
    return (
      <span
        className={className}
        style={{ fontSize: glyphSize, lineHeight: 1, ...style }}
        role="img"
        aria-label={alt || fallback}
      >
        {fallback}
      </span>
    );
  }

  const w = nativeWidth ? nativeWidth * s : undefined;
  const h = nativeWidth ? (nativeHeight ?? nativeWidth) * s : undefined;

  return (
    <img
      src={url}
      alt={alt}
      width={w}
      height={h}
      className={className}
      style={{
        imageRendering: 'pixelated',
        objectFit: 'contain',
        // Bottom-anchored sprites keep their feet on the ground line regardless of
        // how tall the parent box is; centred sprites just sit in the middle.
        alignSelf: anchor === 'bottom' ? 'flex-end' : undefined,
        objectPosition: anchor === 'bottom' ? 'bottom' : undefined,
        ...style,
      }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

export default PixelSprite;
