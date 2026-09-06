# Document 23: Scene Render Specifications for Google Stitch

> Visual descriptions for generating pixel-art background scenes.
> Each scene is rendered at **800×480 pixels**, 16-bit pixel art style, warm Botswana-inspired palette.
> Implementation: 2026-09-06 — stitch backgrounds live under `assets/` / `public/assets/backgrounds/` as `farm_scene`, `kgotla_scene`, `bushveld_scene`, `market_scene`.

---

## Game Overview

**Molemisi** is a cozy pixel-art farm management simulator set in rural Botswana. The player manages a small holding — planting crops, raising livestock, trading at the market, visiting the community Kgotla, and exploring the wild Bushveld. There is no character movement; the player interacts by tapping objects on fixed scene screens. The art style is warm, golden-hour pixel art with earth tones, inspired by Southern African landscapes.

---

## Scene 1: Home Farm (Primary Screen)

**Prompt:**

> Pixel art top-down farm scene, 800x480, 16-bit style. Warm golden-hour lighting over a small Botswana homestead. Left side: a cluster of acacia and marula trees with scattered rocks and bushes forming a natural tree line. Center: a 4x3 grid of square soil plots on tilled earth — some empty brown soil, some with tiny green sprouts. Right side: a farmyard with a red-roofed barn, a stone well with a wooden bucket, a small chicken coop with chickens nearby, a goat pen, a pig pen, and a grain mill. Dirt paths connect the buildings. A wooden fence runs along the bottom. Green grass with flower patches fills the ground. Clear blue sky with a few white clouds. Warm earth tones: browns, greens, amber gold. No player character visible. Cozy, peaceful, inviting atmosphere. Pixel art, not realistic.

---

## Scene 2: Kgotla (Community Gathering)

**Prompt:**

> Pixel art community gathering circle, 800x480, 16-bit style. A traditional Botswana Kgotla — an open-air meeting place. Center: a circular arrangement of stone benches around a central fire pit with a small fire. An elder's carved wooden chair sits at the north side. Around the circle: 5 NPC characters — an elder in traditional dress, a woman selling produce, a young woman with herb baskets, a market vendor with a stall canopy, and a scout with a walking stick. Left: a wooden quest board with pinned papers. Right: a market stall with colorful goods under a striped canopy. Acacia trees provide shade. Herb garden with colorful plants near the herbalist. Warm afternoon light, community feel. Pixel art, not realistic.

---

## Scene 3: Bushveld (Wild Exploration)

**Prompt:**

> Pixel art savanna wilderness scene, 800x480, 16-bit style. A wild Botswana bushveld landscape. Open golden savanna with tall dry grass swaying. Scattered acacia and baobab trees. A small river or waterhole in the center with reeds along the banks. Rocky outcrops on the right side with a cave entrance. Dense bush thickets on the left. Wild animals visible: a bird in the sky, insects near water. Heat shimmer effect over the distant horizon. Sky with scattered clouds and warm sunset tones — amber, gold, dusty orange. Untamed, exploratory feel. No buildings. Pixel art, not realistic.

---

## Scene 4: Market (Trading Hub)

**Prompt:**

> Pixel art bustling market square, 800x480, 16-bit style. An open-air Botswana market. Top: a row of 4 market stalls with colorful striped canopies — red, orange, green, blue. Each stall displays goods: grains, meat, tools, gems. Center: an open market square with cobblestone ground. A few NPC vendors walking between stalls. Price boards showing numbers. Bottom: 4 action stalls — buy, sell, contracts, information. Smoke wisps from a food stall. Colorful, busy, lively atmosphere. Warm palette with pops of color from the canopies and goods. Pixel art, not realistic.

---

## Style Reference Notes

- **Palette:** Earth reds (#C05C3C), grass greens (#5A8F3C), sky blue (#87CEEB), amber gold (#FF8F00), dark brown (#3E2723), cream (#F5E6D3)
- **Lighting:** Golden hour — warm side-lighting with soft shadows
- **Perspective:** Slightly elevated top-down (3/4 view), not flat top-down
- **Character style:** Small (16-24px tall), simple silhouettes, no detailed faces
- **Ground texture:** Visible pixel tiles — grass, dirt, stone paths
- **Mood:** Cozy, warm, inviting, peaceful — like a living pixel postcard of rural Botswana
