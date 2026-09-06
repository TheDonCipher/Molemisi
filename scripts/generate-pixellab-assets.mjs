#!/usr/bin/env node
/**
 * Molemisi — PixelLab Asset Generator
 * ====================================
 * Generates the full set of game assets specified by docs/22_UI_GX_Specification.md
 * (and 05_Art_Direction_and_Asset_Specification.md) using the PixelLab v2 API:
 *
 *   https://api.pixellab.ai/v2/docs
 *
 * Requires: Node.js >= 20 (global fetch). No npm dependencies.
 *
 * Auth: reads PIXELLAB_API_KEY from the environment, from a root .env / .env.local
 *       file, or --key. Get a token at https://pixellab.ai/account
 *
 * Usage
 * -----
 *   node scripts/generate-pixellab-assets.mjs --dry-run          # list planned calls, hit nothing
 *   node scripts/generate-pixellab-assets.mjs --group icons       # only the icon group
 *   node scripts/generate-pixellab-assets.mjs --all               # everything (expensive)
 *   node scripts/generate-pixellab-assets.mjs --skip crops        # everything except crops
 *   node scripts/generate-pixellab-assets.mjs --sample 2 --group crops  # first 2 crops
 *   node scripts/generate-pixellab-assets.mjs --force             # regenerate even if file exists
 *   node scripts/generate-pixellab-assets.mjs --concurrency 3     # parallel requests (default 2)
 *
 * Groups
 * ------
 *   icons        UI icon set (farming/animal/building/market/nav/status/weather/currency/social)
 *   crops        Growth-stage sprites + product icons for every crop
 *   animals      Animal sprites + product icons
 *   buildings    Building sprites (one per building + upgrade level 1)
 *   npcs         Kgotla / community NPC portraits
 *   decor        Trees, rocks, fences, flowers, well, fire (scene props)
 *   ground       Autotiled terrain (grass/dirt/path/water blends) + plot tiles
 *   backgrounds  Farm/Kgotla/Bushveld/Market scene backgrounds
 *   weather      Cloud/sun/rain/storm/drought + season particles
 *   fx           Particle effects (sparkle, coin, heart, water, dust, smoke)
 *   ui-assets    Pixel-art UI panels/buttons via the create-ui-asset pipeline
 *
 * Output
 * ------
 *   Everything lands under assets/ following doc 05 naming conventions:
 *   {category}_{name}_{variant}.png, plus assets/manifest.json with a map of
 *   every generated file (id -> path + logical size) for the Phaser PreloadScene.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ASSET_ROOT = join(REPO_ROOT, 'assets');
const MANIFEST_PATH = join(ASSET_ROOT, 'manifest.json');

/* ============================================================
 * 1. CLI PARSING
 * ============================================================ */
const argv = process.argv.slice(2);
const flags = {
  dryRun: false,
  all: false,
  force: false,
  list: false,
  key: null,
  groups: new Set(),
  skip: new Set(),
  sample: Infinity,
  concurrency: 2,
};
const GROUP_NAMES = [
  'icons',
  'crops',
  'animals',
  'buildings',
  'npcs',
  'decor',
  'ground',
  'backgrounds',
  'weather',
  'fx',
  'ui-assets',
  'scene-props',
];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => argv[++i];
  switch (a) {
    case '--dry-run':
      flags.dryRun = true;
      break;
    case '--list':
      flags.list = true;
      break;
    case '--all':
      flags.all = true;
      break;
    case '--force':
      flags.force = true;
      break;
    case '--key':
      flags.key = next();
      break;
    case '--group':
      for (const g of String(next() || '').split(',')) if (g.trim()) flags.groups.add(g.trim());
      break;
    case '--skip':
      for (const g of String(next() || '').split(',')) if (g.trim()) flags.skip.add(g.trim());
      break;
    case '--sample':
      flags.sample = Number(next());
      break;
    case '--concurrency':
      flags.concurrency = Math.max(1, Number(next()) || 2);
      break;
    case '-h':
    case '--help':
      printHelp();
      process.exit(0);
    default:
      console.error(`Unknown option: ${a}\n`);
      printHelp();
      process.exit(1);
  }
}
if (!flags.all && flags.groups.size === 0 && !flags.dryRun && !flags.list) {
  console.error('Nothing to do. Pass --all, --group <names>, --dry-run, or --list.\n');
  printHelp();
  process.exit(1);
}

function printHelp() {
  const groups = GROUP_NAMES.join(', ');
  console.log(`Molemisi PixelLab asset generator

Usage: node scripts/generate-pixellab-assets.mjs [options]

  --dry-run                  list planned API calls without sending them
  --list                     print every planned asset (id, path, size, kind)
  --all                      generate every group
  --group <a,b,c>            only these groups: ${groups}
  --skip <a,b,c>             all groups except these
  --sample <n>               first n items per group (cheap smoke test)
  --force                    overwrite assets that already exist on disk
  --concurrency <n>          parallel requests (default 2; be kind to the API)
  --key <token>              PixelLab API key (or PIXELLAB_API_KEY env / .env)

Examples:
  node scripts/generate-pixellab-assets.mjs --dry-run --all
  node scripts/generate-pixellab-assets.mjs --group icons
  node scripts/generate-pixellab-assets.mjs --group crops --sample 1`);
}

/* ============================================================
 * 2. CONFIG + AUTH
 * ============================================================ */
const BASE = 'https://api.pixellab.ai/v2';

