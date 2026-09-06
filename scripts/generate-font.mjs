#!/usr/bin/env node
/**
 * Molemisi — Pixel font generator via PixelLab /generate-font-pro.
 *
 * Generates the cultural/tribal pixel display font from the Font Guide
 * (docs/Font_Guide.png) and downloads the resulting font files.
 *
 * Usage: node scripts/generate-font.mjs [--seed N] [--weight Bold|Regular] [--px 8|16|32|64]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = readFileSync(join(root, '.env'), 'utf8');
const KEY = (env.match(/^PIXELLAB_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) {
  console.error('PIXELLAB_API_KEY missing from .env');
  process.exit(1);
}

const BASE = 'https://api.pixellab.ai/v2';
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};

const WEIGHT = getArg('--weight', 'Bold');
const GLYPH_PX = parseInt(getArg('--px', '16'), 10);
const SEED = getArg('--seed') ? parseInt(getArg('--seed'), 10) : Math.floor(Math.random() * 1e9);

/**
 * Style description per the Molemisi font spec: 16-bit RPG pixel font,
 * bold geometric glyphs, sharp carved spur serifs, tribal bracketed
 * terminals, uniform line weight, crisp off-white, no anti-aliasing.
 */
const DESCRIPTION = [
  '16-bit RPG pixel font for game UI, bold geometric glyphs,',
  'sharp carved spur serifs and tribal bracketed terminals,',
  'uniform line weight on a strict pixel grid,',
  'crisp off-white letters, clean pixel lines, no anti-aliasing,',
  'high-contrast display silhouette with distinctive cutout counters,',
  'complete uppercase A-Z, lowercase a-z, numbers 0-9 and basic punctuation,',
  'retro game UI aesthetic, legible at small sizes',
].join(' ');

const FONT_NAME = 'Molemisi Pixel';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = new Error(`${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

/** GET a job endpoint; 423 means still processing. Returns null while busy. */
async function pollJob(path) {
  try {
    return await req(path);
  } catch (e) {
    if (e.status === 423 || e.status === 202 || e.status === 425) return null; // still working
    throw e;
  }
}

// 1. Submit the job
console.log(`[font] Submitting generate-font-pro (weight=${WEIGHT}, glyph_px=${GLYPH_PX}, seed=${SEED})`);
const created = await req('/generate-font-pro', {
  method: 'POST',
  body: JSON.stringify({
    description: DESCRIPTION,
    weight: WEIGHT,
    glyph_px: GLYPH_PX,
    seed: SEED,
    font_name: FONT_NAME,
  }),
});
const jobId = created.background_job_id || created.job_id || created.id;
console.log(`[font] Job queued: ${jobId}`);

// 2. Poll until done (423 = still processing, with ETA)
let result = null;
for (let i = 0; i < 90; i++) {
  await sleep(10000);
  const status = await pollJob(`/generate-font-pro/${jobId}`);
  if (!status) {
    console.log(`[font] poll ${i + 1}: processing…`);
    continue;
  }
  const st = status.status || status.job?.status;
  console.log(`[font] poll ${i + 1}: ${st || 'no-status'}`);
  if (st === 'completed' || st === 'succeeded' || status.font || status.result) {
    result = status;
    break;
  }
  if (st === 'failed' || st === 'error') {
    console.error('[font] Job failed:', JSON.stringify(status).slice(0, 500));
    process.exit(1);
  }
}
if (!result) {
  console.error('[font] Timed out waiting for job');
  process.exit(1);
}

// 3. Download whatever files came back
const outDir = join(root, 'assets', 'branding', 'font');
mkdirSync(outDir, { recursive: true });

const payload = result.font || result.result?.font || result.result || result;
console.log('[font] Result keys:', Object.keys(payload).join(', '));

const files = [];
const collect = (obj, prefix = '') => {
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'string' && (v.startsWith('http') || (v.length > 200 && v.includes('base64')))) {
      files.push({ name: `${prefix}${k}`, value: v });
    } else if (typeof v === 'object' && v !== null) {
      collect(v, `${prefix}${k}.`);
    }
  }
};
collect(payload);
for (const f of files) console.log(`[font] found file field: ${f.name}`);

let saved = 0;
for (const f of files) {
  try {
    let buf;
    if (f.value.startsWith('http')) {
      const dl = await fetch(f.value);
      buf = Buffer.from(await dl.arrayBuffer());
    } else {
      buf = Buffer.from(f.value.replace(/^data:[^;]+;base64,/, ''), 'base64');
    }
    const ext = f.name.toLowerCase().includes('ttf')
      ? 'ttf'
      : f.name.toLowerCase().includes('woff2')
        ? 'woff2'
        : f.name.toLowerCase().includes('woff')
          ? 'woff'
          : f.name.toLowerCase().includes('atlas') || f.name.toLowerCase().includes('png')
            ? 'png'
            : 'bin';
    const name = `${FONT_NAME.toLowerCase().replace(/ /g, '-')}-${f.name.replace(/\./g, '_')}.${ext}`;
    writeFileSync(join(outDir, name), buf);
    console.log(`[font] saved ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
    saved++;
  } catch (e) {
    console.error(`[font] failed to save ${f.name}: ${e.message}`);
  }
}

// Save the raw response for inspection regardless
writeFileSync(join(outDir, 'last-response.json'), JSON.stringify(result, null, 2));
console.log(`[font] Done. ${saved} file(s) saved to assets/branding/font/ (raw response in last-response.json)`);
