'use client';

import React from 'react';
import { useGame, type MarketItem, type InventoryItem } from '@/lib/gameState';

const SEED_ICONS: Record<string, string> = {
  sorghum_seed: '🌾',
  maize_seed: '🌽',
  millet_seed: '🌾',
  cowpeas_seed: '🫘',
  groundnuts_seed: '🥜',
  sesame_seed: '🌿',
  watermelon_seed: '🍉',
  tomatoes_seed: '🍅',
  pepper_seed: '🌶️',
  herbs_seed: '🌿',
  saffron_seed: '🌸',
};

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface-container-high, #2a1f14)',
          border: '3px solid var(--outline, #6b5744)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '340px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '18px',
            color: 'var(--cream, #f5e6d3)',
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--cream, #f5e6d3)',
            marginBottom: 20,
            lineHeight: 1.5,
            opacity: 0.9,
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid var(--outline, #6b5744)',
              background: 'transparent',
              color: 'var(--cream, #f5e6d3)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary, #d4a853)',
              color: '#1a1a1a',
              fontFamily: 'var(--font-headline)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarketScreen() {
  const {
    pula,
    inventory,
    marketItems,
    buyMarketItem,
    sellInventoryItem,
    quickSellProduce,
    showToast,
    setActiveNav,
  } = useGame();

  const [mode, setMode] = React.useState<'buy' | 'sell'>('buy');
  const [confirmState, setConfirmState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    fn: () => void;
  }>({ open: false, title: '', message: '', fn: () => {} });

  // Buy: seeds and tools from marketItems
  const buyables = [...marketItems].sort((a: MarketItem, b: MarketItem) =>
    a.name.localeCompare(b.name),
  );

  // Sell: non-seed inventory items with quantity
  const sellables = inventory
    .filter((item: InventoryItem) => item.quantity > 0 && item.category !== 'tools')
    .sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name));

  function handleBuy(item: MarketItem, qty: number) {
    const total = item.price * qty;
    setConfirmState({
      open: true,
      title: `Buy ${item.name}`,
      message: `Buy ${qty}x ${item.name} for P${total}? Your balance: P${pula}.`,
      fn: () => {
        buyMarketItem(item, qty);
        showToast('Bought!', `${qty}x ${item.name} added to inventory`, '🛒', 'success');
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  function handleSell(item: InventoryItem, qty: number) {
    const total = item.unitValue * qty;
    setConfirmState({
      open: true,
      title: `Sell ${item.name}`,
      message: `Sell ${qty}x ${item.name} for P${total}?`,
      fn: () => {
        sellInventoryItem(item, qty);
        showToast('Sold!', `${qty}x ${item.name} for P${total}`, '💰', 'success');
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  function handleSellAll() {
    setConfirmState({
      open: true,
      title: 'Sell All Produce',
      message: 'Sell all harvested crops and animal products?',
      fn: () => {
        quickSellProduce();
        showToast('Sold all!', 'Everything sold at market', '💰', 'success');
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Village Market"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/market_scene.png"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-wood-dark/40 pointer-events-none" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 px-4 pt-4 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-headline)',
                color: 'var(--cream, #f5e6d3)',
                margin: 0,
                fontSize: 22,
              }}
            >
              🏪 Village Market
            </h2>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-green, #66bb6a)',
                fontSize: 13,
              }}
            >
              P {pula.toLocaleString()}
            </div>
          </div>
          {mode === 'sell' && sellables.length > 0 && (
            <button
              onClick={handleSellAll}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent-green, #66bb6a)',
                color: '#1a1a1a',
                fontFamily: 'var(--font-headline)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Quick Sell All
            </button>
          )}
        </div>

        {/* Buy / Sell Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['buy', 'sell'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: mode === m ? 'var(--primary, #d4a853)' : 'var(--outline, #6b5744)',
                background: mode === m ? 'var(--primary, #d4a853)' : 'transparent',
                color: mode === m ? '#1a1a1a' : 'var(--cream, #f5e6d3)',
                fontFamily: 'var(--font-headline)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m === 'buy' ? '🛒 Buy Seeds' : '💰 Sell Produce'}
            </button>
          ))}
        </div>

        {/* Buy Mode */}
        {mode === 'buy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buyables.length === 0 && (
              <div
                style={{
                  color: 'var(--cream, #f5e6d3)',
                  opacity: 0.6,
                  textAlign: 'center',
                  padding: 32,
                  fontFamily: 'var(--font-body)',
                }}
              >
                No seeds or tools available yet.
              </div>
            )}
            {buyables.map((item: MarketItem) => {
              const canAfford = pula >= item.price;
              const icon = SEED_ICONS[item.id] || item.icon;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--surface-container, #1a1209)',
                    border: '2px solid var(--outline, #6b5744)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-headline)',
                        color: 'var(--cream, #f5e6d3)',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-green, #66bb6a)',
                        fontSize: 13,
                      }}
                    >
                      P{item.price}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      disabled={!canAfford}
                      onClick={() => handleBuy(item, 1)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: canAfford ? 'var(--primary, #d4a853)' : '#333',
                        color: canAfford ? '#1a1a1a' : '#666',
                        fontFamily: 'var(--font-headline)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      x1
                    </button>
                    <button
                      disabled={!canAfford}
                      onClick={() => handleBuy(item, 5)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: canAfford ? 'var(--primary, #d4a853)' : '#333',
                        color: canAfford ? '#1a1a1a' : '#666',
                        fontFamily: 'var(--font-headline)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      x5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sell Mode */}
        {mode === 'sell' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sellables.length === 0 && (
              <div
                style={{
                  color: 'var(--cream, #f5e6d3)',
                  opacity: 0.6,
                  textAlign: 'center',
                  padding: 32,
                  fontFamily: 'var(--font-body)',
                }}
              >
                Nothing to sell. Harvest some crops first!
              </div>
            )}
            {sellables.map((item: InventoryItem) => {
              const qty = item.quantity;
              const total = item.unitValue * qty;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--surface-container, #1a1209)',
                    border: '2px solid var(--outline, #6b5744)',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-headline)',
                        color: 'var(--cream, #f5e6d3)',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--cream, #f5e6d3)',
                        opacity: 0.7,
                      }}
                    >
                      ×{qty} · P{item.unitValue} each · Total: P{total}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      disabled={qty < 1}
                      onClick={() => handleSell(item, 1)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: qty >= 1 ? 'var(--accent-green, #66bb6a)' : '#333',
                        color: qty >= 1 ? '#1a1a1a' : '#666',
                        fontFamily: 'var(--font-headline)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: qty >= 1 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      +1
                    </button>
                    <button
                      disabled={qty < 1}
                      onClick={() => handleSell(item, qty)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: qty >= 1 ? 'var(--accent-green, #66bb6a)' : '#333',
                        color: qty >= 1 ? '#1a1a1a' : '#666',
                        fontFamily: 'var(--font-headline)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: qty >= 1 ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Sell All
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back to Farm */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setActiveNav('Farm')}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '2px solid var(--outline, #6b5744)',
              background: 'var(--wood-dark, #1a1209)',
              color: 'var(--cream, #f5e6d3)',
              fontFamily: 'var(--font-headline)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back to Farm
          </button>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.fn}
          onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        />
      </div>
    </div>
  );
}
