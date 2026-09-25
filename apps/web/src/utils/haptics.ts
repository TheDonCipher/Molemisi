/**
 * Haptics (Doc 12 §6.1.3) — thin wrappers over navigator.vibrate().
 *
 * No-ops on SSR and on browsers/devices without the Vibration API, so every
 * call site can fire unconditionally.
 */

function vibrate(pattern: number): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}

/** Light tick (10ms) — taps, collects, small confirmations. */
export function hapticTap(): void {
  vibrate(10);
}

/** Stronger pulse (50ms) — repair, planting the Heritage Tree. */
export function hapticStrong(): void {
  vibrate(50);
}
