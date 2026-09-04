'use client';

import React from 'react';
import { useGame } from '../../lib/gameState';

export function BushveldScreen() {
  const {
    energy,
    maxEnergy,
    forageBushveld,
    lootFeed,
    activeToolSlot,
    setActiveToolSlot,
  } = useGame();

  const energyPercent = Math.min(100, Math.round((energy / maxEnergy) * 100));

  const energyColorClass =
    energy < 20
      ? 'bg-status-danger'
      : energy < 50
        ? 'bg-status-warning'
        : 'bg-status-success';

  return (
    <div className="w-full flex flex-col select-none pb-20 md:pb-10">
      {/* Viewport Framed Game Scene */}
      <section className="relative w-full overflow-hidden bg-surface-container-lowest">
        <div className="relative w-full aspect-[16/9] max-h-[760px] min-h-[480px]">
          {/* Botswana Savanna Pixel Art Backdrop */}
          <img
            alt="Botswana Savanna Pixel Art Backdrop"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none filter saturate-[1.1]"
            src="/assets/backgrounds/bushveld_scene.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://lh3.googleusercontent.com/aida-public/AB6AXuATAeRwEE_FMm52FkrWo_6vXz-MMHe3AGwc607kyjIFrEYgBEW054rYKsJxVjInit3vI3AlI_q0aLN0BvlJjOU3LnUjNJs9DXrHTOUTTYvltrO30_KhYjO2lakHBbKU_JIMgYk2fJtInIVUCLh5-LI5ROSxkjCd3TwPDci4bl7KWWsiB51gCe7mgTSlOzTCRHa8Vrs-MWlzPTNswmmFWW1QuajHX1hbd6Kfd-rv2PoenxTNzpTrTnv04Q';
            }}
          />

          {/* Ambient Lighting & Dusk Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-wood-dark/60 pointer-events-none" />

          {/* Top Pinned Consoles */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
            {/* Biome & Territory Intel */}
            <div className="pointer-events-auto bg-wood-dark/95 px-3 md:px-4 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col gap-0.5 max-w-xs md:max-w-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  explore
                </span>
                <span className="font-headline text-xs md:text-sm text-primary tracking-wide uppercase font-bold">
                  Bushveld Fringe
                </span>
              </div>
              <p className="font-mono text-[10px] text-cream-surface">
                📍 Okavango Savanna Fringe • Golden Hour
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 bg-secondary-container text-on-secondary-container font-mono text-[9px] rounded uppercase tracking-wider font-bold">
                  Shield: Low Danger
                </span>
                <span className="font-mono text-[9px] text-on-surface-variant">
                  Safe Grazing Zone
                </span>
              </div>
            </div>

            {/* Stamina & Climate Consoles */}
            <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
              {/* Energy Gauge */}
              <div className="bg-wood-dark/95 px-3 md:px-4 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col gap-1 min-w-[180px] md:min-w-[210px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-gold-currency uppercase tracking-wider flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-[16px]">bolt</span> Energy
                  </span>
                  <span className="font-mono text-xs text-cream-surface font-bold">
                    {energy} / {maxEnergy}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container-lowest p-0.5 border border-wood-border overflow-hidden">
                  <div
                    className={`h-full ${energyColorClass} transition-all duration-300`}
                    style={{ width: `${energyPercent}%` }}
                  />
                </div>
              </div>

              {/* Climate Widget */}
              <div className="hidden sm:flex items-center gap-2 bg-wood-dark/95 px-3 py-2 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary-fixed text-[18px]">
                    wb_twilight
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-on-surface-variant leading-tight">
                    Climate
                  </span>
                  <span className="font-mono text-xs text-primary font-bold">
                    29°C • Dry Breeze
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE HOTSPOTS LAYER */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* HOTSPOT 1: Wild Marula Bush (Lower Left) */}
            <div className="absolute bottom-[28%] left-[8%] pointer-events-auto group">
              <button
                onClick={() =>
                  forageBushveld(
                    'marula',
                    0,
                    '+3 Marula, +1 Wild Seeds',
                    'Harvested ripe marula fruit and drought-tolerant seeds from the thorn bush!',
                    'spa',
                    'Wild Marula Fruit',
                    3
                  )
                }
                className="relative flex items-center justify-center w-11 h-11 bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.6)] transform hover:scale-110 active:scale-95 transition-all duration-150 border border-secondary"
                title="Inspect Marula Bush"
              >
                <span className="material-symbols-outlined text-[20px]">spa</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary-fixed" />
                </span>
              </button>
              {/* Tooltip Box */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute left-14 bottom-0 w-64 bg-wood-dark/95 p-3 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border z-30">
                <div className="flex items-center justify-between pb-1 border-b border-wood-border/50">
                  <span className="font-headline text-xs text-secondary font-bold">
                    🌿 Wild Marula Bush
                  </span>
                  <span className="font-mono text-[9px] bg-secondary-container text-on-secondary-container px-1.5 rounded">
                    Ready
                  </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-1">
                  Forage: Ripe Marula Fruit & Wild Bush Seeds
                </p>
                <div className="mt-2 pt-1 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-gold-currency font-bold">Cost: 0 Energy</span>
                  <span className="text-cream-surface underline decoration-secondary">
                    Click to Harvest
                  </span>
                </div>
              </div>
            </div>

            {/* HOTSPOT 2: Central Fresh Waterhole (Center Basin) */}
            <div className="absolute bottom-[30%] left-[48%] pointer-events-auto group -translate-x-1/2">
              <button
                onClick={() =>
                  forageBushveld(
                    'waterhole',
                    5,
                    '+2 River Reeds, Canteen Filled',
                    'Gathered sturdy river reeds for weaving and refreshed the water canteen.',
                    'water_drop',
                    'River Reeds',
                    2
                  )
                }
                className="relative flex items-center justify-center w-12 h-12 bg-sky-deep hover:bg-sky-blue text-cream-surface hover:text-surface-dim rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.6)] transform hover:scale-110 active:scale-95 transition-all duration-150 border border-sky-blue"
                title="Inspect Fresh Waterhole"
              >
                <span className="material-symbols-outlined text-[22px]">water_drop</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-blue opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-status-info" />
                </span>
              </button>
              {/* Tooltip Box */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-14 w-64 bg-wood-dark/95 p-3 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border z-30">
                <div className="flex items-center justify-between pb-1 border-b border-wood-border/50">
                  <span className="font-headline text-xs text-sky-blue font-bold">
                    💧 Fresh Waterhole
                  </span>
                  <span className="font-mono text-[9px] bg-surface-container-high text-sky-blue px-1.5 rounded">
                    Active
                  </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-1">
                  Inspect: Gather Reeds & Fill Canteen
                </p>
                <div className="mt-2 pt-1 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-status-warning font-bold">Cost: -5 Energy</span>
                  <span className="text-cream-surface underline decoration-sky-blue">
                    Click to Gather
                  </span>
                </div>
              </div>
            </div>

            {/* HOTSPOT 3: Ancient Baobab Grove (Mid Right) */}
            <div className="absolute top-[38%] right-[22%] pointer-events-auto group">
              <button
                onClick={() =>
                  forageBushveld(
                    'baobab',
                    -15,
                    '+15 Energy Restored',
                    'Rested under the thick shade of the ancient baobab. Spirits and stamina renewed!',
                    'park'
                  )
                }
                className="relative flex items-center justify-center w-11 h-11 bg-wood-medium hover:bg-wood-border text-primary rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.6)] transform hover:scale-110 active:scale-95 transition-all duration-150 border border-primary/40"
                title="Rest at Baobab"
              >
                <span className="material-symbols-outlined text-[20px]">park</span>
              </button>
              {/* Tooltip Box */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute right-14 bottom-0 w-64 bg-wood-dark/95 p-3 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border z-30">
                <div className="flex items-center justify-between pb-1 border-b border-wood-border/50">
                  <span className="font-headline text-xs text-primary font-bold">
                    🌳 Ancient Baobab
                  </span>
                  <span className="font-mono text-[9px] bg-primary-container text-on-primary-container px-1.5 rounded">
                    Shelter
                  </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-1">
                  Rest in Shade & Contemplate Wilderness
                </p>
                <div className="mt-2 pt-1 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-status-success font-bold">Gain: +15 Energy</span>
                  <span className="text-cream-surface underline decoration-primary">
                    Click to Rest
                  </span>
                </div>
              </div>
            </div>

            {/* HOTSPOT 4: Granite Outcrop Cave (Far Right) */}
            <div className="absolute bottom-[34%] right-[11%] pointer-events-auto group">
              <button
                onClick={() =>
                  forageBushveld(
                    'cave',
                    10,
                    '+2 Raw Stone, +1 Mineral Salt',
                    'Excavated raw granite boulders and pure mineral salt licks inside the cool cave.',
                    'landslide',
                    'Granite Stone',
                    2
                  )
                }
                className="relative flex items-center justify-center w-12 h-12 bg-surface-container-high hover:bg-primary-container text-gold-currency hover:text-on-primary-container rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.6)] transform hover:scale-110 active:scale-95 transition-all duration-150 border border-gold-currency/60"
                title="Mine Granite Outcrop"
              >
                <span className="material-symbols-outlined text-[22px]">landslide</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-currency opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-status-warning" />
                </span>
              </button>
              {/* Tooltip Box */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute right-14 bottom-0 w-64 bg-wood-dark/95 p-3 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.7)] border border-wood-border z-30">
                <div className="flex items-center justify-between pb-1 border-b border-wood-border/50">
                  <span className="font-headline text-xs text-gold-currency font-bold">
                    🪨 Granite Outcrop
                  </span>
                  <span className="font-mono text-[9px] bg-surface-container-highest text-cream-surface px-1.5 rounded">
                    Resource
                  </span>
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-1">
                  Mine: Raw Stone & Mineral Salt Lick
                </p>
                <div className="mt-2 pt-1 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-status-danger font-bold">Cost: -10 Energy</span>
                  <span className="text-cream-surface underline decoration-gold-currency">
                    Click to Mine
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER DECK: Tool Consol & Foraging Registry */}
        <div className="w-full bg-surface-container-high px-4 md:px-8 py-6 border-t-2 border-wood-border">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tool Belt Slots (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    construction
                  </span>
                  <h2 className="font-headline text-sm md:text-base text-primary uppercase font-bold">
                    Wilderness Equipment
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  Quick Select • Slot 1-4
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Tool 1 */}
                <button
                  onClick={() => setActiveToolSlot(1)}
                  className={`flex flex-col p-3 bg-wood-dark hover:bg-wood-medium text-left rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border transition-all group ${
                    activeToolSlot === 1
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-wood-border'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-9 h-9 rounded bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">
                        shopping_basket
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-secondary font-bold">
                      Slot 1
                    </span>
                  </div>
                  <span className="font-headline text-xs text-cream-surface mt-2 font-bold">
                    Woven Basket
                  </span>
                  <span className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                    7 / 15 Items Full
                  </span>
                  <div className="w-full h-1.5 bg-surface-container-lowest mt-2 overflow-hidden">
                    <div className="h-full bg-primary w-[46%]" />
                  </div>
                </button>

                {/* Tool 2 */}
                <button
                  onClick={() => setActiveToolSlot(2)}
                  className={`flex flex-col p-3 bg-wood-dark hover:bg-wood-medium text-left rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border transition-all group ${
                    activeToolSlot === 2
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-wood-border'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-9 h-9 rounded bg-surface-container-low flex items-center justify-center text-gold-currency group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">hardware</span>
                    </span>
                    <span className="font-mono text-[10px] text-secondary font-bold">
                      Slot 2
                    </span>
                  </div>
                  <span className="font-headline text-xs text-cream-surface mt-2 font-bold">
                    Stone Pickaxe
                  </span>
                  <span className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                    Durability 80%
                  </span>
                  <div className="w-full h-1.5 bg-surface-container-lowest mt-2 overflow-hidden">
                    <div className="h-full bg-status-success w-[80%]" />
                  </div>
                </button>

                {/* Tool 3 */}
                <button
                  onClick={() => setActiveToolSlot(3)}
                  className={`flex flex-col p-3 bg-wood-dark hover:bg-wood-medium text-left rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border transition-all group ${
                    activeToolSlot === 3
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-wood-border'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-9 h-9 rounded bg-surface-container-low flex items-center justify-center text-sky-blue group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">local_drink</span>
                    </span>
                    <span className="font-mono text-[10px] text-secondary font-bold">
                      Slot 3
                    </span>
                  </div>
                  <span className="font-headline text-xs text-cream-surface mt-2 font-bold">
                    Clay Canteen
                  </span>
                  <span className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                    100% (Pure Spring)
                  </span>
                  <div className="w-full h-1.5 bg-surface-container-lowest mt-2 overflow-hidden">
                    <div className="h-full bg-status-info w-full" />
                  </div>
                </button>

                {/* Tool 4 */}
                <button
                  onClick={() => setActiveToolSlot(4)}
                  className={`flex flex-col p-3 bg-wood-dark hover:bg-wood-medium text-left rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border transition-all group ${
                    activeToolSlot === 4
                      ? 'border-primary ring-2 ring-primary/50'
                      : 'border-wood-border'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="w-9 h-9 rounded bg-surface-container-low flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </span>
                    <span className="font-mono text-[10px] text-secondary font-bold">
                      Slot 4
                    </span>
                  </div>
                  <span className="font-headline text-xs text-cream-surface mt-2 font-bold">
                    Field Scope
                  </span>
                  <span className="font-mono text-[9px] text-on-surface-variant mt-0.5">
                    Spot Wildlife
                  </span>
                  <div className="w-full h-1.5 bg-surface-container-lowest mt-2 overflow-hidden">
                    <div className="h-full bg-tertiary w-full" />
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Discoveries Log (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3 bg-wood-dark p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.4)] border border-wood-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold-currency text-[18px]">
                    receipt_long
                  </span>
                  <span className="font-headline text-sm text-cream-surface font-bold">
                    Recent Expedition Finds
                  </span>
                </div>
                <span className="font-mono text-[10px] text-secondary">Updated Just Now</span>
              </div>

              {/* Loot Feed */}
              <div className="flex flex-col gap-2">
                {lootFeed.map((loot) => (
                  <div
                    key={loot.id}
                    className="flex items-center justify-between p-2.5 bg-surface-container-low rounded border border-wood-border/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-secondary">
                        <span className="material-symbols-outlined text-[18px]">
                          {loot.icon}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body text-xs text-cream-surface font-bold">
                          {loot.text}
                        </span>
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          {loot.subtext}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-gold-currency bg-wood-medium px-2 py-0.5 rounded font-bold">
                      +5 XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
