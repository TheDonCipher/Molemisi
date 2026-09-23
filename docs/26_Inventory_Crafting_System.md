# 26 — Inventory & Crafting System: Formal Reference

Status: **inspection document**. Every data table below is generated from
`@molemisi/game-config` (`packages/game-config/dist`) by
`scripts/generate-inventory-reference.cjs` — regenerate with:

```bash
cd packages/game-config && npm run build && cd ../..
node scripts/generate-inventory-reference.cjs
```

Nothing here is hand-copied from the config; prose explains, tables *are* the
config. Sources of truth per area: `items.ts` (catalogue), `itemRelations.ts`
(derived relations), `crafting.ts` (recipes + economics), `buildings.ts`
(material demand, slots), `economy.ts` (storage tiers), `chapters.ts` (seed
calendar, month names), `livestock.ts` (products), `bushveld.ts` (forage).
Runtime rules cite `apps/api/src/inventory/inventory.service.ts` (sole
canonical writer) and `apps/api/src/crafting/*`.

---

## 1. The system at a glance

Items exist to flow through one loop:

```
BUY seeds (Co-op, by chapter) ──► GROW crops ──┐
FORAGE bushveld materials (Kagiso-gated) ──────┼──► CRAFT ──► building mats ──► BUILD/UPGRADE/MAINTAIN
RAISE livestock products ──────────────────────┤            └─► food ──► SELL
                                               └──► SELL (Co-op, 5% tax)
```

Design rules the numbers encode:

- **Content is data** (01 §4): adding an item/recipe/hotspot updates this whole
  document and the in-game item card automatically. Only lore is hand-written,
  and tests enforce its voice.
- **Slots are the progression, not timers** (F14): every craft takes 2–6 h, so
  no recipe can outrun a play session; the Workshop's 1→3 concurrent slots are
  the real unlock.
- **Substitution is a visible choice** (03 §3.3, F8): Setena takes clay *or*
  stone, Bupi takes sorghum *or* millet — the player picks, nothing auto-picks.
- **No accidental losses**: inputs are priced at opportunity cost (what selling
  them raw would net) and the margin is printed on the recipe card.
- **Tools are equipment** (F15): owned once, never stacked, never sold, never
  consume an inventory slot.

## 2. Data model

### 2.1 Static definition — `ItemDef` (items.ts)

```ts
interface ItemDef {
  slug: string;            // canonical id, referenced everywhere
  name: string;            // English display name
  setswana: string;        // Setswana-first display name
  category: ItemCategory;  // one of the 7 sets below
  maxStack: number;        // per-slot quantity cap
  baseValue: number;       // Pula value (tools: 0)
  use: string;             // "Go rekisa…" one-line purpose (03 §2.1)
  lore: string;            // elder-voiced line, test-enforced
  sprite: string;          // ui/items/*.png
  isTool: boolean;         // equipment (F15)
  sellable: boolean;       // seeds: false
}
```

### 2.2 Derived relations — `itemRelations.ts`

```ts
type ItemSource =
  | { kind: 'grow';   cropId: string }
  | { kind: 'buy';    seedItemSlug: string; chapters: ChapterSlug[] }
  | { kind: 'raise';  animalId: string }
  | { kind: 'forage'; scene: SceneSlug; hotspotId: string; months?: number[] }
  | { kind: 'craft';  recipeSlug: string };

sourcesForItem(slug)      // every way an item enters the inventory
recipesUsingItem(slug)    // recipes whose anyOf substitution groups contain it
recipeProducingItem(slug) // the recipe that outputs it, if any
buildingsUsingItem(slug)  // construction / upgrade / maintenance demand
```

All four are pure functions over the config tables. The **only** hand-written
bridge is livestock `productType → item slug` (`egg → eggs`,
`goat_milk/cow_milk → milk`, `truffle → truffle`), kept next to the animals as
`PRODUCT_ITEM` in `livestock.ts`; everything else joins by slug. A product's
price of record is the mapped item's `baseValue` (`productValuePula()`, G3).

### 2.3 Crafting definition — `RecipeDef` (crafting.ts)

```ts
interface InputGroup { anyOf: string[]; qty: number }  // substitution group
interface RecipeDef {
  slug; name; setswana;
  output: string; outputQty: number;
  inputs: InputGroup[];
  feePula: number;            // for a batch of 1
  durationMinutes: number;    // 120–360 (F14 floor: 2 h)
  unlock: { bothoGte: number } | null;
}
```

