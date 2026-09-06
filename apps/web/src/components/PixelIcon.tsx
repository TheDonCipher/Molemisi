'use client';

import React from 'react';
import { resolveItemIcon } from '@/lib/pixelIcons';

/**
 * Pixel-art icon with graceful emoji fallback.
 * Renders the PixelLab icon when available, otherwise the emoji.
 */
export function PixelIcon({
  itemType,
  emoji,
  size = 32,
  className,
  style,
}: {
  itemType?: string | null;
  emoji: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = React.useState(false);
  const src = resolveItemIcon(itemType);

  if (!src || failed) {
    return (
      <span
        className={className}
        style={{ fontSize: size * 0.85, lineHeight: 1, ...style }}
        role="img"
        aria-label={emoji}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated', objectFit: 'contain', ...style }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
