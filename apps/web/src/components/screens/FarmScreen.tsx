'use client';

import React, { useState, useCallback } from 'react';
import { useGame, Plot } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';
import { PixelIcon } from '@/components/PixelIcon';

const SEED_OPTIONS = [
  { name: 'Sorghum', cost: 15, icon: '🌾', trait: 'Drought Resistant', itemType: 'sorghum_seed' },
  { name: 'Maize', cost: 12, icon: '🌽', trait: 'High Yield', itemType: 'maize_seed' },
  { name: 'Cowpeas', cost: 18, icon: '🫘', trait: 'Fast Maturing', itemType: 'cowpeas_seed' },
  { name: 'Groundnuts', cost: 20, icon: '🥜', trait: 'High Value', itemType: 'groundnuts_seed' },
  {
    name: 'Tomatoes',
    cost: 25,
    icon: '🍅',
    trait: 'Specialty Heirloom',
    itemType: 'tomatoes_seed',
  },
  { name: 'Herbs', cost: 14, icon: '🌿', trait: 'Soil Enricher', itemType: 'herbs_seed' },
];

export function FarmScreen() {
  const {
    pula,
    waterLevel,
    maxWater,
    refillWell,
    plots,
    harvestPlot,
    waterPlot,
    plantPlot,
    quickWaterAll,
    quickHarvestAll,
    granaryEggs,
    granarySorghum,
    granaryMaize,
    soilFertility,
    season,
    currentDay,
    inventory,
    setActiveNav,
  } = useGame();
  const { tl } = useTranslation();

  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Seed picker from inventory
  const availableSeeds = inventory
    .filter((i) => i.itemType?.endsWith('_seed') && i.quantity > 0)
    .map((i) => {
      const fallback = SEED_OPTIONS.find((f) => f.itemType === i.itemType);
      return {
        name: i.name.replace(' Seeds', ''),
        cost: fallback?.cost || 15,
        icon: i.icon,
        trait: fallback?.trait || 'Field Crop',
        itemType: i.itemType!,
        quantity: i.quantity,
      };
    });
  const seedPicker = availableSeeds.length > 0 ? availableSeeds : SEED_OPTIONS;

  const handlePlotTap = (plot: Plot) => {
    setSelectedPlot(plot);
    setShowCropPicker(false);

    if (plot.canPlant) {
      setShowCropPicker(true);
    }
  };

  const handlePlant = (seed: (typeof seedPicker)[0]) => {
    if (selectedPlot) {
      plantPlot(selectedPlot.id, seed.name, seed.cost, seed.icon);
      showToast(`${tl('planted')} ${seed.name}`);
      setSelectedPlot(null);
      setShowCropPicker(false);
    }
  };

  const handleWater = () => {
    if (selectedPlot) {
      waterPlot(selectedPlot.id);
      showToast(tl('watered'));
      setSelectedPlot(null);
    }
  };

  const handleHarvest = () => {
    if (selectedPlot) {
      harvestPlot(selectedPlot.id);
      showToast(tl('harvested'));
      setSelectedPlot(null);
    }
  };

  const handleQuickWater = () => {
    quickWaterAll();
    showToast(tl('allFieldsWatered'));
  };

  const handleQuickHarvest = () => {
    quickHarvestAll();
    showToast(tl('allHarvested'));
  };

  const waterPercent = Math.round((waterLevel / maxWater) * 100);

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background */}
      <div className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-0">
        <img
          alt="Botswana Rural Farmstead"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/farm_scene.png"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBqnYNXmE88_vwJr6UyYgJMA-y0IAFuJDURROBAiI8_Pe-zsund9QjhP54Lr7oJYK60Ny3HzvMnjsneoNPcEcfZD10_b_yakRnp66gkNZ0h_yb8OOa69EkuJeFYsoqtHA_8E3gmVSiAXod5OsCFfsEeKyzDgwMlfN-GBRdetWSYGslj6DF2PT_qLRF-JB76IdNvHYuXGl_IiqKIx3iruERDmNiKG12Q7WShuIR6t0NRpWG6nbTs2KRh7Q';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="font-mono text-xs text-primary font-bold">☀ Day {currentDay}</span>
          <span className="text-wood-border">•</span>
          <span className="font-mono text-xs text-gold-currency font-bold">
            P {pula.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="font-mono text-[10px] text-sky-blue">
            {season} • {tl('growth')} {soilFertility}%
          </span>
        </div>
      </div>

      {/* Main farm world */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 bg-black/25">
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {plots.map((plot) => (
              <button
                key={plot.id}
                onClick={() => handlePlotTap(plot)}
                className={`relative aspect-square bg-wood-dark/80 border-2 p-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  selectedPlot?.id === plot.id
                    ? 'border-primary ring-2 ring-primary/50 shadow-lg'
                    : plot.canHarvest
                      ? 'border-gold-currency animate-pulse'
                      : plot.canWater
                        ? 'border-sky-blue'
                        : 'border-wood-border hover:border-primary/50'
                }`}
              >
                <span className="text-3xl sm:text-4xl">{plot.icon}</span>
                <span className="font-headline text-[10px] sm:text-xs text-cream-surface font-bold leading-tight">
                  {plot.cropName}
                </span>
                {plot.canHarvest && (
                  <span className="font-mono text-[9px] text-gold-currency font-bold tracking-wider animate-bounce">
                    {tl('ready')}
                  </span>
                )}
                {plot.canWater && (
                  <span className="font-mono text-[9px] text-sky-blue font-bold">
                    💧 {plot.hydration}%
                  </span>
                )}
                {plot.state === 'TILLED' && (
                  <span className="font-mono text-[9px] text-secondary">{tl('emptySoil')}</span>
                )}
                {plot.state === 'GROWING' && !plot.canWater && (
                  <div className="w-full h-1.5 bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-status-success transition-all"
                      style={{ width: `${plot.stageProgress}%` }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contextual Action Panel */}
      {selectedPlot && !showCropPicker && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-md mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedPlot.icon}</span>
                <div>
                  <span className="font-headline text-sm text-cream-surface font-bold">
                    {selectedPlot.cropName}
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant block">
                    {selectedPlot.label} • {selectedPlot.stage}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlot(null)}
                className="text-on-surface-variant hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              {selectedPlot.canPlant && (
                <button
                  onClick={() => setShowCropPicker(true)}
                  className="flex-1 py-2 bg-secondary-container text-on-secondary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
                >
                  {tl('plant')}
                </button>
              )}
              {selectedPlot.canWater && (
                <button
                  onClick={handleWater}
                  className="flex-1 py-2 bg-sky-deep text-cream-surface font-mono text-xs uppercase font-bold active:translate-y-0.5"
                >
                  {tl('water')}
                </button>
              )}
              {selectedPlot.canHarvest && (
                <button
                  onClick={handleHarvest}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
                >
                  {tl('harvest')}
                </button>
              )}
            </div>

            {selectedPlot.state === 'GROWING' && (
              <div className="mt-3">
                <div className="flex justify-between font-mono text-[10px] text-on-surface-variant mb-1">
                  <span>{tl('growth')}</span>
                  <span>{selectedPlot.stageProgress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-lowest overflow-hidden">
                  <div
                    className="h-full bg-status-success transition-all"
                    style={{ width: `${selectedPlot.stageProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crop Picker */}
      {selectedPlot && showCropPicker && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-md mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-headline text-sm text-primary uppercase font-bold">
                {tl('plantOn')} {selectedPlot.label}
              </span>
              <button
                onClick={() => setShowCropPicker(false)}
                className="text-on-surface-variant hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {seedPicker.map((seed) => (
                <button
                  key={seed.itemType || seed.name}
                  onClick={() => handlePlant(seed)}
                  className="w-full flex items-center justify-between p-2.5 bg-surface-container-high hover:bg-wood-medium border border-wood-border transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PixelIcon itemType={seed.itemType} emoji={seed.icon} size={24} />
                    <div className="text-left">
                      <span className="font-headline text-xs text-cream-surface font-bold block">
                        {seed.name}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant">
                        {seed.trait}
                        {'quantity' in seed ? ` (x${seed.quantity})` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-gold-currency font-bold">
                    {seed.cost} P
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="fixed bottom-20 md:bottom-4 left-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleQuickWater}
          className="w-10 h-10 bg-sky-deep/90 text-cream-surface border border-sky-blue flex items-center justify-center shadow-md active:scale-95"
          title={tl('waterAll')}
        >
          💧
        </button>
        <button
          onClick={handleQuickHarvest}
          className="w-10 h-10 bg-primary-container/90 text-on-primary-container border border-primary flex items-center justify-center shadow-md active:scale-95"
          title={tl('harvestAll')}
        >
          🌾
        </button>
        <button
          onClick={() => {
            refillWell();
            showToast(tl('wellPumped'));
          }}
          className="w-10 h-10 bg-wood-dark/90 text-cream-surface border border-wood-border flex items-center justify-center shadow-md active:scale-95"
          title={tl('pumpWell')}
        >
          🚰
        </button>
      </div>

      {/* Water gauge */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-20">
        <div className="bg-wood-dark/90 px-3 py-2 border border-wood-border">
          <div className="flex items-center gap-2">
            <span className="text-sm">💧</span>
            <div className="w-16 h-2 bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full bg-sky-blue transition-all"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-sky-blue font-bold">{waterLevel}L</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-status-success/90 text-wood-dark px-4 py-2 font-mono text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* Granary Quick View */}
      <button
        onClick={() => setActiveNav('Inventory')}
        className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-20 bg-wood-dark/90 px-4 py-2 border border-wood-border shadow-md flex items-center gap-3 active:scale-95"
      >
        <span className="font-mono text-[10px] text-on-surface-variant">{tl('granary')}</span>
        <span className="font-mono text-[10px] text-cream-surface">🌾 {granarySorghum}</span>
        <span className="font-mono text-[10px] text-cream-surface">🌽 {granaryMaize}</span>
        <span className="font-mono text-[10px] text-cream-surface">🥚 {granaryEggs}</span>
      </button>
    </div>
  );
}