### 2.4 Runtime representation (API)

`player_inventory(player_id, item_def_id, quantity)` — written **only** by
`InventoryService` (P3). A *slot* is one distinct non-tool item type; the slot
cap comes from the Storage building tier × Guild multiplier. `addItem` returns
`{ added, overflow }` — overflow is reported, never silently dropped. `removeItem`
deletes the row at zero. Livestock collection grants through `addItem` BEFORE
the animal's timer resets, so a full store loses nothing (G4 — migration
`20260923000031` backfilled the legacy rows, merging goat/cow milk into
`milk`). Contracts check and deduct here too. The legacy `inventory` table
holds nothing anymore and can be dropped in a later migration.

## 3. Item identity rules

- **Categories (7, Setswana-named):** DIPEO seeds → DIJALO crops → DIPHOLOGOLO
  livestock goods → DITSHIMOLOGO TSA NAGENG bushveld materials → DITSALO crafted
  building materials → DIKUNO processed food → DIDIRISIWA tools.
- **Intent** is derived, never stored: `intentGroup()` maps tools→`equipment`,
  seeds→`plant`, crafted building materials→`build`, everything else→`sell`.
  It drives the UI chip and the sell affordance.
- **Stack caps by kind:** seeds 99 · crops 50 · bushveld materials 50 ·
  livestock goods 30 · crafted building materials 99 · processed food 20 ·
  tools 1 (not stored).
- **Valuation:** `baseValue` is the reference price. Co-op sales net 95%
  (`COOP_TAX = 0.05`); crafting prices inputs at `OPPORTUNITY_COST_FACTOR =
  0.95` — what selling the raw material would have netted.
- **The web card** (`apps/web/src/lib/itemInfo.ts` + `InventoryScreen.tsx`)
  renders this same graph: names, intent, stats, lore, sources, "used to make"
  (→ Craft), "needed by" buildings, purse strip (→ Wallet).

## 4. Complete item catalogue

Catalogue size: **41 items** (4 tools are equipment, not stored).

### DIPEO (11)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `sorghum_seed` | Peo ya Mabele | Mabele Seed | 99 | P2 | plant | Co-op: pula, moriti, letlhafula | — | — |
| `millet_seed` | Peo ya Lebelebele | Lebelebele Seed | 99 | P2 | plant | Co-op: pula, moriti, letlhafula | — | — |
| `maize_seed` | Peo ya Mmidi | Mmidi Seed | 99 | P3 | plant | Co-op: pula, phane | — | — |
| `cowpeas_seed` | Peo ya Dinawa | Dinawa Seed | 99 | P3 | plant | Co-op: pula, moriti | — | — |
| `tomatoes_seed` | Peo ya Tamati | Tamati Seed | 99 | P5 | plant | Co-op: pula, phane | — | — |
| `watermelon_seed` | Peo ya Legapu | Legapu Seed | 99 | P6 | plant | Co-op: phane, letlhafula | — | — |
| `groundnuts_seed` | Peo ya Manoko | Manoko Seed | 99 | P8 | plant | Co-op: pula, phane | — | — |
| `sesame_seed` | Peo ya Sesame | Sesame Seed | 99 | P10 | plant | Co-op: phane, moriti | — | — |
| `pepper_seed` | Peo ya Pepere | Pepere Seed | 99 | P12 | plant | Co-op: phane, letlhafula | — | — |
| `herbs_seed` | Peo ya Herbs | Herbs Seed | 99 | P16 | plant | Co-op: moriti, letlhafula | — | — |
| `morula_seed` | Peo ya Morula | Morula Seed | 99 | P28 | plant | Co-op: moriti, letlhafula | — | — |

