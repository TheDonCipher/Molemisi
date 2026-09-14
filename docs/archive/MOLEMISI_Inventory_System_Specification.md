# MOLEMISI
# Inventory System — Specification

---

## 1. Purpose

The inventory stores what the player collects, grows, produces, and uses. It is simple, visual, and connected — every item exists because Farming, the Bushveld, Crafting, Building, or the Market genuinely needs it.

> **Every item has a clear purpose. Every item's name belongs to this world.**

Before any item is added, it has to answer four questions: Where does it come from? What is it used for? Why would the player want it? Could an existing item already do the job? If the last answer is yes, the item doesn't get added.

---

## 2. Item Categories

```text
DIPEO       Seeds
DIJALO      Raw Crops
DITSHIMOLOGO TSA NAGENG   Wild Forage (Bushveld materials)
DIPHOLOGOLO Livestock products
DITSALO     Crafted Materials
DIKUNO      Processed Goods
DIDIRISWA   Tools (persistent, not stacked)
```

Plus a small **Special** category for uncommon finds — kept genuinely rare, not created per quest.

---

## 3. The Item List

| Item | Setswana | Category | Stack Cap | Base Value (P) | Source |
|---|---|---|---|---|---|
| Sorghum Seeds | Peo ya Mabele | Seeds | 99 | 2 | Market / Kgotla |
| Maize Seeds | Peo ya Mmidi | Seeds | 99 | 2 | Market / Kgotla |
| Watermelon Seeds | Peo ya Legapu | Seeds | 99 | 3 | Market / Kgotla |
| Sorghum | Mabele | Raw Crop | 50 | 4 | Farm |
| Maize | Mmidi | Raw Crop | 50 | 4 | Farm |
| Watermelon | Legapu | Raw Crop | 50 | 6 | Farm |
| Eggs | Mae | Livestock | 30 | 3 | Farm |
| Milk | Mashi | Livestock | 30 | 5 | Farm |
| Manure | Manyoro | Livestock | 30 | 1 | Farm |
| Wood | Dikgong | Wild Forage | 50 | 2 | Bushveld — Open Bush |
| Stone | Matlapa | Wild Forage | 50 | 2 | Bushveld — Rocky Outcrop |
| Clay | Letsopa | Wild Forage | 50 | 3 | Bushveld — Riverbank |
| Palm Fiber | Mokolwane | Wild Forage | 50 | 4 | Bushveld — Riverbank |
| Thatch / Reeds | Lotlhaka | Wild Forage | 50 | 3 | Bushveld — Riverbank |
| Mophane Worms | Phane | Wild Forage | 50 | 10 | Bushveld — Open Bush (seasonal, see §9) |
| Plank | Poleto | Crafted Material | 99 | 5 | Crafting |
| Rope | Thapo | Crafted Material | 99 | 6 | Crafting |
| Brick | Setena | Crafted Material | 99 | 6 | Crafting |
| Flour | Bupi | Processed Good | 20 | 8 | Crafting |
| Bread | Borotho | Processed Good | 20 | 12 | Crafting |
| Rare Seed | Peo e e Sa Tlwaelegang | Special | 10 | not sold | Rare Bushveld find |

**Tools** (owned, not stacked, not counted in the list above): Mogoma (Hoe), Selepe (Axe), Watering Can, Pickaxe.

Rare wildlife and mineral finds — kudu tracks, a crocodile track, a quartz shard, and so on — are **not** stackable inventory items. They live in the Field Journal as one-time Discoveries, not as sellable resources. This keeps a full journal meaningful on its own terms, rather than reducing every find to a Pula value.

*A naming note: the Setswana terms above reflect research, not native fluency in every case — a handful (Kgaka, Tholo, Kolobe, Tshwene, Kwena, Mabele, Mmidi, Legapu) are common, well-attested words at high confidence; a few others across the wider project are flagged lower-confidence where they appear. Corrections welcome throughout.*

---

## 4. How Items Flow

