# Molemisi — v3: Economic Model & Live-Service Design

**Author:** Belvedere. **Date:** 2026-09-07. **Status:** proposal for ruling.

Supersedes the economic framing in `MOLEMISI_Economy_v2.md` and the "cozy game" reading in `MVP_REVIEW_AND_IMPROVEMENTS.md`. Screens, art direction, and the four-screen structure are carried over unchanged.

---

## 0. What actually changed

The earlier specs were written as a cozy game: *"pay for convenience, not survival,"* *"no direct cash-out,"* *"no EPS licence required."* Those three lines are mutually consistent — and they describe a product that cannot give players an ROI.

You've since said the intent is an **economic game with real withdrawals**, on **mobile money**, for **Botswana and regional non-gamers**. That is a different product, and the honest summary is:

> **The withdrawal is not a feature you add. It's a different legal category, a different economy, and a different player contract.**

The good news is that it's achievable, and that the mobile-money route has one advantage over crypto that turns out to matter a lot. The bad news is that the current spec's compliance reasoning is void the moment cash can leave.

---

## 1. How Betway Botswana actually does it

This matters, so here's what's real rather than assumed.

**Payments.** Betway Botswana takes **Mascom MyZaka**, **Orange Money**, and **BTC Smega** (the latter for South African users). Deposits are instant, with no player-side fee. Withdrawals to mobile money land in roughly a minute.

**The closed-loop rule.** You must withdraw to *the exact method you deposited with*, and to the registered mobile number. You cannot deposit by Orange Money and withdraw to a bank account. This is the standard anti-money-laundering pattern and it's the single most important control in the whole system.

**KYC before payout.** Identity verification requires a valid **Omang or passport** matching the account name, plus **proof that the mobile number is yours** — typically a recent mobile money statement or screenshot. No verification, no withdrawal.

**And the part that isn't copyable:** Betway operates under a **bookmaker's licence** from the **Botswana Gambling Authority**, issued under the **Gambling Act, 2012**. That licence is the product. Everything else — the rails, the KYC, the closed loop — is plumbing that any operator can build.

### What licences actually exist in Botswana

Section 33 of the Gambling Act provides: **bingo, bingo machine, bookmaker, casino, gambling establishment, lottery, racing, totalizator.** Plus, separately, permission for **promotional competitions and private lotteries** under ss. 66–67.

Note what is *not* on that list: **there is no licence category for "online game with cash prizes."** Which means you have exactly two options:

| Route | What it means | Cost / feasibility |
|---|---|---|
| **Bookmaker's licence** | You're a betting operator. Betway's route. | Heavy, slow, and it reframes Molemisi as gambling — which fights the "non-gamer friendly" goal |
| **Don't be gambling at all** | Structure it so it isn't a bet, a lottery, or a chance-based prize | No gambling licence needed. **This is the one to pursue.** |

### Why Molemisi doesn't need to be gambling

The Gambling Act's lottery definition turns on **contribution + chance + prize**. A bookmaker's licence turns on **betting on an outcome**.

**A player-to-player market is neither.** If one player grows sorghum and sells it to another player for real money, and the platform takes a fee for facilitating the trade, that's commerce — the same legal shape as any marketplace. No bet was placed. No prize was distributed by chance. No one paid for a chance at anything.

So the design target is:

> ### The Withdrawal Funding Rule
> **No thebe leaves the system that did not enter it from another player's deposit. The operator's revenue is fees — never the float, and never house-funded rewards.**

That one rule is what separates "a marketplace where people trade the things they grow" from "a scheme." It also happens to be the same insight Sunflower Land arrived at the hard way: their docs now state that **rewards are only created when FLOWER is spent**, with only ~75% of spent FLOWER cycling back to players. They got there after four years and a large token drawdown. We can start there.

**Two caveats I can't resolve for you:**
1. I am reasoning from the published licence categories, not from legal training. **Get a Gaborone lawyer who does gaming and payments** before building the withdrawal layer. A few thousand pula now versus an existential problem later.
2. **Holding BWP balances redeemable on demand may be e-money / deposit-taking**, which is **Bank of Botswana** territory, not the Gambling Authority's. Mitigation in §5: don't hold the float.

---

## 2. Three currencies

You said I could add a second currency. I'd add three, because the third does a job neither of the others can.

### Pula (P) — soft, earnable, never withdrawable

The gameplay economy. Earned by playing: harvests, forage, quests, contracts. Never purchasable with real money, never transferable between players, never withdrawable.

