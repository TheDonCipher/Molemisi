# 25 — Inventory Item Detail: UX & Data Design

Status: implemented (packages/game-config `itemRelations.ts`, `items.ts` lore;
apps/web `lib/itemInfo.ts`, `components/screens/InventoryScreen.tsx`).

The inventory grid answers "what do I have?". The Item Detail card answers the
two questions a player actually asks next: **where did this come from?** and
**what is it for?** — plus one line of lore so the thing feels like part of the
world, not a database row.

## 1. Information architecture (priority order)

The card is read top-to-bottom, most-scanned first. Sections that have nothing
to say simply don't render — an empty state is noise.

1. **Header** — icon, Setswana name first, English second (only when different),
   intent chip (Plant / Sell / Craft / Build / Equipment), stat strip
   (qty / maxStack · grade · unit value).
2. **Lore** — one elder-voiced line, quoted. Always present (config-enforced).
3. **Where it comes from** — grouped acquisition sources with icons.
4. **Craft CTA** — only when the item is a recipe output; jumps to the Workshop.
5. **Used to make** — recipe chips; each jumps to the Workshop.
6. **Needed by** — buildings that consume it (construction / upgrades / repairs).
7. **Sell row** — unchanged rules (no seeds, nothing at zero stock).

Above the grid, a compact **Purse** strip shows Pula/Botho and links to the
Wallet. Currencies live in the Wallet (02 §3); the inventory never manages them.

## 2. Wireframes

```
INVENTORY (Sesupu)                    12 / 50 slots        ← Back to Farm
┌────────────────────────────────────────────────────────┐
│ 👛 Purse                                   P 240  ✨ 12 →│  ← tap → Wallet
└────────────────────────────────────────────────────────┘
[📦 All] [🌱 Seeds] [🌾 Crops] [🥚 Animal] [🪵 Materials]
┌────┐┌────┐┌────┐┌────┐
│ 🪵 ││ 🧱 ││ 🧵 ││ 🧱 │   ← Setswana name under every icon
│ 12 ││  4 ││  6 ││  3 │
│wood││pole││thap││sete│   (truncated)
└────┘└────┘└────┘└────┘

┌── ITEM DETAIL ─────────────────────────────────────────┐
│ ┌────┐  Thapo  (Rope)                              ✕   │
│ │ 🧵 │  [GO DIRA]  Qty: 6 / 30 · Grade: B · P4         │
│ └────┘                                                  │
│ “Thapo holds the kraal together. Rope, like trust, is   │
│  made by twisting many small fibres.”                   │
│ WHERE IT COMES FROM                                     │
│ 🔨 Craft  Thapo (Rope)                                  │
│ [🔨 Craft at the Workshop]                              │
│ NEEDED BY                                               │
│ 🏠 Kraal (Kraal — building, repairs)                    │
│ [ Sell (24 P) ]                            [ Sell 1 ]   │
└─────────────────────────────────────────────────────────┘

┌── ITEM DETAIL (seasonal: Phane) ───────────────────────┐
│ WHERE IT COMES FROM                                     │
│ 🌾 Forage  Open Bush — Stripped deadfall                │
│            · Moranang & Sedimonthole                    │
└─────────────────────────────────────────────────────────┘

## 3. Data mapping — every fact is derived, none hardcoded

| Card element              | Source of truth                                        |
| ------------------------- | ------------------------------------------------------ |
| Names (tn/en), stack, use | `ITEMS[slug]` (items.ts)                               |
| Intent chip               | `intentGroup(def)` (03 §2.1)                           |
| Lore line                 | `ItemDef.lore` — `ITEM_LORE` map in items.ts           |
| "Grow" source             | `def.category === 'DIJALO'` + `CROPS`                  |
| "Co-op" source (seeds)    | `CHAPTERS.filter(c => c.seeds.includes(cropId))`       |
| "Raise" source            | `ANIMALS` via `productType → item slug` bridge         |
| "Forage" source + months  | `HOTSPOTS` + `DEEP_BUSHVELD_HOTSPOTS` loot/seasonalLoot|
| Craft source / used-in    | `RECIPES` output & input `anyOf` groups (F8)           |
| Needed-by buildings       | `BUILDINGS` baseCost / upgradeCosts / maintenanceMaterials |
| Setswana month names      | `SETSWANA_MONTHS` (chapters.ts, 04 §9.1)               |

`itemRelations.ts` exposes `sourcesForItem`, `recipesUsingItem`,
`recipeProducingItem`, `buildingsUsingItem` — pure functions over the tables.
`itemRelations.spec.ts` pins structure and agreement (e.g. every recipe output
is a real item whose sources include that recipe), never balance numbers.

## 4. Voice rules (lore)

Per docs/MOLEMISI_Field_Journal_Narrative_Voice_v1:

- One line, spoken by someone who has farmed this land — elder-flavored,
  Botswana-rooted. Mogolo may be quoted.
- NEVER mechanics talk: no prices, quantities, cooldowns, or system words
  ("Pula", "Botho", digits). A Jest test enforces this.
- The lore is the item's soul; the `use` line stays the item's job description.
- Content is data: lore lives in `ITEM_LORE` in items.ts, never in a component.

## 5. Edge cases

- **Unknown slug** (item not in the catalogue): card falls back to inventory
  name/description; relations sections hide.
- **No sources** (starter tools — Mogoma, Selepe, etc.): a single italic
  fallback line, "Comes from the everyday work of the farm."
- **Truffle** has no inventory item; the pig produces nothing in relations yet.
- **Seasonal forage** shows real-calendar months in Setswana; everyday loot is
  never tagged seasonal.

## 6. Scaling guidance

- **New crop/seed/animal/recipe/hotspot/building**: add it to its config table.
  The relations, and therefore the card, update themselves. Only add a lore
  line to `ITEM_LORE` (the test fails until you do).
- **New source kind** (e.g. fishing): extend the `ItemSource` union, the
  `sourceLine` adapter, one icon in `SOURCE_ICONS`, one translation key.
- **New building material**: it appears in "Needed by" automatically the moment
  a `BuildCost` column references it — no card code changes.
- Card height is bounded: sources and building rows are plain lists that scroll
  with the screen; no section ever collapses behind a "more" button in v1.

## 7. Out of scope (deliberate)

- Wallet balances, ledger, Kagiso — Wallet screen only.
- Market price history on the card (Co-op price band lives in the Co-op UI).
- Quest cross-links ("needed for Chapter 3") until quests consume items.


┌── ITEM DETAIL (starter tool: Mogoma) ──────────────────┐
│ WHERE IT COMES FROM                                     │
│ Comes from the everyday work of the farm.   ← fallback  │
└─────────────────────────────────────────────────────────┘
```
