# 15 — Cosmetics & Avatar System

> Companion to `09`. Normative anchors: `08 §10` (D10 ruling 2026-10-04), `02 §7.1` (the unbounded sink), `10 §1` (two shelves + Village Pass), `Asset_Manifest_MVP.md` (the art manifest).
> **Per the brief: schema only.** Cosmetic asset lists are maintained separately (`Asset_Manifest_MVP.md`); this document defines the *structure*, the *SKU model*, and the *character system*, not the item catalogue.

---

## 1. What cosmetics are for

Cosmetics are **cosmetic-only** (`docs/33` rule 5) and serve two jobs:

1. **Expression** — the player's farm and avatar look like *them*, without any mechanical advantage.
2. **The unbounded Pula sink** — after land is maxed, every other sink is fixed or slower than income; cosmetics are the only truly unbounded one (`02 §7.1`). Without them the soft currency is meaningless by month three.

**Money buys expression, never access.** A cosmetic never grants yield, storage, speed, or eligibility.

---

## 2. The two shelves

| Shelf | Currency | Framing | Promise |
|---|---|---|---|
| **Market shelf** | **Pula** (earned) | everyday look | a free player can dress the farm fully |
| **Festival shelf** | **Madi** (bought) | seasonal look | paying gets a *different* look sooner, never a *better* one |

**The anti-pay-to-win promise:** every Festival item has a **same-slot Market cousin**, so "nobody's farm looks poorer because they didn't pay" (`docs/34 §3.1`). This is asserted at the store level, and the P10 walkthrough checks it by buying both (`05 §P10`).

**Botho-tier cosmetics** are a third class: **earned, never purchased** — the top-rung achievement cosmetic (e.g. a *Mokgosi* cloak). These signal status and are excluded from both shelves (`08 §5`, D5).

---

## 3. Data-driven SKU manifest (the ruling)

**Cosmetics must be expandable in code** (D10). They move from hardcoded rows to a **data-driven SKU manifest** the store reads; **adding a cosmetic = editing data, not code**.

### 3.1 Schema

```
cosmetic_skus
  slug          TEXT PK            -- e.g. 'cosmetic_hut_thatch'
  slot          TEXT NOT NULL      -- hut | kraal | frame | livestock | outfit
  shelf         TEXT NOT NULL      -- market | festival | earned
  price         INT NULL           -- null when shelf='earned'
  currency      TEXT NULL          -- 'pula' | 'madi' | null (earned)
  asset_key     TEXT NOT NULL      -- resolves in the asset manifest
  cousin_slug   TEXT NULL          -- the same-slot cousin on the other shelf
  is_earned     BOOL DEFAULT FALSE
  unlock_condition JSONB NULL      -- e.g. { achievement: 'mokgosi' }
  season_slug   TEXT NULL          -- nullable; seasonal rotation
  active        BOOL DEFAULT TRUE
```

```
player_cosmetics
  player_id       UUID → auth.users.id
  cosmetic_slug   TEXT → cosmetic_skus.slug
  acquired_at     TIMESTAMPTZ
  equipped        BOOL DEFAULT FALSE
  PRIMARY KEY (player_id, cosmetic_slug)
```

### 3.2 Slot vocabulary (D10 restricted to FARM + AVATAR)

| Slot | Surface | Size | Notes |
|---|---|---|---|
| `hut` | farm | 64×64 | homestead hut |
| `kraal` | farm | 64×64 | livestock kraal |
| `frame` | farm | 64×32 | the player's **stand/banner on their own farm** (Kgotla/Bushveld `frame` was **withdrawn**) |
| `livestock` | farm | 32×32 | animal coat/bell/ribbon |
| `outfit` | **avatar** | 32×64 | the avatar overlay layer |

> **Cosmetics are restricted to farm + avatar only.** The earlier proposal to render a `frame` at the Kgotla/Bushveld is **withdrawn** (`08 §10` ruling). Personalization of the shared Kgotla is *not* through cosmetics.

### 3.3 Store purchase flow (server)

```
purchase(playerId, sku):
  1. load cosmetic_skus[sku]; assert active
  2. assert not already owned                          (player_cosmetics check)
  3. if shelf == 'earned': 403 not_purchasable
  4. WalletService.debit(playerId, currency, price, 'cosmetic_purchase', sku)   // server price
  5. insert player_cosmetics(player_id, sku, equipped=false)
  6. commit (4–5 atomic)
```

The client **never supplies a price**. The `currency` and `price` are read from the SKU row.

---

## 4. The avatar system (2-layer model)

**Decided (D10): a 2-layer sprite.**

```
avatar_base    (body)  — one per attire variant; NOT a cosmetic; chosen at creation/change
avatar_outfit  (overlay) — the cosmetic layer; the store swaps THIS layer only
```

Both layers share the same **32×64 footprint and anchor point** as the NPC sprites, so outfits overlay cleanly.

### 4.1 Base bodies

| Key | File | Note |
|---|---|---|
| `avatar_base_a` | `sprites/avatar/avatar_base_a.png` | Warm Setswana attire, neutral stance, front view |
| `avatar_base_b` | `sprites/avatar/avatar_base_b.png` | Alternate attire/cloth colour |
| `avatar_base_c` | `sprites/avatar/avatar_base_c.png` | *(discretion)* third variant |

