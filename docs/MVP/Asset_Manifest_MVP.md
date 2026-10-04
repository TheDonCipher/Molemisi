# Molemisi — MVP Asset Manifest (PixelLab API)

**Status:** Draft for ruling + generation. Companion to `docs/MVP/08_MVP_Design_Decisions.md` (Decision 10) and `ASSET_MANIFEST.md` (Bushveld pipeline).
**Owner:** Belvedere, for Princess Eugenia.
**Purpose:** A single, PixelLab-ready manifest of **every asset the MVP requires**, including the new art the 2026-10-04 rulings introduced (World Tree, avatar layers, data-driven cosmetics, calendar education UI). This is the list the art pipeline (`pnpm assets:generate`) should be checked against so we don't ship the store/avatar/Events without their pictures.

> **Schema (matches `assets/manifest.json`).** Each entry is `{ "group", "file", "size": {"w","h"}, "kind": "pixen", "prompt" }`. `kind` is `pixen` (PixelLab pixel-art). Files land under `assets/` and are synced to `apps/web/public/assets/` by `pnpm assets:sync` (see `ASSET_MANIFEST.md` §1). All prompts use the Molemisi palette: terracotta `#C05C3C`, warm grass `#5A8F3C`, amber `#FF8F00`, cream `#F5E6D3`, sky blue `#87CEEB`, dark brown `#3E2723`, with a 1px `#3E2723` outline, flat cel shading, no gradients/anti-aliasing.

---

## 0. Coverage snapshot (what's already generated vs. what's new)

> **Manifest entries shipped 2026-10-04.** The avatar and calendar rows below are
> now **in `assets/manifest.json`** (12 new keys: 6 avatar + 6 calendar), so `pnpm
> assets:generate` will produce them. The files themselves are not generated yet —
> every consumer degrades gracefully until they land (`AvatarSprite` falls back to
> an initials crest, a missing outfit simply does not draw, a missing hat falls back
> to a glyph). Run `pnpm assets:generate && pnpm assets:sync` to fill them in.

| Group | In `assets/manifest.json` today? | MVP status | Action |
|---|---|---|---|
| `icons` (UI) | Yes (94+ entries) | Complete | None |
| `crops` | Yes | Complete | None |
| `npcs` (5 canonical) | **Yes — all five** (`elder_neo`, `mama_naledi`, `refilwe`, `thabo`, `oupa_kabelo`) | Complete — **no gap** | None (see §3 correction note) |
| `npc-heads` | Yes (`mama_naledi_head`, `elder_neo_head`) | Complete | None |
| `buildings` | Yes (from line 2643) | Complete | None |
| `decor` / `scenes` | Yes (Bushveld pipeline) | Complete | None (see `ASSET_MANIFEST.md`) |
| `world` (World Tree) | **Yes — 4 stage keys added 2026-10-04** | **NEW — D2, wired** | Generate (§1) |
| `avatar` (base + outfit + hat) | **Yes — 6 keys added 2026-10-04** (3 bases, hat, 2 live outfits) | **NEW — D10, wired** | Generate (§2) |
| `cosmetics` (farm SKUs) | **Yes — 8 keys added 2026-10-04** (hut/kraal/frame/livestock × Market/Festival) | **NEW — D10** | Generate (§4) |
| `ui` (calendar education) | **Yes — 6 keys added 2026-10-04** (header, month strip, one note tile **per chapter**) | **NEW — D8, wired** | Generate (§5) |
| `idle` (breathing loops) | **Yes — 9 keys added 2026-10-04** (5 NPCs + 4 livestock) | **NEW — D1 2nd pass, wired** | Generate (§6) |

> **Full coverage: all 33 new keys are now declared.** `pnpm assets:generate` produces them and
> `pnpm assets:sync` copies them into `apps/web/public/assets`. Until then every consumer
> degrades: `BreathingSprite` falls back to the static sprite (and a glyph if that is missing),
> `WorldTree` falls back to a labelled stage plate, `ChapterTile` falls back to the chapter slug,
> and the Almanac header/month strip simply hide themselves.

> **Correction of record.** An earlier draft claimed Mogolo, Mama Naledi, and Ntate Kabelo NPC sprites were missing. On inspection (2026-10-04) all five canonical NPCs have full-body `npcs` sprites in `assets/manifest.json`. The only NPC *art* add is the **World Tree** and optionally wiring the two surplus sprites (`market_vendor`, `bushveld_scout`) that exist but are not in the hardcoded cast.

---

## 1. World Tree — `group: world` (NEW, Decision 2)

