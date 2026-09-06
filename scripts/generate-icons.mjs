#!/usr/bin/env node
/**
 * Molemisi — App icon + favicon generator (zero-dependency).
 *
 * Reads assets/branding/logo.png (64x64 pixel art) and produces:
 *
 *   apps/web/public/icons/favicon-16.png   16x16  transparent (box downscale)
 *   apps/web/public/icons/favicon-32.png   32x32  transparent (box downscale)
 *   apps/web/public/icons/icon-192.png     192x192 solid bg, padded
 *   apps/web/public/icons/icon-512.png     512x512 solid bg, padded
 *   apps/web/public/icons/icon-maskable-512.png  safe-zone padding
 *   apps/web/public/favicon.ico            16 + 32 + 48 (classic BMP entries)
 *   apps/web/src/app/icon.png              32x32 (Next.js App Router favicon)
 *   apps/web/public/icons/splash/*.png     iOS splash screens
 *
 * Downscale: alpha-weighted box filter (crisper than averaging alone at 16px).
 * Upscale: integer nearest-neighbor (correct for pixel art).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, scaleNearest, fillColor } from './lib/png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(root, 'assets', 'branding', 'logo.png');
const ICONS_DIR = join(root, 'apps', 'web', 'public', 'icons');
const PUBLIC_DIR = join(root, 'apps', 'web', 'public');
const APP_ICON = join(root, 'apps', 'web', 'src', 'app', 'icon.png');

/* ---------------- Scaling ------------------------------------------------- */

/**
 * Alpha-weighted box downscale for arbitrary ratios (e.g. 64 -> 16/32/48).
 * Each destination pixel averages the source rectangle it covers, weighted by
 * alpha so transparent padding doesn't muddy colors. Alpha edges snap to
 * 0/255 so tiny sizes stay crisp instead of muddy.
 */
function downscaleBox(src, srcW, srcH, destW, destH) {
  const out = new Uint8Array(destW * destH * 4);
  for (let dy = 0; dy < destH; dy++) {
    const y0 = (dy * srcH) / destH;
    const y1 = ((dy + 1) * srcH) / destH;
    for (let dx = 0; dx < destW; dx++) {
      const x0 = (dx * srcW) / destW;
      const x1 = ((dx + 1) * srcW) / destW;

      let r = 0,
        g = 0,
        b = 0,
        aSum = 0,
        wSum = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const yCover = Math.min(y1, sy + 1) - Math.max(y0, sy);
        if (yCover <= 0) continue;
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const xCover = Math.min(x1, sx + 1) - Math.max(x0, sx);
          if (xCover <= 0) continue;
          const s = (sy * srcW + sx) * 4;
          const area = xCover * yCover;
          const alpha = src[s + 3] / 255;
          const w = area * alpha;
          r += src[s] * w;
          g += src[s + 1] * w;
          b += src[s + 2] * w;
          aSum += w;
          wSum += area;
        }
      }
      const d = (dy * destW + dx) * 4;
      if (aSum === 0) continue; // fully transparent
      const cov = aSum / wSum;
      // Color = average over visible coverage
      out[d] = Math.round(r / aSum);
      out[d + 1] = Math.round(g / aSum);
      out[d + 2] = Math.round(b / aSum);
      // Alpha snap: crisp edges at tiny sizes (0.25/0.75 thresholds)
      out[d + 3] = cov < 0.25 ? 0 : cov > 0.75 ? 255 : Math.round(cov * 255);
    }
  }
  return out;
}

/* ---------------- ICO writer (classic BMP entries) ------------------------ */

