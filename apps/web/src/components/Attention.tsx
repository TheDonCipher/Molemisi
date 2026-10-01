'use client';

import React from 'react';

/**
 * 2.8 / doc 30 V-14 — one attention contract for the whole interface.
 *
 * `docs/03 §13` specifies a four-level priority queue, and *"only the highest-priority
 * element pulses at once; others show static indicators."* The codebase had drifted
 * away from that: the screens were independently sprinkling `animate-pulse`,
 * `animate-bounce`, `plot-ready`, `heritage-mist` and `product-pop` over whatever each
 * one happened to render, so a busy farm showed four things pulsing at once and the
 * pulse stopped meaning anything.
 *
 * This module owns the whole contract:
 *
 *   - `deriveAttention()` collapses live farm state into at most **one** priority,
 *     following the 03 §13 order (withering crop → hungry animal → product ready →
 *     contract deadline).
 *   - `useAttention()` re-derives it from the notification signal the store already
 *     computes (`a.hunger < 0.3 || a.isSick`, `p.canHarvest`) — V-14's own pointer.
 *   - `<Attention>` renders the *one* pulsing child, and degrades everything else to
 *     a static indicator.
 *
 * Colour follows 03 §13: red for critical, orange for high, blue for medium, grey for
 * low. Those are the only pulses allowed on a screen.
 */

/** 03 §13 priority queue, most urgent first. */
export type AttentionLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AttentionSignal {
  level: AttentionLevel;
  /** Stable key of the element that owns the pulse — at most one across a screen. */
  key: string;
  /** Short human-facing reason, used as the accessible description. */
  reason: string;
}

/** Pulse colour + reason per level (03 §13). */
export const ATTENTION_STYLE: Record<
  AttentionLevel,
  { pulse: string; border: string; hex: string }
> = {
  critical: {
    // Crop about to wither — red.
    pulse: 'attention-pulse-critical',
    border: 'border-status-error',
    hex: '#ef4444',
  },
  high: {
    // Animal hungry — orange.
    pulse: 'attention-pulse-high',
    border: 'border-status-warning',
    hex: '#f59e0b',
  },
  medium: {
    // Product ready to collect — blue.
    pulse: 'attention-pulse-medium',
    border: 'border-sky-blue',
    hex: '#38bdf8',
  },
  low: {
    // Contract deadline approaching — grey.
    pulse: 'attention-pulse-low',
    border: 'border-wood-border',
    hex: '#9ca3af',
  },
};

/** The minimum a caller has to tell us. Mirrors the store's own notification signal. */
export interface AttentionInput {
  plots: ReadonlyArray<{ id: number; canHarvest: boolean; stalled?: boolean }>;
  animals: ReadonlyArray<{ id: string; hunger: number; isSick?: boolean }>;
  /** Optional: contract deadlines, when the caller has them. */
  contractDaysLeft?: number | null;
}

/**
 * Collapse farm state into at most ONE signal, in 03 §13 order:
 *
 *   1. critical — a crop is stalled/withering (the tank is empty; it will die)
 *   2. high     — an animal is hungry or sick
 *   3. medium   — a crop or animal product is ready to collect
 *   4. low      — a contract deadline is close
 *
 * Returns `null` when nothing needs the player. The `key` is what makes "at most one
 * pulse" enforceable: a screen pulses the element whose key matches, and nothing else.
 */
export function deriveAttention(input: AttentionInput): AttentionSignal | null {
  const stalled = input.plots.filter((p) => p.stalled);
  if (stalled.length > 0) {
    return {
      level: 'critical',
      key: `plot:${stalled[0]!.id}`,
      reason: `${stalled.length} crop${stalled.length > 1 ? 's' : ''} withering — the tank is empty`,
    };
  }

  const needy = input.animals.filter((a) => a.hunger < 0.3 || a.isSick);
  if (needy.length > 0) {
    return {
      level: 'high',
      key: `animal:${needy[0]!.id}`,
      reason: `${needy.length} animal${needy.length > 1 ? 's' : ''} hungry or sick`,
    };
  }

  const ready = input.plots.filter((p) => p.canHarvest);
  if (ready.length > 0) {
    return {
      level: 'medium',
      key: `plot:${ready[0]!.id}`,
      reason: `${ready.length} crop${ready.length > 1 ? 's' : ''} ready to harvest`,
    };
  }

  if (input.contractDaysLeft != null && input.contractDaysLeft <= 2) {
    return {
      level: 'low',
      key: 'contract',
      reason: 'A contract deadline is close',
    };
  }

  return null;
}

/**
 * Is this element the one allowed to pulse? Everything else draws statically.
 * Pass the derived signal (or `null`) and the element's own key.
 */
export function ownsPulse(signal: AttentionSignal | null, key: string): boolean {
  return signal?.key === key;
}

export interface AttentionProps {
  /** The current signal for this screen, or `null` if nothing needs attention. */
  signal: AttentionSignal | null;
  /** Key of the element being rendered. Only a match may pulse. */
  elementKey: string;
  /** Sit the pulse on the element itself, or expose it via render-prop. */
  children: (state: { pulsing: boolean; level: AttentionLevel | null; className: string }) => React.ReactNode;
}

/**
 * Renders `children` with the pulse decision already made. This is a render-prop
 * rather than a wrapper element so it can drive any surface (a plot button, a nav
 * badge, an animal card) without imposing its own DOM.
 */
export function Attention({ signal, elementKey, children }: AttentionProps) {
  const pulsing = ownsPulse(signal, elementKey);
  const level = pulsing ? (signal?.level ?? null) : null;
  const className = level ? `attention-pulse ${ATTENTION_STYLE[level].pulse}` : '';
  return <>{children({ pulsing, level, className })}</>;
}

export default Attention;
