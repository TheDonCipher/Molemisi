# Molemisi — MVP Review: Coherence, Maths, Gameplay, and a Direction

**Reviewer:** Belvedere. **Date:** 2026-09-07. **Scope:** all of `docs/MVP/` plus `packages/game-config/src`.
**Companion to:** `MVP_VERIFICATION_RUBRIC.md` (which holds the numbers of record and the conflict register).

---

## 0. Verdict in one page

The specs are unusually good for a solo project. The decisions are documented, the deferred work is listed rather than forgotten, and the economy doc actually shows its arithmetic instead of asserting vibes. Most design documents fail at one of those three things. This one doesn't.

Three things are genuinely wrong, and they're wrong in ways that would survive a playtest and only show up in month two:

1. **The economy's numbers are correct but its *clock* is broken.** Every value in Economy v2 is arithmetically right. But crop growth is measured in **minutes** (sorghum: 12 min) while the stated session is **5–15 minutes once a day**. Those two facts cannot coexist. A 12-minute crop turns the game into a trading terminal and reduces the entire top-up ladder to pocket change.
2. **The Bushveld's respawn bands cannot produce the Bushveld's stated feel.** Every band is under 24 hours, so a player checking in once a day finds *every* hotspot ready, every time. The spec's own target — 2–3 ready per scene — is mathematically unreachable at a daily cadence.
3. **Two of your rulings (C6, C10) hollowed out a progression pillar.** Removing the Journal buffs leaves Pillar 3 with no reward at all. That's fine as a philosophy, but it has to be *answered*, not just left empty.

And the strategic finding that matters most: **the business model's viability is decided by a number the spec explicitly labels a placeholder.** Details in §3.

---

## 1. Consistency and coherence

### What holds together well

- **The Eight Phases are properly dependency-ordered**, and the plan flags its own ordering hazards rather than hiding them.
- **Post-MVP vision is preserved, not deleted** (Core v2 §6). This is the discipline most specs lack — deferring something *properly* instead of quietly dropping it.
- **The two different "seasons"** are explicitly decoupled (Core v2 §6.5, Bushveld §7.3). Someone got burned by that before, or foresaw it. Either way, correct call.
- **"No Phaser"** is settled and stated as a decision, not an open question.
- **The legal architecture** (no cash-out, no P2P, KYC before payout, idempotent webhooks) is genuinely well thought through. Most projects at this stage have none of it.

### What doesn't hold together

| Issue | Where | Why it's a coherence break |
|---|---|---|
| **Session length vs. crop clock** | Core v2 §4.1 vs `crops.ts` | 5–15 min/day session; 12-minute sorghum. See C16. |
| **Bushveld respawn vs. cadence** | Bushveld §10 vs §3 | All bands < 24 h ⇒ nothing is ever on cooldown for a daily player. See C17. |
| **Journal pillar has no payoff** | Core v2 §5.3 + ruling C6 | A "pillar" that grants nothing isn't a pillar. See C18. |
| **Flat buildings kill crafting demand** | Roadmap Decision 5 vs Core v2 §2 | Build-once buildings mean three of five recipes are dead content by week two. See C21. |
| **Water is decorative** | `crops.ts` water rates | `waterDecayRate` 0.1/game-hour with `waterPerAction` 1 means crops effectively never need water — in a game set in Botswana. |
| **Livestock has no stated loop role** | Core v2 §4.1 | "Collect eggs/milk" appears, but there's no feed cost, no kraal purpose, and no reason livestock isn't strictly better than crops. |
| **Contracts and community projects are named but never specified** | Roadmap, Core v2 §4.2 | Both appear in the macro loop; neither has numbers, durations, or rewards anywhere. An implementer cannot build them. |

The last one is worth dwelling on: **market contracts and Kgotla community projects are load-bearing in the loop and entirely unspecified.** They're listed as faucets and as the macro loop, but nothing says what they pay or how long they take. That's the largest *missing* content in the MVP, and it's invisible because it's mentioned so often.

---

## 2. Crafting — the maths, corrected

### 2.1 The spec's arithmetic is internally consistent