/** Build 32bpp bottom-up BGRA DIB (XOR + AND mask) for one ICO entry. */
function bmpEntry(width, height, rgba) {
  const xorSize = width * height * 4;
  const andStride = Math.ceil(width / 8);
  const andPad = (4 - (andStride % 4)) % 4;
  const andSize = (andStride + andPad) * height;

  const buf = Buffer.alloc(40 + xorSize + andSize);
  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 0);
  buf.writeInt32LE(width, 4);
  buf.writeInt32LE(height * 2, 8); // XOR + AND
  buf.writeUInt16LE(1, 12); // planes
  buf.writeUInt16LE(32, 14); // bpp
  buf.writeUInt32LE(0, 16); // compression: BI_RGB
  buf.writeUInt32LE(xorSize + andSize, 20); // size image
  // XOR mask: bottom-up BGRA
  let p = 40;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      buf[p++] = rgba[s + 2]; // B
      buf[p++] = rgba[s + 1]; // G
      buf[p++] = rgba[s]; // R
      buf[p++] = rgba[s + 3]; // A
    }
  }
  // AND mask: all zero (alpha channel governs)
  return buf;
}

/** Multi-size .ico with classic BMP entries (16/32/48). */
function buildIco(sizes) {
  const entries = sizes.map(({ size, rgba }) => ({
    size,
    data: bmpEntry(size, size, rgba),
  }));
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size === 256 ? 0 : e.size; // width
    dir[o + 1] = e.size === 256 ? 0 : e.size; // height
    dir[o + 2] = 0; // palette
    dir[o + 3] = 0; // reserved
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.data.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

/* ---------------- Load source --------------------------------------------- */

const logoBytes = readFileSync(LOGO);
const { width, height, pixels } = decodePng(logoBytes);
console.log(`[icons] Source: ${LOGO} (${width}x${height})`);
mkdirSync(ICONS_DIR, { recursive: true });

/* ---------------- Favicons (true box downscales) --------------------------- */

const fav16 = downscaleBox(pixels, width, height, 16, 16);
const fav32 = downscaleBox(pixels, width, height, 32, 32);
const fav48 = downscaleBox(pixels, width, height, 48, 48);

writeFileSync(join(ICONS_DIR, 'favicon-16.png'), encodePng(16, 16, fav16));
writeFileSync(join(ICONS_DIR, 'favicon-32.png'), encodePng(32, 32, fav32));
writeFileSync(
  join(PUBLIC_DIR, 'favicon.ico'),
  buildIco([
    { size: 16, rgba: fav16 },
    { size: 32, rgba: fav32 },
    { size: 48, rgba: fav48 },
  ]),
);

// Next.js App Router favicon (src/app/icon.png)
writeFileSync(APP_ICON, encodePng(32, 32, fav32));

/* ---------------- PWA icons (integer NN upscales) -------------------------- */

const BG = [26, 15, 10]; // #1A0F0A — matches manifest background_color

for (const size of [192, 512]) {
  const ratio = Math.floor(size / Math.max(width, height)); // 3 or 8
  const drawW = width * ratio;
  const drawH = height * ratio;
  const scaled = scaleNearest(pixels, width, height, drawW, drawH);
  const comp = new Uint8Array(drawW * drawH * 4);
  for (let i = 0; i < drawW * drawH; i++) {
    const a = scaled[i * 4 + 3] / 255;
    comp[i * 4] = Math.round(scaled[i * 4] * a + BG[0] * (1 - a));
    comp[i * 4 + 1] = Math.round(scaled[i * 4 + 1] * a + BG[1] * (1 - a));
    comp[i * 4 + 2] = Math.round(scaled[i * 4 + 2] * a + BG[2] * (1 - a));
    comp[i * 4 + 3] = 255;
  }
  // Center on the icon canvas at 90%
  const out = new Uint8Array(size * size * 4);
  fillColor(out, size, size, [...BG, 255]);
  const off = Math.floor((size - drawW) / 2);
  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const s = (y * drawW + x) * 4;
      const d = ((y + off) * size + (x + off)) * 4;
      out[d] = comp[s];
      out[d + 1] = comp[s + 1];
      out[d + 2] = comp[s + 2];
      out[d + 3] = 255;
    }
  }
  writeFileSync(join(ICONS_DIR, `icon-${size}.png`), encodePng(size, size, out));
}

