'use client';

import React, { useEffect, useState } from 'react';
import {
  useGame,
  apiFetch,
  Plot,
  FarmAnimal,
  AvailableAnimal,
  FarmBuilding,
  AvailableBuilding,
} from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';
import { isSeedInSeason, getCropConfig, type CropId } from '@molemisi/game-config';
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

type WeatherLabelKey =
  'weatherClear' | 'weatherCloudy' | 'weatherRain' | 'weatherStorm' | 'weatherDrought';

const WEATHER_VIEW: Record<string, { icon: string; emoji: string; labelKey: WeatherLabelKey }> = {
  clear: { icon: 'weather_sun', emoji: '☀️', labelKey: 'weatherClear' },
  cloudy: { icon: 'weather_cloud', emoji: '☁️', labelKey: 'weatherCloudy' },
  rain: { icon: 'weather_rain', emoji: '🌧️', labelKey: 'weatherRain' },
  storm: { icon: 'weather_storm', emoji: '⛈️', labelKey: 'weatherStorm' },
  drought: { icon: 'weather_drought', emoji: '🏜️', labelKey: 'weatherDrought' },
};
const WEATHER_FALLBACK = { icon: 'weather_sun', emoji: '☀️', labelKey: 'weatherClear' as const };

/** Scene-overlay sprite for weather that changes play (rain/storm fill the tank). */
const WEATHER_FX_SPRITE: Record<string, string> = {
  rain: '/assets/weather/rain_cloud.png',
  storm: '/assets/weather/cloud_storm.png',
  drought: '/assets/weather/dust_drought.png',
};

