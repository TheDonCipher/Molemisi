'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';

// ============================================================
// API helper
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function apiFetch<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
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
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
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

export interface Plot {
  id: number;
  label: string;
  state: 'READY' | 'GROWING' | 'THIRSTY' | 'TILLED' | 'RESTING';
  cropName: string;
  stage: string;
  stageProgress: number;
  hydration: number;
  icon: string;
  yieldInfo: string;
  canHarvest: boolean;
  canWater: boolean;
  canPlant: boolean;
  serverId?: string;
  cropType?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'crops' | 'animal' | 'materials' | 'tools' | 'seed';
  icon: string;
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
  costPula: number;
  costWood: number;
  costStone: number;
  requiredLevel: number;
  status: 'ready' | 'locked' | 'built';
  benefitText: string;
}

export interface LootItem {
  id: string;
  text: string;
  subtext: string;
  rewardPula?: number;
  rewardXp?: number;
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
  xpReward: number;
  claimed: boolean;
}

export interface MarketItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  price: number;
  description: string;
  badge?: string;
}

export interface DeliveryContract {
  id: string;
  number: string;
  title: string;
  source: string;
  description: string;
  expiresIn: string;
  current: number;
  target: number;
  unit: string;
  pulaReward: number;
  xpReward: number;
  claimed: boolean;
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

// Map server plot to UI plot
function mapServerPlotToUI(
  slotIndex: number,
  serverPlot: {
    id: string;
    state: string;
    crop?: { type: string; growthStage: number; hydration: number };
  },
): Plot {
  const stateMap: Record<string, Plot['state']> = {
    EMPTY: 'TILLED',
    PLANTED: 'GROWING',
    GROWING: 'GROWING',
    READY: 'READY',
    WITHERED: 'THIRSTY',
  };

  const uiState = stateMap[serverPlot.state] || 'TILLED';
  const crop = serverPlot.crop;
  const hasCrop = !!crop;
  const hydration = crop ? Math.round(crop.hydration * 100) : 40;
  const stage = crop ? crop.growthStage : 0;
  const maxStages = 4;
  const stageProgress = crop ? Math.round((stage / maxStages) * 100) : 0;

  return {
    id: slotIndex + 1,
    label: `PLOT ${slotIndex + 1}`,
    state: uiState,
    cropName: hasCrop ? getCropName(crop!.type) : 'Empty Soil',
    stage: hasCrop
      ? serverPlot.state === 'READY'
        ? 'READY'
        : `STAGE ${stage + 1}/${maxStages}`
      : 'TILLED',
    stageProgress,
    hydration,
    icon: hasCrop ? getCropIcon(crop!.type) : '🌱',
    yieldInfo: hasCrop
      ? serverPlot.state === 'READY'
        ? 'Ready!'
        : stage === 0
          ? 'Germinating'
          : 'Growing'
      : 'Tap to Plant',
    canHarvest: serverPlot.state === 'READY',
    canWater:
      hasCrop &&
      (serverPlot.state === 'PLANTED' || serverPlot.state === 'GROWING') &&
      hydration < 100,
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
  state: i === 0 ? 'READY' : i < 4 ? 'GROWING' : 'TILLED',
  cropName: i === 0 ? 'Sorghum' : i === 1 ? 'Sweet Maize' : i === 2 ? 'Cowpeas' : 'Empty Soil',
  stage: i === 0 ? 'READY' : i < 4 ? `STAGE ${i}/4` : 'TILLED',
  stageProgress: i === 0 ? 100 : i < 4 ? i * 25 : 0,
  hydration: 40 + i * 5,
  icon: i === 0 ? '🌾' : i === 1 ? '🌽' : i === 2 ? '🫘' : '🌱',
  yieldInfo: i === 0 ? 'Ready!' : i < 4 ? 'Growing' : 'Tap to Plant',
  canHarvest: i === 0,
  canWater: i > 0 && i < 4,
  canPlant: i >= 4,
}));