### DIJALO (11)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `sorghum` | Mabele | Sorghum | 50 | P3 | sell | Grow (sorghum) | bupi | — |
| `millet` | Lebelebele | Millet | 50 | P4 | sell | Grow (millet) | bupi | — |
| `maize` | Mmidi | Maize | 50 | P5 | sell | Grow (maize) | — | — |
| `cowpeas` | Dinawa | Cowpeas | 50 | P6 | sell | Grow (cowpeas) | — | — |
| `tomatoes` | Tamati | Tomatoes | 50 | P10 | sell | Grow (tomatoes) | — | — |
| `watermelon` | Legapu | Watermelon | 50 | P11 | sell | Grow (watermelon) | — | — |
| `groundnuts` | Manoko | Groundnuts | 50 | P11 | sell | Grow (groundnuts) | — | — |
| `sesame` | Sesame | Sesame | 50 | P15 | sell | Grow (sesame) | — | — |
| `pepper` | Pepere | Pepper | 50 | P17 | sell | Grow (pepper) | — | — |
| `herbs` | Ditlhare tsa Setso | Herbs | 50 | P25 | sell | Grow (herbs) | — | — |
| `morula` | Morula | Morula | 50 | P46 | sell | Grow (morula) | — | — |

### DIPHOLOGOLO (4)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `eggs` | Mae | Eggs | 30 | P5 | sell | Raise chicken | — | — |
| `milk` | Mashi | Milk | 30 | P15 | sell | Raise goat<br>Raise cow | — | — |
| `truffle` | Truffle ya Naga | Truffle | 30 | P50 | sell | Raise pig | — | — |
| `manure` | Manyoro | Manure | 30 | P1 | sell | — *(see §13)* | — | — |

### DITSHIMOLOGO TSA NAGENG (6)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `wood` | Dikgong | Wood | 50 | P2 | craft | Forage open_bush/ob_deadfall<br>Forage open_bush/ob_setlhare_sa_phane | poleto | — |
| `stone` | Matlapa | Stone | 50 | P3 | craft | Forage rocky_outcrop/ro_glint | setena | — |
| `clay` | Letsopa | Clay | 50 | P3 | craft | Forage riverbank/rv_clay | setena | — |
| `palm_fiber` | Mokolwane | Palm Fiber | 50 | P4 | craft | Forage riverbank/rv_palm | thapo | — |
| `thatch` | Lotlhaka | Thatch / Reeds | 50 | P3 | craft | Forage riverbank/rv_reeds | — | — |
| `phane` | Phane | Mophane Worms | 50 | P10 | craft | Forage open_bush/ob_setlhare_sa_phane [Moranang & Sedimonthole] | — | — |

### DITSALO (3)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `poleto` | Poleto | Plank | 99 | P7 | build | Craft (poleto) | — | kraal (construction)<br>farm_boundary (construction+maintenance)<br>crafting (construction+upgrade) |
| `thapo` | Thapo | Rope | 99 | P18 | build | Craft (thapo) | — | kraal (construction+maintenance)<br>farm_boundary (construction) |
| `setena` | Setena | Brick | 99 | P11 | build | Craft (setena) | — | water_source (construction+maintenance)<br>crafting (upgrade) |

### DIKUNO (2)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `bupi` | Bupi | Flour | 20 | P20 | craft | Craft (bupi) | borotho | — |
| `borotho` | Borotho | Bread | 20 | P60 | craft | Craft (borotho) | — | — |

### DIDIRISIWA (4)

| Slug | Setswana | English | Stack | Value | Intent | Sources | Used to make | Needed by |
|---|---|---|---|---|---|---|---|---|
| `mogoma` | Mogoma | Hoe | 1 | P0 | equipment | — *(starter)* | — | — |
| `selepe` | Selepe | Axe | 1 | P0 | equipment | — *(starter)* | — | — |
| `watering_can` | Nkgo ya Metsi | Watering Can | 1 | P0 | equipment | — *(starter)* | — | — |
| `pickaxe` | Piki | Pickaxe | 1 | P0 | equipment | — *(starter)* | — | — |

### Lore appendix (all items)

Voice rules (docs/MOLEMISI_Field_Journal_Narrative_Voice_v1), enforced by
`itemRelations.spec.ts`: elder-voiced, Botswana-rooted, **never** about
mechanics, prices, or counts — no Pula/Botho/digits. `use` is the functional
one-liner (03 §2.1); `lore` is the soul.

