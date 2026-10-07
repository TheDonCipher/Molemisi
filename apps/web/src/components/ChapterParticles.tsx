'use client';

import React from 'react';
import { chapterForDate, type ChapterSlug } from '@molemisi/game-config';

/**
 * 2.9 / doc 30 V-11 — season particles, with the cultural correction.
 *
 * Twelve particle sprites were generated and none were ever drawn. Doc 30 maps them
 * onto the four chapters (04 §9.1):
 *
 *   - **Pula**       → `water_drop` + `rain_cloud`-ish drift (the rains)
 *   - **Phane**      → `leaf_green` + `petal_pink` (growth, the mophane window)
 *   - **Moriti**     → `dust_puff` + `smoke_puff` (dry and cold; seed-fluff drifts)
 *   - **Letlhafula** → `leaf_autumn` + `sparkle_gold` (harvest, wind)
 *
 * **`particles/snowflake.png` is deliberately not used, and has been deleted.**
 * Botswana has no snow; a snowflake in an art set whose first principle is *"Botswana's
 * landscape and culture"* (05 §1.5) is precisely the Western default that principle
 * forbids. Doc 30 offers repurposing it as Moriti seed-fluff — we instead use
 * `dust_puff`, which is already the honest image and needs no reinterpretation.
 *
 * The particles are purely decorative: `aria-hidden`, `pointer-events: none`, and
 * they stop entirely under `prefers-reduced-motion` (03 §16). Nothing here carries
 * information, so hiding it loses nothing.
 */

/** The two sprites each chapter drifts. Order is [primary, secondary]. */
export const CHAPTER_PARTICLES: Record<ChapterSlug, [string, string]> = {
  pula: ['water_drop', 'sparkle_white'],
  phane: ['leaf_green', 'petal_pink'],
  moriti: ['dust_puff', 'smoke_puff'],
  letlhafula: ['leaf_autumn', 'sparkle_gold'],
};

/**
 * Deterministic per-index placement. A pure function of `i` keeps the field stable
 * across re-renders (no reshuffling every state update) and avoids needing a
 * seeded RNG in the render path.
 */
function placement(i: number, count: number) {
  // Golden-ratio dispersal gives an even spread without clustering.
  const phi = 0.618033988749895;
  const x = ((i * phi) % 1) * 100;
  const y = (((i + 1) * phi * 1.7) % 1) * 100;
  const delay = (i * 0.7) % 5;
  const duration = 6 + ((i * 1.3) % 4);
  return { x, y, delay, duration, count };
}

export interface ChapterParticlesProps {
  /** Chapter override; defaults to the real calendar (04 §9.1). */
  chapter?: ChapterSlug;
  /** How many motes to draw. Dense enough to read as weather, not dust. */
  count?: number;
  /** Opacity ceiling, so the field reads over busy scenes without hiding crops. */
  opacity?: number;
  /** Base sprite size in px (pixelated). Per-mote scale adds variety. */
  size?: number;
  className?: string;
}

export function ChapterParticles({
  chapter,
  count = 28,
  opacity = 0.9,
  size = 24,
  className,
}: ChapterParticlesProps) {
  const slug = chapter ?? chapterForDate(new Date()).slug;
  const [primary, secondary] = CHAPTER_PARTICLES[slug];

  return (
    <div
      aria-hidden
      data-chapter-particles={slug}
      className={`chapter-particles pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
      style={{ opacity }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const { x, y, delay, duration } = placement(i, count);
        // Alternate the two sprites so the field is not one repeated shape.
        const sprite = i % 2 === 0 ? primary : secondary;
        // Per-mote scale (0.8×–1.4×) keeps the field varied; every third mote
        // runs larger so the weather reads at a glance on small screens.
        const scale = i % 3 === 0 ? 1.4 : 0.8 + ((i * 0.37) % 0.6);
        const px = Math.round(size * scale);
        return (
          <span
            key={i}
            className="chapter-particle"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              zIndex: 1,
            }}
          >
            <img
              src={`/assets/particles/${sprite}.png`}
              alt=""
              width={px}
              height={px}
              style={{
                imageRendering: 'pixelated',
                width: px,
                height: px,
                // Brighten + slight glow so motes pop over busy farm/bush scenes.
                filter: 'brightness(1.25) drop-shadow(0 0 3px rgba(255,255,255,0.65))',
              }}
              draggable={false}
            />
          </span>
        );
      })}
    </div>
  );
}

export default ChapterParticles;
