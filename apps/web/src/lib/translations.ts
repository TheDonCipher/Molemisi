// ============================================================
// Molemisi Translations — English & Setswana
// ============================================================

export type Locale = 'en' | 'tn';

export const translations = {
  // ---- Global ----
  loadingFarm: { en: 'Loading Farm...', tn: 'Go Ntsha Letlole...' },
  preparingWork: { en: "Preparing today's work...", tn: 'Go Malogi a Kileo...' },
  checkingCredentials: { en: 'Checking credentials...', tn: 'Go Kola Tsebišo...' },
  backToFarm: { en: '← Farm', tn: '← Tshimo' },
  leave: { en: 'Leave', tn: 'Tsamaya' },
  cancel: { en: 'Cancel', tn: 'Khansela' },
  confirm: { en: 'Confirm', tn: 'Netefatša' },
  close: { en: '✕', tn: '✕' },
  sold: { en: 'Sold!', tn: 'O rekisitse' },
  bought: { en: 'Bought!', tn: 'O rekile' },
  viewDetails: { en: 'Details', tn: 'Tsebotso' },
  deliverItemsHint: { en: 'deliver goods to claim', tn: 'isia dithoto go bolela' },
  back: { en: 'Back', tn: 'Morago' },

  // ---- Header ----
  farm: { en: 'Farm', tn: 'Tshimo' },
  kgotla: { en: 'Kgotla', tn: 'Kgotla' },
  wild: { en: 'Wild', tn: 'Naga' },
  market: { en: 'Market', tn: 'Dishopo' },
  store: { en: 'Store', tn: 'Lebentlele' },
  crafting: { en: 'Craft', tn: 'Botaki' },
  bag: { en: 'Bag', tn: 'Letlole' },
  config: { en: 'Config', tn: 'Peakanyo' },
  more: { en: 'More', tn: 'Tse dingwe' },
  wallet: { en: 'Wallet', tn: 'Spiša' },
  journal: { en: 'Journal', tn: 'Tlaleho' },
  logout: { en: 'Log Out', tn: 'Tsoa' },
  devTools: { en: 'Dev Tools', tn: 'Didirisiwa tsa Dev' },

  // ---- Wallet & Journal ----
  refresh: { en: '↻', tn: '↻' },
  subscription: { en: 'Subscription', tn: 'Tumellano' },
  history: { en: 'History', tn: 'Histori' },
  noHistory: { en: 'No transactions yet.', tn: 'Ha go na ditšhelete tse di dirilenggo.' },
  walletNote: { en: 'Madi and withdrawals arrive in v1.1. Pula and Botho are the v1 currencies.', tn: 'Madi le go tsoa go dirwa mo v1.1. Pula le Botho ke tšhelete ya v1.' },
  pages: { en: 'pages', tn: 'maqephe' },
  restored: { en: 'restored', tn: 'e boletsoe' },
  quests: { en: 'Quests', tn: 'Dithata' },
  noQuests: { en: 'No quests yet.', tn: 'Ha go na dithata gape.' },
  discoveries: { en: 'Discoveries', tn: 'Dintho tse di bonweng' },
  noDiscoveries: { en: 'Nothing foraged yet.', tn: 'Ha go na se o se fenyang gape.' },
  mogoloNote: { en: "Mogolo's Note", tn: 'Tlhaloso ya Mogolo' },
  journalEmpty: {
    en: 'Mogolo says the bush keeps its secrets until you walk it. Forage the Bushveld to begin your journal.',
    tn: 'Mogolo o re naga e boloka diphiri tsa yone go fitlha o tsamaya mo go yone. Fula Bushveld go simolola tlaleho ya gago.',
  },

  // ---- Field Journal proverb ----
  proverb: { en: 'Proverb', tn: 'Sekao' },
  basedOnRecent: { en: 'based on what you just did', tn: 'go ya ka se o sa tšwago go se dira' },
  proverbReview: { en: 'needs native-speaker Setswana review', tn: 'e tlhoka tlhahlobo ya Setswana' },

  // ---- Farm Screen ----
  emptySoil: { en: 'Empty Soil', tn: 'Mobu e Se Naga' },
  ready: { en: 'READY', tn: 'E MODUME' },
  tapToPlant: { en: 'Tap to Plant', tn: 'Tobetsa go Rolola' },
  plantOn: { en: 'Plant on', tn: 'Rolola mo' },
  plant: { en: '🌱 Plant', tn: '🌱 Rolola' },
  water: { en: '💧 Water', tn: '💧 Nosetsa' },
  harvest: { en: '🌾 Harvest', tn: '🌾 Kgetha' },
  waterAll: { en: 'Water All', tn: 'Nosetsa gotlhe' },
  harvestAll: { en: 'Harvest All', tn: 'Kgetla gotlhe' },
  pumpWell: { en: 'Pump Well', tn: 'Hudiya Lentswe' },
  granary: { en: 'Granary:', tn: 'Mogolo:' },
  growth: { en: 'Growth', tn: 'Ngwago' },
  wellPumped: { en: 'Well Pumped', tn: 'Lentswe le Hudiilwe' },
  noTank: { en: 'NO TANK', tn: 'GA GO NA THANKA' },
  wellPumpedDesc: {
    en: 'Extracted 15L from bedrock aquifer.',
    tn: 'Go ntšhitse 15L mo meyeng ya mobu.',
  },
  fieldsWatered: { en: 'Fields Watered', tn: 'Mabedi a Meyilwe' },
  allFieldsWatered: { en: 'All fields watered!', tn: 'Mabedi a moka a meyilwe!' },
  noPlotsNeedWater: { en: 'No plots need water.', tn: 'Ga go na mabedi a tla kantheyo.' },
  harvestComplete: { en: 'Harvest Complete', tn: 'Kotulo e Feditše' },
  allHarvested: { en: 'All ready crops harvested!', tn: 'Dirolwe tše di modumetše di kotulilwe!' },
  nothingReady: { en: 'Nothing Ready', tn: 'Ga go na Se di Modumetše' },
  noCropsReady: {
    en: 'No crops ready to harvest.',
    tn: 'Ga go na dirolwe tše di modumetše go kotula.',
  },
  planted: { en: 'Planted!', tn: 'E Rolloilwe!' },
  watered: { en: 'Watered!', tn: 'E Meyilwe!' },
  harvested: { en: 'Harvested!', tn: 'E Kotulilwe!' },
  noSeeds: { en: 'No Seeds', tn: 'Ga go na Merolwana' },
  noSeedsDesc: { en: 'No seeds in inventory.', tn: 'Ga go na merolwana mo sesupung.' },

  // ---- Market Screen ----
  villageMarket: { en: 'Village Market', tn: 'Ditshopa tsa Motse' },
  buySeeds: { en: '🛒 Buy Seeds', tn: '🛒 Reka Merolwana' },
  sellProduce: { en: '💰 Sell Produce', tn: '💰 Radisa Dirolwe' },
  noSeedsAvailable: { en: 'No seeds or tools available yet.', tn: 'Ga go na merolwana kgantele.' },
  nothingToSell: {
    en: 'Nothing to sell. Harvest some crops first!',
    tn: 'Ga go na go radisa. Kotula dirolwe pele!',
  },
  sellAll: { en: 'Sell All', tn: 'Radisa Ka Moka' },
  quickSellAll: { en: 'Quick Sell All', tn: 'Radisa Ka Moka Gantši' },
  sellAllProduce: { en: 'Sell All Produce', tn: 'Radisa Dirolwe Tsotšhe' },
  sellAllConfirm: {
    en: 'Sell all harvested crops and animal products?',
    tn: 'Radisa dirolwe tše di kotulilwe tša masepa le dipeo?',
  },
  buyConfirm: { en: 'Buy', tn: 'Reka' },
  sellConfirm: { en: 'Sell', tn: 'Radisa' },
  each: { en: 'each', tn: 'nngwe' },
  tapToSell: { en: 'tap to sell', tn: 'tobetsa go radisa' },
  // 07 §7.5 — the fee is shown before the button, never after (01 §4).
  priceToday: { en: 'Price today', tn: 'Theko ya gompieno' },
  gross: { en: 'Gross', tn: 'Kakaretso' },
  coopTax: { en: 'Co-op tax', tn: 'Lekgetho la Co-op' },
  youReceive: { en: 'You receive', tn: 'O amogela' },
  priceUnavailable: {
    en: 'Could not fetch a price for that. Please try again.',
    tn: 'Ga go a kgona go bona theko. Leka gape.',
  },
  sellFailed: { en: 'Sell Failed', tn: 'Go Radisa go Paletse' },

  // ---- Inventory Screen ----
  inventory: { en: 'Inventory', tn: 'Sesupu' },
  slots: { en: 'slots', tn: 'di-sloti' },
  all: { en: 'All', tn: 'Tsotšhe' },
  seeds: { en: 'Seeds', tn: 'Merolwana' },
  crops: { en: 'Crops', tn: 'Dirolwe' },
  animal: { en: 'Animal', tn: 'Phoofolo' },
  materials: { en: 'Materials', tn: 'Dilo' },
  quantity: { en: 'Quantity', tn: 'Palo' },
  grade: { en: 'Grade', tn: 'Kgaso' },
  sellFor: { en: 'Sell', tn: 'Radisa' },
  sellOne: { en: 'Sell 1', tn: 'Radisa 1' },

  // ---- Bushveld Screen ----
  bushveld: { en: 'Bushveld', tn: 'Lefatshe' },
  savannaFringe: { en: 'Okavango Savanna Fringe', tn: 'Mafelelo a Okavango' },
  collect: { en: 'Collect', tn: 'Kuta' },
  rest: { en: 'Rest', tn: 'Khutša' },
  notEnoughEnergy: {
    en: 'Not enough energy! Rest under the Baobab.',
    tn: 'Bollong e se kalogo! Khutša ka teraka ya Baobab.',
  },
  marula: { en: 'Wild Marula', tn: 'Marula e Lefatshegilego' },
  waterhole: { en: 'Fresh Waterhole', tn: 'Metsi a Bopša' },
  baobab: { en: 'Ancient Baobab', tn: 'Baobab ya Kgale' },
  cave: { en: 'Granite Cave', tn: 'Keletšo ya Granite' },
  energy: { en: 'Energy', tn: 'Bollong' },

  // ---- Bushveld Screen (Bushveld wiring) ----
  kagiso: { en: 'Kagiso', tn: 'Kagiso' },
  settled: { en: 'Settled', tn: 'E Khutsitseng' },
  resting: { en: 'Resting', tn: 'E Khutšang' },
  notSettled: { en: 'Not settled', tn: 'Ga e a Khutsa' },
  needsKagiso: { en: 'Need {n} Kagiso', tn: 'E hloka Kagiso {n}' },
  sparkle: { en: 'Sparkle', tn: 'Lesedi' },
  seasonal: { en: 'In season', tn: 'Nakong' },
  newDiscovery: { en: 'New Discovery!', tn: 'Tlhakiso e Ncha!' },
  sceneLocked: { en: 'Locked', tn: 'E Notlilwe' },
  comingSoon: { en: 'Coming soon', tn: 'E tla go feta nako' },
  restoration: { en: 'Restoration', tn: 'Tokafatšo' },
  finds: { en: 'Finds', tn: 'Dintho' },
  tapToGather: { en: 'Tap to gather', tn: 'Tobetsa go kokota' },
  bothoNeeded: { en: 'Botho {n} to enter', tn: 'Botho {n} go tsena' },

  // ---- Kgotla Screen ----
  communityHub: { en: 'Community Hub', tn: 'Setšhaba sa Setšo' },
  activeContracts: { en: 'Active Contracts', tn: 'Dikgolwano di E Tsebeletseng' },
  viewContracts: { en: '📜 View Contracts', tn: '📜 Bona Dikgolwano' },
  inProgress: { en: 'In Progress', tn: 'E tšweletše' },
  claimed: { en: '✓ Claimed', tn: '✓ E Rekile' },
  claimReward: { en: 'Claim Reward', tn: 'Reka Nkatiso' },
  talkToNpcs: {
    en: 'Talk to the NPCs to discover contracts!',
    tn: 'Boledišana le bašomi go hwetša dikgolwano!',
  },

  // ---- Kgotla Screen (clarity pass) ----
  kgotlaIntro: {
    en: 'Here the village gathers: hear a council member’s counsel, help decide a community project, and watch your Botho grow.',
    tn: 'Mona motse o kopana: utlwa tlhalo ya leloko la kgotla, thusa go rulaganya projeke ya setšhaba, le go lebelela Botho ya gago go gola.',
  },
  speakWithElders: { en: 'The Council', tn: 'Lekgotla' },
  supportProject: { en: 'The village decides', tn: 'Motse o rulaganya' },
  askGuidance: { en: 'Seek counsel', tn: 'Kopa tlhalo' },
  takeQuest: { en: 'Undertake their charge', tn: 'Amogela tiro ya bona' },
  questReward: { en: 'Reward', tn: 'Mputso' },
  donatePula: { en: 'Donate', tn: 'Neela' },
  donateTo: { en: 'Donate to', tn: 'Neela go' },
  dailyLimitReached: {
    en: 'Daily community limit reached — come back tomorrow.',
    tn: 'Molao wa letšatši wa setšhaba o fihletše — boela gape hosasa.',
  },
  pulaPerDay: { en: 'Pula / day', tn: 'Pula / letšatši' },
  // Council-chamber framing (Kgotla redesign, 2026-09-16)
  kgotlaSubtitle: {
    en: 'Where the village gathers to talk — and decides together.',
    tn: 'Moo motse o kopaneng go bolela le go rulaganya mmogo.',
  },
  inDeliberation: { en: 'In deliberation', tn: 'Mo tirisanong' },
  councilHint: {
    en: 'Choose a council member to hear their counsel.',
    tn: 'Kgetha setho sa kgotla go kwa tlhalo ya sona.',
  },
  villageDecidesHint: {
    en: 'The council weighs each project — your Pula tips the scale.',
    tn: 'Lekgotla le lekola projeke nngwe le nngwe — Pula ya gago e sekametša.',
  },

  // ---- Settings Screen ----
  settings: { en: 'Settings', tn: 'Peakanyo' },
  audio: { en: 'Audio', tn: 'Molumo' },
  music: { en: 'Music', tn: 'Dihumo' },
  soundEffects: { en: 'Sound Effects', tn: 'Dikgabo tsa Molumo' },
  language: { en: 'Language', tn: 'Levha' },
  english: { en: 'English', tn: 'Sekgowa' },
  setswana: { en: 'Setswana', tn: 'Setswana' },
  account: { en: 'Account', tn: 'Akhaonto' },
  status: { en: 'Status', tn: 'Boemo' },
  connected: { en: '✓ Connected', tn: '✓ E Apšilitše' },
  level: { en: 'Level', tn: 'Lekala' },
  experience: { en: 'Experience', tn: 'Maitemogelo' },
  purse: { en: 'Purse', tn: 'Sefela' },
  madeInBotswana: { en: 'Made in Botswana 🇧🇼', tn: 'E Theilwe mo Botswana 🇧🇼' },
} as const;

// Flat lookup helper
export function t(locale: Locale, key: keyof typeof translations): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[locale] || entry.en;
}
