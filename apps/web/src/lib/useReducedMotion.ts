'use client';

/**
 * Motion and particle preferences (08 §1 D1, `22 §11.5`).
 *
 * `globals.css` already neutralises CSS animations under
 * `prefers-reduced-motion`, but **JS-driven animation needs its own signal** —
 * a `requestAnimationFrame` loop or a `setInterval` frame-cycler does not care
 * what the stylesheet says. This is the single hook every ambient/animated
 * component reads so the accessibility rule is applied in one place.
 *
 * PARTICLES is the second switch: the spec's accessibility standing rule is that
 * ambient motion stops when either the OS reduced-motion preference is set OR the
 * player's own Particles setting is OFF. `ambientMotionAllowed()` is therefore
 * the AND of both, and it is what an idle loop should gate on.
 */

import { useEffect, useState } from 'react';

const PARTICLES_KEY = 'molemisi_particles';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    // Safari < 14 only has the deprecated listener API.
    const legacy = mq as unknown as {
      addListener: (cb: () => void) => void;
      removeListener: (cb: () => void) => void;
    };
    legacy.addListener(onChange);
    return () => legacy.removeListener(onChange);
  }, []);

  return reduced;
}

/** The player's own Particles setting. Defaults to ON (ambient motion is allowed). */
export function useParticlesEnabled(): boolean {
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => setOn(window.localStorage.getItem(PARTICLES_KEY) !== 'off');
    read();
    // `storage` lets a Settings toggle take effect without a reload.
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  return on;
}

export function setParticlesEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTICLES_KEY, enabled ? 'on' : 'off');
}

/**
 * The single gate for any ambient/decorative motion. True only when the OS does
 * NOT ask for reduced motion AND the player has Particles ON.
 */
export function useAmbientMotion(): boolean {
  const reduced = usePrefersReducedMotion();
  const particles = useParticlesEnabled();
  return !reduced && particles;
}