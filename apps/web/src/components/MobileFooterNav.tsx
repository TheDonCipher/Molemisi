'use client';

import React from 'react';
import { useGame } from '../lib/gameState';
import { useTranslation } from '../lib/useTranslation';

export function MobileFooterNav() {
  const { activeNav, setActiveNav } = useGame();
  const { tl } = useTranslation();

  const NAV_ITEMS = [
    { id: 'farm', label: tl('farm'), icon: 'agriculture', navTarget: 'Farm' },
    { id: 'kgotla', label: tl('kgotla'), icon: 'account_balance', navTarget: 'Kgotla' },
    { id: 'bushveld', label: tl('wild'), icon: 'forest', navTarget: 'Bushveld' },
    { id: 'market', label: tl('market'), icon: 'storefront', navTarget: 'Market' },
    { id: 'inventory', label: tl('bag'), icon: 'backpack', navTarget: 'Inventory' },
    { id: 'settings', label: tl('config'), icon: 'settings', navTarget: 'Settings' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-wood-medium border-t-2 border-wood-border md:hidden select-none">
      <nav className="h-14 grid grid-cols-6 items-center px-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeNav.toLowerCase() === item.id ||
            (item.id === 'bushveld' && activeNav.toLowerCase() === 'wild') ||
            (item.id === 'inventory' && activeNav.toLowerCase() === 'bag') ||
            (item.id === 'settings' && activeNav.toLowerCase() === 'config');

          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.navTarget)}
              className={`flex flex-col items-center justify-center py-1 transition-colors h-full ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] leading-tight">
                {item.icon}
              </span>
              <span className="font-mono text-[10px] uppercase leading-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
}
