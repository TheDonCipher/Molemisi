'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { resolveItemIcon, pixelItemIcon } from './pixelIcons';
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

export interface Blueprint {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  /** Pixel-art icon URL (PixelLab) — falls back to emoji `icon` when null. */
  image?: string | null;
  costPula: number;
  costWood: number;
  costStone: number;
  status: 'ready' | 'locked' | 'built';
  benefitText: string;
}

export interface LootItem {
  id: string;
  text: string;
  subtext: string;
  rewardPula?: number;
  icon: string;
  timestamp: string;
}

export interface Quest {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  unit: string;
  rewardText: string;
  pulaReward: number;
  repReward: number;
  claimed: boolean;
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
  };
}

// ============================================================
// Demo mock data (used when no token / API unavailable)
// ============================================================

const DEMO_PLOTS: Plot[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  label: `PLOT ${i + 1}`,
  state: i === 0 ? 'READY' : i === 3 ? 'THIRSTY' : i < 4 ? 'GROWING' : 'TILLED',
  cropName: i === 0 ? 'Sorghum' : i === 1 ? 'Sweet Maize' : i === 2 ? 'Cowpeas' : 'Empty Soil',
  stage: i === 0 ? 'READY' : i < 4 ? `${i * 25}%` : 'TILLED',
  stageProgress: i === 0 ? 100 : i < 4 ? i * 25 : 0,
  stalled: i === 3, // one stalled plot so the dry-tank state is visible offline
  icon: i === 0 ? '🌾' : i === 1 ? '🌽' : i === 2 ? '🫘' : '🌱',
  yieldInfo:
    i === 0 ? 'Ready!' : i === 3 ? 'Tank is dry' : i < 4 ? 'Growing' : 'Tap to Plant',
  canHarvest: i === 0,
  canPlant: i >= 4,
}));

const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Sorghum Seeds',
    category: 'seed',
    icon: '🌾',
    image: resolveItemIcon('sorghum_seed'),
    quantity: 10,
    unitValue: 10,
    grade: 'Normal',
    description: 'Staple grain seeds.',
    itemType: 'sorghum_seed',
  },
  {
    id: 'inv-2',
    name: 'Maize Seeds',
    category: 'seed',
    icon: '🌽',
    image: resolveItemIcon('maize_seed'),
    quantity: 5,
    unitValue: 8,
    grade: 'Normal',
    description: 'Sweet corn seeds.',
    itemType: 'maize_seed',
  },
  {
    id: 'inv-3',
    name: 'Sorghum',
    category: 'crops',
    icon: '🌾',
    image: resolveItemIcon('sorghum'),
    quantity: 8,
    unitValue: 10,
    grade: 'Normal',
    description: 'Harvested sorghum grain.',
    itemType: 'sorghum',
  },
  {
    id: 'inv-4',
    name: 'Acacia Wood',
    category: 'materials',
    icon: '🪵',
    image: resolveItemIcon('acacia_wood'),
    quantity: 20,
    unitValue: 4,
    grade: 'Seasoned',
    description: 'Hardwood timber.',
    itemType: 'acacia_wood',
  },
];

const DEMO_MARKET_ITEMS: MarketItem[] = [
  {
    id: 'seed-sorghum',
    name: 'Sorghum Seeds',
    category: 'Cereal Crop',
    icon: '🌾',
    image: pixelItemIcon('sorghum_seed'),
    itemType: 'sorghum_seed',
    price: 15,
    description: 'Staple drought-resistant grain.',
    badge: 'Popular',
  },
  {
    id: 'seed-maize',
    name: 'White Maize Seeds',
    category: 'Staple Grain',
    icon: '🌽',
    image: pixelItemIcon('maize_seed'),
    itemType: 'maize_seed',
    price: 12,
    description: 'High yield sweet corn.',
  },
  {
    id: 'seed-cowpea',
    name: 'Cowpea Seeds',
    category: 'Legume',
    icon: '🫘',
    image: pixelItemIcon('cowpeas_seed'),
    itemType: 'cowpeas_seed',
    price: 18,
    description: 'Nitrogen-fixing pulse.',
  },
  {
    id: 'seed-groundnut',
    name: 'Groundnut Seeds',
    category: 'Cash Crop',
    icon: '🥜',
    image: pixelItemIcon('groundnuts_seed'),
    itemType: 'groundnuts_seed',
    price: 20,
    description: 'Valuable root crop.',
  },
  {
    id: 'seed-tomato',
    name: 'Heritage Tomato',
    category: 'Specialty',
    icon: '🍅',
    image: pixelItemIcon('tomatoes_seed'),
    itemType: 'tomatoes_seed',
    price: 25,
    description: 'Heirloom variety.',
  },
];