Every margin in Economy §8.1 checks out: Poleto +33%, Thapo +32%, Setena +31%, Bupi +36%, Borotho +33%. No errors.

### 2.2 But the method is wrong, and in your favour

The spec taxes the **output** at 5% but values the **input** at its pre-tax base price. That's inconsistent. The true cost of spending an input is what you'd have *received* for selling it — base × 0.95.

Recomputed on that basis:

| Recipe | Inputs (net) | Fee | Outlay | Sale (net) | **Profit** | **ROI** | Spec said |
|---|---|---|---|---|---|---|---|
| Poleto | 2 Wood P3.80 | P1 | P4.80 | P6.65 | **P1.85** | **38.5%** | 33% |
| Thapo | 3 Fiber P11.40 | P1 | P12.40 | P17.10 | **P4.70** | **37.9%** | 32% |
| Setena | 2 Clay P5.70 | P2 | P7.70 | P10.45 | **P2.75** | **35.7%** | 31% |
| Bupi | 3 Grain P11.40 | P2 | P13.40 | P19.00 | **P5.60** | **41.8%** | 36% |
| Borotho | 2 Bupi P38.00 | P3 | P41.00 | P57.00 | **P16.00** | **39.0%** | 33% |

Every recipe is **more** profitable than advertised, and the band is tighter (35.7–41.8%) than claimed (31–36%). Good news — but the published numbers are wrong and should be corrected, not defended. Not urgent; it's a rigour issue, not a balance one.

### 2.3 The number that actually matters: profit per minute of crafting-slot time

| Recipe | Time | Profit/min | Notes |
|---|---|---|---|
| Thapo | 10 min | **P0.470** | Best in game — but gated by Riverbank palm-fiber supply |
| Borotho (full chain: 2×Bupi + bread) | 70 min | **P0.389** | P27.20 per chain |
| Bupi | 20 min | P0.280 | |
| Poleto | 10 min | P0.185 | |
| Setena | 15 min | **P0.183** | Worst in game |

Two consequences worth naming:

- **A rational player makes rope and bread, and never makes planks or bricks** except when a building demands them. That's fine *for now* — but combined with flat, build-once buildings (Decision 5), Poleto and Setena become dead content within weeks. See C21.
- **Thapo being the best recipe is an accident, not a design.** It's best only because palm fiber is cheap relative to rope's value. It's also the most supply-constrained. That's a happy accident — lean into it by making Riverbank genuinely the economic heart of the Bushveld.

### 2.4 The crafting fee is not a sink

The spec calls fees "a deliberate small Pula sink." At P1–P3, and maybe five crafts a day, that's **~P10/day**. Compare: 5% market tax on P300/day of sales is P15/day; seed costs at 20 plots are ~P40/day.

The sink hierarchy is **seeds ≫ tax > fees**. Fees are flavour. Either raise them or stop claiming they do economic work. My preference: **keep them flat and small, and stop describing them as a sink.** Their real job — making crafting feel like it costs something — they do perfectly well.

### 2.5 What crafting is missing

Right now crafting is **a vending machine with a delay.** You press a button, wait, press another. There is no decision in it. Five recipes, all always succeed, all yield exactly one output, no batching, no substitution beyond Bupi's grain choice.

Four cheap fixes, in order of value:

1. **Concurrent slots (C22).** The spec never says how many jobs run at once, and that single unknown swings crafting income by roughly 10×. Specify: **1 slot base, 2nd and 3rd from buildings.** This also gives the flat single-tier buildings a purpose without violating Decision 5.
2. **Batch sizes.** Craft 1 / 3 / 6 at a time, with the fee scaling sub-linearly (1×/2.5×/4×). Now batching is a real choice: capital tied up vs. fee efficiency.
3. **Substitution, extended.** Bupi already takes sorghum *or* maize. Extend the pattern — Setena accepts clay or a little sand-and-dung mix; Borotho accepts flour plus optionally eggs (a richer loaf). Substitution makes the inventory meaningfully *yours*.
4. **Yield variance, never failure.** Not "the craft failed" — that's hostile. Instead: *sometimes* a batch yields a bonus unit, with Mogolo's line attached ("Mogolo helped"). Randomised reward, never randomised punishment. Cozy games should only ever surprise you upward.

