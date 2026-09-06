#!/usr/bin/env node
/**
 * Molemisi — App icon generator (zero-dependency).
 *
 * Reads assets/branding/logo.png (64x64 pixel art) and produces every icon
 * the web app needs, using nearest-neighbor scaling (correct for pixel art):
 *
 *   public/icons/favicon-16.png   16x16  transparent
 *   public/icons/favicon-32.png   32x32  transparent
 *   public/icons/icon-192.png     192x192 solid bg, padded
 *   public/icons/icon-512.png     512x512 solid bg, padded
 *   public/icons/icon-maskable-512.png  512x512 with safe-zone padding
 *   apps/web/src/app/icon.png     32x32  (Next.js App Router favicon)
 *
 * PNG codec: decode/encode with Node's zlib + a minimal PNG writer.
 * Scale: integer nearest-neighbor for crisp pixels, centered on canvas.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(root, 'assets', 'branding', 'logo.png');
const ICONS_DIR = join(root, 'apps', 'web', 'public', 'icons');
const APP_ICON = join(root, 'apps', 'web', 'src', 'app', 'icon.png');

/* ---------------- Minimal PNG decoder (8-bit RGBA, non-interlaced) -------- */

function crc32(buf) {
  let c;
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Int32Array(256);
      for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
      }
      return t;
    })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function decodePng(bytes) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!bytes.subarray(0, 8).equals(sig)) throw new Error('Not a PNG file');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    const data = bytes.subarray(pos + 8, pos + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}`);
      if (colorType !== 6) throw new Error(`Unsupported color type ${colorType} (need RGBA)`);
      if (data[12] !== 0) throw new Error('Interlaced PNG not supported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  let p = 0;

  // Undo per-scanline filters
  const prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = new Uint8Array(stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0;
      const b = prev[x];
      const c = x >= 4 ? prev[x - 4] : 0;
      let val = line[x];
      switch (filter) {
        case 0:
          break;
        case 1:
          val = (val + a) & 0xff;
          break;
        case 2:
          val = (val + b) & 0xff;
          break;
        case 3:
          val = (val + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = (val + pred) & 0xff;
          break;
        }
      }
      cur[x] = val;
    }
    pixels.set(cur, y * stride);
    prev.set(cur);
  }
  return { width, height, pixels };
}

/* ---------------- Minimal PNG encoder (RGBA, filter 0) -------------------- */

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- Nearest-neighbor integer scaling ------------------------ */

function scaleNearest(src, srcW, srcH, destW, destH) {
  const out = new Uint8Array(destW * destH * 4);
  const ratio = Math.min(Math.floor(destW / srcW), Math.floor(destH / srcH)) || 1;
  const drawW = srcW * ratio;
  const drawH = srcH * ratio;
  const offX = Math.floor((destW - drawW) / 2);
  const offY = Math.floor((destH - drawH) / 2);

  for (let y = 0; y < drawH; y++) {
    const sy = Math.floor(y / ratio);
    for (let x = 0; x < drawW; x++) {
      const sx = Math.floor(x / ratio);
      const s = (sy * srcW + sx) * 4;
      const d = ((y + offY) * destW + (x + offX)) * 4;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
      out[d + 3] = src[s + 3];
    }
  }
  return out;
}

function compositeOnColor(pixels, w, h, [r, g, b]) {
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const a = pixels[i * 4 + 3] / 255;
    out[i * 4] = Math.round(pixels[i * 4] * a + r * (1 - a));
    out[i * 4 + 1] = Math.round(pixels[i * 4 + 1] * a + g * (1 - a));
    out[i * 4 + 2] = Math.round(pixels[i * 4 + 2] * a + b * (1 - a));
    out[i * 4 + 3] = 255;
  }
  return out;
}

/* ---------------- Main ---------------------------------------------------- */

const logoBytes = readFileSync(LOGO);
const { inflateSync } = await import('node:zlib');

const { width, height, pixels } = (() => {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!logoBytes.subarray(0, 8).equals(sig)) throw new Error('logo.png is not a PNG');
  let pos = 8;
  let w = 0,
    h = 0,
    idat = [];
  while (pos < logoBytes.length) {
    const len = logoBytes.readUInt32BE(pos);
    const type = logoBytes.toString('ascii', pos + 4, pos + 8);
    const data = logoBytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('logo.png must be 8-bit RGBA');
      if (data[12] !== 0) throw new Error('Interlaced PNG not supported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const px = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0;
      const b = prev[x];
      const c = x >= 4 ? prev[x - 4] : 0;
      let val = line[x];
      switch (filter) {
        case 1:
          val = (val + a) & 0xff;
          break;
        case 2:
          val = (val + b) & 0xff;
          break;
        case 3:
          val = (val + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const pa = Math.abs(b - c),
            pb = Math.abs(a - c),
            pc = Math.abs(a + b - 2 * c);
          val = (val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
      }
      cur[x] = val;
    }
    px.set(cur, y * stride);
    prev.set(cur);
  }
  return { width: w, height: h, pixels: px };
})();

console.log(`[icons] Source: ${LOGO} (${width}x${height})`);
mkdirSync(ICONS_DIR, { recursive: true });

// Favicon set — transparent, tight crop
writeFileSync(
  join(ICONS_DIR, 'favicon-16.png'),
  encodePng(16, 16, scaleNearest(pixels, width, height, 16, 16)),
);
writeFileSync(
  join(ICONS_DIR, 'favicon-32.png'),
  encodePng(32, 32, scaleNearest(pixels, width, height, 32, 32)),
);

// PWA icons — solid dark background (#1a0f0a from manifest), 90% content scale
const BG = [26, 15, 10];
for (const size of [192, 512]) {
  // Pad the art to 90% so it doesn't touch the icon edge
  const padded = Math.round(size / 0.9);
  const scaled = scaleNearest(pixels, width, height, padded, padded);
  // Recomposite onto a size canvas with bg
  const out = new Uint8Array(size * size * 4);
  const off = Math.floor((size - padded) / 2);
  const comp = compositeOnColor(scaled, padded, padded, BG);
  for (let y = 0; y < padded; y++) {
    if (y + off < 0 || y + off >= size) continue;
    for (let x = 0; x < padded; x++) {
      if (x + off < 0 || x + off >= size) continue;
      const s = (y * padded + x) * 4;
      const d = ((y + off) * size + (x + off)) * 4;
      out[d] = comp[s];
      out[d + 1] = comp[s + 1];
      out[d + 2] = comp[s + 2];
      out[d + 3] = comp[s + 3];
    }
  }
  writeFileSync(join(ICONS_DIR, `icon-${size}.png`), encodePng(size, size, out));
}

// Maskable icon — content in the 80% safe zone
{
  const size = 512;
  const inner = Math.round(size * 0.8);
  const scaled = scaleNearest(pixels, width, height, inner, inner);
  const comp = compositeOnColor(scaled, inner, inner, BG);
  const out = new Uint8Array(size * size * 4);
  const off = Math.floor((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const d = ((y + off) * size + (x + off)) * 4;
      out[d] = comp[s];
      out[d + 1] = comp[s + 1];
      out[d + 2] = comp[s + 2];
      out[d + 3] = comp[s + 3];
    }
  }
  writeFileSync(join(ICONS_DIR, 'icon-maskable-512.png'), encodePng(size, size, out));
}

// Next.js App Router favicon (src/app/icon.png)
writeFileSync(APP_ICON, encodePng(32, 32, scaleNearest(pixels, width, height, 32, 32)));

console.log('[icons] Wrote favicon-16/32, icon-192/512, icon-maskable-512, app/icon.png');
