'use client';

import React from 'react';
import { useGame } from '../lib/gameState';
import { useTranslation } from '../lib/useTranslation';

export function HeaderNav() {
  const { pula, farmLevel, activeNav, setActiveNav } = useGame();
  const { tl } = useTranslation();

  const NAV_TABS = [
    { id: 'farm', label: tl('farm') },
    { id: 'kgotla', label: tl('kgotla') },
    { id: 'bushveld', label: tl('wild') },
    { id: 'market', label: tl('market') },
    { id: 'inventory', label: tl('bag') },
    { id: 'settings', label: tl('config') },
  ];

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

        {/* Nav tabs */}
        <nav className="flex-1 flex justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5">
            {NAV_TABS.map((tab) => {
              const isActive =
                activeNav.toLowerCase() === tab.id ||
                (tab.id === 'bushveld' && activeNav.toLowerCase() === 'wild') ||
                (tab.id === 'inventory' && activeNav.toLowerCase() === 'bag') ||
                (tab.id === 'settings' && activeNav.toLowerCase() === 'config');
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    const navName =
                      tab.id === 'farm'
                        ? 'Farm'
                        : tab.id === 'kgotla'
                          ? 'Kgotla'
                          : tab.id === 'bushveld'
                            ? 'Bushveld'
                            : tab.id === 'market'
                              ? 'Market'
                              : tab.id === 'inventory'
                                ? 'Inventory'
                                : 'Settings';
                    setActiveNav(navName);
                  }}
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

        {/* Profile icon */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setActiveNav('Settings')}
            className="w-8 h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