**Buys:** seeds, water, crafting fees, buildings and maintenance, land, cosmetics.

This is where ~95% of play happens, and every balance number in the earlier review (crop timers, crafting margins, land ladder) applies here unchanged. Pula inflates freely — that's fine, it's soft, and the sinks are seeds, water, maintenance, and the 5% Co-op tax.

### Madi (M) — hard, withdrawable, player-traded

**1 Madi = BWP 1.00**, two decimal places. Purchased via mobile money. Used on the **Market Exchange** to buy goods other players listed. **Withdrawable** to the verified mobile number that funded the account.

**The house never sets a Pula ↔ Madi exchange rate.** Players price their own listings; the house takes a fee. This is deliberate and load-bearing: a fixed operator exchange rate is what would make this a currency business rather than a marketplace. Keep the rate floating and player-set.

> *Working name.* "Madi" needs confirming with a Setswana speaker — I've seen it used for both "money" and "blood," and I'm not confident enough to assert it. Alternatives if it doesn't survive review: **Kgwebo** (trade/business), or **Madi ya Kgwebo**. Your call, and worth asking someone who actually speaks the language.

### Chapter Token — seasonal, expiring

Earned and spent **within a single 3-month chapter**, then **expires to zero**. Copied deliberately from Sunflower Land's chapter tokens, which is the most elegant anti-inflation device in their model and the one that costs the least to build.

Themed per chapter — *Sekala sa Pula* (rain scale), *Sekala sa Phane*, and so on. Buys seasonal cosmetics, chapter-only recipes, and entry to the seasonal prize draw. **Never convertible to Madi, never withdrawable.** Its whole job is to give players a reason to spend *now* instead of hoarding.

---

## 3. The four screens, and how each one earns

You've already built these, so the goal is to slot the economy into them rather than redesign them.

### FARM — production

Grow, harvest, raise livestock, craft, build. **Costs Pula, yields goods.** This is the factory floor and it should stay entirely in Pula.

Changes from the earlier review that still stand: crop growth retimed from minutes to **~1 game day**; **water made load-bearing** (empty Jojo tank stops growth — in Botswana this isn't a mechanic, it's the setting); **seasonal building maintenance** so Poleto, Thapo and Setena have permanent demand instead of dying once the last building is up; **crafting slots** (1 base, +2 from buildings).

### BUSHVELD — the scarce inputs

This is where Molemisi stops being reskinnable. Three scenes, **disturbance-scarcity** (a per-scene quiet meter that depletes as you tap and refills slowly) instead of respawn timers, because every timer band in the current spec is under 24 hours and therefore never actually on cooldown for a daily player.

Produces **Bushveld materials** (Pula economy) and **Discoveries** (journal only, never items — per your C4 ruling). **Phane stays real-calendar gated to April and December.**

Critically: the Bushveld is where **genuine scarcity lives**, because a player can't grind it faster than the quiet meter refills. That makes it the natural source of the goods worth listing for Madi.

### MARKET — two sides, two currencies

| Side | Currency | Rules |
|---|---|---|
| **Co-op** | Pula | NPC buyer. Always available. Dynamic prices within a band. **5% tax.** Price floor and ceiling so it can't be exploited. This is the soft sink and the reliable baseline income. |
| **Exchange** | Madi | **Player-to-player.** Players list goods, players buy. House takes **10%** of every sale, charged to the seller. Player-priced — **the house never quotes a rate.** Listing slots limited by Storage tier, so listing space itself is scarce. |

### KGOTLA — contracts, community, and the season

This is the screen that carries the most weight in the new model, and conveniently it's the one that's most uniquely Batswana.

- **Contracts.** Players post "I need 50 sorghum by Friday, paying 20 Madi." Other players fulfil them. **Player-funded** — this is the primary honest path to earning Madi.
- **Seasonal Export Contracts.** House-posted, Madi-denominated, funded from a **capped monthly promotional budget**. Needed to bootstrap liquidity when nobody has Madi yet, and to guarantee a demand floor in quiet months. **This is the one place the Withdrawal Funding Rule bends — so it gets a hard monthly cap and it lives inside the promotional-competition permission.**
- **Community projects.** Multi-day shared material goals. The main **Botho** source, and deliberately **not optimisable by grinding** (§6).
- **Botho.** 100 → Bupi recipe. 300 → Deep Bushveld. 500 → Letsema. 1000 → prize eligibility. Unchanged.
- **Elder's tip / Mogolo.** Rules table reading real state.
- **Almanac & chapter.** The seasonal track.

