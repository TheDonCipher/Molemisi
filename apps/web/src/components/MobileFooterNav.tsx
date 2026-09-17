'use client';

import React from 'react';
import { useGame } from '../lib/gameState';
import { useTranslation } from '../lib/useTranslation';
import { MoreNavMenu } from './MoreNavMenu';

export function MobileFooterNav() {
  const { activeNav, setActiveNav } = useGame();
  const { tl } = useTranslation();

  // Hybrid nav (per 2026-09 ruling): 4 primary screens + a 'More' menu.
  const PRIMARY_NAV = [
    { id: 'farm', label: tl('farm'), icon: 'agriculture', navTarget: 'Farm' },
    { id: 'kgotla', label: tl('kgotla'), icon: 'account_balance', navTarget: 'Kgotla' },
    { id: 'bushveld', label: tl('wild'), icon: 'forest', navTarget: 'Bushveld' },
    { id: 'market', label: tl('market'), icon: 'storefront', navTarget: 'Market' },
  ];
  const SECONDARY_NAV = [
    { id: 'store', label: tl('store'), icon: 'shopping_cart', navTarget: 'Store' },
    { id: 'wallet', label: tl('wallet'), icon: 'account_balance_wallet', navTarget: 'Wallet' },
    { id: 'crafting', label: tl('crafting'), icon: 'handyman', navTarget: 'Crafting' },
    { id: 'inventory', label: tl('bag'), icon: 'backpack', navTarget: 'Inventory' },
    { id: 'journal', label: tl('journal'), icon: 'menu_book', navTarget: 'Journal' },
    { id: 'settings', label: tl('config'), icon: 'settings', navTarget: 'Settings' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-wood-medium border-t-2 border-wood-border md:hidden select-none">
      <nav className="h-14 grid grid-cols-5 items-center px-1">
        {PRIMARY_NAV.map((item) => {
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
        <MoreNavMenu items={SECONDARY_NAV} activeNav={activeNav} onSelect={setActiveNav} variant="footer" />
      </nav>
    </footer>
  );
}
