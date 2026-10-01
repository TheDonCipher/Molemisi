# `assets/_archive/` — retired v1 assets

Files here are **deliberately not loaded by the game**. They are kept so the art history
survives (doc 30 §9 **Q6**: *"Archive under `assets/_archive/` — one commit, and the history
survives"*). Nothing in `apps/` or `packages/` may reference anything under this directory;
the build's asset-reachability gate treats this tree as out of scope.

Archived 2026-09-30 under roadmap tasks **2.11** (doc 30 finding **N-8** — "reconcile the asset
catalogue with the item catalogue") and **2.12** (doc 30 **N-9** — the guinea-fowl swap).

| File | Why it was archived |
| --- | --- |
| `ui/items/building_borehole.png` | No `BUILDINGS` entry, and it must not get one yet. The original design (`docs/archive/MOLEMISI_Core_Systems_v2.md:166`) reserves the water line — **Stone Well → Windmill → Solar Borehole** — as *"the first thing built after MVP ships"*. Promoting it now would also require reworking `water.service.ts`, which assumes exactly **one** `water_source` row. Ruled by Princess Eugenia 2026-09-30: archive now, revisit as a **v1.1** water-tier line. |
| `ui/items/building_greenhouse.png` | No `BUILDINGS` entry; doc 30 N-8: *"not Botswana"*. Retired outright. |
| `ui/items/product_wool.png` | No `ITEMS` entry and no animal produces it. Wool would require a fifth animal (sheep), which is out of v1 scope. Doc 30 N-8: *"either give them a harness or delete."* |
| `ui/items/material_marula.png` | No `ITEMS` entry — note the crop **`morula`** (Sclerocarya birrea) already covers this plant in `crops.ts`. This file is a spelling-duplicate of content that exists. |
| `ui/items/material_salt.png` | No `ITEMS` entry; salt has no production chain in v1. |
| `ui/items/product_saffron.png`, `ui/items/seed_saffron.png`, `sprites/crops/saffron/*` (5 stage files) | `saffron` was correctly replaced by `morula` in `crops.ts`. `crops.spec.ts` asserts its absence (`expect(CROPS.saffron).toBeUndefined()`). The client-side dead references in `pixelIcons.ts` and `gameState.tsx` were removed in the same change. |
| `sprites/animals/pig/*` (4 mood frames) | Roadmap task **2.12** / doc 30 **N-9**: the **pig** was the weakest cultural fit for a Botswana setting, and its product was a **truffle** — a European foraging trope. Replaced by the **guinea fowl** (*kgaka*), ruled in doc 30 §9 **Q1**. The fowl's own sprites are pending (see below). |
| `ui/items/product_truffle.png` *(never existed)* | The `truffle` item referenced this sprite, but **the file was never on disk** — so the pig's product icon was a 404. The item itself was replaced by `guinea_fowl_egg` (P12). |

## Pending regeneration — PixelLab credits exhausted (2026-09-30)

The four `sprites/animals/guinea_fowl/{idle,happy,product,sick}.png` frames are **declared in
`scripts/generate-pixellab-assets.mjs` but not yet generated**: the PixelLab account returns
`402: Insufficient generations and credits (0.0/5000.0)`. Until the account is topped up,
`AnimalSprite`'s existing `onError` fallback renders the 🐦 emoji instead — the game is playable,
just not yet drawn. This blocker also covers Pass-2 tasks 2.1, 2.5 and 2.10.

## Not archived here — deleted in the same task

`assets/sprites/buildings/{barn,coop,goat_pen,mill,paddock,pig_pen,well}/lvl1.png` were **deleted**
(not archived): they were a superseded second art generation with **zero** code references — the
client loads `assets/ui/items/building_*.png` by direct path — and their bytes differed from those
files, so they were stale rather than duplicated. `git` history retains them.

`assets/sprites/buildings/kraal/` is **untracked** and belongs to a concurrent work stream; it was
deliberately left alone.