| Slug | Use (03 §2.1) | Lore |
|---|---|---|
| `sorghum` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Mabele fed this land before anyone thought to count a harvest. Mogolo says a field of sorghum is a promise kept. |
| `millet` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Lebelebele asks little and gives even when the rains fail. The old people planted it where nothing else would stand. |
| `maize` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Mmidi came from far away and made itself at home. A cob that fills the hand is worth the wait. |
| `cowpeas` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Dinawa feed the soil while they feed the pot. A wise field is never without them. |
| `tomatoes` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Tamati ripens all at once, like news in a small village. Carry it gently — it bruises like pride. |
| `watermelon` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | A legapu cooled in the shade is the bushveld's own answer to a hard afternoon. |
| `groundnuts` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Manoko hide their harvest underground. You only learn what you grew when you dig. |
| `sesame` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Sesame is small, but the traders count it like coins. Small things, kept well, add up. |
| `pepper` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | Pepere bites back, and the cook loves it for that. A little heat wakes the whole pot. |
| `herbs` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | The old remedies grow quietly along the fence lines. The bush keeps a pharmacy for those who ask politely. |
| `morula` | Go rekisa kgotsa go apaya. Sell at the Co-op, or cook with it. | The morula belongs to no one until the fruit falls — and then it belongs to everyone. Even the elephants know. |
| `sorghum_seed` | Go jala. For planting. | A handful of mabele seed is a whole field waiting to happen. Keep it dry and it will keep you. |
| `millet_seed` | Go jala. For planting. | Lebelebele seed is patient. It waits out the dry season the way the old people do — without complaint. |
| `maize_seed` | Go jala. For planting. | Plant mmidi when the rain promises, not when it arrives. Mogolo trusts the thunder more than the cloud. |
| `cowpeas_seed` | Go jala. For planting. | Dinawa seed costs little and forgives much. Good seed for a learning hand. |
| `tomatoes_seed` | Go jala. For planting. | Tamati seed is greedy for sun and water both. Give generously and it fills the basket. |
| `watermelon_seed` | Go jala. For planting. | Every legapu seed carries a whole sweet water inside its promise. |
| `groundnuts_seed` | Go jala. For planting. | Bury manoko shallow and walk away. They do their best work unseen. |
| `sesame_seed` | Go jala. For planting. | Sesame is sown thin and threshed gently. Some harvests are won with the fingertips, not the arms. |
| `pepper_seed` | Go jala. For planting. | Pepere seed sleeps late. Do not dig it up to check — Mogolo tried that once. |
| `herbs_seed` | Go jala. For planting. | Seed of the healing plants is sown with respect, or not at all. |
| `morula_seed` | Go jala. For planting. | A morula seed is a gift to someone not yet born. Plant it anyway. |
| `eggs` | Go rekisa kgotsa go baka. Sell, or bake into bread. | A warm egg in the morning means the kraal is content. Mogolo counts eggs the way others count blessings. |
| `milk` | Go rekisa. Sell at the Co-op. | Mashi left to sit becomes maas, and maas keeps when milk cannot. The cow gives; patience decides. |
| `truffle` | Go rekisa. Sell at the Co-op — chefs pay well for it. | The pig smells what the eye cannot see. A truffle is the bush keeping a secret for the patient. |
| `manure` | Go nonotsha tshimo. Enriches the soil for planting. | Manyoro is not waste. It is next year’s harvest wearing rough clothes. |
| `wood` | Go dira Poleto. For planks. | Dry dikgong from a deadfall, taken without hurting a living tree. The bush provides for those who look down. |
| `stone` | Go dira Setena. For bricks — two clay, or clay and stone (F8). | The granite here is older than any story. It does not mind becoming a wall. |
| `clay` | Go dira Setena. For bricks. | The riverbank gives up letsopa where the water bends. Good clay remembers the river in every brick. |
| `palm_fiber` | Go dira Thapo. For rope. | Mokolwane twists into rope the way small words twist into news — strand by strand. |
| `thatch` | Go tlhabolola matlo. For re-ratching roofs. | Lotlhaka from the reeds keeps a roof cool in the dry months and tight in the wet. Cut it cleanly; it grows back. |
| `phane` | Go rekisa. A seasonal delicacy — only in Moranang and Sedimonthole. | Phane come with the rains and leave without saying goodbye. A worm season is a good year. |
| `poleto` | Go aga. Building material. | A straight poleto is sawn twice — once with the eye, once with the blade. |
| `thapo` | Go aga le go baakanya. Building and kraal repair. | Thapo holds the kraal together. Rope, like trust, is made by twisting many small fibres. |
| `setena` | Go aga. Building material (R2 — Setena, not Setene). | A setena is river clay taught to hold a shape. Fire finishes the lesson. |
| `bupi` | Go baka Borotho. For bread. | Bupi is grain that has been persuaded. Between two stones, it gives up its secret. |
| `borotho` | Go rekisa. The most valuable thing you can make. | Borotho fresh from the fire gathers people the way shade gathers cattle at noon. |
| `mogoma` | Go lema. For working the soil. | The mogoma is the first tool taken up and the last one put down. The handle learns the hand. |
| `selepe` | Go rema. For cutting wood. | Selepe cuts what is dead so the living can grow. Sharpen it before the work, not during it. |
| `watering_can` | Go nosetsa. For watering crops. | A nkgo ya metsi carries the river to the root, one careful pour at a time. |
| `pickaxe` | Go epa. For breaking stone. | The piki argues with granite and usually wins. Stubbornness, aimed well, is a virtue. |

