'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { resolveItemIcon, pixelItemIcon } from './pixelIcons';
import { notifyIfEnabled, registerServiceWorker } from './notifications';
import { recordAction } from './playerActions';

// ============================================================
// API helper
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('molemisi_token') || localStorage.getItem('token')
      : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `API error ${res.status}`;
    // Attach status + raw body so callers can branch on structured errors
    // (e.g. Bushveld's 409 { reason, etaSeconds }).
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    (err as any).status = res.status;
    (err as any).body = json;
    throw err;
  }
  // API wraps in { success, data } — unwrap
  return (json?.data ?? json) as T;
}

// ============================================================
// Types (unchanged — screens depend on these)
// ============================================================

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  icon?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}

/**
 * A plot as the Farm grid draws it.
 *
 * There is deliberately no `hydration` and no `canWater`. P4 retired per-plot
 * watering: water is one shared Jojo tank per farm (04 §1.2), so a plot cannot
 * be dry or watered on its own. Growth is hour-based — `stageProgress` is
 * `growthProgressHours / growthHours`, not a stage bucket.
 *
 * `stalled` is the honest replacement for the old water bar: the crop is
 * growing-but-frozen because the tank ran dry. The fix is the tank, not the plot.
 */
export interface Plot {
  id: number;
  label: string;
  state: 'READY' | 'GROWING' | 'THIRSTY' | 'TILLED' | 'RESTING';
  cropName: string;
  stage: string;
  stageProgress: number;
  stalled: boolean;
  icon: string;
  yieldInfo: string;
  canHarvest: boolean;
  canPlant: boolean;
  serverId?: string;
  cropType?: string;
  /** Total growing hours for the planted crop — the basis of the ready-in ETA. */
  growthHours?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'crops' | 'animal' | 'materials' | 'tools' | 'seed';
  icon: string;
  /** Pixel-art icon URL (PixelLab) — falls back to emoji `icon` when null. */
  image?: string | null;
  quantity: number;
  unitValue: number;
  grade: string;
  description: string;
  itemType?: string;
}

export interface LootItem {
  id: string;
  text: string;
  subtext: string;
  rewardPula?: number;
  icon: string;
  timestamp: string;
}

export interface MarketItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  /** Pixel-art icon URL (PixelLab) — falls back to emoji `icon` when null. */
  image?: string | null;
  /** itemType for pixel icon lookup (e.g. "sorghum_seed"). */
  itemType?: string;
  /**
   * What the player will actually be charged right now — the server's
   * `currentPrice`, never `basePrice`. The market moves (02 §4); quoting the
   * base price and charging the live one is how a market screen lies.
   */
  price: number;
  /** The un-moved reference price, shown struck-through when the live one differs. */
  basePrice?: number;
  trend?: 'up' | 'down' | 'stable';
  description: string;
  badge?: string;
}

/** Mirrors `MarketPrice` in apps/api/src/market/market.service.ts. */
export interface MarketPriceView {
  itemType: string;
  basePrice: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  supply: number;
  demand: number;
}

/** Mirrors `MarketEvent` in apps/api/src/market/market.service.ts. */
export interface MarketEventView {
  id: string;
  name: string;
  description: string;
  effect: string;
  multiplier: number;
  endsAt: string;
}

// ============================================================
// Crop / item icon mapping
// ============================================================

const CROP_ICONS: Record<string, string> = {
  sorghum: '🌾',
  maize: '🌽',
  millet: '🌾',
  cowpeas: '🫘',
  groundnuts: '🥜',
  sesame: '🫘',
  watermelon: '🍉',
  tomatoes: '🍅',
  pepper: '🌶️',
  herbs: '🌿',
  saffron: '🌸',
};

const CROP_NAMES: Record<string, string> = {
  sorghum: 'Sorghum',
  maize: 'Sweet Maize',
  millet: 'Millet',
  cowpeas: 'Cowpeas',
  groundnuts: 'Groundnuts',
  sesame: 'Sesame',
  watermelon: 'Melon (Lerotse)',
  tomatoes: 'Heritage Tomato',
  pepper: 'Pepper',
  herbs: 'Bushveld Herbs',
  saffron: 'Saffron',
};

const CATEGORY_MAP: Record<string, 'crops' | 'animal' | 'materials' | 'tools' | 'seed'> = {
  product: 'crops',
  seed: 'seed',
  animal: 'animal',
  material: 'materials',
  tool: 'tools',
};

function getCropIcon(type: string): string {
  return CROP_ICONS[type] || '🌱';
}