The restoration centerpiece of Sesana (D2). A community-restoration visual tied to Botho + completed Council Projects, distinct from the Bushveld scene stages. Four restoration stages, like the Bushveld backgrounds.

| key | file | size | prompt (summary) |
|---|---|---|---|
| `world_tree_stage_0` | `sprites/world/world_tree_stage_0.png` | 400×300 | Degraded: bare cracked trunk, no leaves, dry red-earth, muted palette |
| `world_tree_stage_1` | `sprites/world/world_tree_stage_1.png` | 400×300 | Partial: slim green shoots, a few leaves, small sapling crown |
| `world_tree_stage_2` | `sprites/world/world_tree_stage_2.png` | 400×300 | Recovered: fuller canopy, flowering, birds present, grass ring |
| `world_tree_stage_3` | `sprites/world/world_tree_stage_3.png` | 400×300 | Full: grand acacia-like canopy, glowing, villagers' shade, golden hour |

Each prompt must end with the standard palette + outline + flat-cel-shading clause (see §0). Stage boundaries mirror `04 §7.2` (40% / 70% / 100% restoration).

---

## 2. Avatar system — `group: avatar` (NEW, Decision 10 — **3 layers, ruling 2026-10-04**)

**Decided system (D10, extended): a 3-layer sprite** — `avatar_base` (body, chosen once at creation as a **gender variant**) + `avatar_outfit` (overlay, the cosmetic) + **`avatar_hat` (the signature Farmer's Hat, always worn, non-removable)**. The store swaps the `outfit` layer only; the base is chosen at creation and the hat never changes. New outfits = new SKU, no code change.

### 2.1a The signature Farmer's Hat — layer 3 (NEW, always-on)

| key | file | size | note |
|---|---|---|---|
| `avatar_hat_farmer` | `sprites/avatar/hat_farmers.png` | 32×64 | The signature Farmer's Hat, **drawn on top of every outfit**. Non-removable, not a cosmetic slot, not purchasable. One file ships in MVP. |

> The hat is the player's permanent silhouette cue — it must remain legible over every outfit. Prompt it as part of the Molemisi palette (`#FF8F00` amber / `#F5E6D3` cream straw) with the standard 1px `#3E2723` outline.
> **Wired 2026-10-04:** `AVATAR_HAT` in `packages/game-config/src/avatar.ts`. The path ships in every avatar view from the API, and `AvatarSprite` draws it **last** with its own fallback, so it can never be occluded by an outfit or lost.

### 2.1 Base bodies — **[DISCRETION CLOSED 2026-10-04: three bases, named by config key]**

| key | file | size | note |
|---|---|---|---|
| `avatar_base_sesana` | `sprites/avatar/base_sesana.png` | 32×64 | Everyday field clothes — the plainest start (`base_sesana`) |
| `avatar_base_kgale` | `sprites/avatar/base_kgale.png` | 32×64 | Old-village cut — wrap and shoulder cloth (`base_kgale`) |
| `avatar_base_phane` | `sprites/avatar/base_phane.png` | 32×64 | Light cloth for the long warm months (`base_phane`) |

All bases share the same 32×64 footprint and anchor point as the NPC sprites so outfits overlay cleanly. **A small, Setswana-attire-grounded set rather than a binary gender toggle** (Princess ruling: "choose gender and outfit" at creation).

> **Wired 2026-10-04:** `AVATAR_BASES` in `packages/game-config/src/avatar.ts`. `POST /avatar` accepts a base **once** — a second call is refused — so "chosen once at creation" is enforced server-side, not merely hidden in the UI.

### 2.2 Outfit overlays (the expandable cosmetic layer — Market + Festival shelves)

Format: transparent-background overlay, 32×64, drawn to align with `avatar_base`. Each outfit has a Market (Pula) and a Festival (Madi) cousin per `34 §3.1`.

**MVP starter set (expandable — add rows to the manifest, not code):**

| key | file | slot | shelf | size |
|---|---|---|---|---|
| `avatar_outfit_mogolo_hat` | `sprites/avatar/outfits/mogolo_hat.png` | outfit | Market (P600 · SKU `cos_market_hat`) | 32×64 |
| `avatar_outfit_fest_outfit` | `sprites/avatar/outfits/fest_outfit.png` | outfit | Festival (M150 · SKU `cos_fest_outfit`) | 32×64 |
| `avatar_outfit_mokgosi_cloak` | `sprites/avatar/outfits/mokgosi_cloak.png` | outfit | **Botho-tier (earned)** | 32×64 |

`outfit_mokgosi_cloak` is the top-rung earned cosmetic from the achievement ladder (D5) — unlock, never purchase; its manifest row is added when that SKU lands.

> **Naming convention (decided 2026-10-04):** the outfit **file name IS the cosmetic id** held in `player_cosmetics.cosmetic_id`, so the renderer resolves an equipped outfit with `/assets/sprites/avatar/outfits/<cosmeticId>.png` and needs nothing else. The manifest key is prefixed `avatar_outfit_` to stay greppable in the generator. Two outfit SKUs are live today (`mogolo_hat`, `fest_outfit`) — the doc's earlier `outfit_*` names were placeholders and are superseded.
>
> **Wired:** `PUT /avatar/outfit` accepts only an **owned, `outfit`-slot** cosmetic, and `GET /avatar` returns `ownedOutfits` so the wardrobe renders what the player may actually equip. `StoreScreen` shows the wardrobe with a live 3-layer preview per row.

---

## 3. NPC sprites — `group: npcs` (already present; audit only)

All five canonical NPCs exist. **No generation required.** Listed for completeness and to flag the surplus.

| Cast member | manifest key | file | status |
|---|---|---|---|
| Mogolo (Elder) | `elder_neo` | `sprites/npcs/elder_neo.png` | ✅ present (32×64) |
| Mama Naledi (Trader) | `mama_naledi` | `sprites/npcs/mama_naledi.png` | ✅ present (32×64) |
| Ntate Kabelo (Builder) | `oupa_kabelo` | `sprites/npcs/oupa_kabelo.png` | ✅ present (32×64) |
| Refilwe (Herbalist) | `refilwe` | `sprites/npcs/refilwe.png` | ✅ present (32×64) |
| Thabo (Farmer) | `thabo` | `sprites/npcs/thabo.png` | ✅ present (32×64) |

**Surplus (exists, not in hardcoded cast):** `market_vendor`, `bushveld_scout` (both `npcs`, 32×64). **Action:** wire into content (e.g., a Market background NPC, a Bushveld scout) or deprecate from the manifest. Not a gap.

---

## 4. Farm cosmetics — `group: cosmetics` (NEW, Decision 10)

Farm display slots (D10): `hut`, `kraal`, `frame`, `livestock`. Market (Pula) + Festival (Madi) cousin each. These are *homestead* cosmetics — the player's farm, not the shared Kgotla (ruling restricts cosmetics to farm + avatar).

| key | file | slot | shelf | size |
|---|---|---|---|---|
| `cosmetic_hut_thatch` | `sprites/cosmetics/hut_thatch.png` | hut | Market (P200) | 64×64 |
| `cosmetic_hut_tin` | `sprites/cosmetics/hut_tin.png` | hut | Festival (M40) | 64×64 |
| `cosmetic_kraal_wood` | `sprites/cosmetics/kraal_wood.png` | kraal | Market (P600) | 64×64 |
| `cosmetic_kraal_stone` | `sprites/cosmetics/kraal_stone.png` | kraal | Festival (M80) | 64×64 |
| `cosmetic_frame_beads` | `sprites/cosmetics/frame_beads.png` | frame | Market (P1,500) | 64×32 |
| `cosmetic_frame_carved` | `sprites/cosmetics/frame_carved.png` | frame | Festival (M150) | 64×32 |
| `cosmetic_livestock_bell` | `sprites/cosmetics/livestock_bell.png` | livestock | Market (P600) | 32×32 |
| `cosmetic_livestock_ribbon` | `sprites/cosmetics/livestock_ribbon.png` | livestock | Festival (M80) | 32×32 |

Sizes are indicative; confirm against the actual farm-render anchor points in `apps/web`. Each entry gets the standard palette/outline/flat-cel clause.

---

## 5. Calendar education UI — `group: ui` (NEW, Decision 8)

The rewritten Almanac/guide (B6) teaches the Setswana months + four chapters + "why it matters." Needs illustrated assets beyond the existing `icons` group.

| key | file | size | note |
|---|---|---|---|
| `calendar_almanac_header` | `ui/calendar/almanac_header.png` | 320×80 | Banner: four chapter seals (Sekala sa Pula/Phane/Moriti/Letlhafula) in a row |
| `calendar_month_strip` | `ui/calendar/month_strip.png` | 400×48 | 12 Setswana month markers as a decorative strip |
| `calendar_pula_note` | `ui/calendar/pula_note.png` | 96×96 | Illustrative tile: rain filling tank + seedling |
| `calendar_phane_note` | `ui/calendar/phane_note.png` | 96×96 | Illustrative tile: tall late-rain stalks + a phane moth |
| `calendar_moriti_note` | `ui/calendar/moriti_note.png` | 96×96 | Illustrative tile: empty Jojo tank + dry field ("water is the whole game") |
| `calendar_letlhafula_note` | `ui/calendar/letlhafula_note.png` | 96×96 | Illustrative tile: harvest basket + wind |

These are UI illustrations; keep them flat, readable at small size, palette-consistent. The chapter **names must read "Sekala sa …"** per the D8 ruling (`04 §9.2`).

> **One note tile per chapter (6 keys, all in `assets/manifest.json` as of 2026-10-04).** An earlier draft of this table omitted Phane, which would have left one of the four chapters without an illustration; the tile is added so all four match.
>
> **Month content is NOT blocked.** The twelve Setswana months are **✅ RULED correct (2026-10-04)** — there is no missing-notes problem. The calendar education UI reads them straight from `SETSWANA_MONTHS` in `packages/game-config/src/chapters.ts` (Ferikgong, Tlhakole, Mopitlwe, Moranang, Motsheganong, Seetebosigo, Phukwe, Phatwe, Lwetse, Diphalane, Ngwanatsele, Sedimonthole) and derives the active chapter, its character and the next rollover date from the same module.

---

## 6. Breathing / idle loops — `group: idle` (NEW, Decision 1 — ruling 2026-10-04)

Two **always-on ambient breathing loops** were ruled into v1: NPC breathing in the Kgotla, animal breathing on the farm. They are **sprite-sheet idle animations, not physics** — one loop per sprite, low frame count for low-end devices, and both **disabled under the reduced-motion / Particles-OFF accessibility profile** (`22 §11.5`).

| key | file | size | frames | note |
|---|---|---|---|---|
| `idle_elder_neo_breath` | `sprites/npcs/idle/elder_neo_breath.png` | 32×64 | 2–3 | Mogolo idle breath (~3 s period, 2–4 px) |
| `idle_mama_naledi_breath` | `sprites/npcs/idle/mama_naledi_breath.png` | 32×64 | 2–3 | Mama Naledi idle breath |
| `idle_oupa_kabelo_breath` | `sprites/npcs/idle/oupa_kabelo_breath.png` | 32×64 | 2–3 | Ntate Kabelo idle breath |
| `idle_refilwe_breath` | `sprites/npcs/idle/refilwe_breath.png` | 32×64 | 2–3 | Refilwe idle breath |
| `idle_thabo_breath` | `sprites/npcs/idle/thabo_breath.png` | 32×64 | 2–3 | Thabo idle breath |
| `idle_livestock_breath_<animal>` | `sprites/livestock/idle/<animal>_breath.png` | 32×32 | 2–3 | One per animal type; layered **under** the `22 §4.5` feed bounce/hearts |

> **Generation approach:** these can be produced cheaply by shifting/re-scaling the existing single-frame sprite vertically by a few pixels (breathing in/out), not by re-drawing the character. The hat and NPC poses must stay identical across frames so the loop does not "flicker".

**Scope guard:** breathing is the **only** ambient idle loop in v1 — do **not** extend it to crops, buildings or scene props without a new ruling.

---

## 7. Generation checklist (run before lock-down)

1. **World Tree (§1):** 4 sprites — gates D2 visual.
2. **Avatar (§2):** base gender variants + **1 Farmer's Hat layer** + 6 starter outfits — gates D10 store + avatar system.
3. **Farm cosmetics (§4):** 8 sprites — gates D10 store (farm slots).
4. **Calendar UI (§5):** 5 illustrations — gates D8 calendar education UI.
5. **Idle loops (§6):** 5 NPC + per-animal breathing sheets — gates the D1 ambient-animation ruling.
6. **NPC (§3):** none to generate; decide surplus (`market_vendor`/`bushveld_scout`) wire-or-drop.
7. Run `pnpm assets:generate && pnpm assets:sync`; verify each new file resolves (no emoji fallback) in-game.
8. Extend the data-driven cosmetics SKU manifest (D10) to reference the `cosmetics` + `avatar/outfits` keys above.

> **Scope guard (D7):** crafting/cooking product icons (`product_poleto`, `product_bupi`, etc.) already exist in `assets/manifest.json` (`ui/items/…`) and are **not** blocked by the D7 deferral — they are simply not surfaced in a crafting UI in MVP. They remain valid for the v1.1 build and for the D6 Events service (which grants Bupi/Borotho as event rewards).

*This manifest is the art half of Decision 10. The behavioural half (avatar 3-layer system, expandable cosmetics SKUs, store UI) lives in `08_MVP_Design_Decisions.md` §10 and the sprint plan (§0.2 B4/B7/B8). The idle-loop section (§6) is the art half of Decision 1 (2026-10-04 second pass).*
