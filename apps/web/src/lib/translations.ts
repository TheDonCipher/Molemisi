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
  tankFull: { en: 'Tank Full', tn: 'Thanka e Tletse' },
  welcomeBack: { en: 'Welcome back!', tn: 'O boile!' },
  whileAway: { en: 'While you were away', tn: 'Fa o ne o se koo' },
  wbCropsReady: { en: '{n} crops ready to harvest', tn: 'Dirolwe di le {n} di modume' },
  wbProductsReady: {
    en: '{n} animal products ready',
    tn: 'Dithoto tsa diphologolo di le {n} di siame',
  },
  wbBuildingsDone: { en: '{n} buildings finished construction', tn: 'Dikago di le {n} di feditse' },
  wbMaintenance: {
    en: '{n} buildings need maintenance',
    tn: 'Dikago di le {n} di tlhoka tsosoloso',
  },
  wbSeasonChanged: { en: 'The season turned to {season}', tn: 'Sehla se fetohile go {season}' },
  wbDismiss: { en: 'Back to the farm', tn: 'Boela tshimong' },
  weatherClear: { en: 'Clear', tn: 'Phepa' },
  weatherCloudy: { en: 'Cloudy', tn: 'Maru' },
  weatherRain: { en: 'Rain', tn: 'Pula' },
  weatherStorm: { en: 'Storm', tn: 'Sefefo' },
  weatherDrought: { en: 'Drought', tn: 'Komelelo' },
  rainFillsTank: { en: 'Rain is refilling your tank', tn: 'Pula e tsatsa thankha ya gago' },

  // ---- Farm Screen: Livestock (kraal) ----
  livestock: { en: 'Livestock', tn: 'Diphologolo' },
  buyAnimal: { en: 'Buy Animal', tn: 'Reka Phologolo' },
  noLivestock: {
    en: 'No animals yet — buy your first!',
    tn: 'Ga go na diphologolo — reka ya ntlha!',
  },
  feed: { en: '🍽️ Feed', tn: '🍽️ Fepa' },
  pet: { en: '💛 Pet', tn: '💛 Phopholetsa' },
  hunger: { en: 'Hunger', tn: 'Tlala' },
  health: { en: 'Health', tn: 'Boitekanelo' },
  happiness: { en: 'Happiness', tn: 'Boitumelo' },
  sickBadge: { en: 'Sick', tn: 'E a lwala' },
  needsBuilding: { en: 'Needs {building}', tn: 'E tlhoka {building}' },
  animalChicken: { en: 'Chicken', tn: 'Kgogo' },
  animalGoat: { en: 'Goat', tn: 'Pudi' },
  animalCow: { en: 'Cow', tn: 'Kgomo' },
  animalPig: { en: 'Pig', tn: 'Kolobe' },

  // ---- Farm Screen: Buildings ----
  buildings: { en: 'Buildings', tn: 'Dikago' },
  build: { en: 'Build', tn: 'Aga' },
  repair: { en: '🔧 Repair', tn: '🔧 Baakanya' },
  stateConstruction: { en: 'Building…', tn: 'E a agiwa…' },
  stateMaintenance: { en: 'Needs repair', tn: 'E tlhoka tsosoloso' },
  stateDisabled: { en: 'Disabled', tn: 'E emisitswe' },
  built: { en: 'Built', tn: 'E agilwe' },
  buildingStorage: { en: 'Storage', tn: 'Polokelo' },
  buildingWaterSource: { en: 'Jojo Tank', tn: 'Tanka ya Metsi' },
  buildingKraal: { en: 'Kraal', tn: 'Lesaka' },
  buildingBoundary: { en: 'Farm Boundary', tn: 'Legora' },
  buildingCrafting: { en: 'Workshop', tn: 'Lefelo la Tiro' },
  // ---- Deep Time Lore (Doc 11/12) ----
  buildingHeritageTree: { en: 'Heritage Tree', tn: 'Setlhare sa Boswa' },
  guardianOfSesana: { en: 'Guardian of Sesana', tn: 'Modisa wa Sesana' },
  guardianOnlyHint: {
    en: 'Guardian of Sesana only — Field Journal 100% and 500 Botho',
    tn: 'Modisa wa Sesana fela — Tlaleho 100% le Botho 500',
  },
  guardianEarned: {
    en: 'Named Guardian of Sesana — keeper of the land and its memory.',
    tn: 'O bidiwa Modisa wa Sesana — modisa wa naga le kgakologo ya yone.',
  },
  chooseTreePlot: {
    en: 'Choose an empty plot for the Heritage Tree',
    tn: 'Tlhopha legora le le se nang sepe go Setlhare sa Boswa',
  },
  noFreePlot: { en: 'No empty plot free for the tree', tn: 'Ga go na legora le le se nang sepe' },
  heritageShade: {
    en: 'Heritage shade — these plots drink at 80% water demand',
    tn: 'Moriti wa boswa — dirapa tse di nwa metsi ka 80%',
  },
  whispersHeard: { en: 'Whispers heard', tn: 'Mafoko a a utlwilweng' },
  tsholofelo: { en: 'Tsholofelo', tn: 'Tsholofelo' },
  tsholofeloHere: {
    en: 'Tsholofelo is perched — the farm is at peace.',
    tn: 'Tsholofelo o dutse — tshimo e na le kgotso.',
  },
  villageFeast: { en: 'Village Feast', tn: 'Nako ya Go Arogana' },
  tsholofeloGift: {
    en: 'Tsholofelo has a gift for you — tap her to receive it.',
    tn: 'Tsholofelo o na le mpho ya gago — o e tobole go e amogela.',
  },
  friendOfTheFeast: {
    en: 'Friend of the Feast — shared 20 watermelons with the village.',
    tn: 'Tsala ya Nako ya Go Arogana — o abileng motse makapu a le 20.',
  },
  feastFenceOwned: {
    en: 'keepsake fence built',
    tn: 'lefatse la gopo o kwadilwe',
  },
  villageFeastBlurb: {
    en: 'Share 20 watermelons with the village. Botho, never Pula — some things are not for sale.',
    tn: 'Arogana dijo tsa tshimo le motse. Botho, e seng Pula — dilo dingwe ga di rekisiwe.',
  },
  feastDonate: { en: 'Share 20 watermelons', tn: 'Arogana dijo tsa tshimo' },
  feastThanks: { en: 'The village eats well tonight.', tn: 'Motse o ja sentle bosigo jeno.' },
  feastNeedMelons: {
    en: 'You need 20 watermelons in your basket',
    tn: 'O tlhoka dijo tse di lekaneng mo baskets',
  },
  readyIn: { en: 'Ready in', tn: 'E tla moduma ka' },
  offSeason: { en: 'Off-season', tn: 'Nako e fetileng' },
  upgrade: { en: '⬆ Upgrade', tn: '⬆ Tokafatša' },
  coachTitle: { en: 'Welcome to your farm', tn: 'Amogelwa tshimong ya gago' },
  coachPlant: { en: 'Tap a plot to plant seeds', tn: 'Tobetsa legora go rolola peo' },
  coachWater: { en: 'Tap the water gauge to fill the tank', tn: 'Tobetsa tanka go e tsatsa' },
  coachKraal: {
    en: 'Feed your animals and collect what they make',
    tn: 'Fepa diphologolo tsa gago o bo o kgobokanya',
  },
  coachGo: { en: 'Let’s farm', tn: 'Re yo temeng' },
  notifications: { en: 'Notifications', tn: 'Ditsebiso' },
  enableNotifs: { en: 'Enable notifications', tn: 'Dira ditsebiso' },
  notifCropsReady: { en: 'Crop ready to harvest', tn: 'Dirolwe di modume' },
  notifAnimals: { en: 'Animal needs attention', tn: 'Phologolo e tlhoka tlhoko' },
  buyPlot: { en: '🏡 Buy Plots', tn: '🏡 Reka Masimo' },
  wbCatchUp: {
    en: '+{n} Botho from the community',
    tn: '+{n} Botho go tswa mo setšhabeng',
  },
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
  // ---- Inventory Item Card ----
  comesFrom: { en: 'Where it comes from', tn: 'E tswa kae' },
  sourceGrow: { en: 'Grow', tn: 'Jala' },
  sourceForage: { en: 'Forage', tn: 'Kuta' },
  sourceRaise: { en: 'Raise', tn: 'Alosa' },
  sourceCraft: { en: 'Craft', tn: 'Botaki' },
  sourceBuy: { en: 'Co-op', tn: 'Dishopo' },
  noSource: {
    en: 'Comes from the everyday work of the farm.',
    tn: 'E tswa mo tirong ya malatsi otlhe ya polasi.',
  },
  makesInto: { en: 'Used to make', tn: 'E dira' },
  craftAt: { en: 'Craft at the Workshop', tn: 'Dira kwa Workshopong' },
  neededBy: { en: 'Needed by', tn: 'E tlhokega ke' },
  useConstruction: { en: 'building', tn: 'kago' },
  useUpgrade: { en: 'upgrades', tn: 'tokafatšo' },
  useMaintenance: { en: 'repairs', tn: 'tokiso' },

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

  // ---- Kgotla charges (SPEC §5, settled 2026-09-23) ----
  chargeBoard: { en: 'Today’s charges', tn: 'Ditiro tsa gompieno' },
  chargesRemaining: { en: 'charges left today', tn: 'ditiro di setse gompieno' },
  chargePoolSpent: {
    en: 'The council has given you every charge for today. Come back tomorrow.',
    tn: 'Lekgotla le go neetse ditiro tsotlhe tsa gompieno. Boela hosasa.',
  },
  chargeNone: { en: 'No charge', tn: 'Ga go tiro' },
  chargeInFlight: { en: 'In flight', tn: 'E mo tirong' },
  chargeReady: { en: 'Ready to hand over', tn: 'E itokisitse go neelwa' },
  chargeDone: { en: 'Handed over', tn: 'E neetswe' },
  turnIn: { en: 'Hand it over', tn: 'Neela' },
  objectiveBring: { en: 'Bring', tn: 'Tlisa' },
  objectiveGive: { en: 'Give', tn: 'Neela' },
  objectiveToProject: { en: 'Pula to a project', tn: 'Pula mo projekeng' },
  objectiveSell: { en: 'Sell', tn: 'Rekisa' },
  objectiveOfGoods: { en: 'Pula of goods at the Co-op', tn: 'Pula ya dithoto kwa koporeseng' },
  progressOf: { en: 'of', tn: 'go tswa mo' },
  regard: { en: 'Regard', tn: 'Tlotlo' },
  regardToNext: { en: 'to', tn: 'go fitlha' },
  regardFading: { en: 'will miss you tomorrow', tn: 'o tla go tlhologela hosasa' },
  rewardTokens: { en: 'Chapter Tokens', tn: 'Dithokisi tsa Kgaolo' },

  // ---- Kgotla labels migrated out of hardcoded English (AC-11) ----
  councilUnavailable: {
    en: 'The council could not be reached.',
    tn: 'Lekgotla ga le a kgona go fitlhelelwa.',
  },
  retry: { en: 'Try again', tn: 'Leka gape' },
  bothoEarnedToday: { en: 'Botho earned today', tn: 'Botho e e thotseng gompieno' },
  eldersGuidance: { en: 'Elder’s guidance', tn: 'Kaelo ya mogolo' },
  maxed: { en: 'maxed', tn: 'e tletse' },
  done: { en: 'Done', tn: 'E fedile' },
  noProjects: {
    en: 'No community projects right now.',
    tn: 'Ga go projeke ya setšhaba ga jaanong.',
  },
  projectRewardClaimed: { en: 'Reward taken', tn: 'Mputso e tserwe' },
  leftToday: { en: 'left today', tn: 'di setse gompieno' },

  // ---- Kgotla toasts ----
  chargeCompleteTitle: { en: 'Charge complete', tn: 'Tiro e fedile' },
  chargeFailedTitle: { en: 'Charge not accepted', tn: 'Tiro ga e a amogelwa' },
  donationFailedTitle: { en: 'Donation failed', tn: 'Moneelo o paletse' },
  projectCompleteTitle: { en: 'Project complete', tn: 'Projeke e fedile' },
  gavePula: { en: 'Gave', tn: 'Neetse' },
  somethingWentWrong: {
    en: 'Something went wrong',
    tn: 'Go na le se se sa tsamayang sentle',
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
