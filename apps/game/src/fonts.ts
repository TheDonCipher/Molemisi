/**
 * Molemisi Pixel — game font loader.
 *
 * The TTF is served from /fonts/MolemisiPixel-Bold.ttf (synced by
 * scripts/build-font.mjs). Register it with the document and wait until the
 * browser reports it as loaded, so Phaser renders text with correct metrics
 * from the very first frame (canvas text falls back silently otherwise).
 *
 * Display/UI text uses 'Molemisi Pixel'. Long-form dialogue intentionally
 * keeps Rubik for readability; numbers may use 'Space Mono' where available.
 */

export const FONT_DISPLAY = "'Molemisi Pixel', monospace";
export const FONT_BODY = 'Rubik, sans-serif';
export const FONT_MONO = "'Space Mono', 'Molemisi Pixel', monospace";

const FONT_URL = '/fonts/MolemisiPixel-Bold.ttf';

let fontPromise: Promise<void> | null = null;

/** Kick off font registration exactly once. */
export function ensureGameFont(): Promise<void> {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (typeof document === 'undefined') return;
    if (!('fonts' in document)) return; // very old browser — let fallbacks handle it

    const face = new FontFace('Molemisi Pixel', `url(${FONT_URL})`, {
      weight: '700',
      style: 'normal',
      display: 'swap',
    });
    document.fonts.add(face);
    try {
      await face.load();
      await document.fonts.ready;
      console.log('[font] Molemisi Pixel loaded');
    } catch (e) {
      console.warn('[font] Molemisi Pixel failed to load, using fallbacks:', e);
    }
  })();
  return fontPromise;
}
