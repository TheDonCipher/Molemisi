# Molemisi — Asset Manifest & Pipeline (Bushveld / P6)

**Status: RESOLVED.** All Bushveld art is generated and served. This document
records *where the art lives and how it gets there*, so the next person does not
re-derive it.

> An earlier revision of this file claimed the Bushveld assets were missing and
> listed English filenames (`material_clay.png`, `material_palm_fiber.png`).
> That was wrong on both counts — the art existed, and the generator names files
> in **Setswana**. Corrected below.

---

## 1. The pipeline (the part that bites)

There are **two** asset trees, and only one is served:

```
assets/                          <- SOURCE. PixelLab output lands here.
  backgrounds/open_bush_stage_0..3.png
  sprites/hotspots/*.png
  ui/items/*.png
  manifest.json
        |
        |  pnpm assets:sync  (scripts/sync-assets.mjs)
        |  cpSync, recursive + force. Additive — never deletes.
        v
apps/web/public/assets/          <- SERVED. Next.js maps this to /assets/...
apps/game/public/assets/         <- SERVED. Standalone Phaser build.
```

`pnpm assets:sync` is auto-run by the `predev` and `prebuild` hooks, so a normal
`pnpm dev` / `pnpm build` publishes the art. **If you add a PNG to `assets/` and
the screen still shows the fallback, you skipped the sync.**

Sync also emits `apps/game/src/generated-assets.ts` (a typed manifest, 261
assets / 14 groups) derived from `assets/manifest.json`.

### Regenerating (only if art is genuinely missing)

```
pnpm assets:generate
   = node scripts/generate-pixellab-assets.mjs   # hits PixelLab v2 /create-image-pixen
  && pnpm assets:sync
  && node scripts/generate-icons.mjs
  && node scripts/generate-media-assets.mjs
```

The generator is idempotent: it only builds assets that do **not** already exist
(`--force` to override). Requires `PIXELLAB_API_KEY` in the env or `.env`/`.env.local`.

---

## 2. Scene restoration backgrounds — 12 files, present

The API maps `restorationStage` (0=Degraded, 1=Partial, 2=Recovered, 3=Full) →
`scene.restorationAssets[stage]`, returning it as `restorationAssetKey`. The web
client requests `/assets/<restorationAssetKey>`.

| Scene | Stage 0 | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|
| open_bush | `backgrounds/open_bush_stage_0.png` | `_stage_1` | `_stage_2` | `_stage_3` |
| riverbank | `backgrounds/riverbank_stage_0.png` | `_stage_1` | `_stage_2` | `_stage_3` |
| rocky_outcrop | `backgrounds/rocky_outcrop_stage_0.png` | `_stage_1` | `_stage_2` | `_stage_3` |

`deep_bushveld` has `restorationAssets: []` by design — it shows "coming soon"
until Botho 300.

Stage boundaries come from `04 §7.2`: stage 1 at 40% of finds, stage 2 at 70%,
stage 3 at 100%.

## 3. Hotspot sprites — 13 files, present

`HOTSPOTS` (19 entries) reuse sprites, so 19 hotspots → 13 unique PNGs under
`sprites/hotspots/`:

`open_bush_deadfall`, `open_bush_tracks`, `open_bush_feather`,
`riverbank_clay`, `riverbank_palm`, `riverbank_reeds`, `riverbank_ripple`,
`riverbank_mud_tracks`, `riverbank_morula_tree`,
`rocky_outcrop_glint`, `rocky_outcrop_crevice`, `rocky_outcrop_perch`,
`rocky_outcrop_aloe`

## 4. Item icons — present, and now mapped

Generated files use **Setswana** names, but item **slugs** in
`packages/game-config/src/items.ts` are a mix. The mapping lives in
`apps/web/src/lib/pixelIcons.ts`:

| Item slug | File |
|---|---|
| `clay` / `letsopa` | `ui/items/material_letsopa.png` |
| `palm_fiber` / `mokolwane` | `ui/items/material_mokolwane.png` |
| `thatch` / `lotlhaka` | `ui/items/material_lotlhaka.png` |
| `phane` | `ui/items/material_phane.png` |
| `manure` / `manyoro` | `ui/items/material_manyoro.png` |
| `poleto` (plank) | `ui/items/product_poleto.png` |
| `thapo` (rope) | `ui/items/product_thapo.png` |
| `setena` (brick) | `ui/items/product_setena.png` |
| `bupi` (flour) | `ui/items/product_bupi.png` |
| `borotho` (bread) | `ui/items/product_borotho.png` |
| `morula` | `ui/items/product_morula.png` |
| `morula_seed` | `ui/items/seed_morula.png` |

Both spellings are mapped (slug + Setswana) so either convention the API returns
resolves to art.

---

## 5. Verification checklist

1. `node scripts/sync-assets.mjs` → "N files synced total".
2. `ls apps/web/public/assets/backgrounds/ | grep stage` → 12 files.
3. `ls apps/web/public/assets/sprites/hotspots/` → 13 files.
4. `cd apps/web && node node_modules/typescript/bin/tsc --noEmit` → clean.
5. In-game: scene background swaps at 40 / 70 / 100% finds; each hotspot shows
   its sprite rather than the emoji fallback.
