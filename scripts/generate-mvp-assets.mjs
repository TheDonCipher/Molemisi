#!/usr/bin/env node
/**
 * Molemisi — MVP asset generator (docs/MVP 01–07)
 * ================================================
 * Generates ONLY the assets the MVP spec needs that do not already exist:
 *
 *   - Morula (the crop that replaces Saffron — F18)
 *   - Crafted goods: Poleto (plank), Thapo (rope), Setena (brick), Bupi (flour), Borotho (bread)
 *   - Bushveld materials: Letsopa (clay), Mokolwane (palm fiber), Lotlhaka (reeds), Phane (mophane worms), Manyoro (manure)
 *   - Bushveld scene backgrounds, four restoration stages each (04 §7.2 — the Journal reward)
 *   - Hotspot "tells" — the tappable visual cue in each scene (04 §6)
 *   - The Jojo tank (03 §1.2 — water is the central tension) and a water-drop icon
 *   - Mogolo, the elder who narrates the Field Journal (04 §6)
 *
 * Uses PixelLab v2 /create-image-pixen. Output lands in assets/ and is synced to
 * apps/web/public/assets by `pnpm assets:sync`.
 *
 * Usage
 *   node scripts/generate-mvp-assets.mjs --dry-run
 *   node scripts/generate-mvp-assets.mjs               # everything missing
 *   node scripts/generate-mvp-assets.mjs --force
 *   node scripts/generate-mvp-assets.mjs --concurrency 4
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ASSET_ROOT = join(REPO_ROOT, 'assets');
const BASE = 'https://api.pixellab.ai/v2';

/* ------------------------------------------------------------------ CLI */
const argv = process.argv.slice(2);
const flags = { dryRun: false, force: false, concurrency: 3, key: null, group: null, only: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const nxt = () => argv[++i];
  switch (a) {
    case '--dry-run':
      flags.dryRun = true;
      break;
    case '--force':
      flags.force = true;
      break;
    case '--key':
      flags.key = nxt();
      break;
    case '--concurrency':
      flags.concurrency = Math.max(1, Number(nxt()) || 3);
      break;
    case '--group':
      flags.group = nxt();
      break;
    case '--only':
      flags.only = nxt();
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ KEY */
function loadApiKey() {
  if (flags.key) return flags.key;
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY;
  for (const f of ['.env', '.env.local']) {
    const p = join(REPO_ROOT, f);
    if (existsSync(p)) {
      const m = readFileSync(p, 'utf8').match(/^\s*PIXELLAB_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (m) return m[1].trim();
    }
  }
  throw new Error('No PixelLab API key. Pass --key or set PIXELLAB_API_KEY.');
}
const AUTH = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
});
let API_KEY = null;

/* ------------------------------------------------------------------ HTTP */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pixen(description, size, seed, noBackground = true) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${BASE}/create-image-pixen`, {
      method: 'POST',
      headers: AUTH(),
      body: JSON.stringify({
        description,
        image_size: { width: size.w, height: size.h },
        outline: 'single color outline',
        detail: 'medium detail',
        seed,
        no_background: noBackground,
        enhance_prompt: false,
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(20000, 1500 * 2 ** attempt);
      console.log(`   … ${res.status}, retry in ${(wait / 1000).toFixed(1)}s`);
      await sleep(wait + Math.random() * 500);
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`pixen ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    if (!json?.image?.base64) throw new Error('pixen: no image in response');
    return json;
  }
  throw new Error('pixen: exhausted retries');
}

