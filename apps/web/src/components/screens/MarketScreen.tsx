'use client';

import React, { useState } from 'react';
import { useGame } from '../../lib/gameState';

export function MarketScreen() {
  const { pula, marketItems, buyMarketItem, inventory, sellInventoryItem, setActiveNav } =
    useGame();

  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [toast, setToast] = useState<string | null>(null);

  const sellableItems = inventory.filter(
    (i) =>
      (i.category === 'crops' || i.category === 'animal') &&
      i.quantity > 0 &&
      !i.itemType?.includes('_seed'),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleBuy = (item: (typeof marketItems)[0], qty: number) => {
    const total = item.price * qty;
    if (pula < total) {
      showToast(`Not enough Pula (need ${total})`);
      return;
    }
    buyMarketItem(item, qty);
    showToast(`Bought ${qty}x ${item.name}!`);
  };

  const handleSell = (item: (typeof sellableItems)[0], qty?: number) => {
    sellInventoryItem(item, qty);
    showToast(`Sold ${qty ?? item.quantity}x ${item.name}!`);
  };

  return (
    <div className="w-full px-4 py-4 max-w-2xl mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-lg text-primary uppercase font-bold">Market</h1>
          <span className="font-mono text-[10px] text-gold-currency font-bold">
            P {pula.toLocaleString()}
          </span>
        </div>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          ← Farm
        </button>
      </div>

      {/* Buy / Sell toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-2 font-mono text-xs uppercase font-bold border transition-all ${
            mode === 'buy'
              ? 'bg-primary-container text-on-primary-container border-primary'
              : 'bg-surface-container-high text-on-surface-variant border-wood-border'
          }`}
        >
          🛍 Buy Seeds
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-2 font-mono text-xs uppercase font-bold border transition-all ${
            mode === 'sell'
              ? 'bg-secondary-container text-on-secondary-container border-secondary'
              : 'bg-surface-container-high text-on-surface-variant border-wood-border'
          }`}
        >
          🌾 Sell Crops
        </button>
      </div>

      {/* Buy Mode */}
      {mode === 'buy' && (
        <div className="space-y-2">
          {marketItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-wood-dark border border-wood-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <span className="font-headline text-xs text-cream-surface font-bold block">
                    {item.name}
                  </span>
                  <span className="font-mono text-[9px] text-on-surface-variant">
                    {item.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gold-currency font-bold">
                  {item.price} P
                </span>
                <button
                  onClick={() => handleBuy(item, 1)}
                  className="px-3 py-1.5 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5"
                >
                  Buy x1
                </button>
                <button
                  onClick={() => handleBuy(item, 5)}
                  className="px-3 py-1.5 bg-wood-medium text-cream-surface font-mono text-[10px] uppercase font-bold border border-wood-border active:translate-y-0.5"
                >
                  x5
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sell Mode */}
      {mode === 'sell' && (
        <div>
          {sellableItems.length === 0 ? (
            <div className="text-center py-12 bg-wood-dark border border-wood-border">
              <span className="text-3xl mb-2 block">🧺</span>
              <p className="font-headline text-sm text-cream-surface font-bold">No crops to sell</p>
              <p className="font-body text-xs text-on-surface-variant">
                Harvest crops from your farm first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sellableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-wood-dark border border-wood-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <span className="font-headline text-xs text-cream-surface font-bold block">
                        {item.name}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant">
                        Qty: {item.quantity} • {item.unitValue} P each
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSell(item)}
                      className="px-3 py-1.5 bg-secondary-container text-on-secondary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5"
                    >
                      Sell All (+{item.quantity * item.unitValue} P)
                    </button>
                    {item.quantity > 1 && (
                      <button
                        onClick={() => handleSell(item, 1)}
                        className="px-3 py-1.5 bg-wood-medium text-cream-surface font-mono text-[10px] uppercase font-bold border border-wood-border active:translate-y-0.5"
                      >
                        +1
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
