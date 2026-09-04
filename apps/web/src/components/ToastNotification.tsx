'use client';

import React from 'react';
import { useGame } from '../lib/gameState';

export function ToastNotification() {
  const { toast, clearToast } = useGame();

  if (!toast) return null;

  return (
    <div className="fixed bottom-16 md:bottom-8 right-4 md:right-8 z-50 pointer-events-auto max-w-md w-full animate-bounce-in select-none">
      <div className="bg-wood-dark/95 border-2 border-wood-border text-cream-surface p-3.5 md:p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.7)] flex items-center gap-3 backdrop-blur-sm">
        <div className="w-10 h-10 bg-primary-container/20 border border-primary/30 flex items-center justify-center shrink-0 text-2xl">
          <span className="animate-pulse">{toast.icon || '🌾'}</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-headline text-sm font-bold text-gold-currency tracking-wider uppercase truncate">
            {toast.title}
          </span>
          <span className="font-body text-xs text-cream-surface leading-snug line-clamp-2">
            {toast.message}
          </span>
        </div>
        <button
          onClick={clearToast}
          className="text-on-surface-variant hover:text-cream-surface p-1 transition-colors self-start"
          title="Dismiss"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
