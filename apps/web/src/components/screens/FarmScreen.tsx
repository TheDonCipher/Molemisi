'use client';

import React, { useState } from 'react';
import { useGame, Plot } from '../../lib/gameState';

const FALLBACK_SEEDS = [
  { name: 'Sorghum', cost: 15, icon: '🌾', trait: 'Drought Resistant', itemType: 'sorghum_seed' },
  { name: 'Sweet Maize', cost: 12, icon: '🌽', trait: 'High Yield', itemType: 'maize_seed' },
  { name: 'Cowpea', cost: 18, icon: '🌱', trait: 'Fast Maturing', itemType: 'cowpeas_seed' },
  { name: 'Groundnut', cost: 20, icon: '🥜', trait: 'High Value', itemType: 'groundnuts_seed' },
  {
    name: 'Heritage Tomato',
    cost: 25,
    icon: '🍅',
    trait: 'Specialty Heirloom',
    itemType: 'tomatoes_seed',
  },
  { name: 'Ditloo Beans', cost: 14, icon: '🫘', trait: 'Soil Enricher', itemType: 'herbs_seed' },
];

export function FarmScreen() {
  const {
    waterLevel,
    maxWater,
    refillWell,
    plots,
    harvestPlot,
    waterPlot,
    plantPlot,
    quickWaterAll,
    quickHarvestAll,
    collectEggs,
    granaryEggs,
    granarySorghum,
    granaryMaize,
    inventory,
    granaryCowpeas,
    soilFertility,
    setActiveNav,
  } = useGame();

  const [selectedPlotForPlanting, setSelectedPlotForPlanting] = useState<Plot | null>(null);
  const [activePlotDetail, setActivePlotDetail] = useState<Plot | null>(null);

  const waterPercent = Math.min(100, Math.round((waterLevel / maxWater) * 100));

  // Build seed options from real inventory
  const seedOptions = inventory
    .filter((i) => i.itemType?.endsWith('_seed') && i.quantity > 0)
    .map((i) => {
      const fallback = FALLBACK_SEEDS.find((f) => f.itemType === i.itemType);
      return {
        name: i.name.replace(' Seeds', ''),
        cost: fallback?.cost || 15,
        icon: i.icon,
        trait: fallback?.trait || 'Field Crop',
        itemType: i.itemType!,
        quantity: i.quantity,
      };
    });
  // Use fallback seeds if inventory has no seeds
  const seedPicker = seedOptions.length > 0 ? seedOptions : FALLBACK_SEEDS;

  return (
    <div className="relative w-full overflow-hidden min-h-[calc(100vh-5rem)] flex flex-col justify-between p-2 md:p-6 select-none pb-20 md:pb-10">
      {/* Botswana Rural Farmstead Retro 16-bit Background */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Botswana Rural Farmstead Retro 16-bit Background"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/farm_scene.png"
          onError={(e) => {
            // fallback if local file path differs
            (e.target as HTMLImageElement).src =
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBqnYNXmE88_vwJr6UyYgJMA-y0IAFuJDURROBAiI8_Pe-zsund9QjhP54Lr7oJYK60Ny3HzvMnjsneoNPcEcfZD10_b_yakRnp66gkNZ0h_yb8OOa69EkuJeFYsoqtHA_8E3gmVSiAXod5OsCFfsEeKyzDgwMlfN-GBRdetWSYGslj6DF2PT_qLRF-JB76IdNvHYuXGl_IiqKIx3iruERDmNiKG12Q7WShuIR6t0NRpWG6nbTs2KRh7Q';
          }}
        />
        <div className="absolute inset-0 bg-surface-container-lowest/30 pointer-events-none" />
        <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(27,9,6,0.65)] pointer-events-none" />
      </div>

      {/* Main Grid Content */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-3 md:gap-4 w-full max-w-[1720px] mx-auto items-start">
        {/* LEFT COLUMN: Water Well, Field Orders & Weather */}
        <div className="xl:col-span-3 flex flex-col gap-3 order-2 xl:order-1">
          {/* Stone Well Panel */}
          <div className="bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border">
            <div className="bg-wood-dark px-3 py-1.5 flex items-center justify-between">
              <span className="font-headline text-sm text-primary uppercase tracking-wider flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">water_drop</span> Stone Well
              </span>
              <span className="font-mono text-[10px] text-status-info bg-surface-container-lowest px-2 py-0.5 font-bold">
                Active
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <div className="flex justify-between items-center text-cream-surface">
                <span className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
                  Groundwater Level
                </span>
                <span className="font-mono text-xs text-sky-blue font-bold">
                  {waterLevel} / {maxWater} L
                </span>
              </div>
              <div className="h-2 w-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-status-info transition-all duration-300"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
            </div>
            <button
              onClick={refillWell}
              className="mt-3 w-full bg-wood-dark hover:bg-wood-medium text-cream-surface font-mono text-xs py-2 uppercase tracking-widest flex items-center justify-center gap-2 border border-wood-border shadow-[1px_1px_0px_rgba(0,0,0,0.4)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-sky-blue">
                water_pump
              </span>
              Handpump Refill (+15L)
            </button>
          </div>

          {/* Farm Field Orders */}
          <div className="bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border">
            <div className="bg-wood-dark px-3 py-1.5 mb-3 flex items-center">
              <span className="font-headline text-sm text-primary uppercase tracking-wider flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">handyman</span> Farm Field
                Orders
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // select first empty plot for planting
                  const emptyPlot = plots.find((p) => p.canPlant);
                  if (emptyPlot) {
                    setSelectedPlotForPlanting(emptyPlot);
                  }
                }}
                className="bg-primary-container hover:bg-primary text-on-primary-container font-mono text-xs py-2.5 px-2 flex flex-col items-center justify-center text-center tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-0.5 active:translate-y-0.5 font-bold"
              >
                <span className="material-symbols-outlined text-[20px] mb-0.5">yard</span>
                <span>Plant Field</span>
              </button>

              <button
                onClick={quickWaterAll}
                className="bg-wood-dark hover:bg-wood-medium text-cream-surface font-mono text-xs py-2.5 px-2 flex flex-col items-center justify-center text-center tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-0.5 active:translate-y-0.5 border border-wood-border"
              >
                <span className="material-symbols-outlined text-[20px] text-status-info mb-0.5">
                  rainy
                </span>
                <span>Water All</span>
              </button>

              <button
                onClick={quickHarvestAll}
                className="bg-wood-dark hover:bg-wood-medium text-gold-currency font-mono text-xs py-2.5 px-2 flex flex-col items-center justify-center text-center tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-0.5 active:translate-y-0.5 border border-wood-border"
              >
                <span className="material-symbols-outlined text-[20px] mb-0.5">agriculture</span>
                <span>Harvest All</span>
              </button>

              <button
                onClick={() => setActiveNav('Inventory')}
                className="bg-wood-dark hover:bg-wood-medium text-cream-surface font-mono text-xs py-2.5 px-2 flex flex-col items-center justify-center text-center tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-0.5 active:translate-y-0.5 border border-wood-border"
              >
                <span className="material-symbols-outlined text-[20px] text-secondary mb-0.5">
                  construction
                </span>
                <span>Build / Fence</span>
              </button>
            </div>
          </div>

          {/* Kalahari Weather */}
          <div className="bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border hidden xl:block">
            <div className="bg-wood-dark px-3 py-1.5 flex items-center justify-between mb-2">
              <span className="font-headline text-sm text-primary uppercase tracking-wider flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">wb_twilight</span> Kalahari
                Weather
              </span>
              <span className="font-mono text-[10px] text-primary font-bold">
                Rain Forecast: 2d
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Hot dry winds from the eastern salt pan. Water consumption for cowpeas +20%. Sorghum
              highly resistant.
            </p>
          </div>
        </div>

        {/* CENTER COLUMN: Arable Fields (Tshimo) 4x3 Grid */}
        <div className="xl:col-span-6 flex flex-col items-center order-1 xl:order-2">
          <div className="w-full bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.7)] backdrop-blur-sm border border-wood-border">
            <div className="bg-wood-dark px-3 md:px-4 py-2 flex items-center justify-between mb-3 border border-wood-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  grid_view
                </span>
                <span className="font-headline text-sm md:text-base text-cream-surface uppercase tracking-wider font-bold">
                  Arable Fields (Tshimo)
                </span>
              </div>
              <span className="font-mono text-[10px] text-secondary uppercase tracking-widest bg-surface-container-lowest px-2 py-0.5 font-bold">
                Plot Grid: 4 x 3
              </span>
            </div>

            {/* 12 Plot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container-lowest/80 p-2 border border-wood-border">
              {plots.map((plot) => {
                const isReady = plot.state === 'READY';
                const isThirsty = plot.state === 'THIRSTY';
                const isTilled = plot.state === 'TILLED' || plot.state === 'RESTING';

                return (
                  <div
                    key={plot.id}
                    onClick={() => {
                      if (plot.canPlant) {
                        setSelectedPlotForPlanting(plot);
                      } else if (plot.canHarvest) {
                        harvestPlot(plot.id);
                      } else {
                        setActivePlotDetail(plot);
                      }
                    }}
                    className={`relative group aspect-square bg-wood-dark/95 p-2 flex flex-col justify-between shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transition-all cursor-pointer border ${
                      isReady
                        ? 'border-gold-currency ring-2 ring-gold-currency/60 animate-pulse'
                        : isThirsty
                          ? 'border-status-danger bg-status-danger/10'
                          : 'border-wood-border hover:border-primary/50'
                    }`}
                  >
                    {/* Plot Header */}
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[9px] text-on-surface-variant bg-surface-container-lowest px-1 py-0.5 font-bold">
                        {plot.label}
                      </span>
                      {isReady && (
                        <span className="font-mono text-[9px] text-gold-currency font-bold tracking-wider">
                          READY
                        </span>
                      )}
                      {isThirsty && (
                        <span className="font-mono text-[9px] text-error font-bold flex items-center gap-0.5 animate-bounce">
                          <span className="material-symbols-outlined text-[12px]">water_drop</span>{' '}
                          DRY
                        </span>
                      )}
                      {!isReady && !isThirsty && (
                        <span className="font-mono text-[9px] text-secondary font-bold">
                          {plot.stage}
                        </span>
                      )}
                    </div>

                    {/* Plot Middle Asset & Title */}
                    <div className="flex flex-col items-center text-center my-auto">
                      <span className="text-2xl my-0.5 transition-transform group-hover:scale-110">
                        {plot.icon}
                      </span>
                      <span className="font-headline text-xs text-cream-surface leading-tight font-bold">
                        {plot.cropName}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant">
                        {plot.yieldInfo}
                      </span>
                    </div>

                    {/* Action or Progress Meter */}
                    {isReady ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          harvestPlot(plot.id);
                        }}
                        className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-mono text-[10px] py-1 uppercase font-bold tracking-wider active:translate-y-0.5 shadow-[1px_1px_0px_rgba(0,0,0,0.4)]"
                      >
                        Harvest
                      </button>
                    ) : isThirsty ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          waterPlot(plot.id);
                        }}
                        className="w-full bg-sky-deep hover:bg-sky-blue text-cream-surface font-mono text-[10px] py-1 uppercase font-bold active:translate-y-0.5"
                      >
                        Water Plot
                      </button>
                    ) : isTilled ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlotForPlanting(plot);
                        }}
                        className="w-full bg-wood-medium hover:bg-primary-container text-cream-surface hover:text-on-primary-container font-mono text-[10px] py-1 uppercase font-bold tracking-wider border border-wood-border"
                      >
                        Plant Seed
                      </button>
                    ) : (
                      <div className="w-full bg-surface-container-lowest p-1 flex flex-col gap-0.5">
                        <div className="h-1.5 w-full bg-surface-container-high overflow-hidden">
                          <div
                            className="h-full bg-status-success transition-all duration-300"
                            style={{ width: `${plot.stageProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Seed Selector Modal (Popup when planting) */}
            {selectedPlotForPlanting && (
              <div className="mt-3 bg-wood-dark p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-headline text-sm text-primary uppercase font-bold">
                    Select Seed for {selectedPlotForPlanting.label}
                  </span>
                  <button
                    onClick={() => setSelectedPlotForPlanting(null)}
                    className="text-on-surface-variant hover:text-cream-surface font-mono text-xs px-2 py-1 bg-surface-container-high"
                  >
                    ✕ CLOSE
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {seedPicker.map((seed) => (
                    <div
                      key={seed.itemType || seed.name}
                      onClick={() => {
                        plantPlot(selectedPlotForPlanting.id, seed.name, seed.cost, seed.icon);
                        setSelectedPlotForPlanting(null);
                      }}
                      className="bg-surface-container-high p-2.5 flex items-center justify-between cursor-pointer hover:bg-wood-medium transition-colors border border-wood-border group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl group-hover:scale-110 transition-transform">
                          {seed.icon}
                        </span>
                        <div>
                          <div className="font-headline text-xs text-cream-surface font-bold">
                            {seed.name}
                          </div>
                          <div className="font-mono text-[9px] text-on-surface-variant">
                            {seed.trait}
                            {'quantity' in seed ? ` (x${seed.quantity})` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-gold-currency font-bold">
                        {seed.cost} P
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plot Detail Inspector */}
            {activePlotDetail && (
              <div className="mt-3 bg-wood-dark p-3 md:p-4 shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border animate-fade-in flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{activePlotDetail.icon}</span>
                    <div className="flex flex-col">
                      <span className="font-headline text-sm text-primary uppercase font-bold">
                        {activePlotDetail.label}: {activePlotDetail.cropName}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        Status: {activePlotDetail.state} • Hydration: {activePlotDetail.hydration}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePlotDetail(null)}
                    className="text-on-surface-variant hover:text-cream-surface font-mono text-xs px-2 py-1 bg-surface-container-high"
                  >
                    ✕ CLOSE
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {activePlotDetail.canWater && (
                    <button
                      onClick={() => {
                        waterPlot(activePlotDetail.id);
                        setActivePlotDetail(null);
                      }}
                      className="py-1.5 bg-sky-deep hover:bg-sky-blue text-cream-surface font-mono text-xs uppercase font-bold"
                    >
                      Water Plot (-10L)
                    </button>
                  )}
                  {activePlotDetail.canHarvest && (
                    <button
                      onClick={() => {
                        harvestPlot(activePlotDetail.id);
                        setActivePlotDetail(null);
                      }}
                      className="py-1.5 bg-primary-container hover:bg-primary text-wood-dark font-mono text-xs uppercase font-bold"
                    >
                      Harvest Yield
                    </button>
                  )}
                  {activePlotDetail.canPlant && (
                    <button
                      onClick={() => {
                        setSelectedPlotForPlanting(activePlotDetail);
                        setActivePlotDetail(null);
                      }}
                      className="py-1.5 bg-wood-medium hover:bg-primary-container text-cream-surface font-mono text-xs uppercase font-bold"
                    >
                      Plant Seed
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Livestock Kraal & Granary Storage */}
        <div className="xl:col-span-3 flex flex-col gap-3 order-3">
          {/* Livestock Kraal Yard */}
          <div className="bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border">
            <div className="bg-wood-dark px-3 py-1.5 flex items-center justify-between mb-3 border border-wood-border">
              <span className="font-headline text-sm text-primary uppercase tracking-wider flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">pets</span> Livestock Yard
              </span>
              <span className="font-mono text-[10px] text-secondary uppercase bg-surface-container-lowest px-2 py-0.5 font-bold">
                Kraal
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Chicken Coop */}
              <div className="bg-wood-dark p-2.5 flex flex-col gap-1.5 border border-wood-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🐔</span>
                    <div className="flex flex-col">
                      <span className="font-headline text-xs text-cream-surface leading-none font-bold">
                        Chicken Coop
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        4 / 6 Hens Grazing
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-status-success uppercase font-bold">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between bg-surface-container-lowest p-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-gold-currency flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-[14px]">egg</span> 2 Eggs Ready
                  </span>
                  <button
                    onClick={collectEggs}
                    className="bg-primary-container hover:bg-primary text-on-primary-container font-mono text-[10px] px-2.5 py-0.5 uppercase font-bold tracking-wider active:translate-y-0.5 shadow-[1px_1px_0px_rgba(0,0,0,0.4)]"
                  >
                    Collect
                  </button>
                </div>
              </div>

              {/* Tswana Goat Pen */}
              <div className="bg-wood-dark p-2.5 flex flex-col gap-1.5 border border-wood-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🐐</span>
                    <div className="flex flex-col">
                      <span className="font-headline text-xs text-cream-surface leading-none font-bold">
                        Tswana Goat Pen
                      </span>
                      <span className="font-mono text-[10px] text-secondary">
                        State: Happy & Fed
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-cream-surface bg-surface-container-lowest px-1.5 py-0.5">
                    2/3
                  </span>
                </div>
                <div className="flex flex-col gap-1 bg-surface-container-lowest p-1.5 mt-0.5">
                  <div className="flex justify-between text-on-surface-variant font-mono text-[10px]">
                    <span>Milk Production</span>
                    <span className="text-cream-surface font-bold">Ready in 2h 14m</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-gold-currency w-[60%]" />
                  </div>
                </div>
              </div>

              {/* Draft Cattle (Dipodi) */}
              <div className="bg-wood-dark p-2.5 flex flex-col gap-1.5 border border-wood-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🐂</span>
                    <div className="flex flex-col">
                      <span className="font-headline text-xs text-cream-surface leading-none font-bold">
                        Draft Cattle (Dipodi)
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        2 Oxen Resting
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-secondary-fixed bg-surface-container-lowest px-1.5 py-0.5 font-bold">
                    Plow Ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Granary Storage */}
          <div className="bg-surface-container-high/95 p-3 md:p-4 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border">
            <div className="bg-wood-dark px-3 py-1.5 flex items-center justify-between mb-3 border border-wood-border">
              <span className="font-headline text-sm text-primary uppercase tracking-wider flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span> Granary
                Storage
              </span>
              <span className="font-mono text-[10px] text-cream-surface font-bold">
                {granarySorghum + granaryMaize + granaryCowpeas + granaryEggs} / 300
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div
                onClick={() => setActiveNav('Inventory')}
                className="aspect-square bg-wood-dark flex flex-col items-center justify-center p-1 relative border border-wood-border hover:border-primary cursor-pointer group"
                title="Sorghum Grain"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">🌾</span>
                <span className="font-mono text-[10px] text-cream-surface font-bold mt-0.5">
                  {granarySorghum}
                </span>
              </div>
              <div
                onClick={() => setActiveNav('Inventory')}
                className="aspect-square bg-wood-dark flex flex-col items-center justify-center p-1 relative border border-wood-border hover:border-primary cursor-pointer group"
                title="Maize Cobs"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">🌽</span>
                <span className="font-mono text-[10px] text-cream-surface font-bold mt-0.5">
                  {granaryMaize}
                </span>
              </div>
              <div
                onClick={() => setActiveNav('Inventory')}
                className="aspect-square bg-wood-dark flex flex-col items-center justify-center p-1 relative border border-wood-border hover:border-primary cursor-pointer group"
                title="Cowpeas"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">🌱</span>
                <span className="font-mono text-[10px] text-cream-surface font-bold mt-0.5">
                  {granaryCowpeas}
                </span>
              </div>
              <div
                onClick={() => setActiveNav('Inventory')}
                className="aspect-square bg-wood-dark flex flex-col items-center justify-center p-1 relative border border-wood-border hover:border-primary cursor-pointer group"
                title="Eggs"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">🥚</span>
                <span className="font-mono text-[10px] text-cream-surface font-bold mt-0.5">
                  {granaryEggs}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER: Soil Fertility & Union Status */}
      <div className="relative z-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-3 mt-4 w-full max-w-[1720px] mx-auto pointer-events-none">
        <div className="pointer-events-auto bg-surface-container-high/90 p-2 px-4 shadow-[2px_2px_0px_rgba(0,0,0,0.6)] flex items-center gap-4 border border-wood-border">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[16px]">eco</span>
            <span className="font-mono text-xs text-on-surface-variant uppercase">
              Kgatleng Soil Fertility:
            </span>
            <span className="font-mono text-xs text-secondary font-bold">
              {soilFertility}% Optimum
            </span>
          </div>
          <div className="h-4 w-px bg-wood-border" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-gold-currency text-[16px]">
              workspace_premium
            </span>
            <span className="font-mono text-xs text-gold-currency font-bold">
              Botswana Farmers Union #042
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
