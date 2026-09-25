# Kgotla Screen — Specification

**Status:** NORMATIVE for `apps/web/src/components/screens/KgotlaScreen.tsx` and
`apps/web/src/lib/kgotla.ts`.
**Supersedes:** the Kgotla portion of `docs/Screens/Kgotla/DESIGN.md` for behaviour and
structure. `DESIGN.md` remains the source of truth for *visual tokens only* (colour, type,
spacing, elevation).
**Decisions embodied here (Princess Eugenia, 2026-09-23):** quests become **real objectives**;
community project rewards become **honest per-farm rewards**; formalisation precedes code
changes.

---

## 1. Purpose

The Kgotla is the council chamber. It is where the village talks, and where talking turns
into work somewhere else.

Its job is **not** to pay the player for standing still. Every reward the Kgotla grants must
be traceable to an act the player performed *outside* the Kgotla — a harvest, a gather, a
sale, a build. If a player can earn by tapping inside this screen alone, the screen has failed.

Two currencies of regard live here and must never be conflated:

| Concept | Scope | Range | Cap | Source |
| --- | --- | --- | --- | --- |
| **Botho** | Village-wide, canonical standing (02 §6.4) | 0 → ∞ | 50/day (`BOTHO_DAILY_CAP`) | `/progression` |
| **Regard** (`npc_reputation`) | Per council member | −100 … 100 | saturates at 100 | `/kgotla/npcs` |

Botho unlocks pillars (Bupi recipe 100 · Deep Bushveld 300 · Letsema 500 · Prize
eligibility 1000). Regard unlocks that one elder's better counsel and prices. The screen shows
both, labelled, and never uses one word for the other.

---

## 2. Information architecture

Priority order is fixed. On mobile, everything from the quest board down is below the fold.

1. **Header plaque** — "Kgotla" + subtitle. Always visible.
2. **Botho meter** — one line: current · next pillar threshold · today's remaining.
3. **The Council** — five carved seats, portraits centre-stage. The hero of the screen.
4. **Quest board** — offered · accepted · in flight · ready to turn in.
5. **The village decides** — community projects and the daily contribution allowance.
6. **Elder's guidance** — first visit only, then permanently dismissible.

Rationale: the council is the identity of the screen (UI-GX ruling 2026-09-16) and must not
be pushed down by prose. The intro paragraph, Botho detail line and elder guidance are all
*orientation*, and orientation yields to the thing it describes.

---

## 3. Component inventory

| Component | Props | Rules |
| --- | --- | --- |
| `HeaderPlaque` | — | Title + `kgotlaSubtitle`. No state. |
| `BothoMeter` | `current`, `nextThreshold`, `earnedToday`, `dailyCap`, `remainingToday` | Single line, never three stacked blocks. Renders a 4px-grid meter. Shows "maxed" only when no threshold remains. |
| `CouncilSeat` | `id`, `name`, `role`, `tier`, `regard`, `active`, `onClick` | Carved wood frame, 1:2 native aspect portrait, gold ring when active. Elder Neo rendered **raised and centre**. Regard shown as **stars** *and* tier word (see §4). |
| `NpcPortrait` | `id`, `name`, `size`, `tall`, `head` | `{id}.png` (32×64 bust) in seats; `{id}_head.png` (48×48) in the dialogue sheet. Degrades to an initials crest on error — never a broken image. `image-rendering: pixelated`. |
| `QuestBoard` | `quests` | One row per quest: elder, objective, progress, state. Consumes the existing unused keys `activeContracts`, `inProgress`, `claimed`, `claimReward`, `questReward`. |
| `DialogueSheet` | `npc`, `message`, `questState` | Portrait | words. Two columns desktop, bottom sheet mobile. Dismiss by backdrop, ✕, or Escape. |
| `ProjectCard` | `project`, `allowance` | Name, honest reward, progress bar, contribute controls. |
| `ElderGuidance` | `guidance`, `dismissed` | First visit only. Attribution to Elder Neo. |

