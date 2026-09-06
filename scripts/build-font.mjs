#!/usr/bin/env node
/**
 * Molemisi Pixel — compile the hand-drawn glyph set into a TTF and
 * render an ASCII specimen for review.
 *
 * Output:
 *   assets/branding/font/MolemisiPixel-Bold.ttf
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTTF } from './lib/ttf.mjs';
import { GLYPHS } from './lib/glyphs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'branding', 'font');
mkdirSync(outDir, { recursive: true });

// Validate glyphs: uniform row width
let bad = 0;
for (const [ch, rows] of Object.entries(GLYPHS)) {
  if (rows.length !== 12) {
    console.error(`[font] '${ch}' has ${rows.length} rows (expect 12)`);
    bad++;
  }
  const w = rows[0].length;
  if (rows.some((r) => r.length !== w)) {
    console.error(`[font] '${ch}' has ragged rows`);
    bad++;
  }
}
if (bad) process.exit(1);

const ttf = buildTTF(GLYPHS, {
  familyName: 'Molemisi Pixel',
  styleName: 'Bold',
  ascender: 10 * 128,
  descender: 2 * 128,
});
writeFileSync(join(outDir, 'MolemisiPixel-Bold.ttf'), ttf);
console.log(`[font] Wrote MolemisiPixel-Bold.ttf (${(ttf.length / 1024).toFixed(1)} KB, ${Object.keys(GLYPHS).length} glyphs)`);

// Copy into the web app for next/font/local (build-time reference)
const webFontDir = join(root, 'apps', 'web', 'public', 'fonts');
mkdirSync(webFontDir, { recursive: true });
copyFileSync(join(outDir, 'MolemisiPixel-Bold.ttf'), join(webFontDir, 'MolemisiPixel-Bold.ttf'));
console.log('[font] Copied to apps/web/public/fonts/');

// ASCII specimen of every glyph
console.log('\nMolemisi Pixel — specimen\n');
const chars = Object.keys(GLYPHS);
for (let i = 0; i < chars.length; i += 8) {
  const slice = chars.slice(i, i + 8);
  for (let row = 0; row < 12; row++) {
    console.log(slice.map((ch) => GLYPHS[ch][row]).join('  '));
  }
  console.log('   ' + slice.map((c) => c.replace(/ /, '␣')).join('     '));
  console.log();
}