## 5. Acquisition model

Every item enters through exactly one of five source kinds (§2.2):

1. **buy** — seeds only, at the Co-op; stock rotates by chapter (§8). Seeds are
   the calendar made playable: 6 per chapter, thirsty crops in the rains,
   drought crops in the dry season, so monoculture is structurally impossible.
2. **grow** — every crop maps 1:1 to a seed (`slug = cropId + '_seed'`).
3. **forage** — bushveld hotspots (§9), gated by **Kagiso** (max 6, +1 per 4 h,
   hotspot rest 60 min, cost 1–2) so gathering can never out-earn the fields
   (04 §1). Material finds yield 2–4 per gather; rarity weights shift with
   Kagiso, so scarcity is a decision, not a dice roll.
4. **raise** — livestock products (§8), via the one explicit `productType →
   slug` bridge.
5. **craft** — the five recipes (§6).

## 6. Crafting system

Constants: `COOP_TAX = 0.05`, `OPPORTUNITY_COST_FACTOR = 0.95`,
`BONUS_YIELD_CHANCE = 0.12` (+1 output, variance only — crafting never fails),
slots `base 1 + 1 per Workshop upgrade, max 3`, batch fee multipliers
`{1: ×1, 3: ×2.5, 6: ×4}` (per-unit fee falls 1 → 0.83 → 0.67).

| Recipe | Output | Inputs (anyOf × qty) | Fee P1 | Time | Unlock |
|---|---|---|---|---|---|
| Poleto (Plank) | poleto ×1 | wood ×2 | P1 | 120 min | start |
| Thapo (Rope) | thapo ×1 | palm_fiber ×3 | P1 | 120 min | start |
| Setena (Brick) | setena ×1 | clay/stone ×2 | P2 | 180 min | start |
| Bupi (Flour) | bupi ×1 | sorghum/millet ×4 | P2 | 240 min | Botho ≥ 100 |
| Borotho (Bread) | borotho ×1 | bupi ×2 | P3 | 360 min | Botho ≥ 100 |

### Recipe economics per batch (inputs at opportunity cost, Co-op tax applied)

Each row closes: `total cost + profit = net`. Thapo is the best
profit-per-slot-hour in the chain; Bupi from millet is a thin margin by design
(millet is worth more raw than sorghum).

