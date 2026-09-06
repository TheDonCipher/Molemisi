/**
 * Molemisi — Media asset generator (zero-dependency).
 *
 * Builds press/media branding images from the PixelLab logo variants,
 * compositing a hand-drawn pixel "MOLEMISI" wordmark:
 *
 *   assets/branding/media/molemisi-logo-wordmark.png        emblem + MOLEMISI on dark
 *   assets/branding/media/molemisi-logo-wordmark-light.png  emblem + MOLEMISI on cream
 *   assets/branding/media/molemisi-banner-wide.png          wide banner art + wordmark
 *   assets/branding/media/molemisi-social-square.png        512x512 social avatar
 *   assets/branding/media/molemisi-og.png                   1200x630 Open Graph card
 *   assets/branding/media/molemisi-logo-dark.png            emblem on dark card
 *   assets/branding/media/molemisi-logo-light.png           emblem on cream card
 *   assets/branding/media/molemisi-logo-mono.png            monochrome watermark
 *
 * Usage: node scripts/generate-media-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, scaleNearest, compositeAt, fillColor } from './lib/png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRANDING = join(root, 'assets', 'branding');
const OUT = join(BRANDING, 'media');
mkdirSync(OUT, { recursive: true });

/* ---------------- Palette (matches the game's art direction) -------------- */

const COLORS = {
  darkBg: [26, 15, 10, 255], // #1A0F0A — manifest background
  creamBg: [245, 230, 211, 255], // #F5E6D3 — game cream
  amber: [255, 143, 0, 255], // #FF8F00 — theme color
  cream: [245, 230, 211, 255],
  darkBrown: [62, 39, 35, 255], // #3E2723
  terracotta: [192, 92, 60, 255], // #C05C3C
};

/* ---------------- Tiny 5x7 pixel font (uppercase A–Z, 0–9) ---------------- */
/* Each glyph: 5 wide x 7 tall, '#' = ink. Rendered at integer multiples.     */

const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Measure text width in font pixels (5px glyph + 1px spacing). */
function textWidth(text) {
  return text.length * 6 - 1;
}

/** Render text into a new RGBA canvas at `scale` integer multiples. */
function renderText(text, scale, [r, g, b, a]) {
  const w = textWidth(text) * scale;
  const h = 7 * scale;
  const px = new Uint8Array(w * h * 4);
  let cursor = 0;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) {
      cursor += 6 * scale;
      continue;
    }
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = cursor + gx * scale + sx;
            const y = gy * scale + sy;
            const d = (y * w + x) * 4;
            px[d] = r;
            px[d + 1] = g;
            px[d + 2] = b;
            px[d + 3] = a;
          }
        }
      }
    }
    cursor += 6 * scale;
  }
  return { width: w, height: h, pixels: px };
}

/** Draw a solid rectangle. */
function rect(px, w, x, y, rw, rh, [r, g, b, a]) {
  for (let yy = y; yy < y + rh; yy++) {
    for (let xx = x; xx < x + rw; xx++) {
      if (xx < 0 || yy < 0 || xx >= w) continue;
      const d = (yy * w + xx) * 4;
      px[d] = r;
      px[d + 1] = g;
      px[d + 2] = b;
      px[d + 3] = a;
    }
  }
}

/* ---------------- Load art ------------------------------------------------ */

const logo = decodePng(readFileSync(join(BRANDING, 'logo.png')));
const logoAlt = decodePng(readFileSync(join(BRANDING, 'logo_alt.png')));
const logoMono = decodePng(readFileSync(join(BRANDING, 'logo_mono.png')));
const logoWide = decodePng(readFileSync(join(BRANDING, 'logo_wide.png')));

/** Scale a decoded image by an exact integer factor (no recentering). */
function scaleExact(img, factor) {
  const w = img.width * factor;
  const h = img.height * factor;
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / factor);
      const s = (sy * img.width + sx) * 4;
      const d = (y * w + x) * 4;
      px[d] = img.pixels[s];
      px[d + 1] = img.pixels[s + 1];
      px[d + 2] = img.pixels[s + 2];
      px[d + 3] = img.pixels[s + 3];
    }
  }
  return { width: w, height: h, pixels: px };
}

/** Emblem + "MOLEMISI" lockup on a flat background. */
function wordmark(bg, ink, emblem) {
  const scale = 6; // wordmark scale
  const text = renderText('MOLEMISI', scale, ink);
  const em = scaleExact(emblem, 6); // 64px emblem → 384px
  const gap = 48;
  const pad = 56;

  const w = pad + em.width + gap + text.width + pad;
  const h = Math.max(em.height, text.height) + pad * 2;
  const canvas = new Uint8Array(w * h * 4);
  fillColor(canvas, w, h, bg);

  const emY = Math.floor((h - em.height) / 2);
  const txY = Math.floor((h - text.height) / 2);
  compositeAt(canvas, w, h, em.pixels, em.width, em.height, pad, emY);
  compositeAt(canvas, w, h, text.pixels, text.width, text.height, pad + em.width + gap, txY);
  return { w, h, canvas };
}

