---
name: Rural Golden Sim
colors:
  surface: '#210e0b'
  surface-dim: '#210e0b'
  surface-bright: '#4c332f'
  surface-container-lowest: '#1b0906'
  surface-container-low: '#2b1613'
  surface-container: '#2f1a16'
  surface-container-high: '#3b2420'
  surface-container-highest: '#472f2b'
  on-surface: '#ffdad4'
  on-surface-variant: '#dcc1ae'
  inverse-surface: '#ffdad4'
  inverse-on-surface: '#422a26'
  outline: '#a48c7a'
  outline-variant: '#564334'
  surface-tint: '#ffb77a'
  primary: '#ffb87b'
  on-primary: '#4c2700'
  primary-container: '#ff8f00'
  on-primary-container: '#623400'
  inverse-primary: '#8f4e00'
  secondary: '#9cd67a'
  on-secondary: '#133800'
  secondary-container: '#225404'
  on-secondary-container: '#8fc86d'
  tertiary: '#ffb59f'
  on-tertiary: '#5e1700'
  tertiary-container: '#fe8c68'
  on-tertiary-container: '#742408'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc2'
  primary-fixed-dim: '#ffb77a'
  on-primary-fixed: '#2e1500'
  on-primary-fixed-variant: '#6d3a00'
  secondary-fixed: '#b7f393'
  secondary-fixed-dim: '#9cd67a'
  on-secondary-fixed: '#082100'
  on-secondary-fixed-variant: '#205102'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#7e2b0f'
  background: '#210e0b'
  on-background: '#ffdad4'
  surface-variant: '#472f2b'
  wood-dark: '#2C1810'
  wood-medium: '#4E342E'
  wood-border: '#5D4037'
  cream-surface: '#F5E6D3'
  sky-blue: '#87CEEB'
  sky-deep: '#4A7FB5'
  gold-currency: '#FFD700'
  status-success: '#4CAF50'
  status-warning: '#FFC107'
  status-danger: '#C62828'
  status-info: '#2196F3'
typography:
  headline-lg:
    fontFamily: spaceGrotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: spaceGrotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: spaceGrotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: spaceGrotesk
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: rubik
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: rubik
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: spaceMono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: spaceMono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: spaceMono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
spacing:
  pixel-1: 0.125rem
  pixel-2: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  gutter-mobile: 0.75rem
  gutter-desktop: 1.5rem
---

> Implementation (2026-09-06): React `InventoryScreen`. Phaser `InventoryPanel` is unused.

## Brand & Style

The design system embodies a tranquil, rural agricultural simulation set in Botswana's vibrant landscapes. It delivers a tactile, nostalgic 16-bit retro aesthetic imbued with the warmth of dusk and golden hour. The visual tone balances comforting simplicity with grounded craftsmanship: deep timber tones, sundrenched clay, lush acacia vegetation, and soft woven cream accents.

The target audience encompasses casual sim players, cozy gaming enthusiasts, and cross-generational users who value low cognitive stress, accessible interfaces, and intuitive spatial patterns. The emotional experience is peaceful, communal, and rewarding—evoking the feeling of slow living, seasonal cycles, and pastoral harmony.

The aesthetic fuses **Tactile Skeuomorphism** and **Retro 16-Bit Pixel Art**. UI surfaces operate as handcrafted wooden signboards, double-bordered parchment modules, and crisp, non-anti-aliased physical meters. Mechanical switches, carved pushbuttons, and stepped borders eliminate abstract, clinical minimalism in favor of structured, gameful utility.

## Colors

The color system is rooted in the natural geography of the Southern African highveld and savanna. Surfaces leverage rich, organic dark wood as the baseline container frame, ensuring high contrast against golden-hour accents, vibrant vegetation, and luminous sky hues.

- **Primary (`#FF8F00` - Amber Gold):** Drives core call-to-actions, level progressions, active states, and radiant energy.
- **Secondary (`#5A8F3C` - Grass Green):** Represents cultivation, crop health, natural vitality, and constructive positive confirmations.
- **Tertiary (`#C05C3C` - Kalahari Earth Red):** Evokes the red soil, brick kilns, clay vessels, and earthwork markers across rural homesteads.
- **Neutral (`#3E2723` - Dark Timber):** Serves as the structural background frame, creating warm contrast without relying on sterile neutral blacks or cold slate grays.

### Color Rules
- **UI Surfaces:** Primary overlays, modal backdrops, and HUD bars build from `#3E2723` (at 95% opacity for windows) layered with an inner `#2C1810` heading header and framed with `#5D4037` borders.
- **Text Hierarchy:** High-priority headlines and title bar labels use parchment cream (`#F5E6D3`). High-contrast dark text inside amber CTA pills uses `#2C1810`. Muted supporting descriptions use soft earth gray `#BCAAA4`.
- **System States:** Gauges strictly map function to hue: `#4CAF50` (Crop Growth / Animal Health), `#2196F3` (Hydration / Water), `#FF8F00` (Hunger / Fuel), and `#FFD700` (XP / Botswana Pula currency).

## Typography

Typography bridges readability with modular 16-bit geometric structure. 

- **Headlines:** Set in `spaceGrotesk` with bold weights to maintain sturdy, structural presence reminiscent of blocky vintage game title cards without losing cross-platform legibility.
- **Body:** Rendered in `rubik` to introduce softly curved, friendly geometric glyphs that mirror cozy, relaxed dialogue bubbles and inventory item descriptions.
- **Labels & Numbers:** Controlled by `spaceMono`. Price tags, crop timers, XP counts, and status indicators align mechanically along strict monospaced tracking, ensuring numbers never jitter or jump as values tick upward.

