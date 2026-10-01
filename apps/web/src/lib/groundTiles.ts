import { chapterForDate, type ChapterSlug } from '@molemisi/game-config';

/**
 * 2.4 / doc 30 V-4.1 — the ground the farm stands on.
 *
 * Doc 30's complaint was that the plot grid "reads as dark panels" rather than
 * Botswana soil. Each plot is an HTML button in a responsive CSS grid, so a single
 * ground image behind the grid would cut across the gaps and look like a wallpaper,
 * not a field. Each *cell* therefore paints its own ground tile, and the four tiles
 * that meet at an interior corner are chosen so the texture reads as continuous.
 *
 * The four `grass_*` sets are complete 16-tile Wang sets (`assets/tiles/ground/`),
 * keyed 0–15 by the bitmask of which corners are the "upper" layer:
 *
 *     0  = all lower    (pure base ground)
 *     15 = all upper    (pure overlay)
 *
 * Two layers are available per cell, and which layer is used is a **chapter
 * decision**, not a spatial one:
 *
 *   - **lower** = the chapter's own ground (`grass_dry` in Moriti, `grass_water` in
 *     Pula …). This is the season you are standing in.
 *   - **upper** = `grass_base` (the lush savanna grass), i.e. the *non*-chapter
 *     ground. A cell only reveals upper layer where the two class regions meet, so
 *     the tint is not a flat wash: the farm reads as the season *encroaching on*
 *     green, which is exactly the Botswana dry-season look.
 *
 * Because the CSS grid reflows (2/3/4 columns by breakpoint), physical adjacency is
 * a function of viewport width. Rather than measure it in the browser, the class is
 * derived from a **fixed 4-wide virtual grid**: cell (r, c) of a 4×4 lattice laid
 * over the plots, which is the true layout at the `md` breakpoint and a stable
 * approximation below it. That keeps the function pure and testable, and means the
 * texture never "resamples" on resize — the same cell always paints the same tile.
 */

/** Repo path (under `/public`) of the lush base ground every chapter falls back to. */
export const BASE_GROUND = 'assets/tiles/ground/grass_base.png';

/** Chapter → the ground set that *is* that season (doc 30 V-4.1 pins the first two). */
export const CHAPTER_GROUND: Record<ChapterSlug, string> = {
  // Rains. The Jojo tank fills itself; the farm is green over wet ground.
  pula: 'grass_water',
  // Late rains / long growth. Green pushing through soil.
  phane: 'grass_dirt',
  // Dry and cold. "Water is the whole game" — the dry yellow-brown look.
  moriti: 'grass_dry',
  // Harvest, wind, preparation. Trodden worked ground.
  letlhafula: 'grass_path',
};

/** Human-facing name per set, for the legend / aria labels. */
export const GROUND_LABEL: Record<string, string> = {
  grass_water: 'wet season ground',
  grass_dirt: 'turn of the season ground',
  grass_dry: 'dry season ground',
  grass_path: 'harvest ground',
};

/** The chapter in force right now. Pure — the web app has no chapter in its state. */
export function currentChapterSlug(date: Date = new Date()): ChapterSlug {
  return chapterForDate(date).slug;
}

export function groundSetForChapter(slug: ChapterSlug): string {
  return CHAPTER_GROUND[slug] ?? 'grass_dry';
}

/**
 * Width of the virtual lattice the adjacency mask is computed against. Matches the
 * `md:grid-cols-4` breakpoint — the widest layout, and the one the art targets.
 */
export const VIRTUAL_GRID_WIDTH = 4;

export type GroundClass = 'upper' | 'lower';

/**
 * Which layer this cell shows. A cell is `upper` (lush green) when it is
 * **orthogonally isolated** from every other plot, and `lower` (the chapter's own
 * ground) otherwise.
 *
 * That is deliberately inverted from the obvious reading: the *majority* surface is
 * the chapter, and the sparse isolated cells are the green hold-outs. In a 2×2
 * starter farm every cell has a neighbour, so the whole grid goes chapter-tinted —
 * which is the sentence V-4.1 actually asks for. The green only appears as the farm
 * grows into a sparse shape, which makes the tint read as weather eating into the
 * land rather than as noise.
 */
export function groundClassForCell(
  index: number,
  plotCount: number,
  width: number = VIRTUAL_GRID_WIDTH,
): GroundClass {
  const w = Math.max(1, width);
  const row = Math.floor(index / w);
  const col = index % w;
  const has = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || c >= w) return false;
    const i = r * w + c;
    return i < plotCount;
  };
  const isolated =
    !has(row - 1, col) && !has(row + 1, col) && !has(row, col - 1) && !has(row, col + 1);
  return isolated ? 'upper' : 'lower';
}

export interface GroundTileRef {
  /** Path under `/public`, e.g. `assets/tiles/ground/grass_dry/9.png`. */
  src: string;
  /** Short set name (`grass_dry`) for keys and debugging. */
  set: string;
  /** Which layer this tile belongs to. */
  klass: GroundClass;
}

/**
 * Resolve the tile a single cell paints.
 *
 * `klass === 'lower'` → the chapter set's pure ground tile (`wang_0`, id 0).
 * `klass === 'upper'` → the lush base sheet, cropped by CSS to a solid tile.
 *
 * The upper case cannot point at an individual PNG — `grass_base.png` is a single
 * 64×64 atlas of all sixteen tiles and there is no per-tile file — so we return the
 * sheet plus a CSS background-position for the all-upper tile (`wang_15`, id 15 →
 * column 3, row 3). `FarmGround` handles that crop.
 */
export function groundTileForCell(
  index: number,
  plotCount: number,
  chapter: ChapterSlug,
  width: number = VIRTUAL_GRID_WIDTH,
): GroundTileRef {
  const klass = groundClassForCell(index, plotCount, width);
  if (klass === 'upper') {
    return { src: `/${BASE_GROUND}`, set: 'grass_base', klass };
  }
  const set = groundSetForChapter(chapter);
  return { src: `/assets/tiles/ground/${set}/0.png`, set, klass };
}

/** Tile size in source pixels (the sets are all 16×16). */
export const GROUND_TILE_PX = 16;

/** Atlas geometry for the `grass_base` crop: 4 columns × 4 rows of 16px tiles. */
export const BASE_SHEET_TILES = 4;
/** `wang_15` — every corner upper — is tile index 15, i.e. column 3, row 3. */
export const BASE_SHEET_UPPER_COL = 3;
export const BASE_SHEET_UPPER_ROW = 3;