function getCropName(type: string): string {
  return CROP_NAMES[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * The plot shape the API actually returns — the canonical `PlotView` shared by
 * GET /farms/current and GET /farms/:farmId/plots (apps/api/src/crops/plot-view.ts).
 */
interface ServerPlot {
  id: string;
  slotIndex: number;
  state: string;
  crop: {
    id: string;
    type: string;
    displayName: string;
    growthStage: number;
    growthProgressHours: number;
    growthHours: number;
    plantedAt: string;
    expectedReadyAt: string | null;
    stalled: boolean;
  } | null;
}

// Map server plot to UI plot
function mapServerPlotToUI(slotIndex: number, serverPlot: ServerPlot): Plot {
  const stateMap: Record<string, Plot['state']> = {
    EMPTY: 'TILLED',
    PLANTED: 'GROWING',
    GROWING: 'GROWING',
    READY: 'READY',
    WITHERED: 'THIRSTY',
  };

  const crop = serverPlot.crop;
  const hasCrop = !!crop;

  // P4: growth is hour-based. Progress is real elapsed growing hours against
  // the crop's configured total — never a 0-4 stage bucket, which would jump
  // in four lumps and hide whether a crop is nearly ready.
  const stageProgress = hasCrop
    ? Math.min(
        100,
        Math.round(((crop!.growthProgressHours ?? 0) / (crop!.growthHours || 1)) * 100),
      )
    : 0;

  const isReady = serverPlot.state === 'READY';
  const uiState = hasCrop && crop!.stalled && !isReady ? 'THIRSTY' : stateMap[serverPlot.state] || 'TILLED';

  return {
    id: slotIndex + 1,
    label: `PLOT ${slotIndex + 1}`,
    state: uiState,
    // displayName comes from game-config server-side, so the label is always
    // the same words the rest of the game uses for this crop.
    cropName: hasCrop ? crop!.displayName : 'Empty Soil',
    stage: hasCrop ? (isReady ? 'READY' : `${stageProgress}%`) : 'TILLED',
    stageProgress,
    stalled: hasCrop ? crop!.stalled : false,
    icon: hasCrop ? getCropIcon(crop!.type) : '🌱',
    yieldInfo: hasCrop
      ? isReady
        ? 'Ready!'
        : crop!.stalled
          ? 'Tank is dry'
          : 'Growing'
      : 'Tap to Plant',
    canHarvest: isReady,
    canPlant: !hasCrop,
    serverId: serverPlot.id,
    cropType: crop?.type,
    growthHours: crop?.growthHours ?? 0,
  };
}

// ============================================================
// Server-only data.
//
// There is no demo farm any more. Every number the UI shows comes from the
// API, or the UI shows nothing — a plausible-looking fake plot grid is worse
// than an empty one, because the player acts on it and the server never heard
// (I7: the server is the only authority on state and balance).
// ============================================================
// Context
// ============================================================

/**
 * What the offline simulation did while the player was away (09 §9).
 * Surfaced by the Farm screen as the welcome-back sheet, once per session.
 */
export interface WelcomeBackSummary {
  awayMinutes: number;
  cropsReady: number;
  livestockProducts: number;
  buildingsCompleted: number;
  buildingsMaintenance: number;
  seasonChanged: boolean;
  newSeason: string | null;
  weather: string | null;
  /** Botho credited for whole missed days (03 §9.4 catch-up) — 0 when none. */
  bothoCatchUp: number;
}

/** A farm animal as returned by GET /farms/:id/livestock (03 §5). */
export interface FarmAnimal {
  id: string;
  animalType: string;
  name: string | null;
  /** 0–1 fullness; decays over time. Low hunger stalls production. */
  hunger: number;
  health: number;
  happiness: number;
  productReady: boolean;
  isSick: boolean;
}

/** One purchasable animal type from GET /farms/:id/livestock/available. */
export interface AvailableAnimal {
  id: string;
  name: string;
  description: string;
  purchaseCost: number;
  productType: string;
  productQuantity: number;
  productionCycleHours: number;
  buildingRequired: string;
  owned: boolean;
  count: number;
}

/** A placed building as returned by GET /farms/:id/buildings (09 §8). */
export interface FarmBuilding {
  id: string;
  buildingType: string;
  level: number;
  /** CONSTRUCTION | ACTIVE | MAINTENANCE_NEEDED | DISABLED */
  state: string;
  capacity: number;
  /** 0–1; 1.0 flips the building to MAINTENANCE_NEEDED. */
  wear: number;
  constructionEndsAt: string | null;
  /** Tiers this line has (only Storage and Workshop grow past 1). */
  maxTier: number;
  /** Cost of the NEXT tier from the server config, or null when maxed. */
  nextUpgradeCost: { currency: number; poleto?: number; thapo?: number; setena?: number } | null;
  /** Minutes the next tier takes, or null when maxed. */
  nextUpgradeTime: number | null;
}

/** One purchasable building from GET /farms/:id/buildings/available. */
export interface AvailableBuilding {
  id: string;
  name: string;
  description: string;
  cost: { currency: number; poleto?: number; thapo?: number; setena?: number };
  constructionTime: number;
  capacity: number;
  owned: boolean;
}

export interface GameState {
  pula: number;
  botho: number;
  /**
   * Re-fetch farm + wallet state from the server.
   *
   * Any screen that spends or receives value must call this rather than mutating
   * `pula` locally — the server is the only authority on a balance (I7).
   * `buyMarketItem` still decrements locally and drifts; new code must not
   * repeat that mistake.
   */
  refresh: () => Promise<void>;
  /** Litres currently in the shared Jojo tank — a farm-wide resource, not per-plot. */
  waterLevel: number;
  maxWater: number;
  /** False when the farm has no tank yet; growth cannot advance until one is built. */
  hasTank: boolean;
  energy: number;
  maxEnergy: number;
  daylight: string;
  season: string;
  currentDay: number;
  /** Current farm weather (clear|cloudy|rain|storm|drought). Rain/storm refill the tank (03 §1.2). */
  weather: string;
  /** Non-null once per session when the offline simulation had something to report (09 §9). */
  welcomeBack: WelcomeBackSummary | null;
  dismissWelcomeBack: () => void;
  /** The next land-ladder rung (C15), or null when maxed. */
  nextLand: { plots: number; costPula: number } | null;
  /** Buy the next land-ladder rung (batched tier; the server grants the plots). */
  buyPlot: () => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  farmId: string | null;
  loading: boolean;
  granaryEggs: number;
  granarySorghum: number;
  granaryMaize: number;
  granaryCowpeas: number;

  plots: Plot[];
  harvestPlot: (plotId: number) => void;
  plantPlot: (plotId: number, seedName: string, cost: number, icon: string) => void;
  quickHarvestAll: () => void;
  /** Fill the Jojo tank. Costs Pula and tops up the whole farm at once. */
  refillWell: () => void;
  livestock: FarmAnimal[];
  feedAnimal: (animalId: string) => void;
  petAnimal: (animalId: string) => void;
  collectAnimalProduct: (animalId: string) => void;
  purchaseAnimal: (animalType: string) => void;
  buildings: FarmBuilding[];
  constructBuilding: (buildingType: string) => void;
  maintainBuilding: (buildingId: string) => void;
  upgradeBuilding: (buildingId: string) => void;

  inventory: InventoryItem[];
  selectedItem: InventoryItem | null;
  setSelectedItem: (item: InventoryItem | null) => void;
  sellInventoryItem: (item: InventoryItem, qty?: number) => void;

  forageBushveld: (
    type: string,
    energyCost: number,
    rewardText: string,
    description: string,
    icon: string,
    lootName?: string,
    lootQty?: number,
  ) => void;
  lootFeed: LootItem[];
  activeToolSlot: number;
  setActiveToolSlot: (slot: number) => void;

  activeNpc: string;
  setActiveNpc: (npc: string) => void;

  marketItems: MarketItem[];
  /** Live prices by itemType — the same numbers the server will charge. */
  marketPrices: Record<string, MarketPriceView>;
  /** Events currently moving those prices. Empty is a valid, quiet market. */
  marketEvents: MarketEventView[];
  buyMarketItem: (item: MarketItem, qty: number) => void;
  quickSellProduce: () => void;

  toast: ToastMessage | null;
  showToast: (title: string, message: string, icon?: string, type?: ToastMessage['type']) => void;
  clearToast: () => void;

  bgmVolume: number;
  setBgmVolume: (v: number) => void;
  sfxVolume: number;
  setSfxVolume: (v: number) => void;
  language: 'en' | 'tn';
  setLanguage: (lang: 'en' | 'tn') => void;
  pixelScale: boolean;
  setPixelScale: (p: boolean) => void;
}

const GameContext = createContext<GameState | null>(null);

// ============================================================
// Provider
// ============================================================

export function GameProvider({ children }: { children: ReactNode }) {
  // --- Profile state ---
  const [pula, setPula] = useState(0);
  const [botho, setBotho] = useState(0);
  const [energy, setEnergy] = useState(100);
  const maxEnergy = 100;
  const [farmId, setFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Farm state ---
  const [waterLevel, setWaterLevel] = useState(0);
  const [maxWater, setMaxWater] = useState(100);
  const [hasTank, setHasTank] = useState(false);
  const [season, setSeason] = useState('Spring');
  const [currentDay, setCurrentDay] = useState(1);
  const [weather, setWeather] = useState('clear');
  const [welcomeBack, setWelcomeBack] = useState<WelcomeBackSummary | null>(null);
  const [nextLand, setNextLand] = useState<{ plots: number; costPula: number } | null>(null);
  // Once-per-session latch: refreshFarmData runs on every poll/action, but the
  // welcome-back sheet must appear only on the first load that carries news.
  const welcomeBackShownRef = useRef(false);
  const [activeNav, setActiveNav] = useState('Farm');

  // --- Inventory state ---
  const [granaryEggs, setGranaryEggs] = useState(0);
  const [granarySorghum, setGranarySorghum] = useState(0);
  const [granaryMaize, setGranaryMaize] = useState(0);
  const [granaryCowpeas, setGranaryCowpeas] = useState(0);

  const [livestock, setLivestock] = useState<FarmAnimal[]>([]);
  const [buildings, setBuildings] = useState<FarmBuilding[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [lootFeed, setLootFeed] = useState<LootItem[]>([]);
  const [activeToolSlot, setActiveToolSlot] = useState(1);

  const [activeNpc, setActiveNpc] = useState('Elder Neo');
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPriceView>>({});
  const [marketEvents, setMarketEvents] = useState<MarketEventView[]>([]);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [bgmVolume, setBgmVolume] = useState(70);
  const [sfxVolume, setSfxVolume] = useState(85);
  const [language, setLanguage] = useState<'en' | 'tn'>('en');
  const [pixelScale, setPixelScale] = useState(true);

  // ============================================================
  // Toast helper
  // ============================================================

  const showToast = useCallback(
    (title: string, message: string, icon = '🌾', type: ToastMessage['type'] = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToast({ id, title, message, icon, type });
    },
    [],
  );

  const clearToast = useCallback(() => setToast(null), []);

  const dismissWelcomeBack = useCallback(() => setWelcomeBack(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // ============================================================
  // Load real data from API
  // ============================================================

  const refreshFarmData = useCallback(async () => {
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('molemisi_token') || localStorage.getItem('token')
          : null;
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch profile + wallet + farm + market in parallel.
      //
      // Pula and Botho come from GET /wallet (player_wallets — the source of
      // truth since P2), NOT from the profile's legacy `currency` column, which
      // is a D5 leftover that nothing writes any more.
      const [profile, wallet, farmData, pricesData, eventsData] = await Promise.allSettled([
        apiFetch<{
          id: string;
          displayName: string;
          farmName: string;
          currency: number;
          energy: number;
          maxEnergy: number;
        }>('GET', '/profile'),
        apiFetch<{ pula: number; botho: number }>('GET', '/wallet'),
        apiFetch<{
          farm: {
            id: string;
            name: string;
            plotCount: number;
            weather: string;
            weatherTemperature: number;
            season: string;
            currentDay: number;
          };
          plots: ServerPlot[];
          simulation?: WelcomeBackSummary | null;
          nextLand?: { plots: number; costPula: number } | null;
        }>('GET', '/farms/current'),
        apiFetch<MarketPriceView[]>('GET', '/market/prices').catch(() => null),
        apiFetch<MarketEventView[]>('GET', '/market/events').catch(() => []),
      ]);

      // Apply wallet (Pula + Botho). Falls back to nothing — a stale number is
      // worse than a missing one when the number is spendable.
      if (wallet.status === 'fulfilled') {
        setPula(wallet.value.pula ?? 0);
        setBotho(wallet.value.botho ?? 0);
      }

      // Apply profile
      if (profile.status === 'fulfilled') {
        const p = profile.value;
        setEnergy(p.energy);
      }

      // Apply farm + plots
      if (farmData.status === 'fulfilled') {
        const fd = farmData.value;
        setFarmId(fd.farm.id);
        setSeason(fd.farm.season || 'Spring');
        setCurrentDay(fd.farm.currentDay || 1);
        setWeather(fd.farm.weather || 'clear');
        // C15 — the next land rung, quoted from the server row, never recomputed.
        setNextLand(fd.nextLand ?? null);

        // Welcome-back sheet (09 §9): the server ran the offline simulation
        // and attached a summary — show it once per session, not per refresh.
        if (fd.simulation && !welcomeBackShownRef.current) {
          welcomeBackShownRef.current = true;
          setWelcomeBack(fd.simulation);
        }

        // Map plots
        const uiPlots = fd.plots.map((sp) => mapServerPlotToUI(sp.slotIndex, sp));
        setPlots(uiPlots);

        // The Jojo tank is farm-wide, so it needs the farm id — which is why
        // this is a second round rather than one of the parallel calls above.
        try {
          const tank = await apiFetch<{
            hasTank: boolean;
            waterLevel: number;
            capacity: number;
            state: string;
          }>('GET', `/farms/${fd.farm.id}/water`);
          setHasTank(tank.hasTank);
          setWaterLevel(tank.waterLevel);
          setMaxWater(tank.capacity);
        } catch {
          // No tank reachable (or none built) — leave the level at 0 rather
          // than inventing a full tank the player cannot actually draw from.
          setHasTank(false);
          setWaterLevel(0);
        }

        // Livestock — same second round as the tank: it needs the farm id.
        try {
          const animals = await apiFetch<FarmAnimal[]>('GET', `/farms/${fd.farm.id}/livestock`);
          setLivestock(Array.isArray(animals) ? animals : []);
        } catch {
          setLivestock([]);
        }

        // Buildings — same second round again (farm id).
        try {
          const list = await apiFetch<FarmBuilding[]>('GET', `/farms/${fd.farm.id}/buildings`);
          setBuildings(Array.isArray(list) ? list : []);
        } catch {
          setBuildings([]);
        }

        // Fetch inventory for THIS farm
        try {
          // The API returns { data: { items: InventoryItemView[] } } (unwrapped by
          // apiFetch). InventoryItemView uses `slug`/`category`, NOT the old
          // `itemType`/`itemCategory` keys — reading the wrong key silently
          // resolved to [] and the plant picker ran on phantom stock.
          const inv = await apiFetch<{
            items?: Array<{
              slug: string;
              name?: string;
              setswana?: string;
              category?: string;
              quantity: number;
              baseValue?: number;
              use?: string | null;
              sprite?: string | null;
              isTool?: boolean;
            }>;
            inventory?: unknown[];
          }>('GET', `/farms/${fd.farm.id}/inventory`);

          const rawItems: Array<{
            slug: string;
            name?: string;
            setswana?: string;
            category?: string;
            quantity: number;
            baseValue?: number;
            use?: string | null;
            sprite?: string | null;
            isTool?: boolean;
          }> = (inv.items ?? (inv as { inventory?: unknown[] }).inventory ?? []) as Array<{
            slug: string;
            name?: string;
            setswana?: string;
            category?: string;
            quantity: number;
            baseValue?: number;
            use?: string | null;
            sprite?: string | null;
            isTool?: boolean;
          }>;
          const mappedInventory = rawItems.map((item) => {
            const slug = item.slug;
            const isSeed = slug.endsWith('_seed');
            const cropType = slug.replace('_seed', '');
            return {
              id: slug,
              name: item.name || (isSeed ? `${getCropName(cropType)} Seeds` : getCropName(slug)),
              category: item.isTool
                ? 'tools'
                : (CATEGORY_MAP[item.category ?? ''] || (isSeed ? 'seed' : 'crops')),
              icon: isSeed ? '🌱' : getCropIcon(slug),
              image: item.sprite || resolveItemIcon(slug),
              quantity: item.quantity,
              unitValue: item.baseValue ?? 10,
              grade: 'Normal',
              description:
                item.use ||
                (isSeed
                  ? `Plant ${getCropName(cropType)} seeds.`
                  : `Harvested ${getCropName(slug)}.`),
              itemType: slug,
            };
          });

          // Show the REAL inventory. Only fall back to demo if the fetch itself
          // failed — an empty inventory (a player who owns nothing yet) must read
          // as empty so the plant picker cannot offer seeds they do not have.
          setInventory(mappedInventory);

          // Update granary counts
          let eggs = 0;
          let sorg = 0;
          let maiz = 0;
          let cowp = 0;
          mappedInventory.forEach((item) => {
            const t = item.itemType || '';
            if (t === 'egg') eggs += item.quantity;
            else if (t === 'sorghum') sorg += item.quantity;
            else if (t === 'maize') maiz += item.quantity;
            else if (t === 'cowpeas') cowp += item.quantity;
          });
          setGranaryEggs(eggs);
          setGranarySorghum(sorg);
          setGranaryMaize(maiz);
          setGranaryCowpeas(cowp);
        } catch {
          // Fetch failed — show an empty granary rather than demo stock the
          // player does not own. Never invent inventory.
          setInventory([]);
        }
      }

      // Apply market prices. `currentPrice` is what the server charges and what
      // it pays — using `basePrice` here quoted a number the market never honoured.
      if (pricesData.status === 'fulfilled' && Array.isArray(pricesData.value)) {
        const prices = pricesData.value;

        // The price lookup every money question should use, keyed by raw itemType
        // (includes both `sorghum` crop rows and `sorghum_seed` seed rows).
        const byType: Record<string, MarketPriceView> = {};
        for (const p of prices) byType[p.itemType] = p;
        setMarketPrices(byType);

        // Only seed rows are buyable here. `market_prices` ALSO holds the grown
        // crop rows (e.g. `sorghum`); mapping those would mint a bogus
        // `sorghum_seed` entry and duplicate the real `sorghum_seed` one — two
        // "Sorghum Seeds" cards at different prices.
        const seedPrices = prices.filter((p) => p.itemType.endsWith('_seed'));
        const items = seedPrices.map((p) => {
          const cropType = p.itemType.replace(/_seed$/, '');
          return {
            id: `seed-${p.itemType}`,
            name: `${getCropName(cropType)} Seeds`,
            category: 'Seed',
            icon: getCropIcon(cropType),
            image: pixelItemIcon(p.itemType) || pixelItemIcon(cropType),
            itemType: p.itemType,
            price: p.currentPrice ?? p.basePrice,
            basePrice: p.basePrice,
            trend: p.trend,
            description: `Buy ${getCropName(cropType)} seeds to plant.`,
            badge: p.trend === 'up' ? 'Rising' : p.trend === 'down' ? 'Cheap' : undefined,
          };
        });
        if (items.length > 0) setMarketItems(items);
      }

      // What is moving the market right now. Worth showing: a x1.4 event is the
      // difference between a good sale and a bad one, and it is invisible otherwise.
      if (eventsData.status === 'fulfilled' && Array.isArray(eventsData.value)) {
        setMarketEvents(eventsData.value);
      }
    } catch (err) {
      // Nothing was loaded, so the farm, granary and shop are all empty. That is
      // a real state, not just a console line — surface it so the player knows
      // their actions aren't being saved, instead of acting on stale numbers.
      console.warn('[Game] API unavailable — showing an empty farm', err);
      setPlots([]);
      setInventory([]);
      setLivestock([]);
      setBuildings([]);
      setMarketItems([]);
      showToast(
        'Offline',
        'Could not reach the server. Your farm is read-only until the connection returns.',
        '⚠️',
        'warning',
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load on mount
  useEffect(() => {
    // Best-effort: the SW is the receiver for future server push (03 §12).
    void registerServiceWorker();
    refreshFarmData();
  }, [refreshFarmData]);

  // ============================================================
  // In-app notifications (03 §12) — the two moments that matter between
  // refreshes: a crop becoming ready, an animal going hungry/sick. Baseline is
  // the first observed state, so a returning player is not spammed by history.
  // ============================================================

  const notifSigRef = useRef<{ crops: string; animals: string }>({
    crops: '__init__',
    animals: '__init__',
  });
  useEffect(() => {
    const cropSig = plots
      .map((p) => (p.canHarvest ? String(p.id) : ''))
      .filter(Boolean)
      .join(',');
    const animalSig = livestock
      .map((a) => (a.hunger < 0.3 || a.isSick ? a.id : ''))
      .filter(Boolean)
      .join(',');
    const prev = notifSigRef.current;

    // First observation is the baseline — never notify about history.
    if (prev.crops !== cropSig) {
      if (prev.crops !== '__init__') {
        const newlyReady = plots.filter(
          (p) => p.canHarvest && !prev.crops.split(',').includes(String(p.id)),
        ).length;
        if (newlyReady > 0) {
          notifyIfEnabled('cropsReady', 'Molemisi', `${newlyReady} crop(s) ready to harvest 🌾`);
        }
      }
      notifSigRef.current.crops = cropSig || '__seen__';
    }
    if (prev.animals !== animalSig) {
      if (prev.animals !== '__init__') {
        const newlyHungry = livestock.filter(
          (a) => (a.hunger < 0.3 || a.isSick) && !prev.animals.split(',').includes(a.id),
        ).length;
        if (newlyHungry > 0) {
          notifyIfEnabled('animalsHungry', 'Molemisi', `${newlyHungry} animal(s) need attention 🐔`);
        }
      }
      notifSigRef.current.animals = animalSig || '__seen__';
    }
  }, [plots, livestock]);

  // ============================================================
  // Plot actions (real API)
  // ============================================================

  const harvestPlot = useCallback(
    async (plotId: number) => {
      const plot = plots.find((p) => p.id === plotId);
      if (!plot || !plot.canHarvest || !farmId) return;

      if (!plot.serverId) {
        showToast('Plot Error', 'Cannot harvest — plot not synced.', '⚠️', 'error');
        return;
      }

      try {
        const result = await apiFetch<{
          harvest: { yield: number; quality: string };
          inventoryAddition: { quantity: number };
        }>('POST', `/farms/${farmId}/plots/${plot.serverId}/harvest`, {});
        recordAction('harvest');
        // No XP — D5 retired it. The reward is the crop itself; Pula comes from
        // selling it at market, which is the loop the economy is built on.
        showToast(
          'Harvest Complete',
          `${result.inventoryAddition?.quantity ?? result.harvest?.yield ?? 1}x ${plot.cropName} (${result.harvest?.quality ?? 'Normal'}) to your store.`,
          '🌾',
          'success',
        );
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Harvest failed';
        showToast('Harvest Failed', msg, '⚠️', 'error');
      }
    },
    [plots, farmId, showToast, refreshFarmData],
  );

  // NOTE: there is deliberately no `waterPlot`. Per-plot watering was retired in
  // P4 — the endpoint these calls used (`POST /farms/:id/plots/:plotId/water`)
  // no longer exists on the server. Water is the shared Jojo tank: see
  // `refillWell` below.

  // Map common seed names to cropType
  const NAME_TO_CROPTYPE: Record<string, string> = {
    sorghum: 'sorghum',
    maize: 'maize',
    'sweet maize': 'maize',
    'white maize': 'maize',
    cowpea: 'cowpeas',
    cowpeas: 'cowpeas',
    groundnut: 'groundnuts',
    groundnuts: 'groundnuts',
    tomato: 'tomatoes',
    tomatoes: 'tomatoes',
    'heritage tomato': 'tomatoes',
    beans: 'herbs',
    ditloo: 'herbs',
    'ditloo beans': 'herbs',
    herbs: 'herbs',
    sesame: 'sesame',
    watermelon: 'watermelon',
    pepper: 'pepper',
    saffron: 'saffron',
    millet: 'millet',
  };

  const plantPlot = useCallback(
    async (plotId: number, seedName: string, _cost: number, _icon: string) => {
      const plot = plots.find((p) => p.id === plotId);
      if (!plot || !plot.canPlant || !farmId) return;

      if (!plot.serverId) {
        showToast('Plot Error', 'Cannot plant — plot not synced.', '⚠️', 'error');
        return;
      }

      // Find matching seed in inventory by name
      const normalizedName = seedName.toLowerCase().replace(/ seeds?$/i, '');
      const cropType = NAME_TO_CROPTYPE[normalizedName] || normalizedName;
      const seedEntry = inventory.find((i) => i.itemType === `${cropType}_seed` && i.quantity > 0);
      if (!seedEntry) {
        showToast('No Seeds', `No ${cropType} seeds in inventory.`, '🌱', 'warning');
        return;
      }

      try {
        await apiFetch('POST', `/farms/${farmId}/plots/${plot.serverId}/plant`, {
          cropType,
          seedId: seedEntry.id,
        });
        recordAction('plant');
        showToast('Planted!', `Planted ${getCropName(cropType)}.`, '🌱', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Plant failed';
        showToast('Plant Failed', msg, '⚠️', 'error');
      }
    },
    [plots, farmId, inventory, showToast, refreshFarmData],
  );

  // NOTE: `quickWaterAll` is gone for the same reason as `waterPlot` — there is
  // no per-plot action to batch any more. Refilling the tank is the one call.

  const quickHarvestAll = useCallback(async () => {
    if (!farmId) return;
    let harvested = 0;
    for (const plot of plots) {
      if (plot.canHarvest && plot.serverId) {
        try {
          await apiFetch('POST', `/farms/${farmId}/plots/${plot.serverId}/harvest`, {});
          harvested++;
        } catch {
          /* skip */
        }
      }
    }
    if (harvested > 0) {
      recordAction('harvest');
      showToast('Harvest Complete', `Harvested ${harvested} plots!`, '🌾', 'success');
      await refreshFarmData();
    } else {
      showToast('Nothing Ready', 'No crops ready to harvest.', '🌾', 'info');
    }
  }, [farmId, plots, showToast, refreshFarmData]);

  /**
   * Fill the Jojo tank — the farm's single shared water store (04 §1.2).
   *
   * This used to be a local `setWaterLevel(+15)` that lied: it invented litres
   * the server never had, so the UI showed water that growth would not honour.
   */
  const refillWell = useCallback(async () => {
    if (!farmId) return;
    try {
      const result = await apiFetch<{ added: number; cost: number; waterLevel: number }>(
        'POST',
        `/farms/${farmId}/water/refill`,
        {},
      );
      recordAction('water');
      setWaterLevel(result.waterLevel);
      setHasTank(true);
      showToast(
        'Tank Filled',
        `+${result.added}L for ${result.cost} Pula.`,
        '💧',
        'success',
      );
      await refreshFarmData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refill failed';
      showToast('Refill Failed', msg, '⚠️', 'error');
    }
  }, [farmId, showToast, refreshFarmData]);

  // ============================================================
  // Livestock (03 §5) — the real server loop. The old collectEggs mock
  // (setGranaryEggs(+2), no server call) is gone: eggs enter the granary
  // only via collectAnimalProduct → inventory.
  // ============================================================

  const refreshLivestock = useCallback(async () => {
    if (!farmId) return;
    try {
      const animals = await apiFetch<FarmAnimal[]>('GET', `/farms/${farmId}/livestock`);
      setLivestock(Array.isArray(animals) ? animals : []);
    } catch {
      // Quiet: the kraal keeps showing the last known state.
    }
  }, [farmId]);

  const feedAnimal = useCallback(
    async (animalId: string) => {
      if (!farmId) return;
      try {
        const result = await apiFetch<{ hunger: number; feedUsed: number; feedItemType: string }>(
          'POST',
          `/farms/${farmId}/livestock/${animalId}/feed`,
          {},
        );
        showToast('Fed', `Ate ${result.feedUsed}× ${result.feedItemType}.`, '🍽️', 'success');
        // Feed comes out of the granary — re-read inventory + purse too.
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not feed.';
        showToast('Feeding Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  const petAnimal = useCallback(
    async (animalId: string) => {
      if (!farmId) return;
      try {
        await apiFetch('POST', `/farms/${farmId}/livestock/${animalId}/pet`, {});
        showToast('Pet', '+Happiness', '💛', 'success');
        await refreshLivestock();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not pet.';
        showToast('Pet Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshLivestock],
  );

  const collectAnimalProduct = useCallback(
    async (animalId: string) => {
      if (!farmId) return;
      try {
        const result = await apiFetch<{ productType: string; quantity: number }>(
          'POST',
          `/farms/${farmId}/livestock/${animalId}/collect`,
          {},
        );
        showToast('Collected', `+${result.quantity}× ${result.productType}`, '🧺', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Nothing to collect.';
        showToast('Collect Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  const purchaseAnimal = useCallback(
    async (animalType: string) => {
      if (!farmId) return;
      try {
        await apiFetch('POST', `/farms/${farmId}/livestock/purchase`, { animalType });
        showToast('New Arrival', `The ${animalType} joined your kraal!`, '🐾', 'success');
        await refreshFarmData();
      } catch (err) {
        // The server explains: missing building, full pen, or short on Pula.
        const msg = err instanceof Error ? err.message : 'Could not buy.';
        showToast('Purchase Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  // ============================================================
  // Buildings (09 §8) — construct + maintain. The server owns cost,
  // construction timers and the wear → MAINTENANCE_NEEDED → DISABLED arc.
  // ============================================================

  const constructBuilding = useCallback(
    async (buildingType: string) => {
      if (!farmId) return;
      try {
        await apiFetch('POST', `/farms/${farmId}/buildings/construct`, { buildingType });
        showToast('Construction Started', `Your ${buildingType.replace(/_/g, ' ')} is going up.`, '🏗️', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not build.';
        showToast('Build Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  const maintainBuilding = useCallback(
    async (buildingId: string) => {
      if (!farmId) return;
      try {
        const result = await apiFetch<{
          pulaSpent: number;
          materialsConsumed: Array<{ slug: string; qty: number }>;
        }>('POST', `/farms/${farmId}/buildings/${buildingId}/maintain`, {});
        const mats = result.materialsConsumed?.map((m) => `${m.qty}× ${m.slug}`).join(' + ');
        showToast(
          'Repaired',
          `Spent ${result.pulaSpent} Pula${mats ? ` + ${mats}` : ''}.`,
          '🔧',
          'success',
        );
        await refreshFarmData();
      } catch (err) {
        // Server says what's missing: Pula, or the crafted material (03 §3.5).
        const msg = err instanceof Error ? err.message : 'Could not repair.';
        showToast('Repair Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  /**
   * Promote a building one tier (C22 — the Workshop's 2nd/3rd crafting slot,
   * Storage's Basket → Shed → Storehouse). Cost comes from the server
   * (`nextUpgradeCost` on the building row), so the client never quotes a
   * number the server won't charge.
   */
  const upgradeBuilding = useCallback(
    async (buildingId: string) => {
      if (!farmId) return;
      try {
        const result = await apiFetch<{ newLevel: number }>(
          'POST',
          `/farms/${farmId}/buildings/${buildingId}/upgrade`,
          {},
        );
        showToast('Upgrade Started', `Now building tier ${result.newLevel}.`, '🏗️', 'success');
        await refreshFarmData();
      } catch (err) {
        // Server explains: maxed, not ACTIVE, or short on Pula/material.
        const msg = err instanceof Error ? err.message : 'Could not upgrade.';
        showToast('Upgrade Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  /**
   * C15 — buy the next land-ladder rung as a batch (4→8 →12 →20). The server
   * resolves the rung and grants the plots; the client passes no number at all.
   */
  const buyPlot = useCallback(async () => {
    if (!farmId) return;
    try {
      const result = await apiFetch<{ plotCount: number; tierCost: number }>(
        'POST',
        '/farms/current/plots/purchase',
        {},
      );
      showToast(
        'Land Expanded',
        `The farm now holds ${result.plotCount} plots — ${result.tierCost} Pula.`,
        '🏡',
        'success',
      );
      await refreshFarmData();
    } catch (err) {
      // Server explains: maxed out, or short on Pula.
      const msg = err instanceof Error ? err.message : 'Could not buy the plots.';
      showToast('Land Failed', msg, '⚠️', 'error');
    }
  }, [farmId, showToast, refreshFarmData]);

  // ============================================================
  // Market actions (real API)
  // ============================================================

  const sellInventoryItem = useCallback(
    async (item: InventoryItem, qty?: number) => {
      if (!farmId) return;
      const sellQty = qty ?? item.quantity;
      if (sellQty <= 0 || item.quantity < sellQty) return;

      try {
        const result = await apiFetch<{
          transaction: { netProceeds: number };
        }>('POST', '/market/sell', {
          farmId,
          itemType: item.itemType || item.name.toLowerCase().replace(/\s+/g, '_'),
          quantity: sellQty,
          quality: item.grade || 'normal',
        });
        recordAction('sell');
        const earnings = result.transaction?.netProceeds ?? sellQty * item.unitValue;
        showToast('Sold!', `Sold ${sellQty}x ${item.name} for +${earnings} Pula after 5% Co-op tax.`, '💰', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sell failed';
        showToast('Sell Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  const buyMarketItem = useCallback(
    async (item: MarketItem, qty: number) => {
      if (!farmId) return;
      const total = item.price * qty;

      try {
        // `item.itemType` is the canonical server key (e.g. "sorghum_seed"). The old
        // derivation `item.id.replace('seed-','') + '_seed'` double-appended "_seed"
        // (item.id is already "seed-sorghum_seed") → "sorghum_seed_seed" → no price
        // row → 400 "Item not available for purchase". Use the canonical type directly.
        const itemType = item.itemType ?? item.id;
        await apiFetch('POST', '/market/buy', {
          farmId,
          itemType,
          quantity: qty,
        });
        recordAction('buy');
        showToast('Bought!', `Bought ${qty}x ${item.name}. -${total} Pula.`, '🛍️', 'success');
        await refreshFarmData();
      } catch (err) {
        // No client-side fallback. If the server rejected or failed the purchase
        // we must NOT mint inventory or deduct Pula locally — that would let the
        // UI report a buy that never happened, and in a real-money game a fake
        // purchase is a data-integrity and trust hazard. Surface the failure only.
        const msg = err instanceof Error ? err.message : 'Purchase failed';
        showToast('Purchase Failed', msg || `Could not buy ${qty}x ${item.name}.`, '⚠️', 'error');
      }
    },
    [farmId, pula, showToast, refreshFarmData],
  );

  const quickSellProduce = useCallback(async () => {
    if (!farmId) return;
    let sold = 0;
    let count = 0;
    for (const item of inventory) {
      if (
        (item.category === 'crops' || item.category === 'animal') &&
        item.quantity > 0 &&
        !item.itemType?.includes('_seed')
      ) {
        try {
          const result = await apiFetch<{
            transaction: { netProceeds: number };
          }>('POST', '/market/sell', {
            farmId,
            itemType: item.itemType || item.name.toLowerCase().replace(/\s+/g, '_'),
            quantity: item.quantity,
            quality: item.grade || 'normal',
          });
          sold += result.transaction?.netProceeds ?? item.quantity * item.unitValue;
          count += item.quantity;
        } catch {
          /* skip */
        }
      }
    }
    if (count > 0) {
      recordAction('sell');
      showToast('Quick Sell', `Sold ${count} items for +${sold} Pula (incl. 5% Co-op tax).`, '💰', 'success');
      await refreshFarmData();
    } else {
      showToast('Nothing to Sell', 'No crops in inventory.', '📦', 'info');
    }
  }, [farmId, inventory, showToast, refreshFarmData]);

  // ============================================================
  // Bushveld (still client-side — no real API yet)
  // ============================================================

  const forageBushveld = useCallback(
    (
      _type: string,
      energyCost: number,
      rewardText: string,
      description: string,
      icon: string,
      lootName?: string,
      lootQty = 1,
    ) => {
      if (energy < energyCost && energyCost > 0) {
        showToast('Exhausted!', 'Rest under the Baobab Grove.', '⚡', 'warning');
        return;
      }
      setEnergy((prev) => Math.min(maxEnergy, Math.max(0, prev - energyCost)));
      recordAction('forage');
      const newLoot: LootItem = {
        id: Math.random().toString(36).substring(2, 9),
        text: rewardText,
        subtext: description,
        icon,
        timestamp: 'Just Now',
      };
      setLootFeed((prev) => [newLoot, ...prev.slice(0, 4)]);
      if (lootName) {
        setInventory((prev) => {
          const existing = prev.find((i) => i.name.toLowerCase().includes(lootName.toLowerCase()));
          if (existing) {
            return prev.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + lootQty } : i,
            );
          }
          return [
            ...prev,
            {
              id: `loot-${Date.now()}`,
              name: lootName,
              category: 'materials' as const,
              icon: '🌿',
              quantity: lootQty,
              unitValue: 10,
              grade: 'Foraged',
              description,
            },
          ];
        });
      }
      showToast(rewardText, description, '✨', 'success');
    },
    [energy, maxEnergy, showToast],
  );

  // ============================================================
  // Render
  // ============================================================

  const daylight = `Day ${currentDay}`;
  const seasonDisplay = season.charAt(0).toUpperCase() + season.slice(1);

  return (
    <GameContext.Provider
      value={{
        pula,
        botho,
        waterLevel,
        maxWater,
        hasTank,
        energy,
        maxEnergy,
        daylight,
        season: seasonDisplay,
        currentDay,
        weather,
        welcomeBack,
        dismissWelcomeBack,
        activeNav,
        setActiveNav,
        farmId,
        loading,
        refresh: refreshFarmData,

        granaryEggs,
        granarySorghum,
        granaryMaize,
        granaryCowpeas,

        plots,
        harvestPlot,
        plantPlot,
        quickHarvestAll,
        refillWell,
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

        inventory,
        selectedItem,
        setSelectedItem,
        sellInventoryItem,

        forageBushveld,
        lootFeed,
        activeToolSlot,
        setActiveToolSlot,

        activeNpc,
        setActiveNpc,

        marketItems,
        buyMarketItem,
        quickSellProduce,
        marketPrices,
        marketEvents,

        toast,
        showToast,
        clearToast,

        bgmVolume,
        setBgmVolume,
        sfxVolume,
        setSfxVolume,
        language,
        setLanguage,
        pixelScale,
        setPixelScale,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