function loadApiKey() {
  if (flags.key) return flags.key;
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY;
  for (const f of ['.env', '.env.local']) {
    try {
      const raw = readFileSync(join(REPO_ROOT, f), 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*PIXELLAB_API_KEY\s*=\s*(.+)\s*$/);
        if (m) return m[1].replace(/^["']|["']$/g, '');
      }
    } catch {
      /* missing file is fine */
    }
  }
  return null;
}
const API_KEY = loadApiKey();
if (!API_KEY && !flags.dryRun && !flags.list) {
  console.error('Missing PIXELLAB_API_KEY. Set it in your env, add it to .env, or pass --key.');
  process.exit(1);
}
const AUTH = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

/* ============================================================
 * 3. SHARED STYLE LANGUAGE (doc 22 §8.2 / doc 05 palette)
 * ============================================================ */
const STYLE = [
  'cozy warm 16-bit pixel art game asset for a Botswana-inspired farm game,',
  'soft golden-hour lighting, crisp clean pixels, single 1px dark-brown outline,',
  'flat cel shading, no gradients, no anti-aliasing, no text, no watermark,',
  'palette of terracotta red-earth #C05C3C, warm grass #5A8F3C, amber #FF8F00,',
  'cream #F5E6D3, sky blue #87CEEB and dark brown #3E2723,',
].join(' ');

/**
 * Strict contract for UI icons (doc 22 §2.3). These read at 16-32px, so the
 * subject must be ONE object, drawn LARGE (fills most of the canvas), flat and
 * high-contrast — the opposite of a scenic illustration.
 */
const ICON_STYLE = [
  'single flat game-UI icon, ONE compact object only, no scenery, no background, no people,',
  'no landscape, no drop shadow, no glow, no text, no letters, no numbers,',
  'object centered, drawn LARGE but with a clear margin of empty space on all four sides',
  'so the whole silhouette is cut out cleanly, chunky readable 2px dark-brown #3E2723',
  'outline, minimal flat color blocks (max 4 colors + outline), crisp pixel art,',
  'flat colors, no gradients, cozy Molemisi farm palette: warm amber #FF8F00,',
  'cream #F5E6D3, grass green #5A8F3C, sky blue #87CEEB, terracotta #C05C3C.',
].join(' ');

/** Stable pseudo-seed per asset so re-runs look identical. */
function seedFor(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ============================================================
 * 4. ASSET MANIFEST
 * ============================================================ */
/**
 * Every entry: { id, group, file, size:{w,h}, kind, prompt, opts }
 * kind: 'pixen'  -> POST /create-image-pixen (synchronous)
 *       'pixflux'-> POST /create-image-pixflux (synchronous scene art)
 *       'tileset'-> POST /create-tileset (async autotile blend) + download
 *       'ui'     -> POST /create-ui-asset (async panel) + download image_url
 *       'pixenv2'-> POST /create-image-pixen on transparent bg, taller sprite
 */

// ---- crops from packages/game-config/src/crops.ts (id + stage count) --------
const CROPS = [
  ['sorghum', 4, 'tall sorghum grain crop, feathery golden-brown seed head'],
  ['maize', 5, 'maize plant with broad green leaves and yellow cobs'],
  ['millet', 4, 'slender millet crop with drooping grain clusters'],
  ['cowpeas', 4, 'cowpea plant, leafy green vine with small bean pods'],
  ['groundnuts', 5, 'groundnut (peanut) plant, low green leaves'],
  ['sesame', 4, 'sesame plant with narrow leaves and small seed pods'],
  ['watermelon', 6, 'watermelon vine with round striped green fruit'],
  ['tomatoes', 5, 'tomato plant on a small stake with round red fruit'],
  ['pepper', 4, 'chilli pepper plant with red and green peppers'],
  ['herbs', 3, 'small leafy herb bush, soft green'],
  ['saffron', 5, 'saffron crocus flower with purple petals and red stigmas'],
];

const ANIMALS = [
  ['chicken', 'plump laying hen with red comb'],
  ['goat', 'short-horned goat with floppy ears'],
  ['cow', 'dairy cow, tan with dark patches, gentle face'],
  ['pig', 'round pink pig with a curly tail'],
];

const BUILDINGS = [
  ['well', 'round stone well with wooden roof and bucket'],
  ['coop', 'small wooden chicken coop with ramp and red roof'],
  ['barn', 'large wooden storage barn with corrugated roof'],
  ['goat_pen', 'wooden goat pen shelter with fence'],
  ['mill', 'small grain mill with turning wooden wheel'],
  ['paddock', 'cattle paddock with wooden post fence'],
  ['pig_pen', 'pig pen with low wooden fence and mud patch'],
];

const NPCS = [
  ['elder_neo', 'wise elderly Setswana village elder, grey hair, patterned blanket over shoulder'],
  ['mama_naledi', 'warm middle-aged Setswana woman market vendor, floral headwrap'],
  ['refilwe', 'young Setswana woman herbalist holding a herb bundle'],
  ['market_vendor', 'friendly Setswana man trader at a market stall, apron'],
  ['bushveld_scout', 'young Setswana man scout with a satchel and walking stick'],
];

const DECOR = [
  ['acacia_tree', 'flat-topped acacia tree with spreading canopy'],
  ['baobab_tree', 'huge baobab tree with thick trunk and small crown'],
  ['bush', 'round leafy bush'],
  ['rock', 'grey granite boulder'],
  ['fence', 'wooden fence post segment'],
  ['flower_patch', 'patch of small wildflowers (orange, yellow, pink)'],
  ['grass_tuft', 'tuft of savanna grass'],
  ['marula_tree', 'marula tree with round green fruit'],
  ['reeds', 'cluster of tall river reeds'],
  ['sandstone_rock', 'red sandstone rock formation'],
];

// UI icon catalog from doc 22 §2.3.
// Each entry maps an icon id to an explicit, concrete *subject* so the model
// draws the intended glyph instead of guessing from a one-word label.
const ICON_DEFS = {
  farming: {
    plant: 'a young green sprout with two small leaves growing from a mound of dark soil',
    water: 'a single rounded blue water droplet with a small white shine',
    harvest: 'a golden bundle of wheat stalks tied with twine',
    fertilize: 'a small brown fertilizer sack with a green leaf emblem',
    weed: 'a single dandelion weed with a few spiky leaves, compact upright plant',
    soil: 'a mound of dark brown tilled soil with a wooden-handle shovel',
  },
  animals: {
    feed: 'a small square hay bale tied with twine',
    collect: 'a woven brown basket holding two eggs',
    pet: 'an open human hand with a small pink heart floating above it',
    heal: 'a green rounded badge with a white medical cross',
    shelter: 'a small wooden animal coop with an arched doorway',
  },
  buildings: {
    construct: 'a wooden mallet hammer with a nail beside it',
    upgrade: 'an upward arrow with a sparkle inside a gold rounded badge',
    repair: 'a metal wrench with a wooden handle',
    demolish: 'a single sledgehammer mid-swing with two small brick fragments flying off the head',
  },
  market: {
    buy: 'an open wooden basket with a gold coin inside',
    sell: 'an open hand offering a gold coin',
    price: 'a wooden price tag hanging from a string',
    contract: 'a rolled parchment scroll with a red wax seal',
    trade: 'two curved arrows forming an exchange loop',
  },
  inventory: {
    bag: 'a round leather satchel with a flap and buckle',
    sort: 'three horizontal bars with a small up arrow and down arrow',
    use: 'a pixel cursor hand with an extended index finger',
    drop: 'a brown sack with a downward arrow above it',
    stack: 'three stacked square wooden crates',
  },
  navigation: {
    farm: 'a small farmhouse with a red roof and chimney',
    kgotla: 'a round thatched-roof village meeting shelter on wooden poles',
    bushveld: 'a flat-topped acacia tree',
    market: 'a market stall with a striped awning',
    settings: 'a gear cog with a small wrench',
  },
  status: {
    healthy: 'a green heart with a small white plus sign',
    hungry: 'an empty wooden food bowl with a spoon',
    thirsty: 'an empty water dish with a blue droplet above it',
    sick: 'a thermometer with a red bulb and high red fill',
    ready: 'a gold badge with a green check mark',
    withered: 'a brown wilted drooping plant',
  },
  weather: {
    sun: 'a bright yellow sun with eight short rays',
    cloud: 'a white fluffy cloud',
    rain: 'a grey cloud with three falling raindrops',
    storm: 'a dark storm cloud with a yellow lightning bolt',
    drought: 'a small compact patch of cracked dry earth with a tiny sun above it',
    wind: 'two short curved wind streaks sweeping from the left, compact centered swoosh',
  },
  currency: {
    pula: 'a gold coin engraved with a water droplet',
    gem: 'a faceted blue gem crystal',
    token: 'a round bronze token with a star cut-out',
  },
  social: {
    npc: 'a friendly smiling villager bust with a patterned headwrap, head and shoulders only',
    quest: 'a parchment scroll with a red exclamation mark',
    gift: 'a wrapped gift box with a ribbon bow',
    reputation: 'a gold five-pointed star badge',
  },
};

// Portrait-format backgrounds (mobile-first screens) rendered at higher resolution.
const BIG_BACKGROUNDS = [
  [
    'market_portrait',
    'traditional Botswana village open-air market seen from a player standing in the square, woven baskets filled with grain and produce on wooden display tables, thatched shade structures, colorful cloth canopies strung overhead, red earth ground, acacia trees at the edges, warm late-afternoon light, bustling but cozy, empty center area for UI overlay',
  ],
];

const BACKGROUNDS = [
  [
    'farm_day',
    'serene Botswana farm scene, clear blue sky, distant hills, red-earth field with green crops, acacia tree, warm morning light',
  ],
  ['farm_sunset', 'same farm at golden sunset, orange and pink sky, long soft shadows'],
  ['farm_night', 'same farm at night, deep blue starry sky, warm light from a farmhouse window'],
  [
    'kgotla',
    'traditional Setswana kgotla village gathering place, circular wooden meeting shelter, shade trees, red earth, daytime',
  ],
  [
    'bushveld_savanna',
    'Botswana bushveld savanna with tall golden grass and scattered acacia trees',
  ],
  ['bushveld_riverbank', 'bushveld riverbank with calm water, reeds and green banks'],
  ['market', 'busy open-air African village market with colorful stalls and canopies, daytime'],
];

const WEATHER_FX = [
  ['cloud_white', 'puffy white pixel cloud'],
  ['cloud_storm', 'dark grey storm cloud'],
  ['sun_glow', 'bright pixel sun with warm rays'],
  ['lightning', 'yellow lightning bolt'],
  ['wind_swirl', 'swirling wind streak'],
  ['rain_cloud', 'grey rain cloud with falling rain'],
];

const PARTICLES = [
  ['sparkle_gold', 'small golden sparkle star'],
  ['sparkle_white', 'small white twinkle sparkle'],
  ['coin', 'single gold coin'],
  ['heart', 'small pink heart'],
  ['water_drop', 'single light-blue water droplet'],
  ['leaf_green', 'single small green leaf'],
  ['leaf_autumn', 'single small orange autumn leaf'],
  ['petal_pink', 'single small pink flower petal'],
  ['snowflake', 'small white snowflake'],
  ['dust_puff', 'small brown dust puff'],
  ['smoke_puff', 'soft grey smoke puff'],
  ['dirt_chunk', 'small brown soil chunk'],
];

/* ---- Build the flat asset list ------------------------------------------ */
const ASSETS = [];
function add(group, id, file, size, kind, prompt, opts = {}) {
  ASSETS.push({ group, id, file, size, kind, prompt, opts });
}

// Icons: 32x32 squares, transparent bg, concrete subject + strict glyph contract
for (const [cat, icons] of Object.entries(ICON_DEFS)) {
  for (const [icon, subject] of Object.entries(icons)) {
    add(
      'icons',
      `${cat}_${icon}`,
      `ui/icons/${cat}_${icon}.png`,
      { w: 32, h: 32 },
      'pixen',
      `${subject}. ${ICON_STYLE}`,
      { noBg: true, detail: 'low detail' },
    );
  }
}

// Item icons: pixel-art inventory icons for every game item type (seeds, crops,
// animal products, materials) — matches CROP_ICONS / item types in the web app.
const ITEM_ICONS = [
  // seeds
  ['seed_sorghum', 'small pile of golden-brown sorghum grains on a tiny cloth square'],
  ['seed_maize', 'three yellow maize kernels beside a tiny dried corn cob'],
  ['seed_millet', 'small pile of tiny round millet grains on a tiny cloth square'],
  ['seed_cowpeas', 'five cream-and-brown cowpea beans arranged in a small pile'],
  ['seed_groundnuts', 'three peanuts in their shells, one cracked open'],
  ['seed_sesame', 'tiny scatter of flat ivory sesame seeds on a small cloth square'],
  ['seed_watermelon', 'five black watermelon seeds beside a tiny watermelon slice'],
  ['seed_tomatoes', 'tiny packet of tomato seeds with a small red tomato beside it'],
  ['seed_pepper', 'tiny open paper seed packet with red chilli pepper beside it'],
  ['seed_herbs', 'small paper seed packet with green herb sprigs beside it'],
  ['seed_saffron', 'tiny pouch with purple crocus flowers and red stigmas beside it'],
  // crop products
  ['product_sorghum', 'bundle of golden sorghum grain heads tied with twine'],
  ['product_maize', 'two fresh yellow maize cobs with husks partially peeled'],
  ['product_millet', 'bundle of millet grain clusters tied with twine'],
  ['product_cowpeas', 'small hessian sack of cowpea beans, open at the top'],
  ['product_groundnuts', 'pile of peanuts in shells with one open showing kernels'],
  ['product_sesame', 'small wooden bowl filled with sesame seeds'],
  ['product_watermelon', 'whole striped watermelon beside a cut wedge slice'],
  ['product_tomatoes', 'cluster of three round ripe red tomatoes on the vine'],
  ['product_pepper', 'small pile of red and green chilli peppers'],
  ['product_herbs', 'bundle of fresh green herb sprigs tied with twine'],
  ['product_saffron', 'small glass jar of red saffron threads with purple flower'],
  // animal products
  ['product_egg', 'two brown eggs in a small straw nest'],
  ['product_milk', 'small clay milk jug with wooden cap'],
  ['product_wool', 'fluffy white wool fleece bundle tied with twine'],
  // materials
  ['material_wood', 'stack of three acacia logs with visible bark texture'],
  ['material_stone', 'small pile of grey building stones with one cut block'],
  ['material_reeds', 'bundle of dried river reeds tied with twine'],
  ['material_marula', 'three round marula fruits with one cut open showing flesh'],
  ['material_salt', 'small pile of coarse white mineral salt crystals'],
  ['material_herb_wild', 'bundle of dried wild bushveld herbs tied with twine'],
  // tools
  ['tool_hoe', 'wooden farming hoe with steel blade, diagonal view'],
  ['tool_watering_can', 'metal watering can with long spout'],
  ['tool_sickle', 'curved steel sickle with wooden handle'],
  ['tool_basket', 'woven reed gathering basket with handle'],
  ['tool_pickaxe', 'stone pickaxe with wooden handle'],
  ['tool_canteen', 'round clay water canteen with cork stopper and strap'],
  ['tool_field_scope', 'brass field spyglass telescope collapsed'],
  // buildings (match the world building sprites)
  ['building_well', 'round stone well with wooden roof and bucket'],
  ['building_coop', 'small wooden chicken coop with ramp and red roof'],
  ['building_barn', 'large wooden storage barn with corrugated roof'],
  ['building_goat_pen', 'wooden goat pen shelter with fence'],
  ['building_mill', 'small grain mill with turning wooden wheel'],
  ['building_paddock', 'cattle paddock with wooden post fence'],
  ['building_pig_pen', 'pig pen with low wooden fence and mud patch'],
  ['building_borehole', 'modern deep borehole water pump with metal pipe'],
  ['building_greenhouse', 'small glass greenhouse with plants inside'],
];

for (const [id, desc] of ITEM_ICONS) {
  add(
    'item-icons',
    id,
    `ui/items/${id}.png`,
    { w: 32, h: 32 },
    'pixen',
    `${desc}, centered, ${ICON_STYLE}`,
    { noBg: true, detail: 'medium detail' },
  );
}

// Crops: one frame per growth stage on a shared 32x64 canvas (bottom-anchored)
for (const [crop, stages, desc] of CROPS) {
  for (let s = 0; s < stages; s++) {
    const isFinal = s === stages - 1;
    const plant = isFinal
      ? `Fully mature and ready to harvest, ${desc}`
      : `${stagePhrase(s, stages, crop)} of a ${crop} plant`;
    add(
      'crops',
      `${crop}_stage_${s}`,
      `sprites/crops/${crop}/stage_${s}.png`,
      { w: 32, h: 64 },
      'pixen',
      `${plant}. Single plant centered and grounded at the bottom of the canvas with a small top-down soil patch beneath it, ${STYLE}`,
      { noBg: true },
    );
  }
  add(
    'crops',
    `${crop}_product`,
    `sprites/crops/${crop}/product_${crop}.png`,
    { w: 32, h: 32 },
    'pixen',
    `harvested ${crop} ${harvestWord(crop)} icon, single item centered, ${STYLE}`,
    { noBg: true },
  );
  add(
    'crops',
    `${crop}_seed`,
    `sprites/crops/${crop}/seed_${crop}.png`,
    { w: 32, h: 32 },
    'pixen',
    `small seed packet / seed icon for ${crop}, single item centered, ${STYLE}`,
    { noBg: true },
  );
}

// Animals + their products
const ANIMAL_PRODUCTS = {
  chicken: 'brown egg',
  goat: 'small bottle of goat milk',
  cow: 'bottle of fresh milk',
  pig: 'brown truffle mushroom',
};
for (const [animal, desc] of ANIMALS) {
  add(
    'animals',
    `${animal}_idle`,
    `sprites/animals/${animal}/idle.png`,
    { w: 64, h: 48 },
    'pixen',
    `friendly farm ${desc}, standing side view facing right, full body centered, ${STYLE}`,
    { noBg: true },
  );
  add(
    'animals',
    `${animal}_happy`,
    `sprites/animals/${animal}/happy.png`,
    { w: 64, h: 48 },
    'pixen',
    `happy farm ${desc}, standing side view facing right with a small smile and floating heart above, ${STYLE}`,
    { noBg: true },
  );
  add(
    'animals',
    `${animal}_product`,
    `sprites/animals/${animal}/product.png`,
    { w: 32, h: 32 },
    'pixen',
    `${ANIMAL_PRODUCTS[animal]} item icon, single item centered, ${STYLE}`,
    { noBg: true },
  );
}

// Buildings
for (const [building, desc] of BUILDINGS) {
  add(
    'buildings',
    `${building}_lvl1`,
    `sprites/buildings/${building}/lvl1.png`,
    { w: 96, h: 64 },
    'pixen',
    `cozy farm ${desc}, warm wooden and stone construction, front view, centered, ${STYLE}`,
    { noBg: true },
  );
}

// NPCs
for (const [npc, desc] of NPCS) {
  add(
    'npcs',
    npc,
    `sprites/npcs/${npc}.png`,
    { w: 32, h: 64 },
    'pixen',
    `friendly ${desc}, full body front view portrait, centered, ${STYLE}`,
    { noBg: true },
  );
}

// Decor props
for (const [item, desc] of DECOR) {
  add(
    'decor',
    item,
    `tiles/decorations/${item}.png`,
    { w: 64, h: 64 },
    'pixen',
    `${desc}, single scene decoration, centered, ${STYLE}`,
    { noBg: true },
  );
}

// Scene-specific props for Kgotla, Bushveld, Market
const SCENE_PROPS = [
  // Kgotla
  [
    'fire_pit',
    'stone_circle_with_fire',
    'stone circle with a small crackling campfire, warm orange flames, 64x64',
  ],
  [
    'stone_bench',
    'carved_stone_seat',
    'carved stone seating block, rounded top, rough texture, 48x32',
  ],
  [
    'quest_board',
    'wooden_notice_board',
    'wooden notice board with pinned parchment papers and red string, 48x64',
  ],
  [
    'herb_garden',
    'small_herb_plot',
    'small garden plot with colorful herbs and medicinal plants, 64x32',
  ],
  [
    'elder_chair',
    'carved_wooden_chair',
    'raised carved wooden chair with animal skin draped over it, 48x48',
  ],
  [
    'community_circle',
    'stone_circle_ground',
    'circular arrangement of flat stones on red earth ground, 64x64',
  ],
  // Bushveld
  [
    'resource_node',
    'mineral_deposit',
    'shiny mineral deposit embedded in a grey rock face, sparkling, 48x48',
  ],
  ['cave_entrance', 'dark_cave_opening', 'dark cave opening in a rocky hillside with vines, 64x64'],
  ['river_rock', 'smooth_river_stone', 'smooth grey river stone with water sheen, 32x32'],
  ['wild_berry', 'berry_bush', 'small bush with bright red wild berries, 48x48'],
  ['animal_track', 'paw_prints', 'animal paw prints pressed into dusty ground, 32x32'],
  ['bush_camp', 'campfire_sticks', 'small campfire with crossed sticks and stones, 48x48'],
  // Market
  [
    'stall_canopy',
    'striped_fabric_awning',
    'colorful striped fabric awning canopy over wooden poles, 96x48',
  ],
  ['price_board', 'wooden_price_sign', 'wooden sign board with painted numbers and text, 48x48'],
  ['market_cart', 'wooden_pushcart', 'wooden pushcart with two wheels and goods inside, 64x48'],
  ['food_stall', 'cooking_pot_fire', 'cooking pot over a small fire with steam rising, 48x48'],
  [
    'goods_display',
    'wooden_shelf_items',
    'wooden shelf displaying various trade goods and crafts, 64x48',
  ],
];
for (const [id, _file, desc] of SCENE_PROPS) {
  const [w, h] = desc
    .match(/(\d+)x(\d+)/)
    ?.slice(1)
    .map(Number) || [64, 64];
  const cleanDesc = desc.replace(/, \d+x\d+$/, '');
  add(
    'scene-props',
    id,
    `sprites/scene-props/${id}.png`,
    { w, h },
    'pixen',
    `${cleanDesc}, single game prop centered, ${STYLE}`,
    { noBg: true },
  );
}

// Ground: 4 autotile blends + plot tiles
const GROUND_BLENDS = [
  [
    'grass_dirt',
    'short lush savanna grass',
    'dark brown tilled soil with furrows',
    'dry earth transition',
  ],
  [
    'grass_path',
    'short lush savanna grass',
    'worn sandy dirt path with small stones',
    'dusty path edge',
  ],
  ['grass_water', 'short lush savanna grass', 'calm clear blue water', 'wet muddy bank'],
  ['grass_dry', 'short lush savanna grass', 'dry yellow-brown drought grass', 'patchy dry edge'],
];
for (const [id, lower, upper, transition] of GROUND_BLENDS) {
  add('ground', id, `tiles/ground/${id}.json`, { w: 16, h: 16 }, 'tileset', null, {
    lower,
    upper,
    transition,
  });
}
add(
  'ground',
  'plot_soil',
  'tiles/ground/plot_soil.png',
  { w: 32, h: 32 },
  'pixen',
  `top-down farm plot of rich dark tilled soil with visible furrow rows, slight weeds at edge, seamless tile, ${STYLE}`,
  { noBg: false },
);
add(
  'ground',
  'plot_empty',
  'tiles/ground/plot_empty.png',
  { w: 32, h: 32 },
  'pixen',
  `top-down empty farm plot, dark tilled soil in a neat rectangular bed with crisp edges, ${STYLE}`,
  { noBg: false },
);
add(
  'ground',
  'grass_base',
  'tiles/ground/grass_base.png',
  { w: 32, h: 32 },
  'pixen',
  `top-down seamless savanna grass tile, short green grass with subtle texture and tiny flowers, ${STYLE}`,
  { noBg: false },
);

// Backgrounds (pixflux scene art)
for (const [id, scene] of BACKGROUNDS) {
  add('backgrounds', id, `tiles/sky/${id}.png`, { w: 400, h: 300 }, 'pixflux', scene);
}

// Portrait backgrounds (mobile screens, pixflux at max API resolution 400x400)
for (const [id, scene] of BIG_BACKGROUNDS) {
  add('backgrounds', id, `tiles/sky/${id}.png`, { w: 400, h: 400 }, 'pixflux', scene);
}

// Weather
for (const [id, desc] of WEATHER_FX) {
  add(
    'weather',
    id,
    `weather/${id}.png`,
    { w: 64, h: 64 },
    'pixen',
    `${desc}, centered with transparent background, ${STYLE}`,
    { noBg: true },
  );
}

// Particles (fx group)
for (const [id, desc] of PARTICLES) {
  add(
    'fx',
    id,
    `particles/${id}.png`,
    { w: 32, h: 32 },
    'pixen',
    `${desc}, small particle sprite centered, transparent background, ${STYLE}`,
    { noBg: true },
  );
}

// UI assets: panels via the async create-ui-asset pipeline (sizes 192-688),
// buttons via pixen (transparent, crisp, cheap).
const UI_ASSETS = [
  [
    'panel_dialog',
    'ui',
    { w: 384, h: 256 },
    'pixel-art UI dialog panel, warm dark-brown wooden frame with cream inner panel and amber corner accents, rounded 4px pixel corners',
  ],
  [
    'panel_sheet',
    'ui',
    { w: 384, h: 512 },
    'pixel-art UI bottom sheet panel, dark warm wood frame, cream content area, subtle top highlight border',
  ],
  [
    'panel_titlebar',
    'pixen',
    { w: 256, h: 64 },
    `pixel-art UI window title bar strip, dark chocolate wood with cream border, seamless horizontal, ${STYLE}`,
    { noBg: false },
  ],
];
for (const [id, kind, size, desc] of UI_ASSETS) {
  add('ui-assets', id, `ui/panels/${id}.png`, size, kind, desc);
}

// Buttons: separate transparent sprites so the client can 9-slice / tint them.
const UI_BUTTONS = [
  [
    'button_primary',
    'pixel-art UI action button, warm amber fill, dark brown border, rounded 4px pixel corners, glossy top edge',
  ],
  [
    'button_secondary',
    'pixel-art UI button, dark brown fill, amber border, rounded 4px pixel corners',
  ],
  ['button_danger', 'pixel-art UI button, deep red fill, dark border, rounded 4px pixel corners'],
];
for (const [id, desc] of UI_BUTTONS) {
  add(
    'ui-assets',
    id,
    `ui/buttons/${id}.png`,
    { w: 96, h: 48 },
    'pixen',
    `${desc}, single centered button sprite, ${STYLE}`,
    { noBg: true },
  );
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function harvestWord(crop) {
  return { maize: 'cob', wheat: 'grain', sorghum: 'grain', millet: 'grain' }[crop] || 'produce';
}
function stagePhrase(stage, total, crop) {
  if (stage === 0)
    return 'Freshly planted seed just sprouting, tiny green shoot breaking through dark soil';
  const pct = stage / (total - 1);
  if (pct < 0.4) return 'Young green seedling with two small leaves';
  if (pct < 0.75) return 'Growing vigorously as a healthy medium plant with green leaves';
  return 'Nearly mature and tall, with the first produce just forming';
}

/* ============================================================
 * 5. PIXELLAB HTTP HELPERS
 * ============================================================ */
let totalUsageUsd = 0;
let totalCalls = 0;

async function request(path, body, { retries = 5 } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: AUTH,
    body: JSON.stringify(body),
  });
  if (res.status === 429 || res.status >= 500) {
    if (retries <= 0)
      throw new Error(`PixelLab ${path} failed with ${res.status}: ${await res.text()}`);
    const wait = Math.min(15000, 1000 * 2 ** (5 - retries));
    console.log(`    … rate limited (${res.status}), retrying in ${wait / 1000}s`);
    await sleep(wait + Math.random() * 500);
    return request(path, body, { retries: retries - 1 });
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new Error(
      `PixelLab ${path} -> ${res.status}: ${json ? JSON.stringify(json).slice(0, 400) : text.slice(0, 400)}`,
    );
  }
  return json ?? text;
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: AUTH });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new Error(`PixelLab GET ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  return json ?? text;
}

/** Poll a background job until completed/failed. */
async function pollJob(jobId, label, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await get(`/background-jobs/${jobId}`);
    if (job.status === 'completed') return job;
    if (job.status === 'failed')
      throw new Error(`PixelLab job ${label} failed: ${JSON.stringify(job).slice(0, 400)}`);
    if (job.status === 'processing' || job.status === 'pending') {
      await sleep(3000);
      continue;
    }
    return job; // unknown status — let caller decide
  }
  throw new Error(`PixelLab job ${label} timed out after ${timeoutMs / 1000}s`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Base64 -> file. mkdirs parent dirs. */
function writeB64(file, base64) {
  const buf = Buffer.from(base64, 'base64');
  const out = join(ASSET_ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  return out;
}

async function writeUrl(file, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${url} failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = join(ASSET_ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  return out;
}

function trackUsage(usage) {
  if (usage?.usd) totalUsageUsd += usage.usd;
  if (usage?.generations) totalCalls += usage.generations;
  totalCalls += 1;
}

/* ============================================================
 * 6. GENERATORS (one per kind)
 * ============================================================ */

/**
 * pixen / pixenv2: synchronous pixel-art image gen.
 * Returns the file path written.
 */
async function genPixen(asset) {
  const body = {
    description: asset.prompt,
    image_size: { width: asset.size.w, height: asset.size.h },
    outline: asset.opts.outline || 'single color outline',
    detail: asset.opts.detail || 'medium detail',
    seed: seedFor(asset.id),
    no_background: asset.opts.noBg !== false,
    enhance_prompt: false,
  };
  if (asset.opts.view) body.view = asset.opts.view;
  const res = await request('/create-image-pixen', body);
  if (!res?.image?.base64) throw new Error(`pixen ${asset.id}: no image in response`);
  const path = writeB64(asset.file, res.image.base64);
  trackUsage(res.usage);
  return path;
}

/** pixflux: synchronous scene generation (richer art for backgrounds). */
async function genPixflux(asset) {
  const body = {
    description: `${asset.prompt}. ${STYLE}`,
    image_size: { width: asset.size.w, height: asset.size.h },
    text_guidance_scale: 8,
    detail: 'highly detailed',
    seed: seedFor(asset.id),
  };
  const res = await request('/create-image-pixflux', body);
  if (!res?.image?.base64) throw new Error(`pixflux ${asset.id}: no image in response`);
  const path = writeB64(asset.file, res.image.base64);
  trackUsage(res.usage);
  return path;
}

/**
 * tileset: async top-down autotile blend (grass <-> other terrain).
 * POST /create-tileset -> poll job -> GET /tilesets/{id}.
 * Saves every 16 tile PNGs under tiles/ground/<id>/ and a JSON manifest
 * describing each tile's corner/edge pattern for autotile placement.
 */
async function genTileset(asset) {
  const body = {
    lower_description: asset.opts.lower,
    upper_description: asset.opts.upper,
    transition_description: asset.opts.transition,
    tile_size: { width: 16, height: 16 },
    mode: 'standard',
    view: 'low top-down',
    enhance: false,
    seed: seedFor(asset.id),
  };
  const created = await request('/create-tileset', body);
  const jobId = created.background_job_id || created.id;
  const tilesetId = created.tileset_id || created.id;
  if (!jobId && !tilesetId)
    throw new Error(
      `tileset ${asset.id}: unexpected response ${JSON.stringify(created).slice(0, 300)}`,
    );
  console.log(`    … tileset ${asset.id} queued (job ${jobId}, tileset ${tilesetId})`);
  if (jobId) await pollJob(jobId, asset.id);
  await sleep(1500); // let the tileset row finalize after job completion
  const data = await get(`/tilesets/${tilesetId}`);
  const tiles = data?.tileset?.tiles ?? data?.tiles ?? [];
  if (!tiles.length) throw new Error(`tileset ${asset.id}: no tiles returned`);

  const outDir = `tiles/ground/${asset.id}`;
  const records = [];
  for (const tile of tiles) {
    const name = `${outDir}/${tile.id || tile.name}.png`;
    if (tile.image?.base64) writeB64(name, tile.image.base64);
    records.push({
      name: tile.name,
      id: tile.id,
      corners: tile.corners,
      pattern_4x4: tile.pattern_4x4,
      file: name,
    });
  }
  // JSON manifest for autotiling logic
  const manifest = {
    id: asset.id,
    tile_size: data.tileset?.tile_size || { width: 16, height: 16 },
    lower: asset.opts.lower,
    upper: asset.opts.upper,
    transition: asset.opts.transition,
    view: data.metadata?.view || 'low top-down',
    tiles: records,
  };
  const out = join(ASSET_ROOT, asset.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(manifest, null, 2));
  trackUsage(data.usage || created.usage);
  return out;
}

/**
 * ui: async pixel-art UI asset. POST /create-ui-asset -> poll -> image_url.
 */
async function genUi(asset) {
  const body = {
    description: `${asset.prompt}. ${STYLE}`,
    image_size: { width: asset.size.w, height: asset.size.h },
    no_background: false,
    seed: seedFor(asset.id),
  };
  const created = await request('/create-ui-asset', body);
  const assetId = created.ui_asset_id;
  const jobId = created.background_job_id;
  if (!assetId)
    throw new Error(`ui ${asset.id}: no ui_asset_id in ${JSON.stringify(created).slice(0, 300)}`);
  if (jobId) await pollJob(jobId, asset.id);

  // Poll the UI asset record until an image_url appears.
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const rec = await get(`/ui-assets/${assetId}`);
    if (rec.status === 'completed' || rec.status === 'done') {
      if (!rec.image_url) throw new Error(`ui ${asset.id}: completed but no image_url`);
      const path = await writeUrl(asset.file, rec.image_url);
      trackUsage(rec.usage);
      return path;
    }
    if (rec.status === 'failed' || rec.status === 'error') {
      throw new Error(`ui ${asset.id} failed: ${JSON.stringify(rec).slice(0, 400)}`);
    }
    await sleep(3000);
  }
  throw new Error(`ui ${asset.id} timed out`);
}

const GENERATORS = {
  pixen: genPixen,
  pixenv2: genPixen,
  pixflux: genPixflux,
  tileset: genTileset,
  ui: genUi,
};

/* ============================================================
 * 7. RUNNER
 * ============================================================ */
function selectAssets() {
  let list = ASSETS;
  if (flags.all) {
    // everything
  } else if (flags.groups.size > 0) {
    list = list.filter((a) => flags.groups.has(a.group));
  }
  if (flags.skip.size > 0) list = list.filter((a) => !flags.skip.has(a.group));
  if (Number.isFinite(flags.sample)) {
    const seen = new Map();
    list = list.filter((a) => {
      const n = seen.get(a.group) || 0;
      seen.set(a.group, n + 1);
      return n < flags.sample;
    });
  }
  return list;
}

function skipExisting(list) {
  if (flags.force) return list;
  return list.filter((a) => {
    const p = join(ASSET_ROOT, a.file);
    return !existsSync(p);
  });
}

async function main() {
  const selected = selectAssets();
  const todo = flags.dryRun || flags.list ? selected : skipExisting(selected);
  const skipped = flags.dryRun || flags.list ? 0 : selected.length - todo.length;

  // group summary
  const byGroup = {};
  for (const a of todo) byGroup[a.group] = (byGroup[a.group] || 0) + 1;
  console.log(`\nMolemisi PixelLab asset generator\n`);
  console.log(
    `  Planned calls : ${todo.length}${skipped ? ` (${skipped} already on disk — pass --force to regenerate)` : ''}`,
  );
  for (const [g, n] of Object.entries(byGroup)) console.log(`    ${g.padEnd(12)} ${n}`);
  console.log(`  Concurrency   : ${flags.concurrency}`);
  console.log(`  Mode          : ${flags.dryRun ? 'DRY RUN (no API calls)' : 'LIVE'}\n`);

  if (flags.list || flags.dryRun) {
    if (!API_KEY) console.log('  (no PIXELLAB_API_KEY found — dry run only lists calls)\n');
    for (const a of todo) {
      console.log(
        `  [${a.group}] ${a.id.padEnd(28)} -> ${a.file} (${a.kind} ${a.size.w}x${a.size.h})`,
      );
    }
    if (flags.dryRun) console.log('\nDry run complete — nothing was generated.\n');
    return;
  }

  // Print balance
  try {
    const bal = await get('/balance');
    const credits = bal.credits ? `${bal.credits.usd ?? 0} USD` : 'n/a';
    const sub = bal.subscription
      ? `${bal.subscription.plan ?? bal.subscription.type} (${bal.subscription.status})`
      : 'n/a';
    console.log(`  Account balance: ${credits} | Subscription: ${sub}\n`);
  } catch (e) {
    console.log(`  (could not read /balance: ${e.message})\n`);
  }

  const manifest = loadManifest();
  if (todo.length === 0) {
    // Nothing new to generate — still reconcile the manifest against disk so a
    // re-run (or run after deleting manifest.json) restores every entry.
    for (const a of selected) {
      if (!manifest[a.id] && existsSync(join(ASSET_ROOT, a.file))) {
        manifest[a.id] = {
          group: a.group,
          file: a.file,
          size: a.size,
          kind: a.kind,
          prompt: a.prompt,
        };
      }
    }
    writeManifest(manifest);
    console.log('Nothing to generate — manifest reconciled with existing files.\n');
    return;
  }
  const results = { ok: 0, failed: [] };
  let idx = 0;

  async function worker() {
    while (idx < todo.length) {
      const asset = todo[idx++];
      const gen = GENERATORS[asset.kind];
      if (!gen) {
        results.failed.push([asset.id, `no generator for ${asset.kind}`]);
        continue;
      }
      try {
        const path = await gen(asset);
        manifest[asset.id] = {
          group: asset.group,
          file: asset.file,
          size: asset.size,
          kind: asset.kind,
          prompt: asset.prompt,
        };
        // one atomic line per asset so concurrent workers don't garble output
        console.log(`  [${asset.group}] ${asset.id.padEnd(30)} OK  ${asset.file}`);
        results.ok++;
      } catch (e) {
        console.log(`  [${asset.group}] ${asset.id.padEnd(30)} FAIL  ${e.message}`);
        results.failed.push([asset.id, e.message]);
      }
    }
  }

  const workers = Array.from({ length: flags.concurrency }, () => worker());
  await Promise.all(workers);

  // Reconcile the manifest against every selected asset whose file exists on
  // disk (generated now, or skipped from an earlier run), so a resumable or
  // partially-interrupted run still yields a complete manifest.
  for (const a of selected) {
    const out = join(ASSET_ROOT, a.file);
    if (!manifest[a.id] && existsSync(out)) {
      manifest[a.id] = {
        group: a.group,
        file: a.file,
        size: a.size,
        kind: a.kind,
        prompt: a.prompt,
      };
    }
  }

  writeManifest(manifest);
  console.log(`\nDone. ${results.ok} generated, ${results.failed.length} failed.`);
  if (totalUsageUsd > 0)
    console.log(
      `  Total usage reported: $${totalUsageUsd.toFixed(4)} (across ${totalCalls} calls)`,
    );
  if (results.failed.length) {
    console.log('\nFailed assets:');
    for (const [id, err] of results.failed) console.log(`  ✗ ${id}: ${err}`);
  }
  console.log(`\nManifest written to ${MANIFEST_PATH}\n`);
}

/* Manifest helpers (accumulate across runs) */
function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}
function writeManifest(manifest) {
  mkdirSync(ASSET_ROOT, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

main().catch((e) => {
  console.error('\nFatal:', e.message);
  process.exit(1);
});
