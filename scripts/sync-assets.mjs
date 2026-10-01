#!/usr/bin/env node
/**
 * Molemisi — Asset sync.
 *
 * Copies the generated assets/ directory into apps/web/public/assets/ so the
 * Next.js web app can serve them over HTTP at /assets/...
 *
 * Run from the repo root:  node scripts/sync-assets.mjs
 * (also wired into `pnpm dev` / `pnpm build` via predev/prebuild.)
 *
 * ── Why this script prunes, and how it prunes safely ──────────────────────────
 * `cpSync({ force: true })` only adds and overwrites — it never deletes. That made
 * the served tree accretionary: a renamed or archived asset kept its old file and
 * stayed reachable over HTTP forever (this is how the retired ground-tile UUIDs
 * survived the 2.4 rename from `wang_0`/`wang_15` to `0.png`/`15.png`).
 *
 * The fix is to delete served files that no longer have a source counterpart — but
 * NOT by wiping the whole directory, because the served tree also legitimately holds
 * a few files that were committed directly and have no counterpart under `assets/`
 * (currently `backgrounds/{bushveld,farm,kgotla,market}_scene.png`, tracked since
 * `ecf811d`). A blanket wipe deletes those, which is a real regression.
 *
 * So the prune is deliberate and conservative:
 *   - a served file is a candidate for deletion ONLY if the source tree has no file
 *     at the same relative path;
 *   - candidates under `backgrounds/` are protected by name pattern (the known
 *     hand-committed scene backdrops);
 *   - anything else removed is reported, so an unexpected deletion is visible.
 *
 * `--keep` skips the prune entirely for a fast incremental copy.
 * `--dry-run` reports what would happen without touching disk.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'assets');
// Where the assets are served from over HTTP (the web app hosts the game in the browser).
const publicDir = join(root, 'apps', 'web', 'public', 'assets');
const manifestPath = join(assetsDir, 'manifest.json');
const keepFlag = process.argv.includes('--keep');
const dryRun = process.argv.includes('--dry-run');

/**
 * Served files that are committed directly and have no `assets/` counterpart.
 * These must survive a prune. If you add a hand-placed backdrop, add it here.
 */
const PROTECTED = [
  /^backgrounds[\\/][a-z_]+_scene\.png$/,
];

/**
 * Source subtrees that must NOT be published. `assets/_archive/` holds assets retired
 * from the live catalogue (2.11): they are kept in the repo for provenance and for a
 * future v1.1 to reclaim, but they are not part of the game and must not be
 * downloadable from a public URL. The generator never references them either.
 */
const SOURCE_EXCLUDE = [
  /^_archive([\\/]|$)/,
];

if (!existsSync(manifestPath)) {
  console.warn(`[sync-assets] No ${manifestPath} found — skipping. Run the asset generator first.`);
  process.exit(0);
}

/** All files under a directory, as paths relative to that directory. */
function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(relative(dir, full));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

const sourceFiles = new Set(listFiles(assetsDir).filter((f) => !SOURCE_EXCLUDE.some((re) => re.test(f))));
const protectedOrphans = [];
const removed = [];

// Prune: every served file with no source counterpart, minus the protected ones.
if (existsSync(publicDir) && !keepFlag) {
  for (const rel of listFiles(publicDir)) {
    const relPosix = rel.split(sep).join('/');
    if (sourceFiles.has(rel)) continue;
    // An excluded source subtree was published by an earlier run — remove it.
    if (PROTECTED.some((re) => re.test(rel))) {
      protectedOrphans.push(relPosix);
      continue;
    }
    removed.push(relPosix);
    if (!dryRun) rmSync(join(publicDir, rel), { force: true });
  }
  // Drop directories the prune emptied, so the tree stays honest.
  if (!dryRun) {
    const pruneEmptyDirs = (d) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = join(d, entry.name);
        pruneEmptyDirs(full);
        if (readdirSync(full).length === 0) rmSync(full, { recursive: true, force: true });
      }
    };
    pruneEmptyDirs(publicDir);
  }
}

// Copy the source tree into the web public folder (adds + overwrites only).
// Excluded subtrees (`_archive`) are copied file-by-file away from, so they are never
// published in the first place — pruning them afterwards is not enough, because
// cpSync would simply recreate the directory.
if (!dryRun) {
  mkdirSync(publicDir, { recursive: true });
  const copyTree = (srcDir, destDir) => {
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      const src = join(srcDir, entry.name);
      const dest = join(destDir, entry.name);
      const rel = relative(assetsDir, src).split(sep).join('/');
      if (SOURCE_EXCLUDE.some((re) => re.test(rel))) continue;
      if (entry.isDirectory()) copyTree(src, dest);
      else cpSync(src, dest, { force: true });
    }
  };
  copyTree(assetsDir, publicDir);
}

const copied = dryRun ? sourceFiles.size : listFiles(publicDir).length;

console.log(`[sync-assets] Copied assets -> ${publicDir.replace(root, '.')}${keepFlag ? ' (incremental, no prune)' : ''}${dryRun ? ' (dry run)' : ''}`);
if (removed.length) {
  console.log(`[sync-assets] Pruned ${removed.length} stale served file(s) with no source:`);
  for (const r of removed) console.log(`              - ${r}`);
}
if (protectedOrphans.length) {
  console.log(`[sync-assets] Kept ${protectedOrphans.length} committed backdrop(s) with no source (by design):`);
  for (const r of protectedOrphans) console.log(`              · ${r}`);
}
console.log(`[sync-assets] ${copied} files present in the served tree`);
