'use client';

import React, { useState } from 'react';
import { useGame } from '../../lib/gameState';

export function InventoryScreen() {
  const {
    pula,
    wood,
    stone,
    inventory,
    selectedItem,
    setSelectedItem,
    sellInventoryItem,
    millFlour,
    donateKgotla,
    blueprints,
    constructBlueprint,
  } = useGame();

  const [activeCategory, setActiveCategory] = useState<'all' | 'crops' | 'animal' | 'materials' | 'tools'>('all');

  const filteredItems = inventory.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const currentItem = selectedItem || inventory[0] || null;
  const slotsCount = 20;
  const emptySlotsCount = Math.max(0, slotsCount - filteredItems.length);

  return (
    <div className="w-full px-3 md:px-6 py-4 space-y-4 md:space-y-6 max-w-7xl mx-auto select-none pb-20 md:pb-10">
      {/* Top Status Banner / Granary Summary Strip */}
      <div className="w-full bg-surface-container-low rounded p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-wood-dark rounded flex items-center justify-center text-primary-container shadow-[inset_0_0_4px_rgba(0,0,0,0.6)] border border-wood-border">
            <span className="material-symbols-outlined text-[24px]">warehouse</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline text-sm md:text-base text-primary tracking-wide uppercase font-bold">
                Farm Compound Ledger
              </span>
              <span className="font-mono text-[9px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold">
                Sec. 11.2 - 11.3 Active
              </span>
            </div>
            <span className="font-body text-xs text-on-surface-variant">
              Rural Central District • Morama Kraal Settlement
            </span>
          </div>
        </div>

        {/* Quick Resource Tally Counters */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.35)] border border-wood-border">
            <span className="material-symbols-outlined text-primary text-[18px]">
              inventory_2
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                Satchel Load
              </span>
              <span className="font-mono text-xs text-primary font-bold">
                {inventory.reduce((acc, i) => acc + i.quantity, 0)} / 50 SLOTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.35)] border border-wood-border">
            <span className="material-symbols-outlined text-gold-currency text-[18px]">
              payments
            </span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                Pula Purse
              </span>
              <span className="font-mono text-xs text-gold-currency font-bold">
                {pula.toLocaleString()} P
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.35)] border border-wood-border">
            <span className="material-symbols-outlined text-tertiary text-[18px]">forest</span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                Lumberyard
              </span>
              <span className="font-mono text-xs text-cream-surface font-bold">
                {wood} Acacia
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.35)] border border-wood-border">
            <span className="material-symbols-outlined text-outline text-[18px]">landscape</span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase">
                Granite Heap
              </span>
              <span className="font-mono text-xs text-cream-surface font-bold">
                {stone} Granite
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual Split Game Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* LEFT HALF: FARMER'S SATCHEL & GRANARY (COL 7) */}
        <section className="lg:col-span-7 flex flex-col gap-3 bg-wood-medium/95 rounded p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-wood-dark px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border border-wood-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <div className="flex flex-col">
                <h2 className="font-headline text-sm text-primary uppercase tracking-wider font-bold">
                  Farmer's Satchel & Granary
                </h2>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Tswana field crops, harvested yield & raw store
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 min-w-[120px]">
              <div className="flex items-center justify-between w-full font-mono text-[10px]">
                <span className="text-on-surface-variant">Capacity:</span>
                <span className="text-primary font-bold">
                  {inventory.reduce((acc, i) => acc + i.quantity, 0)} / 50
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-primary-container transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (inventory.reduce((acc, i) => acc + i.quantity, 0) / 50) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-wood-dark p-1 rounded border border-wood-border">
            {(
              [
                { id: 'all', label: '[All Items]' },
                { id: 'crops', label: '[Crops & Seeds]' },
                { id: 'animal', label: '[Animal Goods]' },
                { id: 'materials', label: '[Raw Materials]' },
                { id: 'tools', label: '[Tools]' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase rounded transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
                  activeCategory === tab.id
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-cream-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 5x4 Grid of Pixel Art Inventory Slots */}
          <div className="bg-surface-container-lowest p-3 rounded shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] border border-wood-border">
            <div className="grid grid-cols-5 gap-2">
              {filteredItems.map((item) => {
                const isSelected = currentItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group relative aspect-square bg-wood-dark rounded p-1 flex flex-col items-center justify-center shadow-[inset_0_0_6px_rgba(0,0,0,0.7)] border transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary-container bg-surface-container-high border-primary-container'
                        : 'border-wood-border hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <span className="absolute bottom-1 right-1 font-mono text-[9px] bg-wood-dark/90 text-primary px-1 rounded font-bold leading-none">
                      {item.quantity}
                    </span>
                  </button>
                );
              })}

              {/* Empty visual slots */}
              {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square bg-surface-container-low rounded p-1 flex items-center justify-center opacity-30 shadow-[inset_0_0_4px_rgba(0,0,0,0.8)] border border-wood-border/30"
                >
                  <span className="font-mono text-[9px] text-outline-variant select-none">
                    {filteredItems.length + idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Item Details Box */}
          {currentItem && (
            <div className="bg-wood-dark p-3 md:p-4 rounded shadow-[inset_0_0_6px_rgba(0,0,0,0.6)] border border-wood-border flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center text-3xl shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
                    {currentItem.icon}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-sm text-primary tracking-wide font-bold">
                        {currentItem.name} (x{currentItem.quantity})
                      </h3>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 bg-secondary-container text-on-secondary-container uppercase rounded font-bold">
                        {currentItem.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant mt-0.5">
                      <span>
                        Unit: <strong className="text-gold-currency">{currentItem.unitValue} P</strong> each
                      </span>
                      <span className="text-outline">•</span>
                      <span>
                        Total Yield:{' '}
                        <strong className="text-gold-currency">
                          {currentItem.quantity * currentItem.unitValue} Pula
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Granary Grade Seal */}
                <div className="hidden sm:flex flex-col items-center bg-surface-container-low px-2 py-1 rounded border border-wood-border">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    verified
                  </span>
                  <span className="font-mono text-[9px] text-primary uppercase font-bold">
                    {currentItem.grade}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="font-body text-xs text-cream-surface bg-surface-container-lowest/80 p-2.5 rounded border border-wood-border/50 leading-relaxed">
                {currentItem.description}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => sellInventoryItem(currentItem)}
                  className="flex items-center justify-center gap-1.5 bg-primary-container hover:bg-primary text-wood-dark font-mono text-xs uppercase px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] font-bold active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Sell ({currentItem.quantity * currentItem.unitValue} P)</span>
                </button>

                <button
                  onClick={() => millFlour(currentItem)}
                  className="flex items-center justify-center gap-1.5 bg-surface-container-high hover:bg-wood-medium text-cream-surface hover:text-primary font-mono text-xs uppercase px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] font-bold border border-wood-border active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">grain</span>
                  <span>Mill Flour</span>
                </button>

                <button
                  onClick={() => donateKgotla(currentItem)}
                  className="flex items-center justify-center gap-1.5 bg-secondary-container hover:bg-[#2e6d08] text-cream-surface font-mono text-xs uppercase px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] font-bold border border-secondary active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">handshake</span>
                  <span>Donate Kgotla</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT HALF: FARM CONSTRUCTION & UPGRADES (COL 5) */}
        <section className="lg:col-span-5 flex flex-col gap-3 bg-wood-medium/95 rounded p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
          {/* Header */}
          <div className="flex items-center justify-between bg-wood-dark px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border border-wood-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏗️</span>
              <div className="flex flex-col">
                <h2 className="font-headline text-sm text-primary uppercase tracking-wider font-bold">
                  Farm Construction & Upgrades
                </h2>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Compound shelters, enclosures & aquifers
                </span>
              </div>
            </div>
            <span className="font-mono text-[9px] bg-primary-container text-on-primary-container px-2 py-0.5 rounded font-bold">
              3 BLUEPRINTS
            </span>
          </div>

          {/* Blueprint Cards Stack */}
          <div className="space-y-3">
            {blueprints.map((bp) => {
              const isBuilt = bp.status === 'built';
              const isLocked = bp.status === 'locked';
              const canAfford =
                pula >= bp.costPula && wood >= bp.costWood && stone >= bp.costStone;

              return (
                <div
                  key={bp.id}
                  className={`bg-surface-container-lowest p-3 rounded shadow-[inset_0_0_6px_rgba(0,0,0,0.7)] border flex flex-col gap-2.5 ${
                    isLocked ? 'border-wood-border/40 opacity-75' : 'border-wood-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1.5 bg-wood-dark rounded border border-wood-border">
                        {bp.icon}
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-headline text-xs md:text-sm text-primary font-bold">
                            {bp.title}
                          </h3>
                          {isLocked && (
                            <span className="material-symbols-outlined text-outline text-[16px]">
                              lock
                            </span>
                          )}
                        </div>
                        <span className="font-body text-[10px] text-on-surface-variant">
                          {bp.subtitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                        isBuilt
                          ? 'bg-status-info/20 text-sky-blue'
                          : isLocked
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      {isBuilt ? 'Built' : isLocked ? `Lv.${bp.requiredLevel} Req` : 'Ready'}
                    </span>
                  </div>

                  {/* Material Breakdown */}
                  {!isBuilt && (
                    <div className="grid grid-cols-3 gap-1.5 bg-wood-dark p-2 rounded border border-wood-border">
                      <div className="flex flex-col items-center justify-center p-1 bg-surface-container-high rounded text-center">
                        <span className="font-mono text-[9px] text-on-surface-variant">Cost</span>
                        <span className="font-mono text-xs text-gold-currency font-bold">
                          {bp.costPula} P
                        </span>
                        <span
                          className={`font-mono text-[8px] ${
                            pula >= bp.costPula ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          Have: {pula}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center p-1 bg-surface-container-high rounded text-center">
                        <span className="font-mono text-[9px] text-on-surface-variant">Timber</span>
                        <span className="font-mono text-xs text-tertiary font-bold">
                          {bp.costWood} Wood
                        </span>
                        <span
                          className={`font-mono text-[8px] ${
                            wood >= bp.costWood ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          Have: {wood}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center p-1 bg-surface-container-high rounded text-center">
                        <span className="font-mono text-[9px] text-on-surface-variant">Granite</span>
                        <span className="font-mono text-xs text-outline font-bold">
                          {bp.costStone} Stone
                        </span>
                        <span
                          className={`font-mono text-[8px] ${
                            stone >= bp.costStone ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          Have: {stone}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Build Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[10px] text-on-surface-variant">
                      {bp.benefitText}
                    </span>

                    {isBuilt ? (
                      <span className="font-mono text-xs text-status-success font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Completed
                      </span>
                    ) : isLocked ? (
                      <button
                        disabled
                        className="cursor-not-allowed flex items-center gap-1 bg-surface-container text-outline font-mono text-[10px] uppercase px-3 py-1.5 rounded"
                      >
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Locked
                      </button>
                    ) : (
                      <button
                        onClick={() => constructBlueprint(bp.id)}
                        disabled={!canAfford}
                        className={`flex items-center gap-1.5 font-mono text-[10px] uppercase px-3 py-1.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] font-bold active:translate-x-0.5 active:translate-y-0.5 transition-transform ${
                          canAfford
                            ? 'bg-primary-container hover:bg-primary text-wood-dark'
                            : 'bg-surface-container text-outline opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span>🔨</span>
                        <span>Build Now</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Builder Notice */}
          <div className="bg-wood-dark p-2.5 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border border-wood-border flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              engineering
            </span>
            <p className="font-body text-xs text-on-surface-variant leading-tight">
              Crafting structures immediately deducts timber & granite from compound stores.
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Contextual Illustration & Botswana Lore Insight Card */}
      <div className="w-full bg-wood-medium/90 rounded p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-1/3 h-36 bg-surface-container-lowest rounded overflow-hidden relative border border-wood-border flex items-center justify-center">
          <img
            alt="Morama Granary Post"
            className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-500"
            src="/assets/backgrounds/farm_scene.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://lh3.googleusercontent.com/aida-public/AB6AXuB1bxY_gjcTFl7UqjOQxS6ml_PRRPO5MtDnAdSsRgi-tUWOeWTm3bxeGjL1N0AMS9vL0LRKwUErUpSfvkKbPxsCUr-s_KlhGZ5oo3bDRKzcERmV8HYCKAIdrSa1u_Rkna2RnZaDePkIeidylik-WwlG_SZbDAnBCE7GH09UidzhZTTSLLLK5fejqfFBKILVJnhvgO428XKhSKYmJQWn_aqgxtXSDcAxqZhIE4Q6o5kg8CZLXEjMhhaLMg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-wood-dark via-transparent to-transparent" />
          <span className="absolute bottom-2 left-2 font-mono text-[9px] bg-wood-dark/90 text-primary px-2 py-0.5 rounded uppercase font-bold border border-wood-border">
            Morama Granary Post
          </span>
        </div>

        <div className="w-full md:w-2/3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              menu_book
            </span>
            <h4 className="font-headline text-sm text-primary uppercase font-bold">
              Granary Wisdom: The Letlhafula Harvest Season
            </h4>
          </div>
          <p className="font-body text-xs text-cream-surface leading-relaxed">
            In Botswana farming traditions, balancing your granary stock protects against sudden droughts. Retaining sorghum grains allows emergency planting when seasonal rain showers begin, while surplus cowpeas and sweet maize earn high market dividends in nearby settlements.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[10px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-secondary text-[14px]">eco</span>{' '}
              Tswana Certified Grains
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-primary-container text-[14px]">
                bolt
              </span>{' '}
              Instant Construction
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-gold-currency text-[14px]">
                monetization_on
              </span>{' '}
              Fair Market Trade
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
