# Document 23: Scene Render Specifications for Google Stitch

> Visual descriptions for generating pixel-art background scenes.
> Each scene is rendered at **800×480 pixels**, 16-bit pixel art style, warm Botswana-inspired palette.
> Implementation: 2026-09-06 — the four stitch backgrounds are **generated at
> `assets/tiles/sky/`** and synced to `apps/web/public/assets/tiles/sky/`. Note the path: the
> manifest calls the group `backgrounds`, but there is **no `assets/backgrounds/` directory** —
> always resolve through the manifest's `file` field, not the group name (see `docs/05 §14`).
> **These four scenes are the complete set** — there is no fifth scene, and the client does not
> navigate between full-screen scenes: the four primary screens each render their own background
> over a React UI.
> **Also note (2026-10-02):** the `800×600` logical-resolution figure in `docs/05 §2` is a
> leftover from the deleted Phaser prototype. 800×480 is the real canvas.

---

## Game Overview

**Molemisi** is a cozy pixel-art farm management simulator set in rural Botswana. The player manages a small holding — planting crops, raising livestock, trading at the market, visiting the community Kgotla, and exploring the wild Bushveld. There is no character movement; the player interacts by tapping objects on fixed scene screens. The art style is warm, golden-hour pixel art with earth tones, inspired by Southern African landscapes.

> **Cultural accuracy note (added 2026-10-02).** The art is Setswana, not generic "African
> savanna". Concretely, in what the code and assets currently contain: a **kraal** (not a
> generic "barn" or "hut"), a **Jojo tank** for water, **morula** as the top-of-ladder crop,
> and Setswana naming throughout (`Mma/` for the respected-elder prefix, `kabelo` for
> advice/gossip, `tsholofelo` for a built structure). The pig and truffle were ruled
> **culturally off** (`docs/32` R5) and their art is archived. If you are regenerating any
> scene prompt, prefer these terms over their generic equivalents.

---

## Scene 1: Home Farm (Primary Screen)

**Prompt:**

> Pixel art top-down farm scene, 800x480, 16-bit style. Warm golden-hour lighting over a small Botswana homestead. Left side: a cluster of acacia and marula trees with scattered rocks and bushes forming a natural tree line. Center: a grid of square soil plots on tilled earth — some empty brown soil, some with tiny green sprouts. Right side: a farmyard with a traditional beehive-hung kraal enclosure, a Jojo tank on a stand with a dipper, a chicken coop with chickens nearby, a goat pen and a grain mill. Dirt paths connect the buildings. A wooden fence runs along the bottom. Green grass with flower patches fills the ground. Clear blue sky with a few white clouds. Warm earth tones: browns, greens, amber gold. No player character visible. Cozy, peaceful, inviting atmosphere. Pixel art, not realistic.

> *(Updated 2026-10-02: the original prompt specified a "red-roofed barn, a stone well with a
> wooden bucket, … a pig pen, and a grain mill". The barn, stone well and pig pen no longer
> exist in the game — the **kraal** replaced the building set and the **Jojo tank** replaced the
> well, and the pig was ruled culturally off. Regenerating from the original text would bring
> back art for three things the game does not have.)*

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

### What is actually shipped

⚠️ The file names do **not** match the scene names — there is no `farm_scene.png`.

| Scene | Manifest key | Actual file | Notes |
| --- | --- | --- | --- |
| Home Farm | `farm_day` | `assets/tiles/sky/farm_day.png` | Regenerated during the 2026-09 UI pass |
| Home Farm (sunset) | `farm_sunset` | `assets/tiles/sky/farm_sunset.png` | **Not in the four-scene model** — a time-of-day variant |
| Home Farm (night) | `farm_night` | `assets/tiles/sky/farm_night.png` | **Not in the four-scene model** |
| Kgotla | `kgotla` | `assets/tiles/sky/kgotla.png` | |
| Bushveld | `bushveld_savanna` | `assets/tiles/sky/bushveld_savanna.png` | |
| Bushveld (riverbank) | `bushveld_riverbank` | `assets/tiles/sky/bushveld_riverbank.png` | **Not in the four-scene model** |
| Market | `market` | `assets/tiles/sky/market.png` | Regenerated as a traditional village market |

So the "four scenes" in the four prompts below map to **four of the seven** shipped backgrounds.
The Bushveld in particular is **two** images (savanna + riverbank) because the riverbank is a
scarcity-gated hotspot area, and the farm has a day/sunset/night cycle that this document never
described.

Bushveld **hotspot** sprites are separate again — `assets/sprites/hotspots/<scene>/stage_0..3.png`
for `open_bush`, `riverbank` and `rocky_outcrop`.

> **Palette discipline is a known open item.** A 2026-09-28 audit sampled shipped assets and
> measured **0 % in-palette**, with ~20 colours covering 80 % of a single 32×32 icon where clean
> pixel art wants 3–5. The palette above is the *target*; most shipped sprites do not yet honour
> it. The fix (a quantise / denoise / colour-budget pass in the asset pipeline) is outstanding —
> see `docs/30` V-2 and `KNOWN_LIMITATIONS.md`.