function seedFor(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

/* ================================================================== ASSETS */
const STYLE = '16-bit pixel art, Stardew Valley inspired, warm Southern African palette, clean readable silhouette';

/** @type {{id:string,file:string,w:number,h:number,bg:boolean,group:string,prompt:string}[]} */
const ASSETS = [];

function add(group, id, file, w, h, prompt, bg = false) {
  ASSETS.push({ id, file, w, h, bg, group, prompt: `${prompt}. ${STYLE}` });
}

/* ---- 1. Morula — the crop that replaced Saffron (F18) ----------------- */
const MORULA_STAGES = [
  'a young marula tree seedling, two small leaves, freshly planted in dry sandy soil',
  'a small marula sapling with a few broad green leaves, knee high',
  'a half-grown marula tree, fuller crown of grey-green leaves, green unripe fruit forming',
  'a mature marula tree with a broad crown heavy with ripe yellow fruit, some fruit fallen on the ground',
];
MORULA_STAGES.forEach((p, i) =>
  add('morula', `morula_stage_${i + 1}`, `sprites/crops/morula/stage_${i + 1}.png`, 64, 64, p),
);
add('morula', 'seed_morula', 'ui/items/seed_morula.png', 32, 32, 'a pixel art seed packet labelled with a small yellow marula fruit symbol, paper sachet');
add('morula', 'product_morula', 'ui/items/product_morula.png', 32, 32, 'a cluster of ripe yellow marula fruits, pale green-yellow skin, single fruit in front');

/* ---- 2. Crafted goods (02 §6.3) --------------------------------------- */
add('crafted', 'product_plank', 'ui/items/product_poleto.png', 32, 32, 'a smooth wooden plank, pale blonde timber, cut end visible');
add('crafted', 'product_rope', 'ui/items/product_thapo.png', 32, 32, 'a coiled length of twisted fibre rope, pale tan palm fibre');
add('crafted', 'product_brick', 'ui/items/product_setena.png', 32, 32, 'a single red clay brick, rough handmade texture');
add('crafted', 'product_flour', 'ui/items/product_bupi.png', 32, 32, 'a cloth sack of pale sorghum flour, tied at the neck');
add('crafted', 'product_bread', 'ui/items/product_borotho.png', 32, 32, 'a round golden-brown loaf of bread, dusted with flour');

/* ---- 3. Bushveld materials (02 §6.2) ---------------------------------- */
add('materials', 'material_clay', 'ui/items/material_letsopa.png', 32, 32, 'a lump of grey-brown wet river clay, thumbprint visible');
add('materials', 'material_palm_fiber', 'ui/items/material_mokolwane.png', 32, 32, 'a bundle of long green palm fronds and stripped pale fibre');
add('materials', 'material_thatch', 'ui/items/material_lotlhaka.png', 32, 32, 'a bundle of dried golden reeds and thatching grass, tied with string');
add('materials', 'material_phane', 'ui/items/material_phane.png', 32, 32, 'a small pile of mophane worms, mottled brown and orange caterpillars on a leaf');
add('materials', 'material_manure', 'ui/items/material_manyoro.png', 32, 32, 'a small dark heap of dried livestock manure and straw');

/* ---- 4. Bushveld scenes — four restoration stages each (04 §7.2) ------- */
const SCENES = [
  {
    slug: 'open_bush',
    name: 'Naga e Bulegileng',
    base: 'open Botswana bushveld savanna: pale Kalahari sand, scattered acacia thorn trees, dry golden grass, a wide flat horizon under a hazy blue sky',
  },
  {
    slug: 'riverbank',
    name: 'Fa Nokeng',
    base: 'a sandy riverbank in Botswana: a slow brown river, reeds and makalani palms along the water, muddy edge, green vegetation',
  },
  {
    slug: 'rocky_outcrop',
    name: 'Matlapa a Kwa Godimo',
    base: 'a granite rocky outcrop in Botswana: smooth grey boulders stacked on a rise, dust and dry grass between the rocks, distant flat plains',
  },
];
const STAGE_BRIEF = [
  'over-grazed and degraded, bare eroded soil, few plants, muted dusty colour, no birds, tired and tired-looking land',
  'beginning to recover, patches of grass returning, a few new shrubs, slightly greener, one or two birds in the sky',
  'largely recovered, grass and shrubs thick, wildflowers, several birds, butterflies, healthy warm colour',
  'fully restored and abundant, lush grass, flowering plants, trees full of leaf, birds and butterflies everywhere, rich warm colour',
];
for (const s of SCENES) {
  STAGE_BRIEF.forEach((brief, i) => {
    add(
      'scenes',
      `${s.slug}_stage_${i}`,
      `backgrounds/${s.slug}_stage_${i}.png`,
      512,
      288,
      `wide pixel-art landscape of ${s.base}. Ecological state: ${brief}. No people, no buildings, no text.`,
      true,
    );
  });
}

/* ---- 5. Hotspot "tells" (04 §6) --------------------------------------- */
const HOTSPOTS = [
  ['open_bush', 'deadfall', 'a fallen dead tree branch lying on sand, bark stripped, a few twigs'],
  ['open_bush', 'tracks', 'animal hoof prints pressed into pale sand, heart shaped kudu tracks'],
  ['open_bush', 'feather', 'a speckled guinea fowl feather caught in dry thorn grass'],
  ['riverbank', 'clay', 'a exposed patch of grey-brown river clay on a bank, glistening damp'],
  ['riverbank', 'palm', 'a clipped makalani palm frond lying on sand, long green blades'],
  ['riverbank', 'reeds', 'a stand of tall green reeds at the water edge, gently bent'],
  ['riverbank', 'ripple', 'a single ripple ring spreading on brown river water near the bank'],
  ['riverbank', 'mud_tracks', 'broad splayed hoof prints sunk deep in wet mud at the water edge'],
  ['riverbank', 'morula_tree', 'a marula tree with ripe yellow fruit on the ground beneath it near a river'],
  ['rocky_outcrop', 'glint', 'a cluster of grey stones with a bright white quartz shard catching the light'],
  ['rocky_outcrop', 'crevice', 'a dark crack between granite boulders, dust and small stones'],
  ['rocky_outcrop', 'perch', 'a flat topped rock ledge on an outcrop, a bird of prey silhouette above'],
  ['rocky_outcrop', 'aloe', 'a spiky aloe plant with thick leaves wedged into a rock crack, orange flower spike'],
];
for (const [scene, tell, prompt] of HOTSPOTS) {
  add('hotspots', `hotspot_${scene}_${tell}`, `sprites/hotspots/${scene}_${tell}.png`, 64, 64, `pixel art game icon: ${prompt}`);
}

/* ---- 6. Water: the Jojo tank (03 §1.2) -------------------------------- */
add('water', 'building_jojo_tank', 'ui/items/building_jojo_tank.png', 64, 64, 'a green cylindrical plastic Jojo water tank on a stand with a tap and a downpipe, as seen on Botswana homesteads');
add('water', 'icon_water_drop', 'ui/icons/status_water_drop.png', 24, 24, 'a single blue water droplet icon');
add('water', 'icon_kagiso_pip', 'ui/icons/status_kagiso_pip.png', 24, 24, 'a small round soft green leaf token icon, glowing gently');
add('water', 'icon_tank_empty', 'ui/icons/status_tank_empty.png', 24, 24, 'an empty water tank warning icon');

/* ---- 7. Mogolo — the Field Journal narrator (04 §6) ------------------- */
add('npc', 'npc_mogolo', 'sprites/npcs/mogolo.png', 64, 64, 'portrait bust of an elderly Botswana man, short grey hair and a neat grey beard, weathered kind face, a brown leather hat, wearing a simple shirt');

/* ================================================================== MAIN */
async function main() {
  API_KEY = loadApiKey();

  let list = ASSETS;
  if (flags.group) list = list.filter((a) => a.group === flags.group);
  if (flags.only) list = list.filter((a) => a.id.includes(flags.only));
  if (!flags.force) list = list.filter((a) => !existsSync(join(ASSET_ROOT, a.file)));

  console.log(`\nMolemisi MVP assets — ${list.length} to generate (${ASSETS.length - list.length} already present)\n`);
  if (flags.dryRun) {
    for (const a of list) console.log(`  [${a.group}] ${a.file}  ${a.w}x${a.h}`);
    return;
  }

  let done = 0;
  let failed = 0;
  const queue = [...list];
  const workers = Array.from({ length: Math.min(flags.concurrency, queue.length) }, async () => {
    while (queue.length) {
      const a = queue.shift();
      if (!a) break;
      try {
        const res = await pixen(a.prompt, { w: a.w, h: a.h }, seedFor(a.id), !a.bg);
        const out = join(ASSET_ROOT, a.file);
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, Buffer.from(res.image.base64, 'base64'));
        done++;
        console.log(`  ✓ (${done}/${list.length}) ${a.file}`);
      } catch (e) {
        failed++;
        console.error(`  ✗ ${a.file}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);

  console.log(`\nDone: ${done} written, ${failed} failed.`);
  if (done > 0) console.log('Run `pnpm assets:sync` to publish into apps/web/public/assets.');
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