---

## 4. Standing, made legible

**Regard** renders as five stars plus the tier word — never a star next to a bare word, and
never the raw number alone.

| Tier | Range | Stars |
| --- | --- | --- |
| Stranger | −100 … −1 | ☆☆☆☆☆ |
| Acquaintance | 0 … 24 | ★☆☆☆☆ |
| Friend | 25 … 49 | ★★☆☆☆ |
| Trusted | 50 … 74 | ★★★☆☆ |
| Respected | 75 … 100 | ★★★★☆ / ★★★★★ |

Plus progress-to-next: `30 · 20 to Trusted`. The seat currently hides `reputation` and
`personality` — both are already in the payload and must be rendered (`personality` in the
dialogue sheet, not the seat).

**Botho** renders as the single canonical number with its next pillar threshold, and a
secondary line for the daily cap (`earnedToday`/`dailyCap`/`remainingToday`). The daily cap is a
**legal control** (I4 — Botho gates a real-money prize), so it is shown, not hidden.

### 4.1 Regard decay (ruled 2026-09-23)

Regard is not permanent: **−2 regard per elder per full 7-day period in which no charge for
that elder was completed.**

- **Floor-bounded** — decay never drives regard below 0. Falling to *Stranger* must require a
  deliberate negative act (01 §16); no such act exists in v1, so **Stranger is unreachable in
  v1** and the tier is retained only as scaffolding for later content.
- **Lazy and idempotent** — applied on any Kgotla read or write touching that NPC, not by a
  cron job. Each elapsed period is charged exactly once, tracked by
  `npc_reputation.last_charge_at` (additive column).