> **[DISCRETION — confirm with Princess]** how many `avatar_base` variants ship in MVP (recommend 2–3 Setswana attire bases; outfits are the expandable layer). `08 §10` open item 2.

### 4.2 Outfit overlays

Transparent-background, 32×64, aligned to the base. Each has a Market and a Festival cousin.

```
player_avatar
  player_id     UUID PK → auth.users.id
  base_key      TEXT NOT NULL          -- avatar_base_*
  equipped_outfit TEXT NULL            -- → cosmetic_skus.slug where slot='outfit'
  updated_at    TIMESTAMPTZ
```

**Equip flow:** setting `equipped_outfit` swaps the overlay only. The base never changes from the store. New outfits = new `outfit` SKU rows — **no code change**.

### 4.3 Earned outfit (the top rung)

`outfit_mokgosi_cloak` is the top-rung **earned** cosmetic from the achievement ladder (D5). It is `shelf='earned'`, `is_earned=TRUE`, `unlock_condition = { achievement: 'mokgosi' }`. It grants at achievement attainment, never at purchase.

---

## 5. Achievements & the honorific ladder (B2 — new scope, D5)

The honorific ladder is **attained by achievements, not purchase** (`08 §5` ruling). Display-only; never grants advantage.

### 5.1 Schema

```
achievements
  slug        TEXT PK        -- e.g. 'molemi_first_farm'
  rung        TEXT           -- molemi | molemi_morui | moagi | motsadi | mokgosi
  name        TEXT           -- display
  sets         -- sets the honorific when attained
  milestone   JSONB          -- machine-checkable condition

player_achievements
  player_id        UUID → auth.users.id
  achievement_slug TEXT → achievements.slug
  attained_at      TIMESTAMPTZ
  PRIMARY KEY (player_id, achievement_slug)
```

### 5.2 The canonical ladder (✅ RULED)

| Title | Meaning | Attained at (achievement-driven) |
|---|---|---|
| **Molemi** | Farmer | start / first farm established |
| **Molemi-Morui** | Farmer-Rearer | livestock + early Botho milestones |
| **Moagi** | Builder | buildings + Council Projects |
| **Motsadi** | Elder | sustained Botho + community acts |
| **Mokgosi** | Leader | top Botho + event achievements |

Thresholds from `02 §6.4` **inform** the milestones, but the *rung* is an achievement, not a raw number. Native-speaker confirmation on each title before copy ships (a linguistic pass, not a design decision).

---

## 6. Village Pass & the Botho-tier overlap

| Benefit | Source | Botho-tier overlap |
|---|---|---|
| Helper (waters + collects) | Village Pass **or** Botho 500 (Auto-Helper) | earned free at 500 |
| One festival outfit / month | Village Pass only | — |
| +50% storage (stacking) | Village Pass only | — |

**The helper is the only benefit that is both paid and earned** — "paying gets it early; playing gets it forever" (`02 §6.6`). Because the helper is a **chore-remover, never a yield multiplier**, the overlap does not break the anti-pay-to-win promise.

> ⚠️ **Village Pass +50% storage is not yet wired** to the storage-tier check (`08 §10` open item 3) — a Wave-4 build dependency. `effectiveSlotCap(tier, isGuildSubscriber)` exists in `economy.ts`; the subscription-state read is what is missing.

---

## 7. Cosmetics as the unbounded sink — the accounting

`02 §7.1`. Three evidence points that cosmetics must ship in v1:

| Farm size | Unspent Pula/month |
|---|---|
| 4 plots | ≈ P1,913 |
| 12 plots | ≈ P5,288 |
| 20 plots | ≈ P8,814 |

Once land is maxed, seeds/water/maintenance scale slower than income. **Cosmetics (P200–P2,000) and the Letsema fund are the only two unbounded sinks.** Ship at least one cosmetic line in v1 even if thin (`05 §P9`).

---

## 8. Asset manifest linkage

Cosmetic and avatar `asset_key`s resolve through `assets/manifest.json`. The MVP generation checklist (`Asset_Manifest_MVP.md §6`):

| Group | Count | Gates |
|---|---|---|
| `world` (World Tree) | 4 stages | D2 visual |
| `avatar` (bases + outfits) | 2–3 bases + 6 starter outfits | D10 store + avatar system |
| `cosmetics` (farm slots) | 8 sprites | D10 store (farm slots) |
| `ui` (calendar education) | 5 illustrations | D8 calendar UI |

`pnpm assets:generate && pnpm assets:sync`; verify each new file resolves (no emoji fallback) in-game. The data-driven SKU manifest references these keys — an SKU whose `asset_key` does not resolve renders a fallback, which is a QA failure, not a crash.

---

## 9. Acceptance

- [ ] Adding a cosmetic requires **editing data only** — no code change, no deploy of application logic.
- [ ] Every Festival SKU has a same-slot Market cousin (`cousin_slug` non-null).
- [ ] Earned SKUs are not purchasable via `POST /store/purchase` (403 `not_purchasable`).
- [ ] Store `price`/`currency` come from the SKU row, never the client.
- [ ] Avatar store swaps the `outfit` layer only; the base is unchanged.
- [ ] Slot vocabulary is exactly `{hut, kraal, frame, livestock, outfit}` — no Kgotla/Bushveld slot exists.
- [ ] A maxed-land player can spend Pula and watch the balance fall (`06` P9).

*End of `15`. Proceed to `16_AntiCheat_And_Validation.md`.*
