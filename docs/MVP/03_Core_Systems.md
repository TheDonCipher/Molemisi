# 03 — Core Systems

Behaviour, not amounts. For every number, see `02_Economy_And_Currencies.md`.

---

## 1. Farming

### 1.1 The loop

Plant → water → wait ~1 game day → harvest → sell or craft. One harvest per daily check-in.

**Growth is measured in hours, not minutes.** At the previous 12-minute sorghum the farm was a trading terminal, not a farm, and it broke the faucet (see `02 §6.1`). Crop timers are now 16–48 hours.

**Nothing grows in 24–40 hours.** That band is a trap: a crop finishing just after 24 h still gives only one harvest per daily visit, so it earns half what a 23 h crop of identical value earns. Every crop is therefore explicitly **1-day (16–24 h)** or **2-day (40–48 h)**, and 2-day crops pay roughly 2× per harvest so the wait is a trade against tied-up capital rather than a penalty.

### 1.2 Water — the central tension

An empty Jojo tank **stops crop growth.** It does not kill crops; nothing punishes the player. It just stops the clock until the tank has water.

Refilling costs Pula — the water truck — or you wait for rain.

Why this is the highest-value change available:

- It makes the setting **load-bearing instead of decorative**. Botswana is dry; a game set in Botswana where water doesn't matter is a game wearing a costume.
- It creates a **recurring Pula sink** that scales with farm size — the sink the economy actually needs.
- It makes **rain the most anticipated event in the game**, which is exactly how it works in Botswana.
- It gives the **Pula Stone** ("guarantee rain within 24 h") real value. It was the weakest boost; as of the 2026-09-11 ruling its effect is also unwired, so the stone is withdrawn from sale alongside the other two.

Implementation: `waterDecayRate` per crop per game hour, `waterPerAction` per watering, tank capacity and refill cost in `02`. An empty tank halts the growth timer server-side. Rain events credit the tank.

### 1.3 Wildlife — **DEFERRED from v1** (ruling 2026-09-11)

Jackals and baboons raid plots overnight. The **Kraal** protects livestock; the **Farm Boundary** protects crops. **Ancestral Ward** grants a 3-day shield.

This gives the flat single-tier buildings an ongoing purpose and makes the night meaningfully different from the day — arriving back to a raided plot is a real event, not a punishment.

> **Ruling (2026-09-11): not in v1.** No raid mechanic is implemented anywhere in `apps/api/src`. Building one touches the growth simulation, the building-effect table, and the offline-elapsed-time pass — the highest-risk surface in the codebase — for a feature that no longer has a v1 done-criterion (`06` has been amended to match). Deferred to a post-launch phase and recorded in `docs/KNOWN_LIMITATIONS.md`.
>
> **Consequence, and the reason this needed a ruling rather than a shrug:** the Ancestral Ward was being *sold* as "a three-day shield against wildlife raids" while protecting nothing. It has been withdrawn from the store (`packages/game-config/src/store.ts`, `available: false`) rather than left on the shelf as a lie. Restore it in the same commit that implements raids.

---

## 2. Inventory

Categories, stacks and values are in `02 §6.2`.

- **No quality grading, no freshness decay, no tool durability in v1.** These return post-MVP as additive fields on `player_inventory`, not as a redesign.
- **Rare finds are journal Discoveries, never items** (R3). The `Special` category is dropped entirely.
- Stack caps are enforced server-side: Seeds 99, Crops 50, Forage 50, Livestock 30, Crafted 99, Processed 20.
- Storage tier caps total slots. Writes are rejected at cap.
- **Tools do not occupy storage slots.** Mogoma, Selepe, Watering Can and Pickaxe are *equipment*, not inventory — they live in their own section. Four unstacked tools would otherwise eat 17% of a starting 24-slot basket, permanently, for things the player never chose to carry.

### 2.1 What "sensible" means here

The inventory is the screen most likely to lose a non-gamer, because games built by gamers usually organise it by taxonomy rather than by intent.

- **Group by use, not by category.** *Plant · Sell · Craft · Build* beats all-caps Setswana category headers for a player who may be semi-literate in English. Keep the Setswana names on the **items** — that's where the culture lives — and make the **grouping** functional.
- **Every item states its use in one line.** "Letsopa — for bricks." A name and a number is not enough.
- **Show stack caps** as `47/50`, and explain overflow in words rather than silently rejecting a write.
- **Show what something is worth before asking whether to sell it**, with the quantity stepper on the same screen.

---

## 3. Crafting

Five recipes, values and margins in `02 §6.3`. Available directly from the Farm's crafting menu once unlocked — no station buildings.

### 3.1 Concurrent slots

**One slot by default. A second and third are unlocked by buildings.**

This is currently unspecified and it swings crafting income roughly tenfold, so it cannot stay open. It also gives the otherwise-flat buildings a purpose without violating the single-tier decision.

### 3.2 Batching

Craft 1 / 3 / 6 at once, with the fee scaling sub-linearly (1× / 2.5× / 4×). Batching becomes a real choice: capital tied up versus fee efficiency.

### 3.3 Substitution

**Bupi** accepts 4× sorghum **or** millet. **Setena** accepts any two of clay and stone. Extend the pattern — Borotho accepts flour, optionally with eggs for a richer loaf. Substitution is what makes an inventory feel like *yours* rather than like a spreadsheet.

