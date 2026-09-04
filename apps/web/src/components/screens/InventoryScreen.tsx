'use client';

import React, { useState } from 'react';
import { useGame, InventoryItem } from '../../lib/gameState';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'seed', label: 'Seeds', icon: '🌱' },
  { id: 'crops', label: 'Crops', icon: '🌾' },
  { id: 'animal', label: 'Animal', icon: '🥚' },
  { id: 'materials', label: 'Materials', icon: '🪵' },
] as const;

export function InventoryScreen() {
  const { inventory, selectedItem, setSelectedItem, sellInventoryItem, setActiveNav } = useGame();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

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
    showToast(`Sold ${qty ?? item.quantity}x ${item.name}!`);
    setSelectedItem(null);
  };

  return (
    <div className="w-full px-4 py-4 max-w-2xl mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-lg text-primary uppercase font-bold">Inventory</h1>
          <span className="font-mono text-[10px] text-on-surface-variant">
            {totalSlots} / {maxSlots} slots
          </span>
        </div>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          ← Farm
        </button>
      </div>

      {/* Categories — simple tabs */}
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

      {/* Item Grid — tap to inspect */}
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
            <span className="text-2xl mb-0.5">{item.icon}</span>
            <span className="font-mono text-[9px] text-cream-surface font-bold">
              {item.quantity}
            </span>
          </button>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 12 - filtered.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square bg-surface-container-low/30 border border-wood-border/20 flex items-center justify-center"
          >
            <span className="text-outline/30 text-xs">·</span>
          </div>
        ))}
      </div>

      {/* Selected Item Detail — Level 2 context */}
      {selectedItem && (
        <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{selectedItem.icon}</span>
            <div className="flex-1">
              <h3 className="font-headline text-sm text-cream-surface font-bold">
                {selectedItem.name}
              </h3>
              <p className="font-mono text-[10px] text-on-surface-variant">
                Quantity: {selectedItem.quantity} • Grade: {selectedItem.grade}
              </p>
              <p className="font-body text-xs text-on-surface-variant mt-1">
                {selectedItem.description}
              </p>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-on-surface-variant hover:text-cream-surface text-xs"
            >
              ✕
            </button>
          </div>

          {/* Contextual actions — only valid ones */}
          <div className="flex gap-2">
            {selectedItem.quantity > 0 && !selectedItem.itemType?.includes('_seed') && (
              <button
                onClick={() => handleSell(selectedItem)}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
              >
                Sell ({selectedItem.quantity * selectedItem.unitValue} P)
              </button>
            )}
            {selectedItem.quantity > 0 && !selectedItem.itemType?.includes('_seed') && (
              <button
                onClick={() => handleSell(selectedItem, 1)}
                className="py-2 px-3 bg-surface-container-high text-cream-surface font-mono text-xs uppercase font-bold border border-wood-border active:translate-y-0.5"
              >
                Sell 1
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
