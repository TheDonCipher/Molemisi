#!/usr/bin/env node
/**
 * 2.4 / doc 30 V-4.4 — normalise the ground autotile folders.
 *
 * The four ground autotile sets (grass_dirt / grass_dry / grass_path / grass_water)
 * were generated as complete 16-tile Wang sets, but two tiles in each — `wang_0`
 * (all four corners "lower", the pure ground fill) and `wang_15` (all four "upper",
 * the pure overlay fill) — were written to disk under their generation UUID instead
 * of the numeric id used by the other fourteen. Doc 30 read these as "8 stray
 * UUID-named PNGs" and proposed purging them; that is wrong. They are load-bearing:
 * every set needs *some* all-lower and all-upper tile, and neither has a numeric
 * twin. The defect is the *name*, not the file.
 *
 * This script therefore renames them into the 1–14 scheme already in use:
 *
 *     wang_0  -> 0.png     wang_15 -> 15.png
 *
 * and rewrites the `file` field in each set's .json to match. It also emits
 * `grass_base.png`: the 16 tiles composited 4x4 into the single 64x64 sheet the
 * JSON's `pattern_4x4` field describes, which is what a `tileset` consumer expects.
 *
 * Idempotent: a second run finds nothing to rename and regenerates the same sheet.
 *
 * Usage:  node scripts/normalize-ground-tiles.mjs [--check]
 *   --check   report what would change, write nothing
 */

import { readFileSync, writeFileSync, renameSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GROUND = join(ROOT, 'assets', 'tiles', 'ground');
const WEB_GROUND = join(ROOT, 'apps', 'web', 'public', 'assets', 'tiles', 'ground');
const SETS = ['grass_dirt', 'grass_dry', 'grass_path', 'grass_water'];
const CHECK = process.argv.includes('--check');

const log = (...a) => console.log(CHECK ? '[check]' : '[apply]', ...a);

/** Where the composited sheet is written (source tree; sync-assets copies it out). */
const BASE_SHEET = join(GROUND, 'grass_base.png');

function numericNameFor(tileJsonFile) {
  // `file` looks like "tiles/ground/grass_dry/<name>.png".
  const base = tileJsonFile.split('/').pop();
  return /^\d+\.png$/.test(base) ? null : base;
}

function loadSet(set) {
  const jsonPath = join(GROUND, `${set}.json`);
  if (!existsSync(jsonPath)) return null;
  return { jsonPath, data: JSON.parse(readFileSync(jsonPath, 'utf8')) };
}

/** Rename the UUID tiles to their numeric wang_N id and rewrite the JSON. */
function normalizeSet(set) {
  const loaded = loadSet(set);
  if (!loaded) {
    log(`!! ${set}.json missing — skipped`);
    return { renames: [], tiles: [] };
  }
  const { jsonPath, data } = loaded;
  const renames = [];

  for (const tile of data.tiles) {
    const base = tile.file.split('/').pop();
    // Already numeric (0-15)? Nothing to do.
    if (numericNameFor(tile.file) === null) continue;

    const m = /^wang_(\d+)$/.exec(tile.name ?? '');
    if (!m) {
      log(`   ? ${set}/${base} has non-numeric name and no wang_ id — left alone`);
      continue;
    }
    const newBase = `${m[1]}.png`;
    const from = join(GROUND, set, base);
    const to = join(GROUND, set, newBase);

    if (!existsSync(from)) {
      log(`   ? ${set}/${base} referenced but absent on disk — rewriting JSON only`);
    } else if (existsSync(to)) {
      log(`   ! ${set}/${newBase} already exists; ${base} left in place (manual review)`);
      continue;
    } else {
      if (!CHECK) renameSync(from, to);
      renames.push([base, newBase]);
    }
    tile.file = `tiles/ground/${set}/${newBase}`;
  }

  if (renames.length && !CHECK) {
    writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  }
  return { renames, tiles: data.tiles };
}

/**
 * Composite the 16 tiles into the 4x4 sheet the set's pattern_4x4 implies.
 * Uses Pillow via the managed Python venv (no node image deps in this repo).
 */
function composite(baseTileSet, tiles) {
  const py = process.env.MOLEMISI_PYTHON;
  if (!py) {
    log('   (skipped grass_base.png — set MOLEMISI_PYTHON to composite)');
    return;
  }
  // Order tiles by numeric id so tile N lands at (N % 4, floor(N / 4)).
  // `file` is repo-relative ("tiles/ground/grass_dry/7.png"); ROOT + file is its absolute path.
  const ordered = [];
  for (let id = 0; id < 16; id++) {
    const t = tiles.find((x) => Number(x.file.split('/').pop().replace('.png', '')) === id);
    if (t) ordered.push(join(ROOT, 'assets', t.file));
  }
  if (ordered.length !== 16) {
    log(`   (skipped grass_base.png — only ${ordered.length}/16 tiles resolvable)`);
    return;
  }
  const script = `
import sys
from PIL import Image
paths = sys.argv[1:17]
out = sys.argv[17]
sheet = Image.new('RGBA', (64, 64))
for i, p in enumerate(paths):
    t = Image.open(p).convert('RGBA')
    sheet.paste(t, ((i % 4) * 16, (i // 4) * 16))
sheet.save(out)
`;
  const args = ['-c', script, ...ordered, BASE_SHEET];
  try {
    execFileSync(py, args, { stdio: 'inherit' });
    log(`   composited grass_base.png (64x64)`);
  } catch (e) {
    log(`   !! grass_base.png composite failed: ${e.message}`);
  }
}

let totalRenames = 0;
for (const set of SETS) {
  const { renames, tiles } = normalizeSet(set);
  if (renames.length) {
    log(`${set}: ${renames.map(([a, b]) => `${a} -> ${b}`).join(', ')}`);
  } else {
    log(`${set}: already normalised`);
  }
  totalRenames += renames.length;
  if (!CHECK) composite(set, tiles);
}

// Mirror the base sheet into the web public tree (sync-assets would do this on build).
if (!CHECK && existsSync(BASE_SHEET) && existsSync(dirname(WEB_GROUND))) {
  writeFileSync(join(WEB_GROUND, 'grass_base.png'), readFileSync(BASE_SHEET));
}

log(`done — ${totalRenames} file(s) renamed${CHECK ? ' (dry run)' : ''}`);
