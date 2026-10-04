'use client';

import React, { useEffect, useState } from 'react';

/**
 * Skeleton screens (`07` UX standard: **never a spinner past two seconds**).
 *
 * The rule exists for a specific reason: a spinner that appears instantly reads
 * as "nothing is happening", while a skeleton that appears after a beat reads
 * as "the shape of the answer is on its way". So:
 *
 *   - under `delayMs` (2 s by default) we render NOTHING — no spinner, no
 *     flashing placeholder, no layout jump;
 *   - after it we render shaped blocks that mirror the real content's shape, so
 *     the screen does not reflow when data lands.
 *
 * The pulse is gated on `useAmbientMotion()` for the same reason the breathing
 * loops are: under reduced motion the skeleton is a static shape, not a light
 * going on and off.
 */

import { useAmbientMotion } from '../lib/useReducedMotion';

export interface SkeletonProps {
  className?: string;
  /** Rounded like a panel, or square like a list row. */
  shape?: 'block' | 'pill' | 'line';
}

export function Skeleton({ className = '', shape = 'block' }: SkeletonProps) {
  const ambient = useAmbientMotion();
  const radius = shape === 'pill' ? 'rounded-full' : shape === 'line' ? 'rounded-sm' : 'rounded-sm';
  return (
    <div
      aria-hidden="true"
      className={`${radius} bg-surface-container-high/60 ${ambient ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

/**
 * Hold nothing for `delayMs`, then show skeletons. Use this instead of a spinner.
 */
export function DelayedSkeleton({
  delayMs = 2000,
  rows = 3,
  className = '',
}: {
  delayMs?: number;
  rows?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" shape="line" />
      ))}
    </div>
  );
}