---

## 3. Economy and business model — the finance is sound, the strategy is exposed

### 3.1 Every calculation checks out

I re-ran the whole of Economy §8. Pack bonuses (0/0/5/6/8%), the 3% gateway (97% net), the 300-payer split (210/60/24/6), segment revenue (P12,600 / P2,940 / P3,600 / P3,600 = **P22,740**), ARPU **P2.27**, ARPPU **P75.80**, net after fees **P22,058**, after prize **P21,708**, LTV **P11.35** blended and **P530.60** payer, CAC **P3.78**, break-even **23,033 MAU**, prize split **P200/P100/P50**, pool crossover at **71.43 → 72 subscribers**, prize as **1.5%** of revenue and **11.9%** of subscription revenue.

All correct. I want to say that plainly, because the rest of this section is critical and it shouldn't drown out the fact that the arithmetic is clean.

### 3.2 The break-even number is the whole ballgame

**23,000 MAU** to cover an illustrative P50,000/month. Botswana's population is roughly 2.6 million. That means reaching about **1% of the entire country**, every month, to break even at a cost base the spec itself calls "a placeholder — substitute the team's actual figure."

Replace it with a realistic number and the picture inverts completely:

| Monthly cost base | Break-even MAU | Read |
|---|---|---|
| P10,000 (solo / near-zero overhead) | ~4,600 | Comfortable. The model works. |
| P25,000 (small team, modest hosting) | ~11,500 | Ambitious but plausible domestically. |
| P50,000 (funded studio) | ~23,000 | Requires the game to be *the* Botswanan game, or to export. |

**This is the single most important strategic fact in the document, and it's currently hidden behind a placeholder.** My recommendation: put the real number in before drawing any conclusion from §8.6. If you're solo or near-solo, the model is healthier than it looks. If you're not, the game must be built to export from day one — which, happily, it should be anyway (§6).

### 3.3 The 3% gateway assumption needs verifying

3% is optimistic-looking for mobile money merchant rates, and it's doing real work in the model. Sensitivity on P22,740/month:

- At 3% → P22,058 net
- At 5% → P21,603
- At 8% → P20,921

About P1,100/month at this scale — not fatal, but worth confirming against actual Orange Money / MyZaka / Mascom merchant terms rather than assuming. I've deliberately not invented a figure here; it needs to come from a real quote.

### 3.4 The subscription is the weakest revenue line but carries the most weight

Subscription revenue (P2,940) is **12.9%** of total, yet it funds the prize pool and carries the entire legal framing. And note: at the illustrative scale, 10% of P2,940 is P294 — below the P350 floor, so **the floor governs**. The "10% formula" only starts doing anything at 72 subscribers, which is 20% above projection.

Meaning: **the prize is effectively a fixed P350/month marketing cost for the foreseeable future.** That's fine — arguably it's the correct behaviour at launch — but the spec's framing of it as a scaling formula oversells how much it will actually scale in year one.

### 3.5 One legal hole worth closing (C20)

The Auto-Collector is forbidden from *directly* incrementing Botho. Good. But Botho is earned by **delivering quest items and donating to community projects** — both of which consume **inventory**, which is precisely what the Auto-Collector generates.

So the subscription *indirectly accelerates* Botho accrual by supplying the raw materials for it. If Botho gates a real-money prize, that's the exact purchase-linked chain the legal framing insists must not exist.

**Fix (three parts, all cheap):**
1. Cap Botho accrual per player per day.
2. Require an explicit manual action for every increment — the Auto-Collector must be provably incapable of delivering a quest or donating.
3. Assert all of this in the I4 invariant's CI test.

This is the kind of thing that's trivial to fix now and very expensive to fix after launch.

### 3.6 C11 resolved — crop values, and why the fix isn't where you'd think

**Ruling: adopt the spec's values (sorghum P4, maize P4, watermelon P6; seeds P2/P2/P3).**

