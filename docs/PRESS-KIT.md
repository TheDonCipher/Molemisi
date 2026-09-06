# Molemisi Press Kit

**Molemisi** is a cozy pixel-art farm management simulator inspired by Botswana — grow traditional crops, raise livestock, trade at the village market, and take part in community life at the kgotla.

- **Genre:** Farming sim / cozy management
- **Platforms:** Web (PWA — installable on Android & iOS)
- **Status:** M16 Alpha (in development)
- **Contact:** via the repository issue tracker

---

## Naming

- The game is written **Molemisi** — one word, capital **M**, no exclamation mark, no stylizing.
- The word is Setswana for "farmer" (one who cultivates the land).
- Taglines may be added around the name, but never inside it (no "MoleMiSi", no "MOLEMISI!!").

---

## Logo

The emblem is a **golden sorghum sprig** (three seed heads) rising from a **red-earth mound**, enclosed in a **round terracotta badge** with a cream border ring.

| Rule                          | Detail                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clear space                   | Keep at least 25% of the emblem's width free on all sides                                                                                             |
| Minimum size                  | 24 px tall on screen; 10 mm in print                                                                                                                  |
| Backgrounds                   | Use `logo` on dark/warm surfaces, `logo_alt` (shield crest) on light surfaces, `logo_mono` for single-color stamps/watermarks                         |
| Don'ts                        | No recoloring (except the provided mono), no rotation, no drop shadows, no outlines, no stretching, no placing on busy imagery without a backing card |
| The badge is part of the mark | Don't crop the emblem out of its badge ring                                                                                                           |

---

## Typography — Molemisi Pixel

The game's display typeface is **Molemisi Pixel Bold**, a custom 16-bit RPG pixel font (see `docs/Font_Guide.png`): bold geometric glyphs, sharp carved spur serifs, tribal bracketed terminals, uniform line weight on a strict pixel grid, crisp off-white with no anti-aliasing. Use it for titles, menus, dialogue headers, and HUD — never for long paragraphs (body text uses Rubik).

- Font file: `assets/branding/font/MolemisiPixel-Bold.ttf` (also `apps/web/public/fonts/`)
- Specimen: `assets/branding/font/specimen.png` (hand-crafted reference) · `assets/branding/font/atlas-ai.png` (shipped font glyph atlas)
- Don't simulate the font by pixelating other typefaces.

The wordmark is **MOLEMISI** set in the same pixel style, amber on dark / dark brown on cream. Always use the provided files — do not typeset the name yourself.

| File                                                     | Size     | Use                                        |
| -------------------------------------------------------- | -------- | ------------------------------------------ |
| `assets/branding/media/molemisi-logo-wordmark.png`       | 826×496  | Primary lockup — emblem + name on dark     |
| `assets/branding/media/molemisi-logo-wordmark-light.png` | 826×496  | Lockup on cream/light                      |
| `assets/branding/media/molemisi-social-square.png`       | 512×512  | Social avatars / profile pictures          |
| `assets/branding/media/molemisi-og.png`                  | 1200×630 | Link previews (Open Graph / Twitter cards) |
| `assets/branding/media/molemisi-banner-wide.png`         | 960×475  | Banners, page headers                      |
| `assets/branding/media/molemisi-logo-dark.png`           | 480×480  | Emblem card on dark                        |
| `assets/branding/media/molemisi-logo-light.png`          | 480×480  | Emblem card on light                       |
| `assets/branding/media/molemisi-logo-mono.png`           | 256×256  | One-color watermark                        |

---

## Color Palette

| Name       | Hex       | Use                                           |
| ---------- | --------- | --------------------------------------------- |
| Dark Earth | `#1A0F0A` | App background, dark surfaces                 |
| Dark Brown | `#3E2723` | Ink on light, outlines                        |
| Amber      | `#FF8F00` | Primary accent, wordmark on dark, theme color |
| Terracotta | `#C05C3C` | Red-earth, badge, secondary accent            |
| Warm Grass | `#5A8F3C` | Fields, success states                        |
| Cream      | `#F5E6D3` | Light surfaces, text on dark                  |

---

## App & Web Icons

All derived from `assets/branding/logo.png` by `scripts/generate-icons.mjs` (never edit the outputs by hand):

| File                                               | Size     | Purpose                                               |
| -------------------------------------------------- | -------- | ----------------------------------------------------- |
| `apps/web/public/favicon.ico`                      | 16+32+48 | Browser tab (all browsers)                            |
| `apps/web/public/icons/favicon-16.png` / `-32.png` | 16/32    | PNG favicon fallback                                  |
| `apps/web/public/icons/icon-192.png`               | 192      | Android home screen, apple-touch-icon                 |
| `apps/web/public/icons/icon-512.png`               | 512      | PWA splash / store listings                           |
| `apps/web/public/icons/icon-maskable-512.png`      | 512      | Android adaptive (safe zone)                          |
| `apps/web/public/icons/splash/apple-splash-*.png`  | 24 files | iOS launch screens (12 devices, portrait + landscape) |

---

## Screenshots & Footage

- Capture at **1920×1080** (desktop) or **390×844** (mobile) at 100% scale.
- Show the real game UI — don't mock up screens or add fake currency values.
- The game renders crisp pixels; avoid JPEG for UI shots (use PNG).

---

## Asset Regeneration

All art is generated, not hand-drawn:

```bash
pnpm assets:generate   # PixelLab assets + sync + icons + media files
pnpm icons:generate    # favicons, .ico, PWA icons, splash (from logo.png)
pnpm media:generate    # wordmark lockups, OG card, social square
```

Requires `PIXELLAB_API_KEY` in `.env` for the PixelLab step; icon/media compositing is fully offline.

---

## Usage Permission

Press, content creators, and storefront partners may use these assets in coverage, reviews, videos, and store listings about Molemisi. Don't use the logo or name as your own product/brand, and don't imply endorsement. Anything else — ask first via the repository.