// Maskable icon — content in the 80% safe zone
{
  const size = 512;
  const inner = Math.round(size * 0.8);
  const ratio = Math.floor(inner / Math.max(width, height)); // 5
  const drawW = width * ratio;
  const drawH = height * ratio;
  const scaled = scaleNearest(pixels, width, height, drawW, drawH);
  const out = new Uint8Array(size * size * 4);
  fillColor(out, size, size, [...BG, 255]);
  const off = Math.floor((size - drawW) / 2);
  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const s = (y * drawW + x) * 4;
      const a = scaled[s + 3] / 255;
      const d = ((y + off) * size + (x + off)) * 4;
      out[d] = Math.round(scaled[s] * a + BG[0] * (1 - a));
      out[d + 1] = Math.round(scaled[s + 1] * a + BG[1] * (1 - a));
      out[d + 2] = Math.round(scaled[s + 2] * a + BG[2] * (1 - a));
      out[d + 3] = 255;
    }
  }
  writeFileSync(join(ICONS_DIR, 'icon-maskable-512.png'), encodePng(size, size, out));
}

/* ---------------- iOS splash screens --------------------------------------- */

const SPLASH_SIZES = [
  [1290, 2796], // iPhone 14/15/16 Pro Max
  [1179, 2556], // iPhone 14/15/16 Pro
  [1170, 2532], // iPhone 13/14
  [1125, 2436], // iPhone X/XS/11 Pro/12/13 mini
  [1242, 2688], // iPhone XS Max/11 Pro Max
  [828, 1792], // iPhone XR/11
  [1242, 2208], // iPhone 8 Plus
  [750, 1334], // iPhone 8/SE
  [640, 1136], // iPhone SE 1st gen / 5s
  [2048, 2732], // iPad Pro 12.9"
  [1668, 2388], // iPad Pro 11"
  [1536, 2048], // iPad Air/Mini
];

function makeSplash(fileW, fileH) {
  const target = Math.round(Math.min(fileW, fileH) * 0.22);
  const ratio = Math.max(1, Math.floor(target / Math.max(width, height)));
  const drawW = width * ratio;
  const drawH = height * ratio;
  const logo = scaleNearest(pixels, width, height, drawW, drawH);

  const out = new Uint8Array(fileW * fileH * 4);
  fillColor(out, fileW, fileH, [...BG, 255]);
  const offX = Math.floor((fileW - drawW) / 2);
  const offY = Math.floor((fileH - drawH) / 2);
  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const s = (y * drawW + x) * 4;
      const a = logo[s + 3] / 255;
      if (a === 0) continue;
      const d = ((y + offY) * fileW + (x + offX)) * 4;
      out[d] = Math.round(logo[s] * a + out[d] * (1 - a));
      out[d + 1] = Math.round(logo[s + 1] * a + out[d + 1] * (1 - a));
      out[d + 2] = Math.round(logo[s + 2] * a + out[d + 2] * (1 - a));
      out[d + 3] = 255;
    }
  }
  return encodePng(fileW, fileH, out);
}

const splashDir = join(ICONS_DIR, 'splash');
mkdirSync(splashDir, { recursive: true });
let splashCount = 0;
for (const [w, h] of SPLASH_SIZES) {
  writeFileSync(join(splashDir, `apple-splash-${w}x${h}.png`), makeSplash(w, h));
  writeFileSync(join(splashDir, `apple-splash-${h}x${w}.png`), makeSplash(h, w));
  splashCount += 2;
}

console.log('[icons] Wrote favicon-16/32 + favicon.ico (16/32/48), app/icon.png');
console.log('[icons] Wrote icon-192/512, icon-maskable-512');
console.log(
  `[icons] Wrote ${splashCount} iOS splash screens (${SPLASH_SIZES.length} devices, portrait + landscape)`,
);