Reasoning:
- Rebasing *up* to the code's P15/P20/P40 would force all five recipes to be recomputed a second time, throwing away the work in Core v2 §6.2.
- It would inflate Pula without creating a single thebe of real revenue. **Dev profitability is not a function of how much Pula a player earns** — it's a function of whether the things Pula buys are desirable. Starving players is the worst way to monetise a cozy game.
- Small numbers are *player-sensible*: "a seed costs P2 and returns about P16" is legible at a glance. "P8 returns P64" is not obviously better, and it makes every price in the market feel arbitrary.

**But C11 was never really about price — it's about time.** The faucet is controlled by crop growth duration, not crop value. At 12 minutes, 4 plots net ~**P280/hour** and 20 plots ~**P1,400/hour**; the entire P500 Export pack (540 Pula) is under two hours of endgame play, and the whole monetisation ladder is worthless. Retune growth to ~1 game day (sorghum ~18 h, maize ~22 h, watermelon ~30 h) and the same prices yield ~**P56/day** at 4 plots and ~**P280/day** at 20 — sane, legible, and still generous.

Then protect Pula's value with **large exponential sinks**, which is where the money actually is:

| Land tier | Plots | Suggested cost | Days to afford (blended income) |
|---|---|---|---|
| Start | 4 | — | — |
| → Basket | 8 | P800 | ~4 |
| → Shed | 12 | P3,000 | ~15 |
| → Storehouse farm | 20 | P12,000 | ~55 |

Roughly **75–90 days to a maxed farm** for an engaged player — long enough to make a top-up genuinely tempting, short enough that nobody feels stonewalled. These are *starting points for the simulator to tune*, not gospel.

---

## 4. Bushveld — the best idea in the project, with a broken clock

### 4.1 The respawn maths doesn't work

A hotspot with respawn `R`, visited every `T` minutes, is ready with probability ≈ `min(1, T/R)`.

For a once-daily player, `T = 1,440`:

| Tier | Respawn | T/R | Ready? |
|---|---|---|---|
| Common | 30 min | 48 | **Always** |
| Uncommon | 3 h | 8 | **Always** |
| Rare | 12 h | 2 | **Always** |

**Every hotspot is ready on every visit, always.** Not 2–3 per scene — all 5–8. The spec's own feel target is unreachable, and two things follow:

- **There is no scarcity at all.** The Bushveld becomes "tap everything, get everything, every time."
- **The Daily Sparkle is meaningless.** It marks a hotspot you were going to tap anyway, so it changes no decision.

Even a hyper-engaged player checking every 4 hours finds commons and uncommons permanently ready. The bands aren't *slightly* wrong; they're tuned for a game nobody is playing.

### 4.2 Fix A (quick): lengthen the bands past 24 hours

To average ~3 of 6 ready at daily cadence you need bands like 20 h / 48 h / 96 h. It works, but it's fragile — it only holds for players at exactly one cadence, and it punishes anyone who plays more or less often.

### 4.3 Fix B (recommended): abandon timer-scarcity for disturbance-scarcity

**Every hotspot is always available. Tapping costs quiet.**

Each scene has a **quiet meter** that fills slowly (say +1 per hour, cap 6) and drains with each tap. Yield scales with quiet: full quiet gives full reward, each successive tap in a visit yields progressively less. Wait a few hours and the bush settles again.

Why this is better:

- It's **diegetic**. You're not blocked by an arbitrary timer; you've disturbed the bush and the animals have stopped moving. That *is* the Bushveld.
- It **respects the locked "no energy budget" principle** — no bar to explain, no currency to spend.
- It **produces exactly the spec's stated feel** — 2–3 good taps per scene per visit — and does so at *any* cadence.
- It makes the **Daily Sparkle matter**: now it's genuinely worth spending your quiet on the sparkling hotspot.
- It makes **scene choice matter**: spread taps across three scenes, or concentrate and accept diminishing returns. A real decision, every visit.

### 4.4 Fix C: make each visit different

Right now all three scenes are the same mechanic in three skins, and every visit to a given scene is identical. Two cheap levers:

