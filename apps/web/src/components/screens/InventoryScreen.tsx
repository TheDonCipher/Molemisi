'use client';

import React, { useState } from 'react';
import { useGame, InventoryItem } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';
import { PixelIcon } from '@/components/PixelIcon';
import { getItemInfo, intentLabel } from '../../lib/itemInfo';

const SOURCE_ICONS = { grow: '🌱', forage: '🌾', raise: '🐄', craft: '🔨', buy: '🛒' } as const;

export function InventoryScreen() {
  const { inventory, selectedItem, setSelectedItem, sellInventoryItem, setActiveNav, pula, botho, language } = useGame();
  const { tl } = useTranslation();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  const CATEGORIES = [
    { id: 'all', label: tl('all'), icon: '📦' },
    { id: 'seed', label: tl('seeds'), icon: '🌱' },
    { id: 'crops', label: tl('crops'), icon: '🌾' },
    { id: 'animal', label: tl('animal'), icon: '🥚' },
    { id: 'materials', label: tl('materials'), icon: '🪵' },
  ] as const;

  const filtered = inventory.filter((i) => {
    if (activeCategory === 'all') return true;
    return i.category === activeCategory;
  });

  const totalSlots = filtered.reduce((sum, i) => sum + i.quantity, 0);
  const maxSlots = 50;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSell = (item: InventoryItem, qty?: number) => {
    sellInventoryItem(item, qty);
    showToast(`${tl('sold')} ${qty ?? item.quantity}x ${item.name}!`);
    setSelectedItem(null);
  };

  const info = selectedItem ? getItemInfo(selectedItem.itemType) : null;
  const sourceKindLabels = {
    grow: tl('sourceGrow'),
    forage: tl('sourceForage'),
    raise: tl('sourceRaise'),
    craft: tl('sourceCraft'),
    buy: tl('sourceBuy'),
  } as const;
  const buildingUseLabels = {
    construction: tl('useConstruction'),
    upgrade: tl('useUpgrade'),
    maintenance: tl('useMaintenance'),
  } as const;

  return (
    <div className="w-full px-4 py-4 max-w-2xl mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-lg text-primary uppercase font-bold">
            {tl('inventory')}
          </h1>
          <span className="font-mono text-[10px] text-on-surface-variant">
            {totalSlots} / {maxSlots} {tl('slots')}
          </span>
        </div>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          {tl('backToFarm')}
        </button>
      </div>

      {/* Purse — currencies live in the Wallet (02 §3); this strip is only a link. */}
      <button
        onClick={() => setActiveNav('Wallet')}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-4 bg-wood-dark border border-wood-border hover:border-primary/50 active:translate-y-0.5"
      >
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase text-cream-surface font-bold">
          <span aria-hidden>👛</span> {tl('purse')}
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] text-cream-surface">
          <span className="text-primary font-bold">P{pula}</span>
          <span className="text-on-surface-variant">✨ {botho}</span>
          <span className="text-on-surface-variant" aria-hidden>→</span>
        </span>
      </button>

      {/* Categories */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 font-mono text-[11px] uppercase whitespace-nowrap border transition-all ${
              activeCategory === cat.id
                ? 'bg-primary-container text-on-primary-container font-bold border-primary'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border hover:border-primary/50'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
            className={`aspect-square bg-wood-dark p-2 flex flex-col items-center justify-center border transition-all active:scale-95 ${
              selectedItem?.id === item.id
                ? 'border-primary ring-2 ring-primary/50'
                : 'border-wood-border hover:border-primary/30'
            }`}
          >
            <PixelIcon itemType={item.itemType} emoji={item.icon} size={30} className="mb-0.5" />
            <span className="font-mono text-[9px] text-cream-surface font-bold">
              {item.quantity}
            </span>
            <span className="font-mono text-[7px] text-on-surface-variant leading-tight w-full truncate text-center">
              {getItemInfo(item.itemType)?.def.setswana ?? item.name}
            </span>
          </button>
        ))}

        {Array.from({
          length: Math.max(0, 12 - filtered.length),
        }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square bg-surface-container-low/30 border border-wood-border/20 flex items-center justify-center"
          >
            <span className="text-outline/30 text-xs">·</span>
          </div>
        ))}
      </div>

      {/* Selected Item Detail */}
      {selectedItem && (
        <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-14 h-14 bg-surface-container-low border-2 border-wood-border flex items-center justify-center shrink-0"
              style={{ imageRendering: 'pixelated' }}
            >
              <PixelIcon itemType={selectedItem.itemType} emoji={selectedItem.icon} size={44} />
            </div>
            <div className="flex-1 min-w-0">
              {/* Setswana-first name; English only when they differ */}
              <h3 className="font-headline text-sm text-cream-surface font-bold leading-tight">
                {info?.def.setswana ?? selectedItem.name}
              </h3>
              {info && info.def.name !== info.def.setswana && (
                <p className="font-mono text-[10px] text-on-surface-variant">{info.def.name}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                {info && (
                  <span className="px-1.5 py-0.5 bg-primary-container/40 border border-primary/40 font-mono text-[8px] uppercase text-cream-surface">
                    {intentLabel(info.intent, language)}
                  </span>
                )}
                <span className="font-mono text-[9px] text-on-surface-variant">
                  {tl('quantity')}: {selectedItem.quantity}{info ? ` / ${info.def.maxStack}` : ''} • {tl('grade')}: {selectedItem.grade} • P{selectedItem.unitValue}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-on-surface-variant hover:text-cream-surface text-xs"
            >
              ✕
            </button>
          </div>

          {/* Lore — one elder-voiced line, always from the config */}
          {info?.def.lore ? (
            <p className="font-body text-[11px] italic text-on-surface-variant border-l-2 border-primary/50 pl-2 mb-3 leading-snug">
              “{info.def.lore}”
            </p>
          ) : (
            <p className="font-body text-xs text-on-surface-variant mb-3">{selectedItem.description}</p>
          )}

          {info && (
            <div className="space-y-3 mb-3">
              {/* Where it comes from — derived from crops/chapters/hotspots/recipes/livestock */}
              <div>
                <p className="font-mono text-[9px] uppercase text-primary font-bold mb-1">{tl('comesFrom')}</p>
                {info.sources.length === 0 ? (
                  <p className="font-body text-[11px] italic text-on-surface-variant">{tl('noSource')}</p>
                ) : (
                  <ul className="space-y-1">
                    {info.sources.map((s, i) => (
                      <li key={`${s.kind}-${i}`} className="flex items-baseline gap-1.5 font-body text-[11px] text-cream-surface">
                        <span aria-hidden>{SOURCE_ICONS[s.kind]}</span>
                        <span className="font-bold shrink-0">{sourceKindLabels[s.kind]}</span>
                        <span className="text-on-surface-variant">{s.text}{s.sub ? ` · ${s.sub}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Crafted here → Workshop */}
              {info.producedBy && (
                <button
                  onClick={() => setActiveNav('Craft')}
                  className="w-full py-1.5 px-2 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold border border-primary active:translate-y-0.5"
                >
                  🔨 {tl('craftAt')}
                </button>
              )}

              {/* Used in recipes → Workshop */}
              {info.usedInRecipes.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase text-primary font-bold mb-1">{tl('makesInto')}</p>
                  <div className="flex flex-wrap gap-1">
                    {info.usedInRecipes.map((r) => (
                      <button
                        key={r.slug}
                        onClick={() => setActiveNav('Craft')}
                        className="px-2 py-1 bg-surface-container-high text-cream-surface font-mono text-[9px] uppercase border border-wood-border hover:border-primary/50 active:translate-y-0.5"
                      >
                        🛠 {r.setswana} ({r.name})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buildings that consume it */}
              {info.usedByBuildings.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase text-primary font-bold mb-1">{tl('neededBy')}</p>
                  <ul className="space-y-1">
                    {info.usedByBuildings.map((b) => (
                      <li key={b.slug} className="font-body text-[11px] text-cream-surface">
                        <span aria-hidden>🏠</span> <span className="font-bold">{b.setswana}</span>{' '}
                        <span className="text-on-surface-variant">
                          ({b.name} — {b.uses.map((u) => buildingUseLabels[u]).join(', ')})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sell row (rules unchanged: nothing with zero stock, no seeds) */}
          <div className="flex gap-2">
            {selectedItem.quantity > 0 && !selectedItem.itemType?.includes('_seed') && (
              <button
                onClick={() => handleSell(selectedItem)}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
              >
                {tl('sellFor')} ({selectedItem.quantity * selectedItem.unitValue} P)
              </button>
            )}
            {selectedItem.quantity > 0 && !selectedItem.itemType?.includes('_seed') && (
              <button
                onClick={() => handleSell(selectedItem, 1)}
                className="py-2 px-3 bg-surface-container-high text-cream-surface font-mono text-xs uppercase font-bold border border-wood-border active:translate-y-0.5"
              >
                {tl('sellOne')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-status-success/90 text-wood-dark px-4 py-2 font-mono text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