All text rendered within the design system must align directly to full pixel boundaries, avoiding artificial sub-pixel anti-aliasing fuzziness where feasible.

## Layout & Spacing

The layout is structured around an immutable **4px base pixel grid** (`0.25rem`), strictly scaling along integers (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`). This ensures UI components and 16×16 sprite assets mate without sub-pixel blurring or uneven boundary rendering.

### Adaptive Scaling Model
- **Mobile (`320px – 767px`):** Native `1x` scale. Content relies on docked bottom-sheet drawers (`50%` or `85%` height) and an edge-to-edge bottom navigation strip featuring touch targets sized to a minimum of `48px`.
- **Tablet (`768px – 1023px`):** Scaled at `1.5x`. Modular fixed-width side panels (`300px`) float over the interactive farm plane with `12px` interior inset padding.
- **Desktop (`1024px+`):** Scaled at `2x`. The scene centers within an authentic `800×480` viewport ratio, framed by pinned companion consoles (`400px` width) for inventory, livestock logs, and market order slips.

## Elevation & Depth

This design system eschews Gaussian blurs, soft diffused lighting, and modern drop shadows in favor of **Crisp Orthogonal Pixel Depth** and strict layered hierarchy:

- **Surface Layering:** Panels stack using dark-fill framing. The baseline dialog backdrop is rendered in `#3E2723` (95% opacity), inset with `#2C1810` recessed title banners and highlighted by double-stroke borders (`2px solid #5D4037` internal with a `1px solid #3E2723` outer border).
- **Pixel Drop Shadows:** Floating windows, tooltips, and badges utilize an unblurred, hard-cast shadow: `2px 2px 0px rgba(0, 0, 0, 0.45)`.
- **Layer Stacking Hierarchy:**
  - `Layer 0`: Parallax backdrop, shifting sun and sky gradients (`#87CEEB` dawn through `#1a0f0a` dusk).
  - `Layer 1`: Ground tile grid (red clay, tilled soil, trampled savanna pathways).
  - `Layer 2–3`: Farm assets, fences, grazing livestock, and interactive crop patches.
  - `Layer 4`: In-world tooltips and hovering harvest icons.
  - `Layer 5`: Permanent HUD layer (coin counter, season badge, stamina ring, settings).
  - `Layer 6`: Modals, dialog boards, trading interfaces, and inventory drawers.
  - `Layer 7`: Floating numeric text (`+5 XP`, `-15 Pula`) and top-tier achievement banners.

## Shapes

The design system maintains strict geometric rigidity (`roundedness: 0`). Curved radii conflict with authentic 16-bit retro hardware aesthetics. 

Instead of rounded corners, panels, chips, and interactive cards employ crisp **stepped 90-degree pixel corners** or chamfered single-pixel cutouts. Toggle tracks and meters are constructed of pure rectangles bounded by dark timber outlines, maintaining a rugged, hand-hewn woodwork visual language throughout every interactive touchpoint.

## Components

### Buttons
- **Primary Action (CTA):** Background `#FF8F00`, solid border `1px solid #E65100`, text `#2C1810` (`spaceMono` bold). On hover, background brightens to `#FFA040`. On active/pressed, the element translates down `1px 1px 0px`, shifts background to `#E65100`, and border darkens to `#BF360C`.
- **Secondary Action (Rustic Board):** Background `#3E2723`, border `1px solid #5D4037`, text `#F5E6D3`. On hover, background lifts to `#4E342E` with text shifting to `#FF8F00`.
- **Danger Action:** Background `#C62828`, border `1px solid #B71C1C`, text `#F5E6D3`. On hover, shifts to `#D32F2F`.

### Panels & Cards
- **Window Panel:** Dual-framed box featuring `1px solid #3E2723` outer edge and an inner `2px solid #5D4037` rim. Background `#3E2723` at 95% opacity with an unblurred offset drop shadow `2px 2px 0px rgba(0,0,0,0.5)`. Content padding is set to `12px`.
- **Inventory & Item Cards:** Square `48×48px` or `64×64px` slotted frames with recessed background `#2C1810`. When selected, item cards display a `2px solid #FF8F00` active outline.

### Status Meters & Gauges
- **Gauge Container:** `8px` fixed height with `#1a0f0a` track fill and `1px solid #3E2723` rim.
- **Dynamic Fills:** Solid color bars without gradients—`#4CAF50` for growth/health, `#2196F3` for hydration, `#FF8F00` for hunger, and `#FFD700` for experience points. Progress transitions snap cleanly in 10% steps or smooth 300ms mechanical intervals.

### Form Inputs & Sliders
- **Text Inputs:** Recessed `#2C1810` interior, `1px solid #5D4037` border, cream text `#F5E6D3`, and an amber cursor caret (`#FF8F00`).
- **Sliders:** Segmented track `#3E2723` paired with an amber fill `#FF8F00` and an `8×8px` square block thumb with an inner `1px solid #2C1810` border.

### Chips & Badges
- **Status Badges:** Compact labels framed with a `1px` border matching the status color (`#4CAF50` for "Ready", `#C05C3C` for "Withered"), filled with `#2C1810`, and rendered in uppercase `spaceMono` at 10px.