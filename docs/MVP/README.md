# Molemisi — MVP Specification

**Status:** implementation complete (code); **not yet deployable** — the linked Supabase
project is 11 migrations behind (see `DEVELOPMENT_STATE.md`). **Last consolidated:**
2026-09-07; status confirmed 2026-09-14.
**Owner of this folder:** Princess Eugenia. **Consolidated by:** Belvedere.

---

## What this folder is

The authoritative specification for building Molemisi. Read `01` through `06` in order; each document assumes the ones before it.

**If two documents disagree, the lower number wins** — except `06`, which is the measuring stick and always wins on questions of "is it done?"

| # | Document | Covers |
|---|---|---|
| **01** | `01_Product_Definition.md` | What the game is, who it's for, the four screens, locked decisions, scope, evolution |
| **02** | `02_Economy_And_Currencies.md` | Three currencies, the marketplace, payments and KYC, monetisation, **all numbers of record**, financial model |
| **03** | `03_Core_Systems.md` | Farming, water, inventory, crafting, buildings, livestock, progression |
| **04** | `04_Bushveld.md` | Scenes, hotspots, scarcity model, Field Journal, seasonal events |
| **05** | `05_Implementation_Plan.md` | Phases, dependencies, done-criteria |
| **06** | `06_Verification_Rubric.md` | Audit criteria, hard invariants, per-phase checklists |
| **07** | `07_Balance_And_UX_Review.md` | Why the numbers are what they are; session design; UI flows |

**`01`–`06` are normative — build from them.** `07` is the audit record: read it to understand a decision, but it is not a spec in its own right. Where `07` and `01`–`06` disagree, `01`–`06` win (they were updated with the findings).

---

## What changed on 2026-09-07

The previous specification set described a **cozy game**: no cash-out, no player trading, no licence required. That was inconsistent with the actual product intent, which is an **economic game with real withdrawals on mobile money**, for Botswana and regional non-gamers.

Three decisions are therefore **reversed**, and every document here is written against the reversal:

| Reversed decision | Old | New |
|---|---|---|
| Cash-out | Never — "Pula is never convertible back to real BWP" | **Yes.** Madi withdrawable to a verified mobile money number |
| Player trading | "No P2P transfers, ever" | **Yes.** The Exchange is P2P and player-priced |
| Compliance | "No EPS licence required" | **Void.** Reasoning depended on there being no cash-out. See `02 §2` |

**The product is now a marketplace, not a bookmaker.** Everything follows from that.

### Also on 2026-09-07: the balance retune

A full re-evaluation of the mathematics, economics and daily UX found **18 issues (F1–F18)** and fixed 17 of them in place. The numbers in `02` are the post-retune numbers; `07_Balance_And_UX_Review.md` records each finding, its reasoning, and the fix.

The four that change the game most:

| | Problem | Fix |
|---|---|---|
| **F1** | Six crops sat at 26–48 h, silently halving their value under a daily check-in | **No crop between 24 h and 40 h.** Every crop is 1-day or 2-day |
| **F2** | 8× value spread with no tradeoff — tomatoes dominated, watermelon was a trap | **3.3× spread**, ordered by seed cost and capital at risk |
| **F7** | No unbounded sink — Pula piled up with nothing to buy | **Cosmetics + Letsema fund** |
| **F9** | Every withdrawal under P150 lost money | **Min P100, fee `max(P5, 2%)`** |

**Do not tune these numbers by feel.** After any change to `02 §6.1`, run:

```
python scripts/balance_verify.py
```

It reads the crop table **as written in the spec** and asserts the dead-zone rule, within-season dominance, value spread, thirst spread and land payback. If it prints `FAIL`, the spec is wrong — fix `02`, never the script. (`scripts/archive/` holds the exploratory tuning runs that produced these numbers; they are history, not authority.)

---

## Still open — do not build against an assumption

1. **Legal sign-off** from a Gaborone lawyer (gaming + payments) before the Madi layer ships.
2. **PSP vs self-custody** of BWP balances. Changes the schema. Recommendation: licensed PSP.
3. **Hard-currency name.** Working name *Madi*, pending Setswana confirmation.
4. **Monthly promotional budget** for Export Contracts and the prize pool.
5. **Real gateway pricing** from Orange Money and MyZaka — cash-in %, disbursement fixed + %. The withdrawal fee and the whole Exchange margin model rest on assumed figures. **Highest-value phone call available.**
6. **Your actual monthly cost base** — `02 §8.5` has a composition; replace the indicative figures.
7. ~~Delete `apps/game`~~ — **done 2026-09-11.** The legacy Phaser app (Boot/Preload/FarmScene only) was removed; React `/game` is the only client. See `DEVELOPMENT_STATE.md`.

Resolved 2026-09-07: Saffron → **Morula** as the top-of-ladder crop.

Until 1 and 2 are settled, **v1 ships closed-loop** (no withdrawals). The plan in `05` is built so this delays a feature, never the product.

---

## Archive

`archive/` holds the superseded documents, kept for provenance: the original six specs plus the three review documents produced during the pivot. **Do not build from the archive.** Where archive and 01–06 disagree, 01–06 win.

`06` fully supersedes the old `MVP_VERIFICATION_RUBRIC.md`, including its conflict register — every C-number is carried forward with its ruling, so nothing was dropped, only resolved.

Superseded: `MOLEMISI_MVP_Roadmap.md`, `MOLEMISI_MVP_Implementation_Plan.md`, `MOLEMISI_Core_Systems_v2.md`, `MOLEMISI_Economy_v2.md`, `MOLEMISI_Inventory_System_Specification.md`, `MOLEMISI_Bushveld_Gameplay_Specification.md`, `MVP_REVIEW_AND_IMPROVEMENTS.md`, `MOLEMISI_ECONOMIC_MODEL_v3.md`, `MVP_VERIFICATION_RUBRIC.md`.