| Recipe | Inputs chosen | Batch | Input cost | Fee | Gross | Net | Profit | ROI |
|---|---|---|---|---|---|---|---|---|
| poleto | 2 wood | 1 | 3.8 | 1 | 7 | 6.65 | 1.85 | 39% |
| poleto | 2 wood | 3 | 11.4 | 3 | 21 | 19.95 | 5.55 | 39% |
| poleto | 2 wood | 6 | 22.8 | 4 | 42 | 39.9 | 13.1 | 49% |
| thapo | 3 palm_fiber | 1 | 11.4 | 1 | 18 | 17.1 | 4.7 | 38% |
| thapo | 3 palm_fiber | 3 | 34.2 | 3 | 54 | 51.3 | 14.1 | 38% |
| thapo | 3 palm_fiber | 6 | 68.4 | 4 | 108 | 102.6 | 30.2 | 42% |
| setena | 2 clay | 1 | 5.7 | 2 | 11 | 10.45 | 2.75 | 36% |
| setena | 2 clay | 3 | 17.1 | 5 | 33 | 31.35 | 9.25 | 42% |
| setena | 2 clay | 6 | 34.2 | 8 | 66 | 62.7 | 20.5 | 49% |
| setena | 2 stone | 1 | 5.7 | 2 | 11 | 10.45 | 2.75 | 36% |
| setena | 2 stone | 3 | 17.1 | 5 | 33 | 31.35 | 9.25 | 42% |
| setena | 2 stone | 6 | 34.2 | 8 | 66 | 62.7 | 20.5 | 49% |
| bupi | 4 sorghum | 1 | 11.4 | 2 | 20 | 19 | 5.6 | 42% |
| bupi | 4 sorghum | 3 | 34.2 | 5 | 60 | 57 | 17.8 | 45% |
| bupi | 4 sorghum | 6 | 68.4 | 8 | 120 | 114 | 37.6 | 49% |
| bupi | 4 millet | 1 | 15.2 | 2 | 20 | 19 | 1.8 | 10% |
| bupi | 4 millet | 3 | 45.6 | 5 | 60 | 57 | 6.4 | 13% |
| bupi | 4 millet | 6 | 91.2 | 8 | 120 | 114 | 14.8 | 15% |
| borotho | 2 bupi | 1 | 38 | 3 | 60 | 57 | 16 | 39% |
| borotho | 2 bupi | 3 | 114 | 8 | 180 | 171 | 49 | 40% |
| borotho | 2 bupi | 6 | 228 | 12 | 360 | 342 | 102 | 43% |

### Mechanics (CraftingService)

- **Start** reserves the job row, then consumes inputs + fee atomically with
  rollback refund — no partial deduction is possible.
- **Substitution** is an explicit player choice; `defaultInputsFor` pre-fills
  the group with whichever option the player owns most of, Setena may mix
  clay+stone (F8).
- **Collect** pays `outputQty × batch`, plus a 12% chance of +1.
- **Slots:** 1 by default; Workshop tier 2/3 add one each (`craftingSlotsFor`).
  The 2nd/3rd slot swing crafting income ~tenfold (C22), which is why their
  upgrades cost poleto *and* setena.

## 7. Building material demand matrix

| Building | Setswana | Build | Upgrades | Maintenance (per 90d) |
|---|---|---|---|---|
| Storage | Polokelo | — | P2500 → P12000 | — (+P0) |
| Jojo Tank | Tanka ya Metsi | P800 + 4 setena | — | 2 setena (+P60) |
| Kraal | Lesaka | P1200 + 6 poleto + 2 thapo | — | 2 thapo (+P90) |
| Farm Boundary | Legora | P1500 + 8 poleto + 3 thapo | — | 3 poleto (+P90) |
| Workshop | Lefelo la Tiro | P600 + 4 poleto | P3000 + 6 poleto + 4 setena → P9000 + 10 poleto + 8 setena | — (+P45) |

Total material sink if everything is built and upgraded: **34 poleto ·
5 thapo · 18 setena**, plus a rolling **3 poleto + 2 thapo + 2 setena every
90 days** of maintenance. That recurring demand is what keeps bushveld
gathering relevant after the build-out is done.

Legacy ids (`well`, `barn`, `coop`, `goat_pen`, `paddock`, `pig_pen`, `mill`)
alias to the v1 buildings so old database rows still resolve
(`getBuildingConfig`).

## 8. Seed calendar & livestock products

| Chapter | Months | Seeds stocked |
|---|---|---|
| Sekala sa Pula (Season of Rain) | Ngwanatsele, Sedimonthole, Ferikgong | sorghum, maize, tomatoes, cowpeas, groundnuts, millet |
| Sekala sa Phane (Season of Mophane) | Tlhakole, Mopitlwe, Moranang | maize, watermelon, tomatoes, groundnuts, sesame, pepper |
| Sekala sa Moriti (Season of Shade) | Motsheganong, Seetebosigo, Phukwe | sorghum, millet, cowpeas, sesame, herbs, morula |
| Sekala sa Letlhafula (Season of Harvest) | Phatwe, Lwetse, Diphalane | millet, sorghum, watermelon, pepper, herbs, morula |