---

## 4. How a player actually gets an ROI

The honest version, written as a player would experience it:

1. **Play free.** Grow crops, gather in the Bushveld, craft. All of this is Pula. No deposit needed, ever, to play fully.
2. **Produce something scarce.** Crafted goods, seasonal Phane, contract fulfilment, rare Bushveld finds.
3. **List it on the Exchange, or fulfil a Kgotla contract.** A player who deposited BWP buys it.
4. **Receive Madi.** Withdraw to your mobile money number.

And the other side:

1. **Deposit BWP via Orange Money or MyZaka** → Madi.
2. **Buy the goods** you don't have time to grow.

Nobody is paid by the house. Every thebe a withdrawing player receives was deposited by another player who wanted something. **That's the whole model, and it's why it isn't a scheme.**

---

## 5. Payments, KYC, and anti-abuse

This section is the one that decides whether the model survives contact with reality. Play-to-earn games die here, usually in month three.

### Rails

**Orange Money** and **Mascom MyZaka** at launch — the same two Betway uses. **BTC Smega** for South African users when you go regional; Betway already demonstrates that rail works cross-border.

### Controls, in priority order

1. **One verified mobile number = one account.** Botswana mobile money is KYC'd at the SIM. **This is the advantage mobile money has over crypto**: Web3 has to charge an entry fee or fight sybils forever. You get SIM-level identity for free. Use it.
2. **Closed-loop withdrawal.** Withdraw only to the number that funded the account — exactly Betway's rule.
3. **KYC before first withdrawal.** Omang/passport matching the account name + proof of number ownership. Betway's exact requirement.
4. **The house never funds Madi rewards.** No daily pool, no "earn P50 a week!" Nothing. Only player-funded contracts, plus the capped promotional budget.
5. **Wash-trading is structurally unprofitable.** A sale costs 10% and a withdrawal costs 2%, so any round trip loses money. That's the point — the fees *are* the anti-fraud mechanism.
6. **Caps.** Withdrawal caps (say **P2,000/day, P10,000/month**) — standard operator practice, limits fraud blast radius, and keeps cash flow sane.
7. **New-account holding period.** Withdrawals locked for the first 30 days on a new account. Kills almost all bot-and-dash behaviour. Be transparent about it in the UI; players accept it when it's explained.
8. **Device and IP clustering.** Flag accounts sharing a device or IP that transact with each other.

### Don't hold the float

The e-money risk in §1 is real. The mitigation is architectural: **use a licensed payment processor as the actual money handler.** Your systems track *entitlements* (how much Madi an account has); a licensed PSP holds the BWP. You never custody customer money, which takes the Bank of Botswana question off the table.

If that's not achievable at your scale, the fallback is that Madi balances are **transient** — settled out on a short cycle rather than stored indefinitely. Either way: **decide this before writing Phase 5, because it determines the schema.**

---

## 6. Live service

You want a Google Play-style live service. Here's the skeleton.

### Chapters — 3 months, aligned to the real Botswana year

| Chapter | Months | Theme |
|---|---|---|
| **Pula** | Nov–Jan | First rains. Planting. Everything grows. |
| **Phane** | Feb–Apr | Mophane harvest (April). The Bushveld's big moment. |
| **Moriti** | May–Jul | Cooling. Livestock. Crafting season. |
| **Letlhafula** | Aug–Oct | The dry end. Water is scarce, the tank matters most. |

Each chapter has its own **Chapter Token** that expires at the end. Four times a year the seasonal economy resets to zero — which is precisely the mechanism that stops long-term inflation.

**This is also your postmodern hook, and it costs almost nothing.** The game's year *is* the real year. Every player experiences first rains, mophane season, and the dry end in the same weeks. No reskin can copy that.

### Almanac (seasonal track)

Free track for everyone; **Guild track** for subscribers. Resets each chapter. Rewards are **cosmetics, convenience, Pula, and Chapter Tokens — never Madi.** Standard battle-pass retention, themed as a farming almanac.

### Real-calendar events

Mophane weeks in April and December. First rains in November. Drought in September. Shared, dated, and tied to the Setswana month names you already have.

### Why the reward function matters here

**The reward function determines the culture.** Reward raw throughput and you get spreadsheets, bots, and grinders — and "loyal players" get squeezed by "efficient players." That's what happened to most of this genre.

