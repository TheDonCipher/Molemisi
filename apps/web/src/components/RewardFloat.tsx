'use client';

import React, { useEffect, useState } from 'react';

/**
 * The reward float (08 §1, D1; `22 §12.2`).
 *
 * On a confirmed Co-op sale the player must see `+{amount} 💰` rise and fade.
 * This is the **only** "money left your wallet" signal, and it is deliberately a
 * short, non-blocking overlay rather than a modal or a waiting animation:
 *
 *   - it plays AFTER the server confirms (the caller passes a `trigger` key), so
 *     it never implies money was credited when the transaction was refused;
 *   - it is ~1.2 s, then it unmounts itself — there is no "waiting" state a
 *     player could mistake for a progress loop;
 *   - it uses a CSS transform only, so it stays cheap on a low-end 3G device.
 *
 * D1's rule that matters here: the Co-op tax is shown BEFORE confirm on the
 * market screen; this float is the positive half of the same truth, never a
 * substitute for it.
 */

export interface RewardFloatProps {
  /** Numeric amount, rendered with the currency prefix. */
  amount: number;
  /** `P` = Pula, `M` = Madi. Any other currency should not use this. */
  currency?: 'P' | 'M';
  /**
   * Change this value to replay the animation. Using a key is more robust than a
   * boolean because two sales in the same second still produce two floats.
   */
  trigger?: string | number;
  className?: string;
}

export function RewardFloat({ amount, currency = 'P', trigger, className = '' }: RewardFloatProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === undefined) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;

  return (
    <span
      key={String(trigger)}
      aria-live="polite"
      className={`pointer-events-none absolute z-30 left-1/2 -translate-x-1/2 top-0 font-mono text-sm font-bold text-gold-currency animate-reward-float drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] ${className}`}
    >
      +{currency}
      {amount.toLocaleString()} 💰
    </span>
  );
}