const DEMO_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Sorghum Seeds',
    category: 'seed',
    icon: '🌾',
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
    quantity: 8,
    unitValue: 10,
    grade: 'Normal',
    description: 'Harvested sorghum grain.',
  },
  {
    id: 'inv-4',
    name: 'Acacia Wood',
    category: 'materials',
    icon: '🪵',
    quantity: 20,
    unitValue: 4,
    grade: 'Seasoned',
    description: 'Hardwood timber.',
  },
];

const DEMO_MARKET_ITEMS: MarketItem[] = [
  {
    id: 'seed-sorghum',
    name: 'Sorghum Seeds',
    category: 'Cereal Crop',
    icon: '🌾',
    price: 15,
    description: 'Staple drought-resistant grain.',
    badge: 'Popular',
  },
  {
    id: 'seed-maize',
    name: 'White Maize Seeds',
    category: 'Staple Grain',
    icon: '🌽',
    price: 12,
    description: 'High yield sweet corn.',
  },
  {
    id: 'seed-cowpea',
    name: 'Cowpea Seeds',
    category: 'Legume',
    icon: '🫘',
    price: 18,
    description: 'Nitrogen-fixing pulse.',
  },
  {
    id: 'seed-groundnut',
    name: 'Groundnut Seeds',
    category: 'Cash Crop',
    icon: '🥜',
    price: 20,
    description: 'Valuable root crop.',
  },
  {
    id: 'seed-tomato',
    name: 'Heritage Tomato',
    category: 'Specialty',
    icon: '🍅',
    price: 25,
    description: 'Heirloom variety.',
  },
];

const DEMO_CONTRACTS: DeliveryContract[] = [
  {
    id: 'c1',
    number: '#804',
    title: 'Brewery Supply',
    source: 'Village Brewery',
    description: 'Deliver sorghum for harvest celebration.',
    expiresIn: '2 Days',
    current: 18,
    target: 40,
    unit: 'Bags',
    pulaReward: 650,
    xpReward: 120,
    claimed: false,
  },
  {
    id: 'c2',
    number: '#809',
    title: 'Safari Camp Kitchen',
    source: 'Delta Camp',
    description: 'Weekly fresh produce order.',
    expiresIn: '4 Days',
    current: 25,
    target: 25,
    unit: 'Crates',
    pulaReward: 480,
    xpReward: 90,
    claimed: false,
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
    xpReward: 60,
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
    xpReward: 80,
    claimed: false,
  },
];

const DEMO_BLUEPRINTS: Blueprint[] = [
  {
    id: 'coop',
    title: 'Chicken Coop (Lv.1)',
    subtitle: 'Houses up to 6 hens',
    icon: '🏠',
    costPula: 200,
    costWood: 20,
    costStone: 10,
    requiredLevel: 5,
    status: 'ready',
    benefitText: 'Enables daily egg collection',
  },
  {
    id: 'goat-kraal',
    title: 'Goat Kraal',
    subtitle: 'Shelter for milch goats',
    icon: '🐐',
    costPula: 450,
    costWood: 40,
    costStone: 25,
    requiredLevel: 6,
    status: 'locked',
    benefitText: 'Unlocks goat dairy',
  },
  {
    id: 'borehole',
    title: 'Deep Borehole Well',
    subtitle: 'Expands water to 300L',
    icon: '💧',
    costPula: 350,
    costWood: 0,
    costStone: 15,
    requiredLevel: 5,
    status: 'ready',
    benefitText: '+150L water reserve',
  },
];

// ============================================================
// Context
// ============================================================

export interface GameState {
  pula: number;
  farmLevel: number;
  farmXp: number;
  maxXp: number;
  waterLevel: number;
  maxWater: number;
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
  waterPlot: (plotId: number) => void;
  plantPlot: (plotId: number, seedName: string, cost: number, icon: string) => void;
  quickWaterAll: () => void;
  quickHarvestAll: () => void;
  refillWell: () => void;
  collectEggs: () => void;

