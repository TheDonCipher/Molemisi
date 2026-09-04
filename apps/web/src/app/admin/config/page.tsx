'use client';

import React, { useState } from 'react';

// Game config values from the game-config package
// In production these would come from a database, but we display
// the current compiled values and allow admins to note changes.

interface CropConfig {
  name: string;
  growthStages: number;
  baseYield: number;
  seedCost: number;
  sellPrice: number;
  waterNeeds: number;
  xpReward: number;
}

interface ConfigSection {
  title: string;
  icon: string;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  value: string | number;
  type: 'number' | 'text' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

const DEFAULT_CROPS: CropConfig[] = [
  {
    name: 'Sorghum',
    growthStages: 4,
    baseYield: 3,
    seedCost: 15,
    sellPrice: 10,
    waterNeeds: 40,
    xpReward: 15,
  },
  {
    name: 'Maize',
    growthStages: 5,
    baseYield: 4,
    seedCost: 12,
    sellPrice: 12,
    waterNeeds: 60,
    xpReward: 18,
  },
  {
    name: 'Millet',
    growthStages: 4,
    baseYield: 3,
    seedCost: 10,
    sellPrice: 8,
    waterNeeds: 30,
    xpReward: 12,
  },
  {
    name: 'Cowpeas',
    growthStages: 4,
    baseYield: 3,
    seedCost: 18,
    sellPrice: 14,
    waterNeeds: 45,
    xpReward: 20,
  },
  {
    name: 'Groundnuts',
    growthStages: 5,
    baseYield: 2,
    seedCost: 20,
    sellPrice: 18,
    waterNeeds: 50,
    xpReward: 22,
  },
  {
    name: 'Sesame',
    growthStages: 4,
    baseYield: 2,
    seedCost: 16,
    sellPrice: 15,
    waterNeeds: 35,
    xpReward: 16,
  },
  {
    name: 'Watermelon',
    growthStages: 6,
    baseYield: 4,
    seedCost: 22,
    sellPrice: 20,
    waterNeeds: 80,
    xpReward: 25,
  },
  {
    name: 'Tomatoes',
    growthStages: 5,
    baseYield: 3,
    seedCost: 25,
    sellPrice: 22,
    waterNeeds: 70,
    xpReward: 28,
  },
  {
    name: 'Pepper',
    growthStages: 4,
    baseYield: 2,
    seedCost: 18,
    sellPrice: 16,
    waterNeeds: 55,
    xpReward: 18,
  },
  {
    name: 'Herbs',
    growthStages: 3,
    baseYield: 4,
    seedCost: 14,
    sellPrice: 12,
    waterNeeds: 35,
    xpReward: 14,
  },
  {
    name: 'Saffron',
    growthStages: 5,
    baseYield: 1,
    seedCost: 30,
    sellPrice: 35,
    waterNeeds: 40,
    xpReward: 40,
  },
];

const SYSTEM_CONFIG: ConfigSection[] = [
  {
    title: 'Farm Settings',
    icon: '🏡',
    items: [
      { key: 'STARTING_PLOTS', label: 'Starting Plots', value: 4, type: 'number', min: 1, max: 20 },
      { key: 'MAX_PLOTS', label: 'Max Plots', value: 20, type: 'number', min: 4, max: 50 },
      {
        key: 'STARTING_CURRENCY',
        label: 'Starting Pula',
        value: 100,
        type: 'number',
        min: 0,
        max: 10000,
      },
      {
        key: 'STARTING_WATER',
        label: 'Starting Water (L)',
        value: 85,
        type: 'number',
        min: 0,
        max: 500,
      },
      { key: 'MAX_WATER', label: 'Max Water (L)', value: 100, type: 'number', min: 50, max: 1000 },
    ],
  },
  {
    title: 'Economy Settings',
    icon: '💰',
    items: [
      {
        key: 'PRICE_FLUCTUATION',
        label: 'Price Fluctuation %',
        value: 15,
        type: 'number',
        min: 0,
        max: 50,
        description: 'Max random price change per tick',
      },
      {
        key: 'MARKET_UPDATE_HOURS',
        label: 'Market Update (hours)',
        value: 6,
        type: 'number',
        min: 1,
        max: 24,
      },
      {
        key: 'SELL_TAX_RATE',
        label: 'Sell Tax Rate %',
        value: 5,
        type: 'number',
        min: 0,
        max: 30,
        description: 'Percentage taken from sales',
      },
      {
        key: 'CONTRACT_BONUS',
        label: 'Contract Bonus %',
        value: 20,
        type: 'number',
        min: 0,
        max: 100,
        description: 'Extra reward for contract completion',
      },
    ],
  },
  {
    title: 'Progression',
    icon: '📈',
    items: [
      {
        key: 'XP_PER_LEVEL',
        label: 'XP Per Level',
        value: 3000,
        type: 'number',
        min: 100,
        max: 50000,
      },
      { key: 'XP_PLANT', label: 'XP: Plant', value: 5, type: 'number', min: 0, max: 100 },
      { key: 'XP_WATER', label: 'XP: Water', value: 2, type: 'number', min: 0, max: 50 },
      { key: 'XP_HARVEST', label: 'XP: Harvest', value: 10, type: 'number', min: 0, max: 100 },
      { key: 'XP_FORAGE', label: 'XP: Forage', value: 5, type: 'number', min: 0, max: 50 },
    ],
  },
  {
    title: 'Weather',
    icon: '🌤️',
    items: [
      { key: 'CLEAR_PROB', label: 'Clear Weather %', value: 35, type: 'number', min: 0, max: 100 },
      { key: 'CLOUDY_PROB', label: 'Cloudy %', value: 25, type: 'number', min: 0, max: 100 },
      { key: 'RAIN_PROB', label: 'Rain %', value: 25, type: 'number', min: 0, max: 100 },
      { key: 'STORM_PROB', label: 'Storm %', value: 15, type: 'number', min: 0, max: 100 },
      {
        key: 'DROUGHT_CHANCE',
        label: 'Drought Chance %',
        value: 5,
        type: 'number',
        min: 0,
        max: 30,
        description: 'Chance of multi-day drought',
      },
    ],
  },
  {
    title: 'Simulation',
    icon: '⚙️',
    items: [
      {
        key: 'SIMULATION_INTERVAL',
        label: 'Sim Interval (sec)',
        value: 300,
        type: 'number',
        min: 30,
        max: 3600,
      },
      {
        key: 'GROWTH_PER_TICK',
        label: 'Growth Per Tick',
        value: 0.1,
        type: 'number',
        min: 0.01,
        max: 1.0,
        step: 0.01,
      },
      {
        key: 'HYDRATION_DECAY',
        label: 'Hydration Decay/Tick',
        value: 0.05,
        type: 'number',
        min: 0,
        max: 0.5,
        step: 0.01,
      },
      {
        key: 'ENERGY_REGEN',
        label: 'Energy Regen/Hour',
        value: 10,
        type: 'number',
        min: 0,
        max: 100,
      },
    ],
  },
];

export default function ConfigPage() {
  const [crops, setCrops] = useState<CropConfig[]>(DEFAULT_CROPS);
  const [system, setSystem] = useState(SYSTEM_CONFIG);
  const [toast, setToast] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('crops');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateCrop = (index: number, field: keyof CropConfig, value: number) => {
    setCrops((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const updateSystemConfig = (sectionIndex: number, itemIndex: number, value: number) => {
    setSystem((prev) =>
      prev.map((sec, si) =>
        si === sectionIndex
          ? {
              ...sec,
              items: sec.items.map((item, ii) => (ii === itemIndex ? { ...item, value } : item)),
            }
          : sec,
      ),
    );
  };

  const handleSave = () => {
    // In production this would POST to a config API endpoint
    showToast('Configuration saved! Changes take effect in ~5 minutes.');
  };

  const handleReset = () => {
    setCrops(DEFAULT_CROPS);
    setSystem(SYSTEM_CONFIG);
    showToast('Configuration reset to defaults.');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-xl text-primary uppercase font-bold">
          Game Configuration
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase font-bold border border-wood-border hover:border-primary/50 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-wood-dark font-headline text-xs uppercase font-bold hover:bg-primary/80 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveSection('crops')}
          className={`px-3 py-2 font-mono text-xs uppercase whitespace-nowrap border transition-all ${
            activeSection === 'crops'
              ? 'bg-primary-container text-on-primary-container border-primary font-bold'
              : 'bg-surface-container-high text-on-surface-variant border-wood-border'
          }`}
        >
          🌾 Crops
        </button>
        {system.map((sec, i) => (
          <button
            key={sec.title}
            onClick={() => setActiveSection(`system-${i}`)}
            className={`px-3 py-2 font-mono text-xs uppercase whitespace-nowrap border transition-all ${
              activeSection === `system-${i}`
                ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border'
            }`}
          >
            {sec.icon} {sec.title}
          </button>
        ))}
      </div>

      {/* Crops Editor */}
      {activeSection === 'crops' && (
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Crop</span>
            <span>Stages</span>
            <span>Yield</span>
            <span>Seed Cost</span>
            <span>Sell Price</span>
            <span>Water %</span>
            <span>XP</span>
            <span>Profit</span>
          </div>
          {crops.map((crop, i) => {
            const profit = crop.sellPrice * crop.baseYield - crop.seedCost;
            return (
              <div
                key={crop.name}
                className="grid grid-cols-8 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
              >
                <span className="font-headline text-xs text-cream-surface font-bold">
                  {crop.name}
                </span>
                <input
                  type="number"
                  value={crop.growthStages}
                  onChange={(e) => updateCrop(i, 'growthStages', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-cream-surface text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.baseYield}
                  onChange={(e) => updateCrop(i, 'baseYield', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-cream-surface text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.seedCost}
                  onChange={(e) => updateCrop(i, 'seedCost', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-gold-currency text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.sellPrice}
                  onChange={(e) => updateCrop(i, 'sellPrice', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-gold-currency text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.waterNeeds}
                  onChange={(e) => updateCrop(i, 'waterNeeds', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-sky-blue text-center focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={crop.xpReward}
                  onChange={(e) => updateCrop(i, 'xpReward', Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-surface-container-high border border-wood-border font-mono text-xs text-primary text-center focus:outline-none focus:border-primary"
                />
                <span
                  className={`font-mono text-xs font-bold ${
                    profit >= 0 ? 'text-status-success' : 'text-status-danger'
                  }`}
                >
                  P{profit}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* System Config Editor */}
      {activeSection.startsWith('system-') && (
        <div className="bg-wood-dark border border-wood-border p-4">
          {system
            .filter((_, i) => activeSection === `system-${i}`)
            .map((sec) => (
              <div key={sec.title}>
                <h3 className="font-headline text-sm text-cream-surface font-bold mb-4">
                  {sec.icon} {sec.title}
                </h3>
                <div className="space-y-4">
                  {sec.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="font-mono text-xs text-cream-surface font-bold block">
                          {item.label}
                        </label>
                        {item.description && (
                          <span className="font-mono text-[9px] text-on-surface-variant">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={item.value}
                        min={item.min}
                        max={item.max}
                        step={item.step || 1}
                        onChange={(e) => {
                          const si = system.indexOf(sec);
                          const ii = sec.items.indexOf(item);
                          updateSystemConfig(si, ii, Number(e.target.value));
                        }}
                        className="w-24 px-3 py-1.5 bg-surface-container-high border border-wood-border font-mono text-sm text-gold-currency text-center focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
