'use client';

import { useEffect } from 'react';
import { useGame } from '../lib/gameState';
import { hapticTap } from '../utils/haptics';

/**
 * Global keyboard layer for /game (03 §16 / the shell spec's key map).
 *
 *   M Market   I Inventory   B Build   K Kgotla   X Bushveld
 *   1–9 select plot N          Esc close topmost overlay
 *   F1 keyboard help
 *
 * Two deliberate design decisions:
 *
 * 1. **Typing safety.** Every handler bails out when the event target is an
 *    input, textarea, select, or contenteditable. Without this, a player
 *    searching the Journal for "market" would have the screen yanked away
 *    mid-word. We also ignore keys held with Ctrl/Meta/Alt so browser and OS
 *    shortcuts (Cmd+R, Ctrl+F, Alt+Tab) keep working.
 *
 * 2. **Plot selection crosses a component boundary.** Plot selection state
 *    lives inside FarmScreen (`selectedPlotId`), and moving it into the global
 *    context would mean threading a 1797-line screen through the provider. So
 *    the hotkey dispatches a DOM CustomEvent and FarmScreen subscribes. That
 *    keeps the dependency one-directional (shell → screen) with no refactor.
 */

/** Fired by the 1–9 keys. FarmScreen listens and selects the nth plot. */
export const PLOT_SELECT_EVENT = 'molemisi:plot-select';
/** Fired by Esc. Screens with an open sheet listen and dismiss their top layer. */
export const ESCAPE_EVENT = 'molemisi:escape';
/** Fired by F1 to toggle the shortcut sheet. */
export const HELP_TOGGLE_EVENT = 'molemisi:help-toggle';

const NAV_KEYS: Record<string, string> = {
  m: 'Market',
  i: 'Inventory',
  b: 'Build',
  k: 'Kgotla',
  x: 'Bushveld',
};

/** Nav targets that are not plain screens (Build is a Farm action). */
function resolveNavTarget(key: string): string | undefined {
  if (!(key in NAV_KEYS)) return undefined;
  return key === 'b' ? 'Farm' : NAV_KEYS[key];
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export function GameHotkeys() {
  const { setActiveNav } = useGame();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // Never steal a browser/OS shortcut.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // F1 — our own help sheet. preventDefault stops the browser help dialog.
      if (e.key === 'F1') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(HELP_TOGGLE_EVENT));
        return;
      }

      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent(ESCAPE_EVENT));
        return;
      }

      // 1–9 → plot N. Only meaningful on the Farm screen; other screens simply
      // have no listener, so this is a no-op there by construction.
      if (/^[1-9]$/.test(e.key)) {
        window.dispatchEvent(
          new CustomEvent(PLOT_SELECT_EVENT, { detail: { index: Number(e.key) - 1 } }),
        );
        return;
      }

      // Space is reserved by the spec for pause, but no pause affordance exists
      // in gameState or the API yet, so it is deliberately left unbound rather
      // than mapped to a keypress that appears to do nothing.
      if (e.key === ' ' || e.code === 'Space') return;

      const target = resolveNavTarget(e.key.toLowerCase());
      if (target) {
        e.preventDefault();
        hapticTap();
        setActiveNav(target);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveNav]);

  return null;
}