  inventory: InventoryItem[];
  selectedItem: InventoryItem | null;
  setSelectedItem: (item: InventoryItem | null) => void;
  sellInventoryItem: (item: InventoryItem, qty?: number) => void;
  millFlour: (item: InventoryItem) => void;
  donateKgotla: (item: InventoryItem) => void;
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
  buyMarketItem: (item: MarketItem, qty: number) => void;
  contracts: DeliveryContract[];
  claimContract: (contractId: string) => void;
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
  const [farmLevel, setFarmLevel] = useState(1);
  const [farmXp, setFarmXp] = useState(0);
  const maxXp = 3000;
  const [energy, setEnergy] = useState(100);
  const maxEnergy = 100;
  const [farmId, setFarmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Farm state ---
  const [waterLevel, setWaterLevel] = useState(85);
  const [maxWater, setMaxWater] = useState(100);
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
  const [contracts, setContracts] = useState<DeliveryContract[]>(DEMO_CONTRACTS);

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
  // XP helper
  // ============================================================

  const addXp = useCallback(
    (amount: number) => {
      setFarmXp((prev) => {
        const next = prev + amount;
        if (next >= maxXp) {
          setFarmLevel((lvl) => lvl + 1);
          return next - maxXp;
        }
        return next;
      });
    },
    [maxXp],
  );

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

      // Fetch profile + farm + inventory + market in parallel
      const [profile, farmData, pricesData] = await Promise.allSettled([
        apiFetch<{
          id: string;
          displayName: string;
          farmName: string;
          farmLevel: number;
          farmXp: number;
          currency: number;
          energy: number;
          maxEnergy: number;
        }>('GET', '/profile'),
        apiFetch<{
          farm: {
            id: string;
            name: string;
            level: number;
            plotCount: number;
            weather: string;
            weatherTemperature: number;
            season: string;
            currentDay: number;
          };
          plots: Array<{
            id: string;
            slotIndex: number;
            state: string;
            crop?: { type: string; growthStage: number; hydration: number };
          }>;
        }>('GET', '/farms/current'),
        apiFetch<
          Array<{
            itemType: string;
            name: string;
            category: string;
            basePrice: number;
          }>
        >('GET', '/market/prices').catch(() => null),
      ]);

      // Apply profile
      if (profile.status === 'fulfilled') {
        const p = profile.value;
        setPula(p.currency);
        setFarmLevel(p.farmLevel);
        setFarmXp(p.farmXp);
        setEnergy(p.energy);
        setMaxWater(100);
      }

      // Apply farm + plots
      if (farmData.status === 'fulfilled') {
        const fd = farmData.value;
        setFarmId(fd.farm.id);
        setSeason(fd.farm.season || 'Spring');
        setCurrentDay(fd.farm.currentDay || 1);
        setWaterLevel(85);

        // Map plots
        const uiPlots = fd.plots.map((sp) => mapServerPlotToUI(sp.slotIndex, sp));
        setPlots(uiPlots);

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

      // Apply market prices
      if (pricesData.status === 'fulfilled' && Array.isArray(pricesData.value)) {
        const items = pricesData.value.map((p) => ({
          id: `seed-${p.itemType}`,
          name: `${getCropName(p.itemType)} Seeds`,
          category: p.category || 'Crop',
          icon: getCropIcon(p.itemType),
          price: p.basePrice || 15,
          description: `Buy ${getCropName(p.itemType)} seeds to plant.`,
          badge: undefined,
        }));
        if (items.length > 0) setMarketItems(items);
      }
    } catch (err) {
      console.warn('[Game] API unavailable, using demo data', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
        await apiFetch('POST', `/farms/${farmId}/plots/${plot.serverId}/harvest`, {});
        addXp(10);
        showToast('Harvest Complete', `${plot.cropName} harvested! +10 XP`, '🌾', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Harvest failed';
        showToast('Harvest Failed', msg, '⚠️', 'error');
      }
    },
    [plots, farmId, addXp, showToast, refreshFarmData],
  );

  const waterPlot = useCallback(
    async (plotId: number) => {
      const plot = plots.find((p) => p.id === plotId);
      if (!plot || !plot.canWater || !farmId) return;

      if (!plot.serverId) {
        showToast('Plot Error', 'Cannot water — plot not synced.', '⚠️', 'error');
        return;
      }

      try {
        await apiFetch('POST', `/farms/${farmId}/plots/${plot.serverId}/water`, {});
        addXp(2);
        showToast('Watered!', `${plot.cropName} watered. +2 XP`, '💧', 'info');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Water failed';
        showToast('Water Failed', msg, '⚠️', 'error');
      }
    },
    [plots, farmId, addXp, showToast, refreshFarmData],
  );

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
        addXp(5);
        showToast('Planted!', `Planted ${getCropName(cropType)}. +5 XP`, '🌱', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Plant failed';
        showToast('Plant Failed', msg, '⚠️', 'error');
      }
    },
    [plots, farmId, inventory, addXp, showToast, refreshFarmData],
  );

  const quickWaterAll = useCallback(async () => {
    if (!farmId) return;
    let watered = 0;
    for (const plot of plots) {
      if (plot.canWater && plot.serverId) {
        try {
          await apiFetch('POST', `/farms/${farmId}/plots/${plot.serverId}/water`, {});
          watered++;
        } catch {
          /* skip */
        }
      }
    }
    if (watered > 0) {
      addXp(2 * watered);
      showToast('Fields Watered', `Watered ${watered} plots.`, '💧', 'info');
      await refreshFarmData();
    } else {
      showToast('No Plots', 'No plots need water.', '💧', 'info');
    }
  }, [farmId, plots, addXp, showToast, refreshFarmData]);

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
      addXp(10 * harvested);
      showToast('Harvest Complete', `Harvested ${harvested} plots!`, '🌾', 'success');
      await refreshFarmData();
    } else {
      showToast('Nothing Ready', 'No crops ready to harvest.', '🌾', 'info');
    }
  }, [farmId, plots, addXp, showToast, refreshFarmData]);

  const refillWell = useCallback(() => {
    setWaterLevel((prev) => Math.min(maxWater, prev + 15));
    showToast('Well Pumped', 'Extracted 15L from bedrock aquifer.', '💧', 'info');
  }, [maxWater, showToast]);

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
        await apiFetch('POST', '/market/sell', {
          farmId,
          itemType: item.itemType || item.name.toLowerCase().replace(/\s+/g, '_'),
          quantity: sellQty,
          quality: item.grade || 'normal',
        });
        const earnings = sellQty * item.unitValue;
        showToast('Sold!', `Sold ${sellQty}x ${item.name} for +${earnings} Pula.`, '💰', 'success');
        await refreshFarmData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sell failed';
        showToast('Sell Failed', msg, '⚠️', 'error');
      }
    },
    [farmId, showToast, refreshFarmData],
  );

  const millFlour = useCallback(
    (item: InventoryItem) => {
      if (item.quantity < 2) {
        showToast('Not Enough', 'Need at least 2 units to mill.', '🌾', 'warning');
        return;
      }
      setInventory((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 2 } : i)),
      );
      addXp(15);
      showToast('Milling Done', `Milled 2x ${item.name}. +15 XP`, '⚙️', 'success');
    },
    [addXp, showToast],
  );

  const donateKgotla = useCallback(
    (item: InventoryItem) => {
      if (item.quantity < 1) return;
      setInventory((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)),
      );
      setReputation((prev) => Math.min(maxReputation, prev + 25));
      showToast('Donated!', `Donated 1x ${item.name}. +25 Rep`, '🏛️', 'success');
    },
    [maxReputation, showToast],
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
      addXp(50);
      setBlueprints((prev) =>
        prev.map((b) => (b.id === blueprintId ? { ...b, status: 'built' as const } : b)),
      );
      showToast('Built!', `Completed ${bp.title}! +50 XP`, '🔨', 'success');
    },
    [blueprints, pula, wood, stone, addXp, showToast],
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
        showToast('Bought!', `Bought ${qty}x ${item.name}. -${total} Pula.`, '🛍️', 'success');
        await refreshFarmData();
      } catch {
        // Fallback to client-side
        if (pula < total) {
          showToast('Insufficient Pula', `Need ${total} Pula.`, '💰', 'warning');
          return;
        }
        setPula((prev) => prev - total);
        setInventory((prev) => {
          const existing = prev.find((i) =>
            i.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0] ?? ''),
          );
          if (existing) {
            return prev.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i,
            );
          }
          return [
            ...prev,
            {
              id: `inv-${Date.now()}`,
              name: item.name,
              category: 'seed' as const,
              icon: item.icon,
              quantity: qty,
              unitValue: Math.round(item.price * 0.8),
              grade: 'Normal',
              description: item.description,
              itemType: item.id.replace('seed-', '') + '_seed',
            },
          ];
        });
        showToast('Purchased', `Bought ${qty}x ${item.name}.`, '🛍️', 'success');
      }
    },
    [farmId, pula, showToast, refreshFarmData],
  );

  const claimContract = useCallback(
    (contractId: string) => {
      const c = contracts.find((x) => x.id === contractId);
      if (!c || c.claimed) return;
      setPula((prev) => prev + c.pulaReward);
      addXp(c.xpReward);
      setContracts((prev) => prev.map((x) => (x.id === contractId ? { ...x, claimed: true } : x)));
      showToast('Contract Complete', `+${c.pulaReward} Pula +${c.xpReward} XP`, '📜', 'success');
    },
    [contracts, addXp, showToast],
  );

  const quickSellProduce = useCallback(async () => {
    if (!farmId) return;
    let sold = 0;
    for (const item of inventory) {
      if (
        (item.category === 'crops' || item.category === 'animal') &&
        item.quantity > 0 &&
        !item.itemType?.includes('_seed')
      ) {
        try {
          await apiFetch('POST', '/market/sell', {
            farmId,
            itemType: item.itemType || item.name.toLowerCase().replace(/\s+/g, '_'),
            quantity: item.quantity,
            quality: item.grade || 'normal',
          });
          sold += item.quantity * item.unitValue;
        } catch {
          /* skip */
        }
      }
    }
    if (sold > 0) {
      showToast('Quick Sell', `Sold all crops for +${sold} Pula.`, '💰', 'success');
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
      const newLoot: LootItem = {
        id: Math.random().toString(36).substring(2, 9),
        text: rewardText,
        subtext: description,
        icon,
        timestamp: 'Just Now',
        rewardXp: 5,
      };
      setLootFeed((prev) => [newLoot, ...prev.slice(0, 4)]);
      addXp(5);
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
    [energy, maxEnergy, addXp, showToast],
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
      addXp(q.xpReward);
      setQuests((prev) => prev.map((x) => (x.id === questId ? { ...x, claimed: true } : x)));
      showToast('Quest Done', `+${q.pulaReward} Pula +${q.repReward} Rep`, '🏛️', 'success');
    },
    [quests, maxReputation, addXp, showToast],
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
        farmLevel,
        farmXp,
        maxXp,
        waterLevel,
        maxWater,
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

        wood,
        stone,
        granaryEggs,
        granarySorghum,
        granaryMaize,
        granaryCowpeas,

        plots,
        harvestPlot,
        waterPlot,
        plantPlot,
        quickWaterAll,
        quickHarvestAll,
        refillWell,
        collectEggs,

        inventory,
        selectedItem,
        setSelectedItem,
        sellInventoryItem,
        millFlour,
        donateKgotla,
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
        contracts,
        claimContract,
        quickSellProduce,

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