Substitutes must be **close in value**, or one branch is a trap. Clay and stone are both P3 for exactly this reason, which is also what gives Rocky Outcrop a purpose — stone previously had no recipe at all and a third of a scene's output was dead content.

In the UI, substitution is a **visible choice**, not an automatic pick. Default to whichever the player has more of, and let them override.

### 3.4 Variance, never failure

A batch sometimes yields a bonus unit, with a Mogolo line attached. **Never** a failed craft. Cozy games should only ever surprise the player upward.

### 3.5 Why maintenance matters here

Poleto, Thapo and Setena exist mainly as building inputs. With build-once buildings they become **dead content within weeks**. Seasonal maintenance — re-ratching thatch, repairing kraals, mending fences — gives them permanent demand, a recurring sink, and a seasonal rhythm to the farm. A kraal in Botswana is never finished; that's not a chore, it's the truth of the thing.

### 3.6 Crafting is need-driven, not list-driven

A farmer doesn't browse recipes. They want to build a kraal and they're short of two planks. So the crafting screen leads with questions, not with a catalogue:

- **"What can I make right now?"** — filtered to what's affordable, with slots free.
- **"What am I short of?"** — and, where the shortfall is craftable, a direct path to craft it.
- **A direct path from any building's missing material → craft that material.** This is the single most useful shortcut in the game and it costs almost nothing to build.

Plus three rules that stop the screen from becoming a spreadsheet:

- **Default the batch to the maximum affordable**, with 1 / 3 / 6 as a segmented control.
- **Show input value against output value** on the recipe card, so a player can see the margin without doing arithmetic.
- **Never let a craft be a loss by accident.** If the market band has moved such that a recipe is currently underwater, say so.

---

## 4. Buildings

| Building | Tiers | Notes |
|---|---|---|
| Storage | 3 (Basket / Shed / Storehouse) | The only tiered line in v1 |
| Water Source | 1 | Flat, requires maintenance |
| Kraal | 1 | Flat, requires maintenance, protects livestock |
| Farm Boundary | 1 | Flat, requires maintenance, protects crops |
| Crafting | 1 + 2 slot upgrades | Unlocks the 2nd and 3rd crafting slots |

Visual tier-ups are **React sprite swaps**, not Phaser (D3).

---

## 5. Livestock

Chickens and goats in v1. Fed with crops or feed; produce eggs, milk and manure.

Livestock's role needs stating because it's currently implicit: it is the **lowest-effort, most reliable** income — a floor under the player's economy — while crops are higher-ceiling but water-dependent and wildlife-exposed. That's a real strategic choice rather than one being strictly better.

---

## 6. Progression — Three Pillars

No levels. No XP. Any existing level/XP field is **deleted, not extended**.

### 6.1 Pula — infrastructure
Land, buildings, water, tools. Gated purely by affordability. Costs scale exponentially.

### 6.2 Botho — community standing
**`player_wallets.botho_points` is the single canonical number** (R6). One column, one source of truth, no second counter anywhere. Thresholds in `02 §6.4`.

**Botho accrues only from explicit, manual, deliberate acts** — delivering a quest, contributing to a community project — and is **capped per player per day**.

That cap is not a balance decision, it's a legal one. If Botho gates a real-money prize, and a paid subscription's Auto-Collector supplies the materials for Botho-earning acts, then the subscription indirectly buys prize eligibility — which is precisely the link the marketplace model exists to avoid. Three controls: cap the accrual, require a manual action, and make the Auto-Collector **provably incapable** of delivering a quest or donating. See `06` invariant I4.

### 6.3 Journal — ecological mastery
First-time Bushveld finds write to the Field Journal, organised by real scene. See `04 §7`.

**The Journal's reward is the restoration of the scene's art** (R5 — the old page buffs are removed). Complete a scene's page and that scene's background visibly recovers: more plants, more birds, more life.

This costs no balance, needs no new progression maths, and is the most distinctive thing in the design: **the world changes because you paid attention to it.** It's also already in the Bushveld spec's future scope, so it's a pull-forward rather than new work.

---

## 7. The Elder's guidance

A small rules table — condition → line — read from real player state: tank level, weather, Botho, season. Not a fixed dialogue tree.

**Extend it into the proverb system.** The daily proverb (currently a random rotation) should respond to what the player actually did:

- Sold an entire harvest in one go → a proverb about haste
- Let a crop sit unwatered → one about neglect
- Contributed to a community project → *Motho ke motho ka batho*

The game reading you back is the cheapest, warmest piece of character work available, and it's the same rules-table machinery the Elder's tip already needs. Content must get a native-speaker pass before shipping — several proverbs in the original spec are already flagged low-confidence, and totem material is personal.

---

## 8. Server authority

Non-negotiable, stated once so it applies everywhere:

- The client never determines **price, quantity owned, growth completion, or reward**.
- Every value-changing action is a server decision, transactional, with the result returned to the client.
- Elapsed-time simulation on load is **advisory**. The server recomputes and is the authority.
- `WalletService.credit` / `debit` are the **only** functions permitted to touch a Pula balance. No function accepts two distinct player IDs. Enforced by signature, not convention.
