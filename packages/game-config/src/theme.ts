/**
 * Molemisi Design Tokens — extracted from Google Stitch DESIGN.md
 *
 * These tokens define the visual language for all Phaser UI rendering.
 * They match the Stitch-generated HTML/CSS exactly.
 */

// ─── Color Palette ───────────────────────────────────────────────
export const COLORS = {
  // Primary — Amber Gold (CTAs, active states, currency)
  primary: 0xff8f00,
  primaryLight: 0xffb87b,
  primaryDark: 0xe65100,
  onPrimary: 0x4c2700,

  // Secondary — Grass Green (crops, health, growth)
  secondary: 0x5a8f3c,
  secondaryLight: 0x9cd67a,
  secondaryDark: 0x225404,
  onSecondary: 0x133800,

  // Tertiary — Kalahari Earth Red (soil, warnings)
  tertiary: 0xc05c3c,
  tertiaryLight: 0xfe8c68,
  onTertiary: 0x5e1700,

  // Neutral — Dark Timber (UI surfaces, panels)
  woodDark: 0x2c1810,
  woodMedium: 0x4e342e,
  woodBorder: 0x5d4037,
  surfaceContainer: 0x3e2723,
  surfaceContainerHigh: 0x472f2b,
  surfaceContainerLow: 0x2b1613,
  surfaceLowest: 0x1b0906,

  // Text
  cream: 0xf5e6d3,
  muted: 0xbcaaa4,
  onSurfaceVariant: 0xdcc1ae,

  // Status
  success: 0x4caf50,
  warning: 0xffc107,
  danger: 0xc62828,
  info: 0x2196f3,

  // Currency
  gold: 0xffd700,

  // Environment
  skyBlue: 0x87ceeb,
  skyDeep: 0x4a7fb5,
  grassGreen: 0x5a8f3c,
  earthRed: 0xc05c3c,

  // Transparent helpers
  overlayDark: 0x1b0906,
  panelBg: 0x3e2723,
} as const;

// ─── Typography (Phaser text styles) ─────────────────────────────
export const FONTS = {
  // Headlines — Space Grotesk (bold, structural)
  headlineLg: { fontFamily: 'Space Grotesk, monospace', fontSize: '32px', fontStyle: 'bold' },
  headlineMd: { fontFamily: 'Space Grotesk, monospace', fontSize: '20px', fontStyle: 'bold' },
  headlineSm: { fontFamily: 'Space Grotesk, monospace', fontSize: '16px', fontStyle: 'bold' },

  // Body — Rubik (friendly, readable)
  bodyLg: { fontFamily: 'Rubik, sans-serif', fontSize: '16px' },
  bodyMd: { fontFamily: 'Rubik, sans-serif', fontSize: '14px' },
  bodySm: { fontFamily: 'Rubik, sans-serif', fontSize: '12px' },

  // Labels & Numbers — Space Mono (monospaced, mechanical)
  labelLg: { fontFamily: 'Space Mono, monospace', fontSize: '14px', fontStyle: 'bold' },
  labelMd: { fontFamily: 'Space Mono, monospace', fontSize: '12px', fontStyle: 'bold' },
  labelSm: { fontFamily: 'Space Mono, monospace', fontSize: '10px', fontStyle: 'bold' },
} as const;

// ─── Spacing (4px grid) ─────────────────────────────────────────
export const SPACING = {
  px1: 1, // 0.125rem
  px2: 2, // 0.25rem
  sm: 4, // 0.5rem
  md: 6, // 0.75rem
  lg: 8, // 1rem
  xl: 12, // 1.5rem
  xxl: 16, // 2rem
} as const;

// ─── Panel Specs ─────────────────────────────────────────────────
export const PANEL = {
  borderWidth: 2,
  borderColor: COLORS.woodBorder,
  bgColor: COLORS.surfaceContainer,
  bgAlpha: 0.95,
  headerBg: COLORS.woodDark,
  shadowOffset: 2,
  shadowAlpha: 0.5,
  padding: 12,
  cornerRadius: 0, // strict pixel corners
} as const;

// ─── Button Specs ────────────────────────────────────────────────
export const BUTTON = {
  primary: { bg: COLORS.primary, text: COLORS.woodDark, border: COLORS.primaryDark },
  secondary: { bg: COLORS.surfaceContainer, text: COLORS.cream, border: COLORS.woodBorder },
  danger: { bg: COLORS.danger, text: COLORS.cream, border: 0xb71c1c },
  height: 32,
  paddingX: 12,
} as const;

// ─── Status Bar Specs ────────────────────────────────────────────
export const BAR = {
  height: 6,
  trackBg: COLORS.surfaceLowest,
  borderColor: COLORS.woodBorder,
  borderWidth: 1,
  growth: COLORS.success,
  hydration: COLORS.info,
  hunger: COLORS.primary,
  xp: COLORS.gold,
} as const;

// ─── Plot Grid Specs ─────────────────────────────────────────────
export const PLOT_GRID = {
  cols: 4,
  rows: 3,
  plotSize: 64,
  gap: 8,
  borderWidth: 2,
  readyBorderColor: COLORS.gold,
  selectedBorderColor: COLORS.primary,
  hoverAlpha: 0.15,
} as const;

// ─── Scene Backgrounds ───────────────────────────────────────────
export const BACKGROUNDS = {
  farm: '/assets/backgrounds/farm_scene.png',
  kgotla: '/assets/backgrounds/kgotla_scene.png',
  bushveld: '/assets/backgrounds/bushveld_scene.png',
  market: '/assets/backgrounds/market_scene.png',
} as const;