- **Visible** — a seat shows a warning when a period is within 24h of elapsing ("Thabo will
  miss you tomorrow"), so nobody is silently punished.

Rationale for −2 / 7 days: at +10 regard per charge, a fully neglected elder falls from
Respected (75) to Acquaintance (24) in about 26 weeks — slower than a chapter. It is a nudge
to keep visiting, never a punishment for taking a holiday.

---

## 5. Quest model — target state

Quests have a goal. The loop is: **offer → accept → objective (elsewhere) → turn in**.

### 5.1 The shared pool (ruled 2026-09-23)

**Three charges per farm per Botswana day, shared across the whole council** — not one per
elder. Five elders, three charges: the player must choose whom to serve, which is the decision
the council chamber exists to create. Enforced server-side; the client never decides whether a
charge is claimable. `talk()` already returns `questAvailable` and the UI must honour it.

### 5.2 Objectives and rewards (decided 2026-09-23)

| Elder | Type | Objective | Verified by | Reward |
| --- | --- | --- | --- | --- |
| Elder Neo | community | Contribute 25 Pula to any project | `kgotla_projects` delta since acceptance | 10 Botho · 2 Chapter Token |
| Mama Naledi | trade | Sell goods worth 60 Pula | `ledger_entries` where `source='coop_sale'`, summed since acceptance | 12 Pula · 10 Botho |
| Oupa Kabelo | construction | Bring 6 poleto | inventory, **consumed** at turn-in | 12 Pula · 10 Botho |
| Refilwe | gathering | Bring 4 thatch (*Lotlhaka*) | inventory, **consumed** at turn-in | 8 Pula · 10 Botho |
| Thabo | farming | Bring 6 of one named crop | inventory, **consumed** at turn-in | 8 Pula · 10 Botho |

Every charge also grants **+10 regard** with that elder.

**Design note — why "bring me X".** Three of the five objectives are errands settled by
*consuming* items at turn-in, and the other two are volume checks against tables we already
write (ledger, project contributions). This means progress needs **no event hooks, no counters
and no new writes on the harvest/gather/sell paths** — it is derived from state that already
exists and is already server-authoritative. It also makes AC-01 structurally true: you cannot
be paid for tapping, because the goods must be in your bag.

**Sizing.** A 4-plot farm earns roughly 50 Pula/day (sorghum nets ≈12.25 Pula/plot/day after
the 5% co-op tax). Three charges cap quest income at **32 Pula/day** — about a third of farm
income, and only on top of work already done. Botho from charges caps at **30/day** of the
50/day total, leaving 20 for donation and other acts. **FLAGGED:** these are economic numbers;
re-run `scripts/balance_verify.py` after implementation and fix the spec, not the script.

**Implementation caveat:** the item slugs (`poleto`, thatch, crop product) must be validated
against `item_definitions` at build time — do not invent slugs. This is now enforced by a
spec that asserts every errand slug resolves via `getItemDef`, so a typo fails CI rather
than failing at turn-in.

**Amendment, 2026-09-23 (implementation):** the original draft of this table asked Refilwe
for "4 wild herbs". **There is no wild-herb item.** `herbs` is a FARMED crop (*Ditlhare tsa
Setso*) and the Bushveld yields only wood, clay, palm fiber, thatch and phane. Refilwe's
errand is therefore **4 thatch**, chosen because it is always in season (unlike phane, which
exists only in Moranang and Sedimonthole), is the least economically loaded Bushveld
material (thatch feeds roof upkeep, whereas palm fiber feeds Thapo — the best craft margin
in the game), and keeps the three errands spread across three systems: craft (poleto) ·
Bushveld (thatch) · farm (crop). A genuine herbalist errand would need a new gathered item
and is a v1.1 candidate, not a v1 change.

### 5.3 Storage (decided 2026-09-23)

**A `kgotla_quests` table.** Chosen over deriving the allowance from the ledger because:

- quest state is multi-field and mutable (type, target, item, status, acceptance day, pool
  slot), whereas the ledger is an append-only audit trail with a `source` enum and no metadata
  column;
- writing mutable progress into the ledger would make a second owner of player state, which is
  precisely what WalletService's sole-writer rule exists to prevent;
- the shared pool falls out for free: `count(*) where farm_id = ? and accepted_on = today`.

```
kgotla_quests (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  npc_id       varchar(50) not null,
  quest_type   varchar(20) not null,   -- community|trade|construction|gathering|farming
  item_slug    text,                   -- null for community + trade
  target_qty   int not null,
  status       varchar(12) not null default 'active',  -- active|claimed
  accepted_on  date not null,
  created_at   timestamptz not null default now(),
  unique (farm_id, npc_id, accepted_on)
)
```

There is deliberately **no `progress` column**: progress is derived at read time from
inventory or the ledger, so it can never drift out of sync with the world. The migration is
additive and non-destructive, but it is **not written until confirmed**.

### 5.4 Blocking defect — **RESOLVED** (API, 2026-09-23)

**Was:** `completeQuest` credited 50 Pula + 10 Botho per call with no objective, no cooldown
and no cap. Botho was capped; Pula was not. It was an unbounded faucet (~3,000 Pula/min at
the 60 req/min rate limit), and its own comment claimed it was "reputation-capped" when
nothing capped it.

**Now:** `completeQuest` is deleted, and so is its route. The loop is
`accept` → objective elsewhere → `turn-in`, with the shared pool enforced server-side and
every objective measured from state written outside the Kgotla. The API test suite asserts
the acceptance criteria directly — including that accepting a charge moves **no** balance,
and that an unfinished turn-in pays nothing and consumes nothing.

**Client: also resolved, same day.** `KgotlaScreen.tsx` and `lib/kgotla.ts` are migrated
off the deleted route and now speak `accept` / `turn-in` / `charges`. The screen can
complete a charge again.

---

## 6. Community projects — honest rewards

`kgotla_projects` is `UNIQUE(farm_id, project_id)`: progress is **per-farm**. Therefore no
reward string may promise a village-wide effect.

Retired copy (do not reintroduce):

- "All farmers gain +10% water efficiency"
- "All farmers gain +5% XP from all actions"
- "All farmers gain +5% sell prices"

Replacement rewards must be things the game actually grants — seeds, cosmetics, Chapter
Token, a Field Journal page — and must name the farmer, not the village ("You gain…").
`villageDecidesHint` ("your Pula tips the scale") stays as flavour; the *reward* becomes
literal.

Projects also remain a Pula **sink** (Letsema fund, F7/I4) capped at
`KGOTLA_DAILY_CONTRIBUTION_CAP` = 200 Pula/day, and Botho from donating is 1 per Pula, capped
by the daily Botho cap. **Both confirmed by Princess Eugenia 2026-09-23** and now settled
numbers, to be written into 02 §6.

**Consequence to note (not a blocker):** at 1:1, donating **50 Pula saturates the entire 50/day
Botho cap on its own**, which makes the 30/day available from charges the *secondary* path.
Cap and rate are as ruled; if charges should be the primary Botho path instead, the rate to
revisit is 1 Botho per 4 Pula donated, not the cap.

---

## 7. Data contract

| Endpoint | Used for | Fields the screen must render |
| --- | --- | --- |
| `GET /progression` | Botho + journal | `botho.current`, `botho.next`, `botho.earnedToday`, `botho.dailyCap`, `botho.remainingToday`, `journal.*` |
| `GET /progression/elder` | Elder's guidance | `setswana`, `english` |
| `GET /farms/:id/kgotla/npcs` | The Council | `id`, `name`, `role`, `personality`, `greeting`, `questType`, `reputation`, `tier`, **`toNext`**, **`nextTier`**, **`decayWarning`**, **`charge`** |
| `GET /farms/:id/kgotla/charges` | The charge board | `date`, `poolTotal`, `poolUsed`, `poolRemaining`, `charges[].{npcId,name,status,objective,progress,ready,rewards}` |
| `POST /farms/:id/kgotla/npcs/:npcId/talk` | Counsel | `message`, **`questAvailable`** (now means a real pool slot is free) |
| `POST /farms/:id/kgotla/npcs/:npcId/accept` | Accept a charge | `charge`, `poolRemaining` |
| `POST /farms/:id/kgotla/npcs/:npcId/turn-in` | Turn in a charge | `reputationGain`, `reputation`, `tier`, `pulaReward`, `bothoReward`, `chapterTokens`, `consumed`, `poolRemaining` |
| `GET /farms/:id/kgotla/projects` | The village decides | `id`, `name`, `description`, `currentContributions`, `requiredContributions`, `reward`, `completed`, **`rewardClaimed`** |
| `POST /farms/:id/kgotla/projects/:projectId/donate` | Contribute | `newTotal`, `reward`, `bothoReward`, `contributedToday`, `dailyCap`, `remainingToday` |

**Gap:** the contribution allowance is only returned *after* a donation, so a player cannot
see the 200/day remaining before spending. The allowance must be available on load —
either included in `/progression` or via a dedicated read.

**Drift control:** `KgotlaNpc` and friends are hand-duplicated in `apps/web/src/lib/kgotla.ts`
against `apps/api/src/kgotla/kgotla.service.ts`. Move these DTOs into `packages/shared` and
have both sides import them. Duplication is the mechanism by which this screen drifted.

---

## 8. State matrix

| State | Rendering |
| --- | --- |
| First visit | Elder guidance shown; intro shown |
| Returning | Elder guidance dismissed; intro collapsed to one line |
| Loading (initial) | Seat/board skeletons — **not** a full-screen overlay |
| Loading (after an action) | Inline spinner on the acting control only |
| Council fetch failed | Error row inside the council with a Retry action |
| No quests available | Board explains why and when (tomorrow), no enabled button |
| Quest in flight | Board row with objective + progress, no claim button |
| Quest ready | Board row with claim enabled |
| Donation blocked | Allowance row states the cap; buttons disabled with `aria-disabled` |
| Project complete | Honest reward named; project marked done |
| Portrait missing | Initials crest |

---

## 9. Accessibility

- Menu-driven, no movement (standing accessibility rule — do not "fix").
- Council seats: real `<button>`, `aria-expanded` (not `aria-pressed`), `aria-label` combining
  name + role + tier + regard.
- Dialogue sheet: `role="dialog"`, `aria-modal`, **Escape closes**, focus trapped inside,
  focus restored to the originating seat on close.
- Minimum 48px touch targets; all text on the 4px grid; pixel-aligned rendering.
- Stars must expose the tier as text, never colour or glyph alone.
- `prefers-reduced-motion` disables the fire flicker and sheet slide-up.

---

## 10. i18n

`tl()` is typed — every label needs an `en` and `tn` entry. Existing keys to reuse:
`kgotla`, `kgotlaSubtitle`, `kgotlaIntro`, `speakWithElders`, `supportProject`,
`villageDecidesHint`, `councilHint`, `askGuidance`, `takeQuest`, `questReward`,
`donatePula`, `donateTo`, `pulaPerDay`, `dailyLimitReached`, `activeContracts`,
`viewContracts`, `inProgress`, `claimed`, `claimReward`, `talkToNpcs`, `communityHub`,
`inDeliberation`.

**Hardcoded English currently bypassing `tl()` — must be migrated:** `Done`, `pages`,
`Reward:`, `No community projects right now.`, `Elder's guidance`, `Botho earned today:`,
`maxed`.

New keys required by this spec: quest objective text, quest states, regard
(`regard`, `toNext`), contribution allowance (`allowanceRemaining`), the honest project
rewards, retry/error.

---

## 11. Responsive

- **Mobile (320–767):** single column, council above the fold, sheet rises from the bottom.
- **Tablet (768–1023):** 1.5× scale, council + board side by side.
- **Desktop (1024+):** 2× scale, stage framed at the 800×480 ratio with pinned side consoles —
  council left, board and projects right. *Today only the projects column is width-capped
  (`max-w-md`); there is no desktop layout.*

---

## 12. Acceptance criteria

- **AC-01** No sequence of taps inside the Kgotla increases the player's Pula balance.
- **AC-02** No more than **three charges** may be accepted per farm per Botswana day across
  the whole council; the server rejects the fourth, and rejects a second charge for the same
  elder on the same day.
- **AC-03** Turning in a charge requires the objective to be satisfied by state recorded
  outside the Kgotla — goods present in inventory, or co-op sales / project contributions
  since acceptance. Errand items are consumed at turn-in.
- **AC-04** No project reward string promises an effect on other farmers.
- **AC-05** Every council seat renders regard as stars **and** a tier word **and**
  progress to the next tier.
- **AC-06** Botho meter shows current, next pillar threshold, and today's remaining cap.
- **AC-07** The contribution allowance is visible before any donation is made.
- **AC-08** Donating does not blank the screen (no full-screen loading overlay).
- **AC-09** A failed council fetch surfaces an error with Retry, not an empty state.
- **AC-10** Escape closes the dialogue sheet and returns focus to the seat that opened it.
- **AC-11** Every user-visible string resolves through `tl()` with both `en` and `tn`.
- **AC-12** Elder Neo is visually distinct and positioned as head of the council.
- **AC-13** A missing portrait degrades to an initials crest; no broken image is ever shown.
- **AC-14** Kgotla DTOs are imported from `packages/shared` by both apps.
- **AC-15** Regard decays −2 per elder per full 7-day period with no completed charge, is
  applied at most once per period, and never reduces regard below 0.
- **AC-16** The remaining charge pool for today is visible on the quest board, and the board
  explains why no charge is available when the pool is spent.

---

## 13. Documented deviations

| vs | Deviation | Disposition |
| --- | --- | --- |
| 03 §20.2 | Listed a donation area and **events**; no events exist. | **Amended 2026-09-23 with approval** to describe the council, quest board and community projects. Events descoped from v1 of this screen and recorded as a deviation below. |
| 22 §3.2 | Specifies a Kgotla **circle**, raised elder's seat, community fire, market stall, acacia trees. | Target state, not shipped. Art pending. 22 is not in the normative set, but the circle arrangement is adopted here. |
| 22 §11.4 | `🏛️ KGOTLA Rep: ★★★☆☆` panel. | Adopted as the per-seat star rating (§4) rather than a separate panel. |
| 01 §16 / 03 §20.2 | Periodic **events** (harvest festival, market day, community meeting, seasonal celebrations). | Descoped from v1 of this screen. Retained as a v1.1 candidate; no endpoint, table or copy exists for them today. |

---

## 14. Rulings (all resolved 2026-09-23)

| # | Question | Ruling | Where |
| --- | --- | --- | --- |
| 1 | Quest allowance | **Shared pool of 3 per farm per day**, not 1 per elder | §5.1 |
| 2 | Objective magnitudes and rates | Decided by counsel — 25 Pula / 60 Pula / 6 poleto / 4 thatch / 6 crop; 8–12 Pula + 10 Botho each | §5.2 |
| 3 | Storage | Decided by counsel — `kgotla_quests` table, no progress column | §5.3 |
| 4 | Regard decay | **Yes — −2 per elder per full 7 days idle**, floored at 0 | §4.1 |
| 5 | 200 Pula/day cap and 1 Botho per Pula | **Confirmed**; to be written into 02 §6 | §6 |
| 6 | Amend 03 §20.2 | **Approved — amended** | §13 |

### Implementation status, 2026-09-23

**Done (API):** `KgotlaService` rewritten; `completeQuest` and its route deleted;
`acceptCharge` / `turnInCharge` / `getChargeBoard` added; shared 3/day pool enforced;
decay applied lazily and idempotently; errand goods consumed at turn-in; project rewards
replaced with a once-only Chapter Token grant; `WalletService.contributedSince` /
`coopSalesSince` added so the ledger keeps one reader. **42/42 Kgotla tests pass**, and the
spec asserts AC-01, AC-02, AC-03, AC-04, AC-07 and AC-15 directly.

**Done (database):** migration `20260923000032` **applied to the live project** and verified
by probe — `kgotla_quests`, `npc_reputation.last_charge_at` and
`kgotla_projects.reward_claimed_at` all resolve.

**Done (web):** `lib/kgotla.ts` rewritten against the new endpoints; `KgotlaScreen.tsx`
gained the quest board (AC-16), stars + tier + progress on every seat (AC-05), a Botho meter
with the daily cap (AC-06), an allowance visible before spending (AC-07), skeleton loading
instead of a full-screen overlay (AC-08), an error row with Retry (AC-09), Escape + focus
trap + focus restore on the dialogue sheet (AC-10), all strings through `tl()` with `en` and
`tn` (AC-11), and Elder Neo raised and centred as head of the council (AC-12). Web `tsc` is
clean and ESLint reports no rule violations (only the repo-wide prettier/CRLF noise).

**Outstanding:**

1. **`scripts/balance_verify.py`** re-run now that quest income exists (charges cap at
   32 Pula/day by design).
2. **AC-14 — DTO drift.** `KgotlaNpc` and friends are still hand-duplicated between
   `apps/web/src/lib/kgotla.ts` and the API service. They belong in `packages/shared`.
   Duplication is the mechanism by which this screen drifted the first time.
3. **Playtest.** Nothing here has been played. AC-01…AC-16 are asserted in code; how the
   chamber *feels* — whether three charges read as a real choice, whether the decay warning
   is noticed rather than nagging — needs the Princess at the screen.