const DEMO_QUESTS: Quest[] = [
  {
    id: 'q1',
    title: 'Grain for the Granary',
    category: 'Priority',
    description: 'Deliver 20 Sorghum bundles.',
    icon: '🌾',
    current: 14,
    target: 20,
    unit: 'Sorghum',
    rewardText: '+100 Pula',
    pulaReward: 100,
    repReward: 50,
    claimed: false,
  },
  {
    id: 'q2',
    title: 'Shelter the Flock',
    category: 'Building',
    description: 'Construct a chicken coop.',
    icon: '🏠',
    current: 1,
    target: 3,
    unit: 'Timber',
    rewardText: '+200 Pula',
    pulaReward: 200,
    repReward: 40,
    claimed: false,
  },
];

const DEMO_BLUEPRINTS: Blueprint[] = [
  {
    id: 'coop',
    title: 'Chicken Coop',
    subtitle: 'Houses up to 6 hens',
    icon: '🏠',
    image: pixelItemIcon('coop'),
    costPula: 200,
    costWood: 20,
    costStone: 10,
    status: 'ready',
    benefitText: 'Enables daily egg collection',
  },
  {
    id: 'goat-kraal',
    title: 'Goat Kraal',
    subtitle: 'Shelter for milch goats',
    icon: '🐐',
    image: pixelItemIcon('goat_pen'),
    costPula: 450,
    costWood: 40,
    costStone: 25,
    status: 'ready',
    benefitText: 'Unlocks goat dairy',
  },
  {
    id: 'borehole',
    title: 'Deep Borehole Well',
    subtitle: 'Expands water to 300L',
    icon: '💧',
    image: pixelItemIcon('borehole'),
    costPula: 350,
    costWood: 0,
    costStone: 15,
    status: 'ready',
    benefitText: '+150L water reserve',
  },
];

// ============================================================
// Context
// ============================================================

