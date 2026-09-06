#!/usr/bin/env node
/**
 * Render a PNG specimen of Molemisi Pixel using the glyph bitmaps
 * (exact pixels that go into the TTF).
 *
 * Output: assets/branding/font/specimen.png
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, fillColor } from './lib/png.mjs';
import { GLYPHS } from './lib/glyphs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const S = 6; // screen px per font px
const COLS = 8;
const CHAR_GAP = 2; // font px between chars

const chars = Object.keys(GLYPHS);
const rows = Math.ceil(chars.length / COLS);

// layout metrics in font px
const cellW = 10;
const cellH = 14;
const W = COLS * cellW + CHAR_GAP;
const H = rows * cellH + 2;

const CREAM = [245, 230, 211, 255];
const AMBER = [255, 143, 0, 255];
const DARK = [26, 15, 10, 255];

const canvas = new Uint8Array(W * S * (H * S) * 4);
fillColor(canvas, W * S, H * S, DARK);

function blit(bitmap, ox, oy, color) {
  for (let y = 0; y < bitmap.length; y++) {
    for (let x = 0; x < bitmap[y].length; x++) {
      if (bitmap[y][x] !== '#') continue;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = (oy + y) * S + sy;
          const py = (ox + x) * S + sx;
          const d = (px * W * S + py) * 4;
          canvas[d] = color[0];
          canvas[d + 1] = color[1];
          canvas[d + 2] = color[2];
          canvas[d + 3] = 255;
        }
      }
    }
  }
}

let idx = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < COLS && idx < chars.length; c++, idx++) {
    const ch = chars[idx];
    blit(GLYPHS[ch], c * cellW + 1, r * cellH + 1, idx % 12 === 0 ? AMBER : CREAM);
  }
}

const outDir = join(root, 'assets', 'branding', 'font');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'specimen.png'), encodePng(W * S, H * S, canvas));
console.log(`[font] Wrote assets/branding/font/specimen.png (${W * S}x${H * S})`);