/** Save helper. */
function save(name, w, h, px) {
  writeFileSync(join(OUT, name), encodePng(w, h, px));
  console.log(`  [media] ${name} (${w}x${h})`);
}

console.log('[media] Generating branding media assets...\n');

/* 1. Wordmark — dark + light ---------------------------------------------- */
{
  const { w, h, canvas } = wordmark(COLORS.darkBg, COLORS.amber, logo);
  save('molemisi-logo-wordmark.png', w, h, canvas);
}
{
  const { w, h, canvas } = wordmark(COLORS.creamBg, COLORS.darkBrown, logoAlt);
  save('molemisi-logo-wordmark-light.png', w, h, canvas);
}

/* 2. Wide banner (logo_wide art + wordmark strip below) -------------------- */
{
  const scale = 2;
  const banner = scaleExact(logoWide, scale); // 400x160 -> 800x320
  const text = renderText('MOLEMISI', 5, COLORS.cream);
  const w = banner.width + 160;
  const h = banner.height + text.height + 120;
  const canvas = new Uint8Array(w * h * 4);
  fillColor(canvas, w, h, COLORS.darkBg);
  compositeAt(canvas, w, h, banner.pixels, banner.width, banner.height, 80, 40);
  compositeAt(
    canvas,
    w,
    h,
    text.pixels,
    text.width,
    text.height,
    Math.floor((w - text.width) / 2),
    banner.height + 70,
  );
  save('molemisi-banner-wide.png', w, h, canvas);
}

/* 3. Social square 512x512 ------------------------------------------------- */
{
  const size = 512;
  const canvas = new Uint8Array(size * size * 4);
  fillColor(canvas, size, size, COLORS.darkBg);
  const em = scaleExact(logo, 6); // 384px
  compositeAt(canvas, size, size, em.pixels, em.width, em.height, (size - em.width) / 2, 40);
  const text = renderText('MOLEMISI', 4, COLORS.amber);
  compositeAt(
    canvas,
    size,
    size,
    text.pixels,
    text.width,
    text.height,
    Math.floor((size - text.width) / 2),
    440,
  );
  save('molemisi-social-square.png', size, size, canvas);
}

/* 4. Open Graph card 1200x630 ---------------------------------------------- */
{
  const w = 1200;
  const h = 630;
  const canvas = new Uint8Array(w * h * 4);
  fillColor(canvas, w, h, COLORS.darkBg);
  // top accent strip
  rect(canvas, w, 0, 0, w, 12, COLORS.amber);
  rect(canvas, w, 0, h - 12, w, 12, COLORS.terracotta);
  const em = scaleExact(logo, 5); // 320px
  compositeAt(canvas, w, h, em.pixels, em.width, em.height, 100, (h - em.height) / 2);
  const text = renderText('MOLEMISI', 12, COLORS.amber);
  const sub = renderText('A BOTSWANA FARM SIM', 4, COLORS.cream);
  const textX = 520;
  compositeAt(canvas, w, h, text.pixels, text.width, text.height, textX, 210);
  compositeAt(canvas, w, h, sub.pixels, sub.width, sub.height, textX, 350);
  save('molemisi-og.png', w, h, canvas);
}

/* 5. Emblem-on-card (dark + light) ------------------------------------------ */
{
  const size = 480;
  for (const [name, bg] of [
    ['molemisi-logo-dark.png', COLORS.darkBg],
    ['molemisi-logo-light.png', COLORS.creamBg],
  ]) {
    const canvas = new Uint8Array(size * size * 4);
    fillColor(canvas, size, size, bg);
    const em = scaleExact(logo, 5);
    compositeAt(
      canvas,
      size,
      size,
      em.pixels,
      em.width,
      em.height,
      (size - em.width) / 2,
      (size - em.height) / 2,
    );
    save(name, size, size, canvas);
  }
}

/* 6. Monochrome watermark (transparent bg, single color) -------------------- */
{
  const em = scaleExact(logoMono, 4); // 256px
  // Recolor all non-transparent pixels to dark brown
  const px = em.pixels;
  for (let i = 0; i < em.width * em.height; i++) {
    if (px[i * 4 + 3] > 0) {
      px[i * 4] = COLORS.darkBrown[0];
      px[i * 4 + 1] = COLORS.darkBrown[1];
      px[i * 4 + 2] = COLORS.darkBrown[2];
    }
  }
  save('molemisi-logo-mono.png', em.width, em.height, px);
}

console.log('\n[media] Done. Files in assets/branding/media/');