- **Time of day.** Some tells only appear at dawn or dusk. The Bushveld is a different place at 6am.
- **Weather and season.** Riverbank is rich after rain and poor in drought. Rocky Outcrop is the refuge in dry months. Open Bush is best in the growing season.

This turns the Field Journal from a checklist you finish in a fortnight into a **season-long project** — which it needs to be, since it's one of three progression pillars.

### 4.5 The Mophane event is the best idea here — expand it

Real-calendar seasonal gating (April and December, `active_months = [4, 12]`) is genuinely distinctive. It ties the game to actual Botswana life and creates a twice-yearly *shared* moment across the whole player base. You already have the Setswana month names (Bushveld §7.2). Use them:

- **Sedimonthole (Dec)** — mophane worms. Already specified.
- **Moranang (Apr)** — mophane worms. Already specified.
- **Phatwe / Lwetse (Aug–Sep)** — the dry end; water scarce, Bushveld thin, Jojo tank matters most.
- **Ngwanatsele (Nov)** — first rains. Everything changes: planting begins, the Bushveld comes alive, Riverbank floods.

**This is the postmodern hook and it's nearly free to build.** See §6.

### 4.6 Journal completion is too fast

Three scenes × ~6 hotspots, each with a small loot table. If every hotspot is always ready (§4.1), a diligent player exhausts most of the journal in **one to two weeks**. Then Pillar 3 is finished, and — post-C6 — it finished for no reward at all.

Combining §4.3, §4.4 and §6.1's restoration arc fixes this properly.

---

## 5. The Journal pillar after C6 — a hole that needs answering

You removed the page buffs. I think that's defensible: buffs tied to completion are power creep, and they make the journal feel like homework with a grade attached.

But it leaves **Pillar 3 ("Ecological Mastery") granting literally nothing**, while Pillar 1 grants buildings and Pillar 2 grants recipes, Letsema, and prize eligibility. One of these is not like the others.

You have three options:

| Option | What it is | Cost | My read |
|---|---|---|---|
| **A. Intrinsic only** | The journal is its own reward. No mechanic. | Zero | Honest, and genuinely fine for a cozy game — completionism is a real motivation. But then stop calling it a *pillar of progression*. Call it what it is: the game's soul. |
| **B. Restoration arc** | Completing a scene's page visibly changes that scene's background art — the bush recovers as you learn it. | Low (art swaps you're already building for building tiers) | **My recommendation.** Costs no balance, is deeply satisfying, is already in Bushveld §11 as future scope, and is the most postmodern thing on this list: **the world changes because you paid attention to it.** |
| **C. Cosmetic / title** | Completing pages grants cosmetic items or a title. | Low | Fine, but generic. Every game does this. |

**Recommendation: B, with A as the underlying philosophy.** The journal shouldn't make you stronger. It should make the world more itself.

---

## 6. Making Molemisi postmodern and unique

"Postmodern" is a dangerous brief for a cozy game. The obvious reading — irony, winking at the player, breaking the fourth wall — ages badly and, worse, would undercut the sincerity that makes Molemisi's Botswanan setting work in the first place. Irony is cheap; sincerity is rare, and rarer still in games.

So I'd take "postmodern" to mean something more structural: **a game that declines the conventions of its genre on purpose, and says something by declining them.** Here are five moves, ranked by how much distinctiveness they buy per hour of work.

### 6.1 Run on Botswana's real calendar — shared time

**Cost: near zero. Distinctiveness: enormous.**

The game's year *is* the actual year. All players experience the first rains in the same week, the mophane harvest in the same fortnight, the dry end together. The UI shows the Setswana month name (you already have all twelve).

Why this is the strongest move available:
- It's **uncopyable by a reskin**. No amount of asset-swapping reproduces a game that knows it's April.
- It creates **collective moments** — the thing that makes a small player base feel like a community, which is exactly what Botho means.
- It breaks the convention that a game world is separate from the real one. That's a genuinely postmodern device, and here it's in service of something real rather than clever for its own sake.

### 6.2 Refuse the growth imperative

**Cost: low. Distinctiveness: very high.**

Nearly every farming game is an accumulation simulator: expand, optimise, repeat forever, with no acknowledgment that you might ever have *enough*. Molemisi could simply decline that.

Concretely: when a farm is genuinely self-sustaining — water secure, livestock breeding, soil not degrading, no debt — **the game says so.** Mogolo remarks on it. Nothing else is demanded. You can keep playing, but you're not *behind*.

Note that `SELF_SUSTAINING_THRESHOLD_HOURS` already exists in your codebase. The instinct is there; it just needs to be promoted from a constant to a stance.

This is quietly radical, and it's also *correct for the setting*: in Setswana cattle culture, wealth is a social relation, not an accumulating number. A game that lets you stop is a game with a point of view.

### 6.3 The Kgotla decides — Botho made mechanical

You already have the Kgotla, community projects, and a currency literally named after the philosophy "a person is a person through other people." But Botho is currently a number that goes up when you hand in items.

**Proposal:** once a week, the community *votes* at the Kgotla — repair the borehole, or extend the kraal, or plant a communal field. Every player with standing gets a voice. The outcome is a **shared world state** affecting everyone, including people who didn't vote.

This does four things at once:
- Makes **Botho relational** rather than accumulative — the philosophy made mechanical, which almost no game does.
- Creates a **weekly retention beat** (come back to vote) that isn't a login bonus.
- Delivers **Village Evolution** (currently post-MVP) through a mechanism instead of a progress bar.
- Makes the game's central idea *legible*: you are a person because of other people.

It's also the thing most likely to make Molemisi the game people describe to their friends.

### 6.4 Mogolo reads you back

You have a daily proverb system (Bushveld §7.4) and an Elder's tip driven by a rules table (Core v2 §5.4). Combine and invert them: **the proverb responds to what you actually did.**

Sell your entire harvest in one go → a proverb about haste or greed. Let a crop wither → one about neglect. Donate to a community project → one about *motho ke motho ka batho*. Help is not random; it's **commentary**.

This is metafiction — the game is reading you — delivered through the warmest voice in the game rather than a wink at the camera. It's a rules table, exactly like the Elder's tip. Cheap, and it will be the thing players screenshot.

### 6.5 Specificity as the art direction

Don't make "generic cozy, Botswana palette." Make the *specific* thing:
- The Kalahari's particular ochre, and the fact that Botswana's sky is enormous — make the **sky** the signature, not the crops.
- A kgotla has a specific shape: the kgotla tree, the curved seating, the speaking order. Draw that, not a "village square."
- Cattle are not livestock; they're the visual centre of rural Botswana. If cattle appear as one sprite among four, that's underdone.

**Caveat, and I mean it:** I'm giving you design reasoning, not cultural authority. Several Setswana terms in the specs are already flagged low-confidence, and totem/clan material is explicitly personal. Get a native speaker and a local artist on the proverbs, names, and totem material before shipping. That's not a nice-to-have; it's the difference between authentic and embarrassing.

### 6.6 What I'd explicitly *not* do

- **No fourth-wall jokes about it being a game.** Cute for a week, corrosive after.
- **No NFTs, no "play to earn."** Your "no cash-out" rule is one of the best decisions in the document. Keep it, and keep saying it out loud — it's a selling point.
- **No irony about the Botswanan setting.** The specificity is the appeal. Undercutting it would remove the only thing a competitor can't copy.

---

## 7. Other gameplay improvements, gamer hat

### 7.1 Make water the central tension

Right now `waterDecayRate: 0.1/game-hour` with `waterPerAction: 1` means crops effectively never need water — **in a game set in one of the driest countries on earth.** The Jojo tank is the most perfect piece of setting you have, and it currently does nothing.

Proposal:
- Crops **stop growing** (they don't die — no punishment) when the tank is empty.
- Refilling costs Pula: the water truck. Or you wait for rain.
- **Rain becomes the most anticipated event in the game** — which is exactly how it works in Botswana.

This single change does more than any other: it makes the setting **load-bearing instead of decorative**, creates a recurring Pula sink, gives the Pula Stone ("guarantee rain in 24h") real value — it's currently the weakest boost — and gives every game day a reason to check the forecast.

### 7.2 Make wildlife an actual antagonist

Ancestral Ward implies a wildlife-damage system, but it's barely in the loop. Make it real: jackals and baboons raid plots overnight; the kraal protects livestock; the boundary protects crops. Now those flat single-tier buildings have ongoing purpose, and it dovetails with C21's maintenance idea.

### 7.3 C21 — maintenance, so three recipes don't die

Flat, build-once buildings mean Poleto, Thapo, and Setena have **no sustained demand**. After the last building, they're dead content.

**Add seasonal maintenance.** Thatch needs re-ratching; kraals need repair; fences need mending. A kraal in Botswana is never "finished" — that's not a chore, that's the truth of the thing. You get:
- Permanent demand for planks, rope, and brick.
- A meaningful, recurring Pula sink (finally, one that isn't seeds).
- A seasonal rhythm to the farm.

### 7.4 Retire level/XP properly (C12)

Delete `calculateLevelXpRequired()`, `XP_REWARDS`, `STARTING_ENERGY`, and every `unlockLevel`. Keep all 11 crops (C13), all available from the start.

Replace the level gate with **seed availability**: the Market and Kgotla stock different seeds by season. You discover crops through the world rather than through a number going up — which is more interesting, fits the real-calendar concept (§6.1), and satisfies your ruling that everything be available at once.

### 7.5 Two gaps an implementer will hit

- **Contracts and community projects are never specified.** No durations, no rewards, no numbers. They're load-bearing in the macro loop and unbuildable as written. This is the largest missing content in the MVP.
- **Concurrent crafting slots are unspecified (C22).** Swings crafting income ~10×.

---

## 8. Recommendations, priority order

**Do before Phase 2 is built:**
1. **C16** — retune crop growth from minutes to ~1 game day. Everything else in the economy depends on this.
2. **C14** — split the market band: raw goods swing 0.5×–2.0×, crafted goods stable at 1.0× (±10%). This is what makes Economy §8.1's "consistent margin" claim *true*.
3. **C13/C12** — keep all 11 crops, all unlocked, retire level/XP, gate by seed seasonality.
4. **C22** — specify 1 crafting slot base, +2 from buildings.

**Do before Phase 4:**
5. **C17** — implement disturbance-scarcity instead of the current respawn bands.
6. **C18** — bring the restoration arc into MVP as the Journal's reward (Option B, §5).

**Do before Phase 6/7:**
7. **C20** — close the indirect-Botho hole: daily cap, manual action required, Auto-Collector provably unable to deliver or donate. Extend the I4 invariant.
8. **C5** — enforce the P500 daily cap in **Botswana time (UTC+2)**, not server-local.
9. Verify the **3% gateway fee** against a real merchant quote.

**Do soonest, because it changes strategy:**
10. Replace the P50,000/month placeholder in Economy §8.6 with your actual cost base. **The entire viability question turns on this number** (§3.2).

**Then:**
11. Specify contracts and community projects — currently named, never defined.
12. Make water load-bearing (§7.1). Best single gameplay change available.
13. Build the simulator and tune everything above against it.

---

## 9. What the simulator should settle

Since it's next on the docket, these are the questions I'd want it to answer first — several of them are ones I've had to reason about by hand in this review, which is exactly the situation the sandbox exists to eliminate:

1. At the proposed ~1-day crop timers, what is the real daily Pula curve from 4 plots to 20?
2. With disturbance-scarcity, does a 1–2 visits/day player actually see 2–3 rewarding taps per scene?
3. With raw goods at 0.5×–2.0× and crafted goods stable, what fraction of craft cycles stay profitable — and does Thapo still dominate?
4. Does the land ladder (P800 / P3,000 / P12,000) produce a ~75–90 day path to a maxed farm?
5. With seasonal maintenance added, does Pula stay bounded over 90 simulated days, or does it inflate?
6. How long to Botho 100 / 500 / 1000 under a realistic cadence — and is that pacing tolerable?