| Animal | Product → item | Cycle | Qty | Base price | Feed/day | Cost |
|---|---|---|---|---|---|---|
| Chicken | egg → `eggs` | 12 h | 2 | P5 | 2 grain | P50 |
| Goat | goat_milk → `milk` | 24 h | 1 | P15 | 4 hay | P150 |
| Cow | cow_milk → `milk` | 24 h | 3 | P15 | 8 hay | P400 |
| Pig | truffle → `truffle` | 48 h | 1 | P50 | 6 mixed_feed | P300 |

All animals require the Kraal (the v1 list has one livestock building, D8); none
are level-gated (D5/C12) — only cost and the building gate them.

## 9. Forage table

Finds marked with qty are **materials** (land in inventory); finds marked ◈ are
**Field Journal discoveries** (lore only, no item).

| Hotspot | Scene | Finds (item/discovery · rarity · weight · qty) | Seasonal finds | Seasonal window |
|---|---|---|---|---|
| ob_deadfall | open_bush | wood · common · w10 · 2-4 | — | — |
| ob_setlhare_sa_phane | open_bush | wood · common · w10 · 2-4 | phane · rare · w6 · 2-4<br>wood · common · w4 · 2-4 | Moranang, Sedimonthole |
| ob_tracks | open_bush | ◈ Kudu (common)<br>◈ Steenbok (common) | — | — |
| ob_tracks_heavy | open_bush | ◈ Warthog (uncommon)<br>◈ Honey Badger (rare) | — | — |
| ob_feather | open_bush | ◈ Guinea Fowl (common) | — | — |
| ob_feather_dark | open_bush | ◈ Vulture (rare) | — | — |
| rv_clay | riverbank | clay · common · w10 · 2-4 | — | — |
| rv_palm | riverbank | palm_fiber · common · w10 · 2-4 | — | — |
| rv_reeds | riverbank | thatch · common · w10 · 2-4 | — | — |
| rv_ripple | riverbank | ◈ Catfish (common) | — | — |
| rv_ripple_bright | riverbank | ◈ Kingfisher (uncommon)<br>◈ Otter (rare) | — | — |
| rv_mud_tracks | riverbank | ◈ Waterbuck (uncommon)<br>◈ Heron (uncommon)<br>◈ Crocodile (rare) | — | — |
| rv_morula | riverbank | ◈ Marula tree (uncommon) | — | — |
| ro_glint | rocky_outcrop | stone · common · w10 · 2-4 | — | — |
| ro_quartz | rocky_outcrop | ◈ Quartz Shard (rare) | — | — |
| ro_crevice | rocky_outcrop | ◈ Rock Hyrax (common)<br>◈ Baboon (common) | — | — |
| ro_leopard | rocky_outcrop | ◈ Leopard (rare) | — | — |
| ro_perch | rocky_outcrop | ◈ Raptor (uncommon) | — | — |
| ro_aloe | rocky_outcrop | ◈ Aloe (common) | — | — |

## 10. Storage model

- Tier 1 Storage Basket (Seroto): 24 slots, 5 market listings, upgrade — (starter tier); Guild → 36 slots
- Tier 2 Storage Shed (Shedi): 48 slots, 10 market listings, upgrade P2500; Guild → 72 slots
- Tier 3 Storehouse (Ntlo ya Polokelo): 96 slots, 20 market listings, upgrade P12000; Guild → 144 slots

Upgrade costs derive from `BUILDINGS.storage.upgradeCosts` via
`storageUpgradeCost(tier)` — the same number `buildings.service` charges for
`storage_upgrade` (G8; the stale `STORAGE_TIERS.upgradeCostPula` duplicate that
said P1,200/P6,000 is deleted, and the seeded `storage_tiers` rows are
corrected by migration `20260923000031`).

