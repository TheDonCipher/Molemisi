'use client';

import React, { useState } from 'react';
import { useGame } from '../../lib/gameState';

export function MarketScreen() {
  const {
    pula,
    marketItems,
    buyMarketItem,
    contracts,
    claimContract,
    quickSellProduce,
    inventory,
    sellInventoryItem,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'contracts' | 'trends'>('buy');

  const cropItemsInInventory = inventory.filter(
    (i) => i.category === 'crops' || i.category === 'animal'
  );

  return (
    <div className="w-full flex flex-col select-none pb-20 md:pb-10">
      {/* Live Ambient Market Screen Container */}
      <div className="relative w-full overflow-hidden bg-surface-container-lowest">
        {/* Pixel Art Village Scene Parallax Stage */}
        <div className="relative w-full h-[280px] sm:h-[360px] lg:h-[420px] overflow-hidden">
          <img
            alt="Maun Village Market Pixel Art"
            className="w-full h-full object-cover object-center scale-105 filter saturate-[1.1] transition-transform duration-1000 ease-out hover:scale-100"
            src="/assets/backgrounds/market_scene.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://lh3.googleusercontent.com/aida-public/AB6AXuBgUT_WoQXPtORaW5m-ViB8B0Bt5vecrbJpvVTprpJ64P_LwNklncPKdQj3I5B57WrIN2t-UdlqgVy5of05nv1GSgpyelyqSrxolX2DGUkmkSG-AeLxJLKqkqeu9qoymVdyKYVN6ccvyHR-kIFlGcYMthwVJKJ3QxkrFNW6QZKgNPoxYFMp7pHhFeAD49HVSThmp7B6mzdMywPX7up8LfVcYZrCeORAUKsKxhtj9wI3UK969w8vZoQlQw';
            }}
          />
          {/* Dusky Sunset Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest/70 via-transparent to-surface-container-lowest/70 pointer-events-none" />

          {/* Top Hub Bar */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2 bg-wood-dark/95 px-3 md:px-4 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border">
              <span className="material-symbols-outlined text-primary text-[22px]">
                storefront
              </span>
              <div className="flex flex-col">
                <span className="font-headline text-xs md:text-sm text-primary uppercase tracking-wider font-bold">
                  Maun Trading Post
                </span>
                <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">
                  Ngamiland District • Day 14
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-wood-dark/95 px-3 md:px-5 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gold-currency text-[22px]">
                  monetization_on
                </span>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
                    Farmer Wallet
                  </span>
                  <span className="font-mono text-sm md:text-base text-gold-currency tracking-wider font-bold">
                    {pula.toLocaleString()} Pula
                  </span>
                </div>
              </div>
              <div className="h-6 w-0.5 bg-wood-medium" />
              <div className="flex items-center gap-1 text-status-success">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span className="font-mono text-xs font-bold">+42 P today</span>
              </div>
            </div>
          </div>

          {/* Bazaar Status Badges */}
          <div className="absolute bottom-6 left-4 right-4 hidden md:flex items-center justify-center gap-4 z-10">
            <div className="flex items-center gap-2 bg-surface-container-high/90 px-3 py-1 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span className="font-mono text-[10px] text-cream-surface uppercase font-bold">
                Bazaar Open: Peak Hours
              </span>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-high/90 px-3 py-1 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
              <span className="material-symbols-outlined text-primary text-[16px]">
                local_shipping
              </span>
              <span className="font-mono text-[10px] text-primary uppercase font-bold">
                Daily Ox-Cart Arrived
              </span>
            </div>
          </div>
        </div>

        {/* Main Interactive Trading Deck */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-12">
          {/* Stepped Navigation Tabs */}
          <div className="bg-wood-dark p-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveTab('buy')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded flex items-center gap-2 transition-all ${
                  activeTab === 'buy'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-medium text-cream-surface hover:text-primary hover:bg-surface-bright'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                <span>Buy Seeds & Tools</span>
              </button>

              <button
                onClick={() => setActiveTab('sell')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded flex items-center gap-2 transition-all ${
                  activeTab === 'sell'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-medium text-cream-surface hover:text-primary hover:bg-surface-bright'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">sell</span>
                <span>Sell Produce</span>
              </button>

              <button
                onClick={() => setActiveTab('contracts')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded flex items-center gap-2 transition-all ${
                  activeTab === 'contracts'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-medium text-cream-surface hover:text-primary hover:bg-surface-bright'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">assignment</span>
                <span>Delivery Contracts</span>
                <span className="bg-status-warning text-wood-dark px-1.5 py-0.5 rounded text-[9px] font-bold">
                  2 New
                </span>
              </button>

              <button
                onClick={() => setActiveTab('trends')}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded flex items-center gap-2 transition-all ${
                  activeTab === 'trends'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-medium text-cream-surface hover:text-primary hover:bg-surface-bright'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">insights</span>
                <span>Market Price Trends</span>
              </button>
            </div>

            {/* Quick Sell Produce Trigger */}
            <button
              onClick={quickSellProduce}
              className="px-4 py-2 bg-status-success/20 hover:bg-status-success/30 text-secondary-fixed font-mono text-xs uppercase tracking-wider rounded flex items-center gap-2 transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-secondary/40 font-bold"
            >
              <span className="material-symbols-outlined text-gold-currency text-[18px]">
                payments
              </span>
              <span>Quick Sell Harvest</span>
            </button>
          </div>

          {/* TAB 1: BUY SEEDS & TOOLS */}
          {activeTab === 'buy' && (
            <div className="mt-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-primary rounded-none" />
                  <h2 className="font-headline text-sm md:text-base text-primary tracking-wide uppercase font-bold">
                    Village Nursery & Artisan Depot
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[10px]">
                  <span className="material-symbols-outlined text-[14px] text-status-info">
                    water_drop
                  </span>
                  <span>
                    Season: <strong className="text-cream-surface">Kalahari Rains</strong>
                  </span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-wood-medium rounded p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col justify-between group hover:bg-surface-container-high transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-wood-dark rounded flex items-center justify-center text-3xl shadow-[inset_1px_1px_0px_rgba(0,0,0,0.6)] border border-wood-border">
                            {item.icon}
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-secondary uppercase font-bold">
                              {item.category}
                            </span>
                            <h3 className="font-headline text-xs md:text-sm text-cream-surface leading-tight font-bold">
                              {item.name}
                            </h3>
                            <div className="font-mono text-xs text-gold-currency font-bold">
                              {item.price} Pula{' '}
                              <span className="text-on-surface-variant font-normal text-[10px]">
                                / unit
                              </span>
                            </div>
                          </div>
                        </div>

                        {item.badge && (
                          <span className="bg-wood-dark px-1.5 py-0.5 text-[9px] font-mono text-status-success rounded font-bold uppercase border border-wood-border">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <p className="font-body text-xs text-on-surface-variant line-clamp-2 mb-4">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 bg-surface-container-lowest/40 p-2 rounded border border-wood-border/40">
                      <button
                        onClick={() => buyMarketItem(item, 1)}
                        className="flex-1 py-1.5 bg-primary-container hover:bg-primary text-on-primary-container font-mono text-[10px] rounded uppercase font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all"
                      >
                        Buy x1 ({item.price} P)
                      </button>
                      <button
                        onClick={() => buyMarketItem(item, 5)}
                        className="flex-1 py-1.5 bg-wood-dark hover:bg-wood-medium text-cream-surface hover:text-primary font-mono text-[10px] rounded uppercase font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all border border-wood-border"
                      >
                        Buy x5 ({item.price * 5} P)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SELL PRODUCE */}
          {activeTab === 'sell' && (
            <div className="mt-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-secondary rounded-none" />
                  <h2 className="font-headline text-sm md:text-base text-secondary tracking-wide uppercase font-bold">
                    Farm Produce Exchange
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Liquidate your satchel inventory at daily prices
                </span>
              </div>

              {cropItemsInInventory.length === 0 ? (
                <div className="bg-wood-medium p-8 rounded text-center border border-wood-border">
                  <span className="text-4xl">🧺</span>
                  <h4 className="font-headline text-sm text-cream-surface font-bold mt-2">
                    Satchel Empty
                  </h4>
                  <p className="font-body text-xs text-on-surface-variant mt-1">
                    Harvest crops from Tshimo arable fields to sell them at the village market.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cropItemsInInventory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-wood-medium p-4 rounded flex items-center justify-between shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.icon}</span>
                        <div>
                          <h4 className="font-headline text-xs md:text-sm text-cream-surface font-bold">
                            {item.name}
                          </h4>
                          <span className="font-mono text-[10px] text-on-surface-variant">
                            In Stock: {item.quantity} units ({item.unitValue} P ea)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => sellInventoryItem(item, Math.min(item.quantity, 5))}
                        className="px-3 py-1.5 bg-wood-dark hover:bg-primary-container hover:text-on-primary-container text-primary font-mono text-[10px] rounded uppercase font-bold transition-all border border-wood-border"
                      >
                        Sell {Math.min(item.quantity, 5)} (+
                        {Math.min(item.quantity, 5) * item.unitValue} P)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DELIVERY CONTRACTS */}
          {activeTab === 'contracts' && (
            <div className="mt-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-status-warning rounded-none" />
                  <h2 className="font-headline text-sm md:text-base text-status-warning tracking-wide uppercase font-bold">
                    Kgotla Council & Merchant Contracts
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Fulfill bulk shipments for bonus village standing
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contracts.map((contract) => {
                  const isReady = contract.current >= contract.target;
                  const progressPct = Math.min(
                    100,
                    Math.round((contract.current / contract.target) * 100)
                  );

                  return (
                    <div
                      key={contract.id}
                      className="bg-wood-medium p-4 md:p-5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] text-primary uppercase font-bold">
                            Contract {contract.number} • {contract.source}
                          </span>
                          <span className="bg-status-warning/20 text-status-warning px-2 py-0.5 rounded text-[9px] font-bold font-mono">
                            Expires in {contract.expiresIn}
                          </span>
                        </div>
                        <h3 className="font-headline text-sm text-cream-surface mb-1 font-bold">
                          {contract.title}
                        </h3>
                        <p className="font-body text-xs text-on-surface-variant mb-4 leading-relaxed">
                          {contract.description}
                        </p>

                        <div className="space-y-1.5 mb-4 bg-wood-dark p-3 rounded border border-wood-border">
                          <div className="flex justify-between font-mono text-[10px]">
                            <span className="text-on-surface-variant">
                              Progress: {contract.current} / {contract.target} {contract.unit}
                            </span>
                            <span className="text-gold-currency font-bold">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-surface-container-lowest overflow-hidden">
                            <div
                              className="h-full bg-status-warning transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-wood-border/40">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-gold-currency text-[18px]">
                            military_tech
                          </span>
                          <span className="font-mono text-xs text-gold-currency font-bold">
                            Reward: {contract.pulaReward} Pula + {contract.xpReward} XP
                          </span>
                        </div>

                        {contract.claimed ? (
                          <span className="font-mono text-[10px] text-secondary font-bold">
                            ✓ Claimed
                          </span>
                        ) : isReady ? (
                          <button
                            onClick={() => claimContract(contract.id)}
                            className="px-3 py-1 bg-status-success hover:bg-secondary text-wood-dark font-mono text-[10px] uppercase font-bold rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] animate-bounce"
                          >
                            Claim Reward
                          </button>
                        ) : (
                          <button
                            onClick={() => claimContract(contract.id)}
                            className="px-3 py-1 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)]"
                          >
                            Deliver Partial
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MARKET PRICE TRENDS */}
          {activeTab === 'trends' && (
            <div className="mt-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-sky-blue rounded-none" />
                  <h2 className="font-headline text-sm md:text-base text-sky-blue tracking-wide uppercase font-bold">
                    Seasonal Commodity Indices
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Fluctuates daily at dawn (06:00)
                </span>
              </div>

              <div className="bg-wood-medium p-4 md:p-6 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-wood-dark p-3.5 rounded border border-wood-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline text-xs text-cream-surface font-bold">
                        Sorghum
                      </span>
                      <span className="text-status-success font-mono text-xs font-bold">
                        ↑ +12%
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-on-surface-variant">
                      22 Pula / bag
                    </div>
                    <div className="mt-2 text-[10px] text-secondary-fixed font-mono">
                      Reason: Local brewery event
                    </div>
                  </div>

                  <div className="bg-wood-dark p-3.5 rounded border border-wood-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline text-xs text-cream-surface font-bold">
                        Maize Grain
                      </span>
                      <span className="text-status-danger font-mono text-xs font-bold">
                        ↓ -5%
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-on-surface-variant">
                      14 Pula / bag
                    </div>
                    <div className="mt-2 text-[10px] text-on-surface-variant font-mono">
                      Reason: High harvest supply
                    </div>
                  </div>

                  <div className="bg-wood-dark p-3.5 rounded border border-wood-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline text-xs text-cream-surface font-bold">
                        Cattle Feed
                      </span>
                      <span className="text-status-success font-mono text-xs font-bold">
                        ↑ +8%
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-on-surface-variant">
                      38 Pula / bale
                    </div>
                    <div className="mt-2 text-[10px] text-secondary-fixed font-mono">
                      Reason: Dry grazing patches
                    </div>
                  </div>

                  <div className="bg-wood-dark p-3.5 rounded border border-wood-border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline text-xs text-cream-surface font-bold">
                        Mopane Wood
                      </span>
                      <span className="text-status-warning font-mono text-xs font-bold">
                        ↔ Stable
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-on-surface-variant">
                      45 Pula / 10x
                    </div>
                    <div className="mt-2 text-[10px] text-on-surface-variant font-mono">
                      Steady artisan demand
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Daily Price Ticker Bar */}
          <div className="mt-6 bg-surface-container-high/90 px-4 py-3 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex items-center justify-between overflow-hidden gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">
                show_chart
              </span>
              <span className="font-mono text-xs text-primary uppercase font-bold tracking-wider">
                Daily Trends:
              </span>
            </div>
            <div className="overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 flex items-center gap-6 font-mono text-xs">
              <span className="text-cream-surface flex items-center gap-1">
                🌾 Sorghum <strong className="text-status-success">↑ +12%</strong>{' '}
                <span className="text-on-surface-variant">(High brewery demand)</span>
              </span>
              <span className="text-on-surface-variant">|</span>
              <span className="text-cream-surface flex items-center gap-1">
                🌽 Maize <strong className="text-status-danger">↓ -5%</strong>
              </span>
              <span className="text-on-surface-variant">|</span>
              <span className="text-cream-surface flex items-center gap-1">
                🐂 Cattle Feed <strong className="text-status-success">↑ +8%</strong>
              </span>
              <span className="text-on-surface-variant">|</span>
              <span className="text-cream-surface flex items-center gap-1">
                🪵 Wood <strong className="text-status-warning">Stable</strong>
              </span>
              <span className="text-on-surface-variant">|</span>
              <span className="text-cream-surface flex items-center gap-1">
                🫘 Cowpeas <strong className="text-status-success">↑ +4%</strong>
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-on-surface-variant font-mono text-[9px] shrink-0">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              Syncing Ngami Rates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
