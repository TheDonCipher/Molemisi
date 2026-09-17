'use client';

import React, { useState } from 'react';
import { useTranslation } from '../lib/useTranslation';

export interface MoreNavItem {
  id: string;
  label: string;
  icon: string;
  navTarget: string;
}

/**
 * The "More" overflow for the hybrid nav (per the 2026-09 ruling): keep four
 * primary screens in the main nav; bundle the rest (Store, Wallet, Crafting,
 * Inventory, Journal, Settings) into a slide-out triggered by this button.
 *
 * `variant` only changes positioning — `footer` slides a panel up from above the
 * mobile tab bar, `header` drops a menu below the desktop nav. Both use `fixed`
 * so they are not constrained by the parent's layout/overflow.
 */
export function MoreNavMenu({
  items,
  activeNav,
  onSelect,
  variant,
}: {
  items: MoreNavItem[];
  activeNav: string;
  onSelect: (navTarget: string) => void;
  variant: 'footer' | 'header';
}) {
  const { tl } = useTranslation();
  const [open, setOpen] = useState(false);

  const isActive = (id: string) =>
    activeNav.toLowerCase() === id ||
    (id === 'bushveld' && activeNav.toLowerCase() === 'wild') ||
    (id === 'inventory' && activeNav.toLowerCase() === 'bag') ||
    (id === 'settings' && activeNav.toLowerCase() === 'config');

  const panelClass =
    variant === 'footer'
      ? 'fixed bottom-14 left-0 right-0 z-50 bg-wood-dark border-t-2 border-wood-border shadow-lg'
      : 'fixed top-12 right-2 z-50 w-60 bg-wood-dark border-2 border-wood-border shadow-lg';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex flex-col items-center justify-center py-1 h-full w-full transition-colors ${
          open
            ? 'bg-primary-container text-on-primary-container font-bold'
            : 'text-on-surface-variant hover:text-on-surface'
        } ${variant === 'header' ? 'px-3 font-mono text-[10px] md:text-xs uppercase whitespace-nowrap' : ''}`}
      >
        <span className="material-symbols-outlined text-[20px] leading-tight">menu</span>
        {variant === 'footer' && (
          <span className="font-mono text-[10px] uppercase leading-tight mt-0.5">{tl('more')}</span>
        )}
        {variant === 'header' && (
          <span className="font-mono text-[10px] uppercase">{tl('more')}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={panelClass}>
            <div className="px-3 py-2 border-b border-wood-border">
              <span className="font-headline text-xs text-cream-surface font-bold uppercase">
                {tl('more')}
              </span>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.navTarget);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
                  isActive(item.id)
                    ? 'bg-primary-container/20 text-primary'
                    : 'text-cream-surface hover:bg-wood-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="font-mono text-[11px] uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
