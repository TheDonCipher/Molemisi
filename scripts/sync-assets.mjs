#!/usr/bin/env node
/**
 * Molemisi — Asset sync.
 *
 * Copies the generated assets/ directory into apps/web/public/assets/ so the
 * Next.js web app can serve them over HTTP at /assets/...
 *
 * Run from the repo root:  node scripts/sync-assets.mjs
 * (also wired into `pnpm dev` / `pnpm build` via predev/prebuild.)
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'assets');
// Where the assets are served from over HTTP (the web app hosts the game in the browser).
const publicDir = join(root, 'apps', 'web', 'public', 'assets');
const manifestPath = join(assetsDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.warn(`[sync-assets] No ${manifestPath} found — skipping. Run the asset generator first.`);
  process.exit(0);
}

// Copy the whole assets tree into the web public folder.
mkdirSync(publicDir, { recursive: true });
cpSync(assetsDir, publicDir, { recursive: true, force: true });
let copied = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(dir, entry.name));
    else copied++;
  }
};
walk(publicDir);

console.log(`[sync-assets] Copied assets -> ${publicDir.replace(root, '.')}`);
console.log(`[sync-assets] ${copied} files synced total`);
