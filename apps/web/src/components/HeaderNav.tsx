'use client';

import React from 'react';
import { useGame } from '../lib/gameState';

const NAV_TABS = [
  { id: 'farm', label: 'Farm' },
  { id: 'kgotla', label: 'Kgotla' },
  { id: 'bushveld', label: 'Wild' },
  { id: 'market', label: 'Market' },
  { id: 'inventory', label: 'Bag' },
  { id: 'settings', label: 'Config' },
];

export function HeaderNav() {
  const { pula, farmLevel, activeNav, setActiveNav } = useGame();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-wood-medium border-b-2 border-wood-border select-none">
      <div className="h-12 md:h-14 w-full px-2 md:px-4 flex items-center justify-between gap-1">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-lg md:text-xl">🌾</span>
          <span className="font-headline text-xs md:text-sm text-primary font-bold uppercase hidden sm:block">
            Molemisi
          </span>
        </div>

        {/* Pula + Level chip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border">
            <span className="text-[10px]">💰</span>
            <span className="font-mono text-[10px] md:text-[11px] text-gold-currency font-bold">
              {pula.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border">
            <span className="font-mono text-[10px] text-primary font-bold">Lv.{farmLevel}</span>
          </div>
        </div>

        {/* Nav tabs — scrollable on mobile */}
        <nav className="flex-1 flex justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5">
            {NAV_TABS.map((tab) => {
              const isActive = activeNav.toLowerCase() === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveNav(tab.label)}
                  className={`px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-cream-surface'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Profile icon — always visible, right side */}
        <button
          onClick={() => setActiveNav('Settings')}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shrink-0 active:scale-95 transition-transform"
          title="Profile & Settings"
        >
          <span className="material-symbols-outlined text-on-primary text-base">person</span>
        </button>
      </div>
    </header>
  );
}
