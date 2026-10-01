'use client';

import React from 'react';

/**
 * 2.7 / doc 30 V-6 — a named pixel icon from `assets/ui/icons/`.
 *
 * `PixelIcon` (the existing component) resolves an icon from an **item type** via
 * `lib/pixelIcons.ts`. That is fine for inventory stacks, but it cannot reach the 53
 * curated *interface* icons — `status_ready`, `status_thirsty`, `currency_pula`,
 * `social_botho`, `status_kagiso_pip` and so on — which were generated for exactly
 * the places the UI currently draws emoji (`🌾 🥚 🤝 🔧 🏗️ 💧 🌳 ✦ 🌸`). Emoji ignore
 * the palette, ignore the 32px grid, and render differently on every OS; that is the
 * single biggest cohesion break in the interface (doc 30 V-6).
 *
 * This component is the missing accessor: give it an icon *name* and an emoji, and it
 * draws the pixel icon, falling back to the emoji if the file is absent. The fallback
 * matters because the icon set is generated, and a not-yet-generated icon should
 * degrade to a glyph rather than a broken image.
 */
export interface PixelUiIconProps {
  /** Icon name without extension, e.g. `status_ready`, `currency_pula`. */
  name: string;
  /** Glyph shown if the icon is missing. Omit to render nothing on failure. */
  emoji?: string;
  /** Rendered size in px. The set is authored on a 32px grid, so 16/32/48 are clean. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label. Defaults to the emoji, which is a reasonable spoken name. */
  label?: string;
}

/** Build the served URL for a named icon. */
export function uiIconSrc(name: string): string {
  return `/assets/ui/icons/${name}.png`;
}

export function PixelUiIcon({
  name,
  emoji,
  size = 32,
  className,
  style,
  label,
}: PixelUiIconProps) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    if (!emoji) return null;
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.85, lineHeight: 1, ...style }}
        role="img"
        aria-label={label ?? emoji}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={uiIconSrc(name)}
      alt=""
      aria-label={label ?? emoji ?? name}
      role="img"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated', objectFit: 'contain', ...style }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

export default PixelUiIcon;
