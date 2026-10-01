'use client';

import React from 'react';
import {
  GROUND_TILE_PX,
  BASE_SHEET_TILES,
  BASE_SHEET_UPPER_COL,
  BASE_SHEET_UPPER_ROW,
  type GroundTileRef,
} from '@/lib/groundTiles';

/**
 * 2.4 / doc 30 V-4.1 — one plot cell's ground, painted behind the crop.
 *
 * This is deliberately NOT `<PixelSprite>`: a sprite is a whole image that gets
 * scaled, whereas a ground tile is a *texture* that has to fill an arbitrary box
 * without distorting. So it is a background-image layer with:
 *
 *   - `background-size` pinned to `scale × 16px`, so the art is never resampled and
 *     never stretched to a fractional width;
 *   - `background-repeat: repeat` on the direct-file case, which only matters if the
 *     cell happens to be an exact multiple of the tile — normally one tile fills it;
 *   - a `background-position` crop on the atlas case (`grass_base.png` is a 4×4
 *     sheet, so the all-upper tile lives at column 3 / row 3).
 *
 * `image-rendering: pixelated` keeps the 16px art crisp when the box is not an exact
 * multiple — the browser will snap rather than smooth.
 */
export interface FarmGroundProps {
  tile: GroundTileRef;
  /** Integer zoom. 2 → a 16px tile drawn at 32px. */
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FarmGround({ tile, scale = 2, className, style }: FarmGroundProps) {
  const s = Math.max(1, Math.floor(scale));
  const size = GROUND_TILE_PX * s;

  const backgroundImage = `url('${tile.src}')`;
  const isAtlas = tile.klass === 'upper';

  // On the atlas, crop to one tile. On a direct file, show it at the origin.
  const backgroundSize = isAtlas ? `${size * BASE_SHEET_TILES}px ${size * BASE_SHEET_TILES}px` : `${size}px ${size}px`;
  const backgroundPosition = isAtlas
    ? `${-BASE_SHEET_UPPER_COL * size}px ${-BASE_SHEET_UPPER_ROW * size}px`
    : '0 0';

  return (
    <span
      aria-hidden
      data-ground-set={tile.set}
      data-ground-class={tile.klass}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

export default FarmGround;