/** Weather icon with emoji fallback when the pixel sprite is missing. */
function WeatherGlyph({ weather }: { weather: string }) {
  const [failed, setFailed] = useState(false);
  const view = WEATHER_VIEW[weather] ?? WEATHER_FALLBACK;
  if (failed) {
    return (
      <span className="text-xs leading-none" role="img" aria-label={view.emoji}>
        {view.emoji}
      </span>
    );
  }
  return (
    <img
      src={`/assets/ui/icons/${view.icon}.png`}
      alt={view.emoji}
      width={16}
      height={16}
      style={{ imageRendering: 'pixelated' }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

function formatAway(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Display mirror of the server's FEED_ITEM map + AnimalConfig.feedPerDay
// (apps/api/src/livestock/livestock.service.ts). The server stays the
// authority — this only labels the Feed button and greys it out.
const FEED_INFO: Record<string, { slug: string; amount: number; emoji: string }> = {
  chicken: { slug: 'sorghum', amount: 2, emoji: '🌾' },
  goat: { slug: 'herbs', amount: 4, emoji: '🌿' },
  cow: { slug: 'herbs', amount: 8, emoji: '🌿' },
  pig: { slug: 'sorghum', amount: 6, emoji: '🌾' },
};

const PRODUCT_EMOJI: Record<string, string> = {
  egg: '🥚',
  goat_milk: '🥛',
  cow_milk: '🥛',
  truffle: '🍄',
};

/** Product badge per animal type (mirror of AnimalConfig.productType). */
const ANIMAL_PRODUCT: Record<string, string> = {
  chicken: '🥚',
  goat: '🥛',
  cow: '🥛',
  pig: '🍄',
};

const ANIMAL_EMOJI: Record<string, string> = { chicken: '🐔', goat: '🐐', cow: '🐄', pig: '🐖' };

type AnimalNameKey = 'animalChicken' | 'animalGoat' | 'animalCow' | 'animalPig';
const ANIMAL_NAME_KEY: Record<string, AnimalNameKey> = {
  chicken: 'animalChicken',
  goat: 'animalGoat',
  cow: 'animalCow',
  pig: 'animalPig',
};

/** Animal sprite by mood, with emoji fallback when the art is missing. */
function AnimalSprite({
  type,
  mood,
  size,
}: {
  type: string;
  mood: 'idle' | 'happy' | 'sick';
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span style={{ fontSize: size * 0.7, lineHeight: 1 }} role="img" aria-label={type}>
        {ANIMAL_EMOJI[type] ?? '🐾'}
      </span>
    );
  }
  return (
    <img
      src={`/assets/sprites/animals/${type}/${mood}.png`}
      alt={type}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

// Display mirror of game-config BUILDINGS (spriteSheet + maintenance). The
// server is the authority on cost; this only paints icons and button labels.
const BUILDING_ICON: Record<string, string> = {
  storage: 'building_barn',
  water_source: 'building_jojo_tank',
  kraal: 'building_paddock',
  farm_boundary: 'building_fence',
  crafting: 'building_mill',
};
const BUILDING_EMOJI: Record<string, string> = {
  storage: '🧺',
  water_source: '💧',
  kraal: '🪵',
  farm_boundary: '🚧',
  crafting: '⚒️',
};
const MAINTENANCE_INFO: Record<string, { pula: number; mat?: { slug: string; qty: number } }> = {
  water_source: { pula: 60, mat: { slug: 'setena', qty: 2 } },
  kraal: { pula: 90, mat: { slug: 'thapo', qty: 2 } },
  farm_boundary: { pula: 90, mat: { slug: 'poleto', qty: 3 } },
  crafting: { pula: 45 },
};
const MAT_EMOJI: Record<string, string> = { poleto: '🧱', thapo: '🪢', setena: '🪨' };

type BuildingNameKey =
  | 'buildingStorage'
  | 'buildingWaterSource'
  | 'buildingKraal'
  | 'buildingBoundary'
  | 'buildingCrafting';
const BUILDING_NAME_KEY: Record<string, BuildingNameKey> = {
  storage: 'buildingStorage',
  water_source: 'buildingWaterSource',
  kraal: 'buildingKraal',
  farm_boundary: 'buildingBoundary',
  crafting: 'buildingCrafting',
};

/** Building icon from the item-icon set, with emoji fallback. */
function BuildingIcon({ type, size }: { type: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const icon = BUILDING_ICON[type];
  if (failed || !icon) {
    return (
      <span style={{ fontSize: size * 0.7, lineHeight: 1 }} role="img" aria-label={type}>
        {BUILDING_EMOJI[type] ?? '🏠'}
      </span>
    );
  }
  return (
    <img
      src={`/assets/ui/items/${icon}.png`}
      alt={type}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

/**
 * Growth-stage art for a plot.
 *
 * `assets/sprites/crops/<crop>/stage_N.png` exists for every crop, but the
 * counts differ (every crop has 5 stages except watermelon, which has 6), so the ideal index is
 * clamped and then *stepped down* on a load error. When even stage_0 is missing
 * the emoji the server sent is the honest fallback.
 *
 * Art walks the crop's own sprite stages (CropConfig.spriteStages) by progress, not the server's cosmetic `growthStage`, so
 * art follows the same hour-based number the progress bar shows.
 */
function CropSprite({
  cropType,
  stageProgress,
  emoji,
  size = 44,
}: {
  cropType?: string | null;
  stageProgress: number;
  emoji: string;
  size?: number;
}) {
  const stages = getCropConfig(cropType ?? '')?.spriteStages ?? 5;
  const maxIndex = Math.min(stages - 1, Math.floor((stageProgress * stages) / 100));
  // How many stages to walk down after failures; reset when the crop or its
  // growth bucket changes (a new planting must start from the ideal sprite).
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [cropType, maxIndex]);

  const index = maxIndex - step;
  if (!cropType || index < 0) {
    return (
      <span style={{ fontSize: size * 0.85, lineHeight: 1 }} role="img" aria-label={emoji}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={`/assets/sprites/crops/${cropType}/stage_${index}.png`}
      alt=""
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={() => setStep((s) => s + 1)}
      draggable={false}
    />
  );
}

/**
 * "Ready in ~4h" for a growing plot.
 *
 * Tank-gated growth means this is a pace, not a promise: the estimate assumes
 * the shared tank keeps up (03 §1.2), so it is always prefixed with "~".
 */
function readyInText(plot: Plot, label: string): string | null {
  if (!plot.growthHours || plot.growthHours <= 0) return null;
  if (plot.canHarvest || plot.canPlant) return null;
  const remainingHours = (1 - plot.stageProgress / 100) * plot.growthHours;
  if (remainingHours <= 0) return null;
  const hours = Math.floor(remainingHours);
  const minutes = Math.round((remainingHours - hours) * 60);
  const span = hours >= 1 ? `${hours}h` : `${minutes}m`;
  return `${label} ~${span}`;
}

function animalMood(a: FarmAnimal): 'idle' | 'happy' | 'sick' {
  if (a.isSick) return 'sick';
  return a.happiness >= 0.6 ? 'happy' : 'idle';
}

export function FarmScreen() {
  const {
    pula,
    weather,
    welcomeBack,
    dismissWelcomeBack,
    livestock,
    feedAnimal,
    petAnimal,
    collectAnimalProduct,
    purchaseAnimal,
    buildings,
    constructBuilding,
    maintainBuilding,
    upgradeBuilding,
    nextLand,
    buyPlot,
    farmId,
    waterLevel,
    maxWater,
    hasTank,
    refillWell,
    plots,
    harvestPlot,
    plantPlot,
    quickHarvestAll,
    granaryEggs,
    granarySorghum,
    granaryMaize,
    season,
    currentDay,
    inventory,
    setActiveNav,
  } = useGame();
  const { tl } = useTranslation();

  // Store only the plot id and derive the plot from live game state, so the
  // action panel never renders a stale snapshot (growth %, stall flips) while open.
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const selectedPlot = plots.find((p) => p.id === selectedPlotId) ?? null;
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  // Same live-derivation rule as plots: the animal sheet reads current state.
  const selectedAnimal = livestock.find((a) => a.id === selectedAnimalId) ?? null;
  const [showBuyAnimals, setShowBuyAnimals] = useState(false);
  const [availableAnimals, setAvailableAnimals] = useState<AvailableAnimal[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) ?? null;
  const [showBuildSheet, setShowBuildSheet] = useState(false);
  const [availableBuildings, setAvailableBuildings] = useState<AvailableBuilding[]>([]);

  // 03 §14 — first-visit nudge. One-time (localStorage): a fresh grid of
  // identical "Empty Soil" tiles gives a new player nothing to read.
  const [showCoach, setShowCoach] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.localStorage.getItem('molemisi_coach_farm')) {
      setShowCoach(true);
    }
  }, []);
  const dismissCoach = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem('molemisi_coach_farm', '1');
    setShowCoach(false);
  };
  const [showCropPicker, setShowCropPicker] = useState(false);
  // Transient per-plot animation: which plot is mid-action and what kind, so we
  // can play a short plant / water / harvest micro-animation. Cleared by timer.
  const [celebrate, setCelebrate] = useState<{ id: number; kind: 'plant' | 'water' | 'harvest' } | null>(
    null,
  );
  const triggerCelebrate = (id: number, kind: 'plant' | 'water' | 'harvest') => {
    setCelebrate({ id, kind });
    window.setTimeout(() => {
      setCelebrate((cur) => (cur?.id === id && cur?.kind === kind ? null : cur));
    }, 650);
  };
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
  const handlePlotTap = (plot: Plot) => {
    setSelectedPlotId(plot.id);
    setShowCropPicker(false);

    if (plot.canPlant) {
      setShowCropPicker(true);
    }
  };

  const handlePlant = (seed: (typeof availableSeeds)[0]) => {
    if (selectedPlot) {
      // plantPlot reports its own outcome (Planted! / Plant Failed) once the
      // server responds — don't fire a premature success toast on top of it.
      triggerCelebrate(selectedPlot.id, 'plant');
      plantPlot(selectedPlot.id, seed.name, seed.cost, seed.icon);
      setSelectedPlotId(null);
      setShowCropPicker(false);
    }
  };

  const handleHarvest = () => {
    if (selectedPlot) {
      // harvestPlot reports its own outcome (Harvest Complete / Harvest Failed).
      triggerCelebrate(selectedPlot.id, 'harvest');
      harvestPlot(selectedPlot.id);
      setSelectedPlotId(null);
    }
  };

  const handleQuickHarvest = () => {
    // quickHarvestAll reports its own outcome (Harvest Complete / Nothing Ready).
    quickHarvestAll();
  };

  const waterPercent = Math.round((waterLevel / maxWater) * 100);
  const readyCount = plots.filter((p) => p.canHarvest).length;

  // Buy sheet: the list comes from the server (config is the authority on
  // cost/product/building), fetched lazily on open.
  const openBuySheet = async () => {
    setSelectedAnimalId(null);
    setShowBuyAnimals(true);
    if (!farmId) return;
    try {
      const list = await apiFetch<AvailableAnimal[]>('GET', `/farms/${farmId}/livestock/available`);
      setAvailableAnimals(Array.isArray(list) ? list : []);
    } catch {
      setAvailableAnimals([]);
    }
  };

  // Feed affordability for the open animal sheet (display-only; the server
  // still validates and charges the granary).
  const selFeed = selectedAnimal ? FEED_INFO[selectedAnimal.animalType] : undefined;
  const selFeedQty = selFeed
    ? (inventory.find((i) => i.itemType === selFeed.slug)?.quantity ?? 0)
    : 0;
  const canFeed =
    !!selectedAnimal && !!selFeed && selFeedQty >= selFeed.amount && selectedAnimal.hunger < 0.95;

  // Build sheet: server-driven list (config = authority), lazy on open.
  const openBuildSheet = async () => {
    setSelectedBuildingId(null);
    setShowBuildSheet(true);
    if (!farmId) return;
    try {
      const list = await apiFetch<AvailableBuilding[]>(
        'GET',
        `/farms/${farmId}/buildings/available`,
      );
      setAvailableBuildings(Array.isArray(list) ? list : []);
    } catch {
      setAvailableBuildings([]);
    }
  };

  // Repair affordability for the open building sheet (display-only mirror of
  // maintenanceQuote in buildings.service — DISABLED doubles the Pula cost).
  const selMaint = selectedBuilding ? MAINTENANCE_INFO[selectedBuilding.buildingType] : undefined;
  const selMat = selMaint?.mat ?? null;
  const selMaintPula = selMaint
    ? selMaint.pula * (selectedBuilding?.state === 'DISABLED' ? 2 : 1)
    : 0;
  const selMatQty = selMat
    ? (inventory.find((i) => i.itemType === selMat.slug)?.quantity ?? 0)
    : Infinity;
  const canMaintain =
    !!selectedBuilding &&
    (selectedBuilding.state === 'MAINTENANCE_NEEDED' || selectedBuilding.state === 'DISABLED') &&
    !!selMaint &&
    pula >= selMaintPula &&
    selMatQty >= (selMat?.qty ?? 0);

  // Tier-up affordability for the open building sheet — cost comes from the
  // server row (`nextUpgradeCost`), so the button never quotes a wrong number.
  const selUpgrade = selectedBuilding?.nextUpgradeCost ?? null;
  const selUpgradeMats = selUpgrade
    ? (['poleto', 'thapo', 'setena'] as const)
        .filter((m) => (selUpgrade[m] ?? 0) > 0)
        .map((m) => ({ slug: m, qty: selUpgrade[m] as number }))
    : [];
  const canUpgrade =
    !!selectedBuilding &&
    selectedBuilding.state === 'ACTIVE' &&
    !!selUpgrade &&
    pula >= selUpgrade.currency &&
    selUpgradeMats.every(
      (m) => (inventory.find((i) => i.itemType === m.slug)?.quantity ?? 0) >= m.qty,
    );

  const buildingStateText = (b: FarmBuilding): string | null => {
    if (b.state === 'CONSTRUCTION') {
      const mins = b.constructionEndsAt
        ? Math.max(0, Math.ceil((new Date(b.constructionEndsAt).getTime() - Date.now()) / 60000))
        : 0;
      return `${tl('stateConstruction')} ${formatAway(mins)}`;
    }
    if (b.state === 'MAINTENANCE_NEEDED') return tl('stateMaintenance');
    if (b.state === 'DISABLED') return tl('stateDisabled');
    return null;
  };
  const weatherView = WEATHER_VIEW[weather] ?? WEATHER_FALLBACK;
  const raining = weather === 'rain' || weather === 'storm';

  // Welcome-back rows (09 §9) — only the lines that have something to say.
  const wbRows: Array<{ emoji: string; text: string }> = [];
  if (welcomeBack) {
    if (welcomeBack.cropsReady > 0)
      wbRows.push({
        emoji: '🌾',
        text: tl('wbCropsReady').replace('{n}', String(welcomeBack.cropsReady)),
      });
    if (welcomeBack.livestockProducts > 0)
      wbRows.push({
        emoji: '🥚',
        text: tl('wbProductsReady').replace('{n}', String(welcomeBack.livestockProducts)),
      });
    if (welcomeBack.buildingsCompleted > 0)
      wbRows.push({
        emoji: '🏗️',
        text: tl('wbBuildingsDone').replace('{n}', String(welcomeBack.buildingsCompleted)),
      });
    if (welcomeBack.buildingsMaintenance > 0)
      wbRows.push({
        emoji: '🔧',
        text: tl('wbMaintenance').replace('{n}', String(welcomeBack.buildingsMaintenance)),
      });
    if (welcomeBack.bothoCatchUp > 0)
      wbRows.push({
        emoji: '🤝',
        text: tl('wbCatchUp').replace('{n}', String(welcomeBack.bothoCatchUp)),
      });
    if (welcomeBack.seasonChanged && welcomeBack.newSeason)
      wbRows.push({
        emoji: '🍂',
        text: tl('wbSeasonChanged').replace('{season}', welcomeBack.newSeason),
      });
  }

  return (
    <div className="relative w-full flex flex-col overflow-hidden select-none h-[calc(100dvh_-_7.5rem)] md:h-[calc(100dvh_-_5rem)]">
      {/* Background — the gradient overlay below is also the fallback backdrop
          if the sprite is missing; no third-party URL is trusted here. */}
      <div className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-0 bg-wood-dark">
        <img
          alt="Botswana Rural Farmstead"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/tiles/sky/farm_day.png"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* Top HUD — pinned inside the screen (D): day + currency, the granary
          counts (B, moved up out of the bottom band) and the sky. */}
      <div className="relative z-10 flex-none flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
        {/* md:contents dissolves this row so all three chips share one line on
            wide screens while staying two tidy rows on a phone. */}
        <div className="flex items-center justify-between gap-2 md:contents">
          <div className="md:order-1 flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
            <span className="font-mono text-xs text-primary font-bold">☀ Day {currentDay}</span>
            <span className="text-wood-border">•</span>
            <span className="font-mono text-xs text-gold-currency font-bold">
              P {pula.toLocaleString()}
            </span>
          </div>
          <div
            className="md:order-3 flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border"
            title={raining ? tl('rainFillsTank') : tl(weatherView.labelKey)}
          >
            <WeatherGlyph weather={weather} />
            <span className="font-mono text-[11px] text-sky-blue">
              {tl(weatherView.labelKey)} • {season}
            </span>
          </div>
        </div>

        {/* Granary — tap to open the Inventory (was a floating pill) */}
        <button
          onClick={() => setActiveNav('Inventory')}
          aria-label={tl('granary')}
          title={tl('granary')}
          className="md:order-2 w-full md:w-auto flex items-center justify-between md:justify-start gap-3 bg-wood-dark/90 px-3 py-1.5 border border-wood-border active:scale-[0.99]"
        >
          <span className="font-mono text-[11px] text-cream-surface/90 uppercase">
            {tl('granary')}
          </span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-xs text-cream-surface">🌾 {granarySorghum}</span>
            <span className="font-mono text-xs text-cream-surface">🌽 {granaryMaize}</span>
            <span className="font-mono text-xs text-cream-surface">🥚 {granaryEggs}</span>
          </span>
        </button>
      </div>

      {/* Farm world — the bounded, scrollable middle of the shell (D).
          On lg+ the plots keep the left column and the livestock/buildings
          slide into a rail beside them (E). */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto bg-black/25">
        {/* Weather FX: the sky state the sim rolled, visible over the scene */}
        {WEATHER_FX_SPRITE[weather] && (
          <img
            src={WEATHER_FX_SPRITE[weather]}
            alt=""
            aria-hidden
            className="absolute top-2 right-4 w-14 h-14 opacity-90 pointer-events-none animate-pulse"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="mx-auto w-full max-w-2xl lg:max-w-5xl px-4 py-5 lg:flex lg:items-start lg:gap-4">
          {/* Left column — the plots and the land ladder */}
          <div className="lg:flex-1 lg:min-w-0">
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
                        : plot.stalled
                          ? 'border-sky-blue'
                          : 'border-wood-border hover:border-primary/50'
                  } ${celebrate?.id === plot.id ? `animate-${celebrate.kind}` : ''}`}
                >
                  <CropSprite
                    cropType={plot.cropType}
                    stageProgress={plot.stageProgress}
                    emoji={plot.icon}
                    size={44}
                  />
                  <span className="font-headline text-[11px] sm:text-xs text-cream-surface font-bold leading-tight">
                    {plot.cropName}
                  </span>
                  {plot.canHarvest && (
                    <span className="font-mono text-[10px] text-gold-currency font-bold tracking-wider animate-bounce">
                      {tl('ready')}
                    </span>
                  )}
                  {plot.stalled && (
                    // Not a water level — a stall. The crop stopped because the
                    // tank is empty, and the only fix is the shared tank.
                    <span className="font-mono text-[10px] text-sky-blue font-bold">💧 DRY</span>
                  )}
                  {plot.state === 'TILLED' && (
                    <span className="font-mono text-[10px] text-secondary">{tl('emptySoil')}</span>
                  )}
                  {plot.state === 'GROWING' && (
                    <div className="w-full h-2 bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          plot.stalled ? 'bg-sky-blue/50' : 'bg-status-success'
                        }`}
                        style={{ width: `${plot.stageProgress}%` }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Land ladder (C15) — the next rung, quoted from the server row */}
            {nextLand && (
              <button
                onClick={buyPlot}
                disabled={nextLand.costPula > pula}
                aria-label={tl('buyPlot')}
                className="mt-3 w-full py-2.5 border border-dashed border-gold-currency/60 bg-gold-currency/10 text-gold-currency font-mono text-xs font-bold uppercase active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ＋ {tl('buyPlot')} → {nextLand.plots} · P{nextLand.costPula.toLocaleString()}
              </button>
            )}
          </div>

          {/* Right rail (E) — livestock + buildings sit beside the plots on lg+ */}
          <div className="mt-3 lg:mt-0 lg:w-80 lg:flex-none lg:sticky lg:top-0">
            {/* Kraal — livestock strip (03 §5). Simple loop: tap an animal, act. */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] text-cream-surface/90 uppercase">
                  {tl('livestock')}
                </span>
                {livestock.some((a) => a.productReady) && (
                  <span className="font-mono text-[10px] text-gold-currency">{tl('ready')}</span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {livestock.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => setSelectedAnimalId(animal.id)}
                    aria-label={
                      animal.name ?? tl(ANIMAL_NAME_KEY[animal.animalType] ?? 'animalChicken')
                    }
                    className={`relative flex-shrink-0 w-20 p-1.5 border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                      animal.productReady
                        ? 'bg-gold-currency/20 border-gold-currency animate-pulse'
                        : animal.isSick || animal.hunger < 0.3
                          ? 'bg-error-container/40 border-status-danger'
                          : 'bg-wood-dark/80 border-wood-border'
                    }`}
                  >
                    <AnimalSprite type={animal.animalType} mood={animalMood(animal)} size={40} />
                    <span className="font-mono text-[10px] text-cream-surface truncate w-full text-center">
                      {animal.name ?? tl(ANIMAL_NAME_KEY[animal.animalType] ?? 'animalChicken')}
                    </span>
                    {/* Hunger micro-bar — fullness, not emptiness */}
                    <div className="w-full h-1 bg-surface-container-lowest overflow-hidden">
                      <div
                        className={`h-full ${animal.hunger > 0.3 ? 'bg-status-success' : 'bg-status-danger'}`}
                        style={{ width: `${Math.round(animal.hunger * 100)}%` }}
                      />
                    </div>
                    {animal.productReady && (
                      <span className="absolute -top-1 -right-1 text-xs" aria-hidden>
                        {ANIMAL_PRODUCT[animal.animalType] ?? '🧺'}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={openBuySheet}
                  aria-label={tl('buyAnimal')}
                  className="flex-shrink-0 w-20 p-1.5 border border-dashed border-wood-border flex flex-col items-center justify-center gap-1 text-cream-surface/90 active:scale-95"
                >
                  <span className="text-lg">＋</span>
                  <span className="font-mono text-[10px]">{tl('buyAnimal')}</span>
                </button>
              </div>
              {livestock.length === 0 && (
                <p className="font-mono text-[10px] text-cream-surface/90 mt-1">
                  {tl('noLivestock')}
                </p>
              )}
            </div>

            {/* Buildings — construction timers, wear, maintenance (09 §8) */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] text-cream-surface/90 uppercase">
                  {tl('buildings')}
                </span>
                {buildings.some(
                  (b) => b.state === 'MAINTENANCE_NEEDED' || b.state === 'DISABLED',
                ) && (
                  <span className="font-mono text-[10px] text-status-warning">
                    {tl('stateMaintenance')}
                  </span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {buildings.map((b) => {
                  const stateText = buildingStateText(b);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBuildingId(b.id)}
                      aria-label={tl(BUILDING_NAME_KEY[b.buildingType] ?? 'buildingStorage')}
                      className={`relative flex-shrink-0 w-20 p-1.5 border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        b.state === 'CONSTRUCTION'
                          ? 'bg-surface-container-high/60 border-status-info'
                          : b.state === 'DISABLED'
                            ? 'bg-error-container/40 border-status-danger'
                            : b.state === 'MAINTENANCE_NEEDED'
                              ? 'bg-status-warning/10 border-status-warning'
                              : 'bg-wood-dark/80 border-wood-border'
                      }`}
                    >
                      <BuildingIcon type={b.buildingType} size={32} />
                      <span className="font-mono text-[10px] text-cream-surface truncate w-full text-center">
                        {tl(BUILDING_NAME_KEY[b.buildingType] ?? 'buildingStorage')}
                      </span>
                      {b.state === 'CONSTRUCTION' ? (
                        <span className="font-mono text-[10px] text-status-info">{stateText}</span>
                      ) : (
                        <div className="w-full h-1 bg-surface-container-lowest overflow-hidden">
                          <div
                            className={`h-full ${b.wear < 0.7 ? 'bg-status-success' : 'bg-status-warning'}`}
                            style={{ width: `${Math.round((1 - b.wear) * 100)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={openBuildSheet}
                  aria-label={tl('build')}
                  className="flex-shrink-0 w-20 p-1.5 border border-dashed border-wood-border flex flex-col items-center justify-center gap-1 text-cream-surface/90 active:scale-95"
                >
                  <span className="text-lg">＋</span>
                  <span className="font-mono text-[10px]">{tl('build')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docked action bar (A) — one strip at column width, replacing the three
          floating pills. The plot action panel and the seed picker take over
          this same slot instead of overlaying it (C). */}
      <div className="relative z-20 flex-none border-t border-wood-border bg-wood-dark/85 px-3 py-2">
        {selectedPlot && showCropPicker ? (
          <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
            <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="font-headline text-sm text-primary uppercase font-bold">
                  {tl('plantOn')} {selectedPlot.label}
                </span>
                <button
                  onClick={() => setShowCropPicker(false)}
                  aria-label="Close"
                  className="text-cream-surface/90 hover:text-cream-surface text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {availableSeeds.length === 0 ? (
                  // No seeds in inventory — route the player to the Market
                  // instead of listing seeds they don't own.
                  <button
                    onClick={() => {
                      setShowCropPicker(false);
                      setSelectedPlotId(null);
                      setActiveNav('Market');
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-surface-container-high hover:bg-wood-medium border border-wood-border transition-colors"
                  >
                    <div className="text-left">
                      <span className="font-headline text-xs text-cream-surface font-bold block">
                        {tl('noSeeds')}
                      </span>
                      <span className="font-mono text-[10px] text-cream-surface/90">
                        {tl('noSeedsDesc')}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-primary font-bold">
                      {tl('buySeeds')} →
                    </span>
                  </button>
                ) : (
                  availableSeeds.map((seed) => {
                    const unaffordable = seed.cost > pula;
                    return (
                      <button
                        key={seed.itemType}
                        disabled={unaffordable}
                        onClick={() => handlePlant(seed)}
                        className={`w-full flex items-center justify-between p-2.5 border transition-colors ${
                          unaffordable
                            ? 'bg-surface-container-high/50 border-wood-border opacity-50 cursor-not-allowed'
                            : 'bg-surface-container-high hover:bg-wood-medium border-wood-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PixelIcon itemType={seed.itemType} emoji={seed.icon} size={24} />
                          <div className="text-left">
                            <span className="font-headline text-xs text-cream-surface font-bold block">
                              {seed.name}
                            </span>
                            <span className="font-mono text-[10px] text-cream-surface/90">
                              {seed.trait} (x{seed.quantity}){' '}
                              {isSeedInSeason(seed.itemType.replace(/_seed$/, '') as CropId) ? (
                                <span className="text-status-success">{tl('seasonal')}</span>
                              ) : (
                                <span className="text-status-warning">{tl('offSeason')}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold ${
                            unaffordable ? 'text-status-danger' : 'text-gold-currency'
                          }`}
                        >
                          {seed.cost} P
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : selectedPlot ? (
          <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
            <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedPlot.icon}</span>
                  <div>
                    <span className="font-headline text-sm text-cream-surface font-bold">
                      {selectedPlot.cropName}
                    </span>
                    <span className="font-mono text-[11px] text-cream-surface/90 block">
                      {selectedPlot.label} • {selectedPlot.stage}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlotId(null)}
                  aria-label="Close"
                  className="text-cream-surface/90 hover:text-cream-surface text-xs"
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
                {selectedPlot.stalled && (
                  // Points at the real fix instead of offering a per-plot action
                  // that no longer exists on the server.
                  <button
                    onClick={() => {
                      triggerCelebrate(selectedPlot.id, 'water');
                      refillWell();
                      setSelectedPlotId(null);
                    }}
                    className="flex-1 py-2 bg-sky-deep text-cream-surface font-mono text-xs uppercase font-bold active:translate-y-0.5"
                  >
                    {tl('pumpWell')}
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
                  <div className="flex justify-between font-mono text-[11px] text-cream-surface/90 mb-1">
                    <span>
                      {tl('growth')}
                      {/* Tank-gated pace, not a promise (03 §1.2) — hence "~". */}
                      {(() => {
                        const eta = readyInText(selectedPlot, tl('readyIn'));
                        return eta ? ` • ${eta}` : '';
                      })()}
                    </span>
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
        ) : (
          <div className="mx-auto w-full max-w-2xl lg:max-w-5xl flex items-stretch gap-2">
            {/* Water gauge — tappable: refills the one shared tank (see refillWell) */}
            <button
              onClick={() => {
                triggerCelebrate(-1, 'water');
                // refillWell reports its own outcome (+N L for M Pula, or the
                // failure) — don't stack a second toast on top of it.
                refillWell();
              }}
              disabled={!hasTank || waterLevel >= maxWater}
              aria-label={tl('pumpWell')}
              title={
                hasTank ? (waterLevel >= maxWater ? tl('tankFull') : tl('pumpWell')) : tl('noTank')
              }
              className={`flex-1 min-w-0 flex items-center gap-2 bg-wood-dark border border-wood-border px-3 py-2 shadow-md active:scale-[0.99] disabled:cursor-not-allowed ${
                celebrate?.id === -1 && celebrate.kind === 'water' ? 'animate-water' : ''
              }`}
            >
              <span className="text-sm leading-none">💧</span>
              <div className="flex-1 h-2.5 bg-surface-container-lowest overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    hasTank ? 'bg-sky-blue' : 'bg-status-error/60'
                  }`}
                  style={{ width: `${hasTank ? waterPercent : 0}%` }}
                />
              </div>
              <span
                className={`font-mono text-xs font-bold ${
                  hasTank ? 'text-sky-blue' : 'text-status-error'
                }`}
              >
                {hasTank ? `${waterLevel}L` : tl('noTank')}
              </span>
            </button>

            {/* Harvest all — there is deliberately no "water all": the tank is
                shared, so the gauge above *is* the batch control. */}
            <button
              onClick={() => {
                triggerCelebrate(0, 'harvest');
                handleQuickHarvest();
              }}
              disabled={readyCount === 0}
              aria-label={tl('harvestAll')}
              title={tl('harvestAll')}
              className={`relative flex-none flex items-center gap-2 bg-primary-container text-on-primary-container border border-primary px-3 sm:px-4 py-2 font-mono text-xs uppercase font-bold shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
                celebrate?.id === 0 && celebrate.kind === 'harvest' ? 'animate-harvest' : ''
              }`}
            >
              <span className="text-base leading-none">🌾</span>
              <span className="whitespace-nowrap">{tl('harvestAll')}</span>
              {readyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-gold-currency text-wood-dark font-mono text-[10px] font-bold flex items-center justify-center">
                  {readyCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Animal action sheet — Feed / Pet / Collect */}
      {selectedAnimal && !showBuyAnimals && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 flex justify-center px-4 pb-2">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AnimalSprite
                  type={selectedAnimal.animalType}
                  mood={animalMood(selectedAnimal)}
                  size={40}
                />
                <div>
                  <span className="font-headline text-sm text-cream-surface font-bold block">
                    {selectedAnimal.name ??
                      tl(ANIMAL_NAME_KEY[selectedAnimal.animalType] ?? 'animalChicken')}
                  </span>
                  <span className="font-mono text-[10px] text-cream-surface/90">
                    {selectedAnimal.isSick
                      ? tl('sickBadge')
                      : selectedAnimal.productReady
                        ? tl('ready')
                        : tl(ANIMAL_NAME_KEY[selectedAnimal.animalType] ?? 'animalChicken')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimalId(null)}
                aria-label="Close"
                className="text-cream-surface/90 hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 mb-3">
              {[
                { label: tl('hunger'), value: selectedAnimal.hunger },
                { label: tl('health'), value: selectedAnimal.health },
                { label: tl('happiness'), value: selectedAnimal.happiness },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-cream-surface/90 w-16">
                    {bar.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-surface-container-lowest overflow-hidden">
                    <div
                      className={`h-full transition-all ${bar.value > 0.3 ? 'bg-status-success' : 'bg-status-danger'}`}
                      style={{ width: `${Math.round(bar.value * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-cream-surface/90 w-8 text-right">
                    {Math.round(bar.value * 100)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                disabled={!canFeed}
                onClick={() => feedAnimal(selectedAnimal.id)}
                title={selFeed ? `${selFeed.amount}× ${selFeed.slug} (${selFeedQty})` : undefined}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-[11px] font-bold uppercase active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {tl('feed')}
                {selFeed ? ` ${selFeed.amount}${selFeed.emoji}` : ''}
              </button>
              <button
                onClick={() => petAnimal(selectedAnimal.id)}
                className="flex-1 py-2 bg-secondary-container text-on-secondary-container font-mono text-[11px] font-bold uppercase active:translate-y-0.5"
              >
                {tl('pet')}
              </button>
              <button
                disabled={!selectedAnimal.productReady}
                onClick={() => collectAnimalProduct(selectedAnimal.id)}
                className="flex-1 py-2 bg-gold-currency/90 text-wood-dark font-mono text-[11px] font-bold uppercase active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {tl('collect')} {ANIMAL_PRODUCT[selectedAnimal.animalType] ?? '🧺'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy animal sheet — list is server-driven (config = authority) */}
      {showBuyAnimals && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 flex justify-center px-4 pb-2">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-sm text-cream-surface font-bold">
                {tl('buyAnimal')}
              </span>
              <button
                onClick={() => setShowBuyAnimals(false)}
                aria-label="Close"
                className="text-cream-surface/90 hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {availableAnimals.length === 0 && (
                <p className="font-mono text-[11px] text-cream-surface/90">{tl('loadingFarm')}</p>
              )}
              {availableAnimals.map((a) => {
                const unaffordable = a.purchaseCost > pula;
                return (
                  <button
                    key={a.id}
                    disabled={unaffordable}
                    onClick={() => {
                      purchaseAnimal(a.id);
                      setShowBuyAnimals(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 border transition-colors ${
                      unaffordable
                        ? 'bg-surface-container-high/50 border-wood-border opacity-50 cursor-not-allowed'
                        : 'bg-surface-container-high hover:bg-wood-medium border-wood-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AnimalSprite type={a.id} mood="idle" size={32} />
                      <div className="text-left">
                        <span className="font-headline text-xs text-cream-surface font-bold block">
                          {tl(ANIMAL_NAME_KEY[a.id] ?? 'animalChicken')}
                          {a.count > 0 ? ` (x${a.count})` : ''}
                        </span>
                        <span className="font-mono text-[10px] text-cream-surface/90">
                          {PRODUCT_EMOJI[a.productType] ?? '🧺'}×{a.productQuantity} /{' '}
                          {a.productionCycleHours}h •{' '}
                          {tl('needsBuilding').replace(
                            '{building}',
                            a.buildingRequired.replace(/_/g, ' '),
                          )}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${unaffordable ? 'text-status-danger' : 'text-gold-currency'}`}
                    >
                      {a.purchaseCost} P
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Building sheet — status, wear, repair */}
      {selectedBuilding && !showBuildSheet && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 flex justify-center px-4 pb-2">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BuildingIcon type={selectedBuilding.buildingType} size={36} />
                <div>
                  <span className="font-headline text-sm text-cream-surface font-bold block">
                    {tl(BUILDING_NAME_KEY[selectedBuilding.buildingType] ?? 'buildingStorage')}
                    {selectedBuilding.level > 1 ? ` Lv.${selectedBuilding.level}` : ''}
                  </span>
                  <span className="font-mono text-[10px] text-cream-surface/90">
                    {buildingStateText(selectedBuilding) ?? '✓'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBuildingId(null)}
                aria-label="Close"
                className="text-cream-surface/90 hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>

            {selectedBuilding.state !== 'CONSTRUCTION' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-cream-surface/90 w-16">
                  {tl('health')}
                </span>
                <div className="flex-1 h-1.5 bg-surface-container-lowest overflow-hidden">
                  <div
                    className={`h-full transition-all ${selectedBuilding.wear < 0.7 ? 'bg-status-success' : 'bg-status-warning'}`}
                    style={{ width: `${Math.round((1 - selectedBuilding.wear) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-cream-surface/90 w-8 text-right">
                  {Math.round((1 - selectedBuilding.wear) * 100)}%
                </span>
              </div>
            )}

            {(selectedBuilding.state === 'MAINTENANCE_NEEDED' ||
              selectedBuilding.state === 'DISABLED') &&
              selMaint && (
                <button
                  disabled={!canMaintain}
                  onClick={() => {
                    maintainBuilding(selectedBuilding.id);
                    setSelectedBuildingId(null);
                  }}
                  className="w-full py-2 bg-primary-container text-on-primary-container font-mono text-xs font-bold uppercase active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tl('repair')} — {selMaintPula}P
                  {selMat ? ` + ${selMat.qty}${MAT_EMOJI[selMat.slug] ?? ''}` : ''}
                </button>
              )}

            {selectedBuilding.state === 'ACTIVE' && selUpgrade && (
              <button
                disabled={!canUpgrade}
                onClick={() => {
                  upgradeBuilding(selectedBuilding.id);
                  setSelectedBuildingId(null);
                }}
                title={
                  selectedBuilding.nextUpgradeTime
                    ? formatAway(selectedBuilding.nextUpgradeTime)
                    : undefined
                }
                className="w-full mt-2 py-2 bg-secondary-container text-on-secondary-container font-mono text-xs font-bold uppercase active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {tl('upgrade')} — {selUpgrade.currency}P
                {selUpgradeMats.length > 0
                  ? selUpgradeMats.map((m) => ` + ${m.qty}${MAT_EMOJI[m.slug] ?? ''}`).join('')
                  : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Build sheet — server-driven list; cost in Pula + crafted materials */}
      {showBuildSheet && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-30 flex justify-center px-4 pb-2">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-sm text-cream-surface font-bold">
                {tl('build')}
              </span>
              <button
                onClick={() => setShowBuildSheet(false)}
                aria-label="Close"
                className="text-cream-surface/90 hover:text-cream-surface text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {availableBuildings.length === 0 && (
                <p className="font-mono text-[11px] text-cream-surface/90">{tl('loadingFarm')}</p>
              )}
              {availableBuildings.map((b) => {
                const matCost = (['poleto', 'thapo', 'setena'] as const)
                  .filter((m) => (b.cost[m] ?? 0) > 0)
                  .map((m) => ({ slug: m, qty: b.cost[m] ?? 0 }));
                const matsShort = matCost.some(
                  (m) => (inventory.find((i) => i.itemType === m.slug)?.quantity ?? 0) < m.qty,
                );
                const unavailable = b.owned || b.cost.currency > pula || matsShort;
                return (
                  <button
                    key={b.id}
                    disabled={unavailable}
                    onClick={() => {
                      constructBuilding(b.id);
                      setShowBuildSheet(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 border transition-colors ${
                      unavailable
                        ? 'bg-surface-container-high/50 border-wood-border opacity-50 cursor-not-allowed'
                        : 'bg-surface-container-high hover:bg-wood-medium border-wood-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BuildingIcon type={b.id} size={32} />
                      <div className="text-left">
                        <span className="font-headline text-xs text-cream-surface font-bold block">
                          {tl(BUILDING_NAME_KEY[b.id] ?? 'buildingStorage')}
                        </span>
                        <span className="font-mono text-[10px] text-cream-surface/90">
                          {formatAway(b.constructionTime)}
                          {matCost.length > 0 &&
                            ' • ' +
                              matCost
                                .map((m) => `${m.qty}${MAT_EMOJI[m.slug] ?? ''} ${m.slug}`)
                                .join(' ')}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        b.owned
                          ? 'text-status-success'
                          : unavailable
                            ? 'text-status-danger'
                            : 'text-gold-currency'
                      }`}
                    >
                      {b.owned ? `✓ ${tl('built')}` : `${b.cost.currency} P`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* First-visit coach mark (03 §14) — shown once, then stored */}
      {showCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-5 animate-slide-up">
            <h2 className="font-headline text-base text-primary uppercase font-bold text-center mb-3">
              {tl('coachTitle')}
            </h2>
            <ul className="space-y-2 mb-4 font-mono text-[11px] text-cream-surface">
              <li>🌾 {tl('coachPlant')}</li>
              <li>💧 {tl('coachWater')}</li>
              <li>🐔 {tl('coachKraal')}</li>
            </ul>
            <button
              onClick={dismissCoach}
              className="w-full py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
            >
              {tl('coachGo')}
            </button>
          </div>
        </div>
      )}

      {/* Welcome-back sheet (09 §9) — offline sim summary, once per session */}
      {welcomeBack && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-wood-dark/95 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)] p-5 animate-slide-up">
            <div className="flex flex-col items-center text-center mb-3">
              <img
                src="/assets/branding/welcome_sunrise.png"
                alt=""
                aria-hidden
                width={72}
                height={72}
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h2 className="font-headline text-lg text-primary uppercase font-bold mt-2">
                {tl('welcomeBack')}
              </h2>
              <p className="font-mono text-[11px] text-cream-surface/90">
                {tl('whileAway')} · {formatAway(welcomeBack.awayMinutes)}
              </p>
            </div>
            <div className="space-y-1.5 mb-4">
              {wbRows.map((row) => (
                <div
                  key={row.text}
                  className="flex items-center gap-2 bg-surface-container-high border border-wood-border px-2.5 py-1.5"
                >
                  <span className="text-sm">{row.emoji}</span>
                  <span className="font-mono text-xs text-cream-surface">{row.text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={dismissWelcomeBack}
              className="w-full py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
            >
              {tl('wbDismiss')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
