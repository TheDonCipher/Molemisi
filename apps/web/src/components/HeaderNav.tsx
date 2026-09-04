'use client';

import React from 'react';
import { useGame } from '../lib/gameState';

const NAV_TABS = [
  { id: 'farm', label: 'Farm', icon: 'agriculture' },
  { id: 'kgotla', label: 'Kgotla', icon: 'account_balance' },
  { id: 'bushveld', label: 'Bushveld', icon: 'forest' },
  { id: 'market', label: 'Market', icon: 'storefront' },
  { id: 'inventory', label: 'Inventory', icon: 'backpack' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function HeaderNav() {
  const {
    pula,
    farmLevel,
    farmXp,
    maxXp,
    waterLevel,
    maxWater,
    daylight,
    season,
    activeNav,
    setActiveNav,
  } = useGame();

  const xpPercent = Math.min(100, Math.round((farmXp / maxXp) * 100));
  const waterPercent = Math.min(100, Math.round((waterLevel / maxWater) * 100));

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-wood-medium shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border-b-2 border-wood-border select-none">
      <div className="h-16 md:h-20 w-full px-3 md:px-6 mx-auto flex items-center justify-between gap-2 md:gap-4">
        {/* Brand & Level Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl">🌾</span>
            <div className="flex flex-col">
              <span className="font-headline text-sm md:text-base text-primary font-bold tracking-wider uppercase leading-tight">
                Molemisi
              </span>
              <span className="font-mono text-[9px] md:text-[10px] text-on-surface-variant uppercase tracking-widest hidden sm:block">
                Botswana Farm Sim
              </span>
            </div>
          </div>

          {/* XP Meter Box */}
          <div className="hidden xl:flex items-center gap-2 ml-2 bg-wood-dark px-3 py-1.5 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-primary-container font-bold">
                  ★ Lv.{farmLevel} Farm
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {farmXp.toLocaleString()} / {maxXp.toLocaleString()} XP
                </span>
              </div>
              <div className="w-32 h-2 bg-surface-container-lowest border border-wood-border rounded-none overflow-hidden">
                <div
                  className="h-full bg-gold-currency transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vital Status Indicators */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3">
          {/* Funds / Pula */}
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.45)]">
            <span className="material-symbols-outlined text-gold-currency text-[18px]">
              monetization_on
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant leading-none">
                Funds
              </span>
              <span className="font-mono text-xs text-gold-currency tracking-wider font-bold">
                {pula.toLocaleString()} P
              </span>
            </div>
          </div>

          {/* Water Tank */}
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.45)]">
            <span className="material-symbols-outlined text-status-info text-[18px]">
              water_drop
            </span>
            <div className="flex flex-col">
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono text-[9px] text-on-surface-variant leading-none">
                  Water
                </span>
                <span className="font-mono text-[9px] text-status-info font-bold">
                  {waterPercent}%
                </span>
              </div>
              <div className="w-20 h-2 bg-surface-container-lowest border border-wood-border rounded-none mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-status-info transition-all duration-300"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daylight Clock */}
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.45)]">
            <span className="material-symbols-outlined text-primary text-[18px]">
              wb_sunny
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant leading-none">
                Daylight
              </span>
              <span className="font-mono text-xs text-cream-surface font-bold">
                {daylight}
              </span>
            </div>
          </div>

          {/* Season Indicator */}
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.45)]">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              grass
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant leading-none">
                Season
              </span>
              <span className="font-mono text-xs text-secondary font-bold">
                {season}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-wood-dark px-1.5 py-1 border border-wood-border rounded">
          {NAV_TABS.map((tab) => {
            const isActive = activeNav.toLowerCase() === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveNav(tab.label)}
                className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors rounded-sm ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold border-b-2 border-on-primary-container shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'text-on-surface-variant hover:text-cream-surface hover:bg-wood-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Profile / Avatar */}
        <div className="flex items-center gap-2">
          {/* Mobile Funds Mini-Chip */}
          <div className="flex lg:hidden items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border rounded">
            <span className="text-xs">💰</span>
            <span className="font-mono text-[11px] text-gold-currency font-bold">
              {pula.toLocaleString()} P
            </span>
          </div>

          <button
            onClick={() => setActiveNav('Settings')}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-transform"
            title="User Profile & Settings"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