export interface GameState {
  pula: number;
  botho: number;
  /**
   * Re-fetch farm + wallet state from the server.
   *
   * Any screen that spends or receives value must call this rather than mutating
   * `pula` locally — the server is the only authority on a balance (I7). Several
   * older actions (`constructBlueprint`, `buyMarketItem`) still decrement locally
   * and drift; new code must not repeat that mistake.
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
  soilFertility: number;
  reputation: number;
  maxReputation: number;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  farmId: string | null;
  loading: boolean;

  wood: number;
  stone: number;
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
  collectEggs: () => void;

  inventory: InventoryItem[];
  selectedItem: InventoryItem | null;
  setSelectedItem: (item: InventoryItem | null) => void;
  sellInventoryItem: (item: InventoryItem, qty?: number) => void;
  blueprints: Blueprint[];
  constructBlueprint: (blueprintId: string) => void;

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
  quests: Quest[];
  acceptQuest: (questId: string) => void;
  claimQuest: (questId: string) => void;

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
  const [soilFertility] = useState(92);
  const [reputation, setReputation] = useState(0);
  const maxReputation = 1000;
  const [activeNav, setActiveNav] = useState('Farm');

  // --- Inventory state ---
  const [wood, setWood] = useState(0);
  const [stone, setStone] = useState(0);
  const [granaryEggs, setGranaryEggs] = useState(0);
  const [granarySorghum, setGranarySorghum] = useState(0);
  const [granaryMaize, setGranaryMaize] = useState(0);
  const [granaryCowpeas, setGranaryCowpeas] = useState(0);

  const [plots, setPlots] = useState<Plot[]>(DEMO_PLOTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(DEMO_INVENTORY);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>(DEMO_BLUEPRINTS);
  const [lootFeed, setLootFeed] = useState<LootItem[]>([]);
  const [activeToolSlot, setActiveToolSlot] = useState(1);

  const [activeNpc, setActiveNpc] = useState('Elder Neo');
  const [quests, setQuests] = useState<Quest[]>(DEMO_QUESTS);
  const [marketItems, setMarketItems] = useState<MarketItem[]>(DEMO_MARKET_ITEMS);
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

        // Fetch inventory for THIS farm
        try {
          const inv = await apiFetch<{
            inventory: Array<{
              id: string;
              itemType: string;
              itemCategory: string;
              quantity: number;
              quality: string;
            }>;
          }>('GET', `/farms/${fd.farm.id}/inventory`);

          const mappedInventory = (inv.inventory || []).map((item) => {
            const isSeed = item.itemType.endsWith('_seed');
            const cropType = item.itemType.replace('_seed', '');
            return {
              id: item.id,
              name: isSeed ? `${getCropName(cropType)} Seeds` : getCropName(item.itemType),
              category: CATEGORY_MAP[item.itemCategory] || 'crops',
              icon: isSeed ? '🌱' : getCropIcon(item.itemType),
              image: resolveItemIcon(item.itemType),
              quantity: item.quantity,
              unitValue: 10,
              grade: item.quality || 'Normal',
              description: isSeed
                ? `Plant ${getCropName(cropType)} seeds.`
                : `Harvested ${getCropName(item.itemType)}.`,
              itemType: item.itemType,
            };
          });

          setInventory(mappedInventory.length > 0 ? mappedInventory : DEMO_INVENTORY);

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
          // Use demo inventory
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
      // The player is now sitting on the DEMO_* sample farm with no live data.
      // That is a real state, not just a console line — surface it so they know
      // their actions aren't being saved and we never silently lie about success.
      console.warn('[Game] API unavailable, using demo data', err);
      showToast(
        'Offline — Demo Mode',
        'Could not reach the server. Showing sample data — your actions are not being saved.',
        '⚠️',
        'warning',
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load on mount
  useEffect(() => {
    refreshFarmData();
  }, [refreshFarmData]);

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

  const collectEggs = useCallback(() => {
    setGranaryEggs((prev) => prev + 2);
    showToast('Eggs Gathered', 'Gathered 2 fresh eggs.', '🥚', 'success');
  }, [showToast]);

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

  const constructBlueprint = useCallback(
    (blueprintId: string) => {
      const bp = blueprints.find((b) => b.id === blueprintId);
      if (!bp) return;
      if (pula < bp.costPula || wood < bp.costWood || stone < bp.costStone) {
        showToast('Missing Materials', 'Need more Pula, Wood, or Stone.', '🔨', 'error');
        return;
      }
      setPula((prev) => prev - bp.costPula);
      setWood((prev) => prev - bp.costWood);
      setStone((prev) => prev - bp.costStone);
      setBlueprints((prev) =>
        prev.map((b) => (b.id === blueprintId ? { ...b, status: 'built' as const } : b)),
      );
      recordAction('build');
      showToast('Built!', `Completed ${bp.title}!`, '🔨', 'success');
    },
    [blueprints, pula, wood, stone, showToast],
  );

  const buyMarketItem = useCallback(
    async (item: MarketItem, qty: number) => {
      if (!farmId) return;
      const total = item.price * qty;

      try {
        // Map seed name to itemType for API
        const itemType = item.id.replace('seed-', '') + '_seed';
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
  // Kgotla (client-side for now)
  // ============================================================

  const acceptQuest = useCallback(
    (questId: string) => {
      const q = quests.find((x) => x.id === questId);
      if (q) showToast('Accepted', `Contract: ${q.title}`, '📜', 'info');
    },
    [quests, showToast],
  );

  const claimQuest = useCallback(
    (questId: string) => {
      const q = quests.find((x) => x.id === questId);
      if (!q || q.claimed) return;
      setPula((prev) => prev + q.pulaReward);
      setReputation((prev) => Math.min(maxReputation, prev + q.repReward));
      setQuests((prev) => prev.map((x) => (x.id === questId ? { ...x, claimed: true } : x)));
      showToast('Quest Done', `+${q.pulaReward} Pula +${q.repReward} Rep`, '🏛️', 'success');
    },
    [quests, maxReputation, showToast],
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
        soilFertility,
        reputation,
        maxReputation,
        activeNav,
        setActiveNav,
        farmId,
        loading,
        refresh: refreshFarmData,

        wood,
        stone,
        granaryEggs,
        granarySorghum,
        granaryMaize,
        granaryCowpeas,

        plots,
        harvestPlot,
        plantPlot,
        quickHarvestAll,
        refillWell,
        collectEggs,

        inventory,
        selectedItem,
        setSelectedItem,
        sellInventoryItem,
        blueprints,
        constructBlueprint,

        forageBushveld,
        lootFeed,
        activeToolSlot,
        setActiveToolSlot,

        activeNpc,
        setActiveNpc,
        quests,
        acceptQuest,
        claimQuest,

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
