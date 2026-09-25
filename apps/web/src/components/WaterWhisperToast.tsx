'use client';

import React from 'react';

/**
 * Water Whisper (Doc 12 §4.1 / Doc 11 §3) — an ambient lore line that fades in
 * directly above the tank/dock bar: italic, slightly transparent, no blocking
 * popup. The CSS animation (globals.css `.water-whisper`) runs fade-in ~1s →
 * hold 4s → fade-out 2s (7s total), matching the auto-clear timer kept in
 * gameState (`waterWhisper`). Absolutely positioned inside the dock's relative
 * container so it never shifts layout; `key`ed by text so a fresh whisper
 * restarts the animation.
 */
export function WaterWhisperToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p
      key={text}
      className="water-whisper pointer-events-none absolute inset-x-0 bottom-full mb-1.5 z-10 px-3 text-center font-mono text-[11px] italic text-cream-surface/80"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