```text
                 ┌──────────┐
                 │  POLASA  │  Farm
                 └────┬─────┘
                      │
              Mabele / Mmidi / Legapu / Mae / Maswi
                      │
                      ↓
                 ┌──────────┐
                 │ SETLOLO  │  Inventory
                 └────┬─────┘
                      │
              ┌───────┼───────┐
              ↓       ↓       ↓
            SELL    PROCESS  CONTRACT
              │       │       │
              ↓       ↓       ↓
             PULA   BUPI/    KGOTLA
                    BOROTHO  REWARDS


                 ┌──────────┐
                 │  NAGA    │  Bushveld
                 └────┬─────┘
                      │
        Dikgong / Matlapa / Letsopa /
        Mokolwane / Lotlhaka / Phane
                      ↓
                 SETLOLO
                      ↓
                 CRAFT / BUILD
                      ↓
                   POLASA
```

Farm and Bushveld feed each other: the Farm needs materials only the Bushveld provides, and Bushveld exploration is only worth doing because the Farm (and the Kgotla's contracts) genuinely need what's out there.

**Example journey:** a player wants a better chicken coop. It needs Dikgong, Matlapa, and Poleto. Dikgong and Matlapa are missing, so they head to the Bushveld, gather both, return, craft Poleto from the Dikgong, and build. The coop lets them raise more chickens, produce more Mae, sell them for Pula, and expand the farm further. No item in that chain exists for its own sake — each has a next step.

---

## 5. Crafting

| Recipe | Input | Fee (P) | Time | Output |
|---|---|---|---|---|
| Poleto | 2× Dikgong | 1 | 10 min | 1× Poleto |
| Thapo | 3× Mokolwane | 1 | 10 min | 1× Thapo |
| Setena | 2× Letsopa | 2 | 15 min | 1× Setena |
| Bupi | 3× Mabele or Mmidi | 2 | 20 min | 1× Bupi |
| Borotho | 2× Bupi | 3 | 30 min | 1× Borotho |

The crafting fee is a deliberate small Pula sink — it represents cooperative labor and keeps currency from accumulating without any outflow. These numbers are a first-pass target for playtesting, not a fully validated balance — expect to tune once real play data exists.

---

## 6. Selling

- A flat 5% market tax applies to all sales, functioning as a continuous currency sink against inflation.
- The client never determines price, quantity owned, or reward — the server is authoritative on every transaction.
- Rare Special items and Field Journal Discoveries are not sellable (see §3).

---

## 7. Storage

The player starts with limited storage (a starter cap around 24 slots) that grows through Farm buildings — a simple chest, then a storage shed, then a full storehouse. Storage growth is a **Farm progression mechanic** tied to buildings, not a separate inventory-management feature to design on its own.

---

## 8. Contracts and the Market

Kgotla contracts and Market sales both draw on the same inventory — there is no separate "contract-only" version of an item. A player's Mabele can be sold, milled into Bupi, or delivered against a contract, whichever they choose at the time. This keeps the economy legible: one Mabele, several uses, no duplicated items for the sake of bookkeeping.

---

## 9. Seasonal Items

Phane (mophane worms) is the one item in the list gated by a real calendar rather than always available. It's tied to Botswana's actual mophane-worm harvest windows, roughly December and April — active during those months at a specific Bushveld location, an ordinary wood source the rest of the year. This is the only seasonal item for now; it exists because a specific Bushveld event needed it, not as a template to apply everywhere.

---

## 10. What's Intentionally Not Built Yet

Quality grading (1–5★ item quality), freshness/spoilage decay, and tool durability are all real, reasonable systems for a farming game — and all deliberately left out of this specification. Interlocking mechanics like these are exactly what makes a first implementation stall: a decay timer touches inventory, market pricing, and crafting all at once, and none of it can be tested in isolation. The item list, database shape, and crafting flow above are all written so that grading, freshness, and durability could be added later as a pure logic change — new fields, not a redesign — but none of it is required for the core loop (grow → gather → craft → sell → contract → grow more) to be complete and playable on its own.

Also deliberately out of scope here: item durability trees, dozens of material grades, equipment rarity tiers, complex sorting, item weight, randomized item stats, crafting skill trees, separate quest-only inventories, and multiple currencies. Molemisi's depth should come from relationships between a small number of items, not from making each item complicated.

---

## 11. The Golden Rule

> **Simple items. Meaningful relationships. Names that belong to this world.**

```text
DIKGONG (Wood)
 │
 ├── Poleto → Buildings
 │
 └── Sell → Pula
```

One resource, several strategic uses — preferable every time to five variations on the same resource.