So: **make the things that pay best the things that can't be multiplied by grinding.** Community projects. Botho. Journal discovery. Seasonal participation. A player who shows up daily and contributes should out-earn a player who optimises a spreadsheet, because the *design* says so. That's how you get ROI for **loyal** players specifically, which is what you asked for — and it's the one place your Botswana-specific mechanics double as anti-farm mechanics.

---

## 7. Fallback: closed loop

You said if there's no simple solution you'd go closed loop. My recommendation is stronger than that:

> **Build it so both are possible. Ship closed. Unlock withdrawals when you're cleared.**

The Pula economy, all four screens, the crafting and Bushveld work, progression, and the live-service skeleton are **identical** in both versions. Madi is a **layer bolted onto the Market and Kgotla**, not a foundation.

So:

**v1 — ship it (no withdrawals).** FARM, BUSHVELD, MARKET (Co-op only), KGOTLA. Pula economy. Guild subscription P49/mo, top-up packs for Pula, three boosts, cosmetics. Almanac. Chapters.

**v1.1 — Madi layer.** Subject to legal sign-off and a PSP. KYC, mobile money in/out, Exchange, contracts, withdrawal with the closed-loop rule, caps, holding period, promotional prize permissioned under s.67.

**v2 — regional.** South Africa via Smega. Then the post-MVP content backlog: fourth Bushveld scene, tiered buildings, quality grading.

This sequencing means **a regulatory surprise delays a feature, never the product.**

---

## 8. What the earlier rulings do to this

Your C2–C15 rulings all survive the pivot unchanged — they're about content, not the economic frame. Two notes:

- **The Monthly Community Prize** (top 3 by Botho, real money, KYC'd) is very likely a **lottery or promotional competition** under the Act. That's fine — **s.67 promotional competitions can be permissioned.** It's a separate, cheap permission from a bookmaker's licence. Don't let it drag the rest of the model into gambling territory; ring-fence it.
- **C20 (the indirect Botho hole)** gets *more* important now. If Botho gates a real-money prize, and the Guild subscription's Auto-Collector supplies the materials for Botho-earning activities, then the subscription indirectly buys prize eligibility. Cap Botho per day, require a manual action per increment, keep the CI assertion.

---

## 9. Graphics

"Personalized, pixel sprites, memorable." Three recommendations.

1. **Silhouette first.** Memorable sprites read at 32×32 from the shape alone, before any detail. If you can't tell two characters apart as solid black shapes, they aren't distinct yet. Fix silhouettes before palettes.
2. **One signature palette, used ruthlessly.** The Kalahari ochres, the particular blue of a Botswana sky, the green-grey of mopane. A limited palette is what makes pixel art look *authored* rather than *generated* — and it's what makes it recognisable in a store screenshot.
3. **One unforgettable face.** Mogolo should be the face of the game. He's already the narrative voice; make him the visual one too. Give him the best idle animation in the project.

On "personalized": I read that as **player expression** — farm layout, house colours, character, maybe a signature item. That's worth building, because personalization is what makes a player say "my farm" instead of "the farm," and it's the cheapest retention you'll ever buy. Say the word if you meant something else.

And the standing caveat: **the Setswana naming, proverbs, and especially the totem material need a native speaker and, ideally, a local artist** before they ship as final. Several terms in the Bushveld spec are already flagged low-confidence, and totem/clan content is personal.

---

## 10. Decisions I need from you

1. **Legal appetite.** Are you willing to brief a Gaborone lawyer on gaming and payments? If yes, v1.1 is real. If no, we build v1 closed-loop and make it excellent — which is still a good product.
2. **PSP.** Would you use a licensed processor (so you never custody BWP), or hold balances yourself? This changes the schema and the regulatory exposure. I recommend the PSP.
3. **Currency name.** Madi, pending confirmation — or your preference.
4. **Promotional budget.** How much per month are you willing to spend on Export Contracts and the prize? This caps how fast the Madi economy can grow.
5. **Confirm "personalized" means player customisation.**

## 11. And the simulator

Still the right next build, and now with a clearer job:

1. Does the Pula economy stay bounded over 90 days with seeds, water, maintenance, and the 5% Co-op tax as sinks?
2. At a 10% Exchange fee, what exchange rate between Pula and Madi emerges — and is it stable?
3. How much Madi liquidity is needed before the Exchange feels alive rather than empty?
4. Does disturbance-scarcity actually deliver 2–3 rewarding taps per scene per visit?
5. Does the reward function favour daily loyal play over spreadsheet optimisation, as §6 intends?