A slot is one **distinct non-tool item type**; quantity within a slot is bounded
by the item's `maxStack` (§3). The Guild +50% bonus (`GUILD_STORAGE_MULTIPLIER =
1.5`) vanishes when the subscription lapses (R7/C8) — overflow is not destroyed,
but no new types can be added until back under cap. Listing slots feed the
Exchange (P2P, Madi), a separate economy from the Co-op.

## 11. Sell & exit rules

- **Co-op (Pula, NPC):** sells net `baseValue × 0.95` (`COOP_TAX`). The server is
  authoritative — `GET /market/quote` and the sale agree to the cent, and the
  confirm sheet shows price → gross → tax → net ("never surprise the player
  with a cost", 01 §4).
- **Seeds never sell** (`sellable: false`; the UI gate is the `_seed` suffix).
  Tools are equipment: not stored, not sellable.
- **Everything else** sells at any quantity held; a sale empties at 0 and the
  row (and slot) is freed.
- **Inventory card sell** quotes `quantity × unitValue` as a gross hint; the
  toast reports the server's `netProceeds` after tax.

## 12. Invariants

Structural (test-enforced in `packages/game-config`):

1. Every item carries lore; lore contains no Pula/Botho/digits/mechanics words.
2. Every recipe output is a real item whose sources include that recipe; every
   recipe input slug resolves (`recipesUsingItem` round-trips).
3. Phane's seasonal window is exactly `[Moranang, Sedimonthole]`.
4. Kraal maintenance consumes thapo; Workshop upgrades consume poleto + setena
   (`buildingsUsingItem` agreement).
5. No recipe is quicker than 120 min (F14); durations ≤ 360 min.
6. Every animal `productType` maps through `PRODUCT_ITEM` to a real item whose
   `baseValue` is the price of record — eggs P5, milk P15, truffle P50 (G2/G3).
7. Storage upgrade cost derives from `BUILDINGS.storage.upgradeCosts` only
   (G8: P2,500 → P12,000).

Runtime (enforced by services):

8. All writes go through `InventoryService`; stack cap and slot cap checked in
   exactly one place; overflow is returned, never dropped.
9. Crafting start = reserve → consume with rollback; collect is idempotent per
   job; failure states do not exist (variance bonus only).
10. Tools never occupy slots; storage cap = tier × Guild multiplier.
11. Money: Co-op tax 5% on every NPC sale; crafting fees ledgered as
    `crafting_fee`.

## 13. Observations & open gaps

Found while generating this reference — recorded, not silently patched. Gaps
2, 3, 4 and 8 from the first pass were fixed on 2026-09-23 (see *Resolved*
below); four remain open:

1. **`manure` has no acquisition source.** No crop, animal, hotspot, or recipe
   produces it; only starters/grants could create it. Its `use` promises
   "enriches the soil" but no consumer exists either.
2. **`DEEP_BUSHVELD_HOTSPOTS` is empty** — the scene unlocks at Botho ≥ 300
   with no content yet.
3. **`thatch` is a dead-end material** — foraged, sellable, but feeds no recipe
   and no building (its `use` promises roof work). Natural hook for a future
   storage/hut upgrade path.
4. **All wood comes from Open Bush.** Two hotspots, same scene — a deliberate
   scarcity or an oversight worth confirming.

### Resolved 2026-09-23 (batch 1)

- **Truffle item added** (was gap 2): `truffle` (P50, DIPHOLOGOLO, stack 30)
  now exists; the pig's product is addressable and saleable.
- **Livestock prices single-sourced** (was gap 3): `AnimalConfig.
  baseProductPrice` is deleted; the mapped item's `baseValue` is the only price
  of record, and the animal prices won (eggs P3→P5, milk P5→P15) because the
  payback math was tuned on them. `productValuePula()` derives the price; a
  spec test fails if any productType lacks a mapped item.
- **Legacy inventory cutover done** (was gap 4): `livestock.service` grants via
  `InventoryService.addItem` before resetting the animal's timer (full storage
  → collect fails, product kept); `contracts.service` checks and deducts from
  `player_inventory`. Migration `20260923000031` backfills legacy rows
  (`egg`→`eggs`, `goat_milk`/`cow_milk`→`milk`, `truffle`→`truffle`). The
  legacy `inventory` table's drop is deferred to a later migration.
- **Storage upgrade cost unified** (was gap 8): `STORAGE_TIERS.upgradeCostPula`
  (stale P1,200/P6,000) is deleted; `storageUpgradeCost(tier)` derives from
  `BUILDINGS.storage.upgradeCosts` (P2,500/P12,000) — the number actually
  charged — and the migration corrects the seeded `storage_tiers` rows.

---

*Regenerate every table: `node scripts/generate-inventory-reference.cjs`
(after `npm run build` in `packages/game-config`). If the doc and the script
output ever disagree, the script is right.*

