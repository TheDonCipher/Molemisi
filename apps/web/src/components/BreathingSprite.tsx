'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAmbientMotion } from '../lib/useReducedMotion';

/**
 * Ambient breathing loop (08 §1, D1 second-pass ruling; W12 / B8).
 *
 * A *presence* cue, not a state change: a ~3 s cycle of 2-4 px of vertical travel
 * over a 2-3 frame sheet. It exists so a standing NPC or animal reads as alive
 * rather than as a decal.
 *
 * THE FOUR RULES, all enforced here rather than left to call sites:
 *
 *  1. **It never blocks input.** The animated layer is `pointer-events-none`, so
 *     the tap target underneath is the sprite's full box. A presence cue that
 *     swallows taps is worse than no cue.
 *  2. **It is the ONLY ambient loop in v1.** Crops, buildings and scene props do
 *     not breathe without a new ruling (`Asset_Manifest_MVP.md` §6 scope guard).
 *  3. **It obeys accessibility.** `useAmbientMotion()` gates it, so it stops
 *     entirely under `prefers-reduced-motion` OR when the player's Particles
 *     setting is OFF — both are required by `22 §11.5`.
 *  4. **It degrades to the static sprite.** If the idle sheet has not been
 *     generated yet (they are new art), the component renders the ordinary
 *     single-frame sprite instead. A missing sheet is a placeholder, never a
 *     broken image and never an empty box.
 *
 * COST (`20 §5.4`, low-end 3G): one `setInterval` per sprite, driven by CSS
 * transforms rather than per-frame React re-renders, and it **pauses when the tab
 * is hidden or the sprite scrolls out of view**.
 */

export interface BreathingSpriteProps {
  /** The ordinary single-frame sprite. Always required — it is the fallback. */
  src: string;
  /**
   * Optional horizontal idle sheet (`frames` frames side by side). When absent or
   * not yet generated, this is skipped and the static sprite renders.
   */
  sheet?: string;
  /** Frames in the sheet. The ruling allows 2-3; keep it low for low-end devices. */
  frames?: number;
  /** Full cycle length in ms. The spec's figure is ~3000. */
  periodMs?: number;
  /** Vertical travel in px. The spec's range is 2-4. */
  amplitudePx?: number;
  /** Rendered width in px (art is square for animals, 32x64 for NPCs). */
  width?: number;
  /** Rendered height; defaults to `width` (square). */
  height?: number;
  alt?: string;
  className?: string;
  /** Delay before this loop starts, so a row of NPCs is not in lockstep. */
  staggerMs?: number;
  /**
   * Called when even the STATIC sprite 404s, so the host can supply a richer
   * fallback (e.g. the Kgotla's initials crest) instead of the built-in glyph.
   */
  onSourceError?: () => void;
}

export function BreathingSprite({
  src,
  sheet,
  frames = 2,
  periodMs = 3000,
  amplitudePx = 3,
  width = 32,
  height = width,
  alt = '',
  className = '',
  staggerMs = 0,
  onSourceError,
}: BreathingSpriteProps) {
  const ambient = useAmbientMotion();
  const [frame, setFrame] = useState(0);
  const [sheetBroken, setSheetBroken] = useState(false);
  const [staticBroken, setStaticBroken] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  // Surface a 404 on the static art to the host, exactly once per source.
  const reportSourceError = () => {
    setStaticBroken(true);
    onSourceError?.();
  };

  /**
   * A sheet only counts if there IS one, it has not 404'd, and it has more than
   * one frame. Everything downstream branches on this single boolean, so "no
   * breathing" is always just "no sheet" and never a half-working animation.
   */
  const sheetUsable = Boolean(sheet) && !sheetBroken && frames > 1;

  useEffect(() => {
    // Rule 3: no loop at all when ambient motion is off.
    if (!ambient || !sheetUsable) return;

    const step = Math.max(400, Math.floor(periodMs / frames));
    const start = () => {
      if (timer.current !== null) return;
      timer.current = window.setInterval(() => setFrame((f) => (f + 1) % frames), step);
    };
    const stop = () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };

    let visible = true;
    let onScreen = true;
    const sync = () => {
      visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      onScreen = !ref.current || isInView(ref.current);
      if (visible && onScreen) start();
      else stop();
    };

    // Rule 4 / cost: pause when hidden or scrolled away.
    const io =
      typeof IntersectionObserver !== 'undefined' && ref.current
        ? new IntersectionObserver(
            (entries) => {
              onScreen = entries.some((e) => e.isIntersecting);
              sync();
            },
            { rootMargin: '64px' },
          )
        : null;
    if (ref.current) io?.observe(ref.current);
    document.addEventListener('visibilitychange', sync);
    if (staggerMs > 0) {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        sync();
      }, staggerMs);
    } else {
      sync();
    }

    return () => {
      stop();
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      io?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ambient, sheetUsable, frames, periodMs, staggerMs]);

  const box = { width, height };

  return (
    <div ref={ref} className={`relative shrink-0 overflow-visible ${className}`} style={box}>
      {sheetUsable ? (
        <div className="absolute inset-0">
          <img
            src={sheet}
            alt={alt}
            // The sheet is `frames` wide; sliding it by one frame width shows
            // exactly one frame. pointer-events-none keeps the tap target whole.
            style={{
              position: 'absolute',
              inset: 0,
              width: width * frames,
              height,
              maxWidth: 'none',
              transform: `translate3d(${-frame * width}px, 0, 0)`,
              transition: ambient ? `transform ${Math.round(periodMs / frames)}ms steps(1)` : 'none',
              imageRendering: 'pixelated' as const,
              pointerEvents: 'none' as const,
            }}
            onError={() => setSheetBroken(true)}
          />
          {/* The 2-4 px vertical breath, layered under any tap feedback. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              transform: ambient
                ? `translate3d(0, ${Math.sin((frame / frames) * Math.PI * 2) * amplitudePx}px, 0)`
                : 'none',
              transition: ambient ? `transform ${Math.round(periodMs / frames)}ms ease-in-out` : 'none',
              pointerEvents: 'none' as const,
            }}
          />
        </div>
      ) : staticBroken ? (
        <div
          aria-hidden="true"
          className="w-full h-full flex items-center justify-center bg-primary-container text-on-primary-container"
          style={{ fontSize: Math.max(8, width * 0.4), lineHeight: 1 }}
        >
          🌾
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width, height, imageRendering: 'pixelated' as const }}
          onError={reportSourceError}
        />
      )}
    </div>
  );
}

function isInView(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > -64 && r.top < (window.innerHeight || 0) + 64;
}
