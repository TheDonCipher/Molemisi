#!/usr/bin/env node
/**
 * Render a PNG specimen of Molemisi Pixel from the shipped font's glyph atlas
 * (assets/branding/font/atlas-ai.png, produced by scripts/generate-font.mjs).
 *
 * Falls back to the hand-crafted glyph bitmaps if the atlas is missing.
 *
 * Output: assets/branding/font/specimen.png
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, fillColor } from './lib/png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontDir = join(root, 'assets', 'branding', 'font');

const S = 4; // px per font pixel (atlas is 1:1 font pixels)
const PAD = 8 * S;
const BG = [26, 15, 10, 255]; // #1a0f0a dark earth
const INK = [245, 230, 211, 255]; // cream

let src, srcW, srcH, sourceLabel;
const atlasPath = join(fontDir, 'atlas-ai.png');
if (existsSync(atlasPath)) {
  const decoded = decodePng(readFileSync(atlasPath));
  src = decoded.pixels;
  srcW = decoded.width;
  srcH = decoded.height;
  sourceLabel = 'shipped font atlas';
} else {
  console.error('[specimen] atlas-ai.png missing — regenerate with scripts/generate-font.mjs');
  process.exit(1);
}

const W = srcW * S + PAD * 2;
const H = srcH * S + PAD * 2;
const pixels = fillColor(new Uint8Array(W * H * 4), W, H, BG);

// Blit the atlas, scaling each font pixel to S×S
for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const si = (y * srcW + x) * 4;
    const a = src[si + 3];
    if (a < 64) continue; // transparent
    // use the glyph ink color from the atlas, or the cream default
    const c = [src[si], src[si + 1], src[si + 2], 255];
    for (let dy = 0; dy < S; dy++) {
      for (let dx = 0; dx < S; dx++) {
        const di = ((PAD + y * S + dy) * W + (PAD + x * S + dx)) * 4;
        pixels[di] = c[0];
        pixels[di + 1] = c[1];
        pixels[di + 2] = c[2];
        pixels[di + 3] = 255;
      }
    }
  }
}

const out = join(fontDir, 'specimen.png');
writeFileSync(out, encodePng(W, H, pixels));
console.log(`[specimen] Wrote ${out} (${W}x${H}, from ${sourceLabel})`);
