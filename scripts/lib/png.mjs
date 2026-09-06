/**
 * Molemisi — zero-dependency PNG codec + pixel scaling helpers.
 *
 * Supports 8-bit RGBA non-interlaced PNGs (what PixelLab produces),
 * nearest-neighbor integer scaling, and flat-color compositing.
 */
import { deflateSync, inflateSync } from 'node:zlib';

/* ---------------- CRC32 -------------------------------------------------- */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

/* ---------------- Decode ------------------------------------------------- */

/** Decode an 8-bit RGBA non-interlaced PNG into { width, height, pixels }. */
export function decodePng(bytes) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!bytes.subarray(0, 8).equals(sig)) throw new Error('Not a PNG file');
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error('Need 8-bit RGBA PNG');
      if (data[12] !== 0) throw new Error('Interlaced PNG not supported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  let p = 0;
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
          val = (val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
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

/* ---------------- Encode ------------------------------------------------- */

/** Encode RGBA pixels into a PNG buffer (filter 0). */
export function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- Scaling & compositing ---------------------------------- */

/** Integer nearest-neighbor scale, centered on the destination canvas. */
export function scaleNearest(src, srcW, srcH, destW, destH) {
  const out = new Uint8Array(destW * destH * 4);
  const ratio = Math.max(1, Math.min(Math.floor(destW / srcW), Math.floor(destH / srcH)));
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

/** Composite `over` (RGBA) onto `base` (RGBA) at (x, y). Alpha-blended. baseH bounds the canvas. */
export function compositeAt(base, baseW, baseH, over, overW, overH, x, y) {
  for (let oy = 0; oy < overH; oy++) {
    const by = y + oy;
    if (by < 0 || by >= baseH) continue;
    for (let ox = 0; ox < overW; ox++) {
      const bx = x + ox;
      if (bx < 0 || bx >= baseW) continue;
      const s = (oy * overW + ox) * 4;
      const a = over[s + 3] / 255;
      if (a === 0) continue;
      const d = (by * baseW + bx) * 4;
      base[d] = Math.round(over[s] * a + base[d] * (1 - a));
      base[d + 1] = Math.round(over[s + 1] * a + base[d + 1] * (1 - a));
      base[d + 2] = Math.round(over[s + 2] * a + base[d + 2] * (1 - a));
      base[d + 3] = Math.max(base[d + 3], over[s + 3]);
    }
  }
}

/** Fill a canvas with a flat RGBA color. */
export function fillColor(pixels, w, h, [r, g, b, a = 255]) {
  for (let i = 0; i < w * h; i++) {
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = a;
  }
  return pixels;
}
