# Molemisi — Economy & Business Model Specification (v2.0, MVP-Aligned)

**Status:** Locked design intent for MVP, reconciled with the Core Systems & Progression Specification v2.0, the Inventory and Bushveld specifications, and the MVP Roadmap. Section 8 is new — a worked financial model with actual numbers, not just a pricing table.

---

## 1. Core Economic Philosophy — unchanged

1. **1:1 Transparent Pula (BWP).** No premium currency, no exchange rate, no multiplier.
2. **No direct cash-out.** In-game Pula is never convertible back to real BWP.
3. **Pay for convenience and expression, not survival.** Nothing purchasable is required to progress.
4. **Cultural authenticity.** Premium items are framed through Tswana spirituality and community, not generic gem-shop language.

---

## 2. Revenue Streams

### 2.1 Direct Top-Ups (unchanged)

| Pack | Price | Bonus | Total Granted |
|---|---|---|---|
| Starter | P5 | — | P5 |
| Farmer | P50 | — | P50 |
| Harvest | P100 | +5 | P105 |
| Cattle | P250 | +15 | P265 |
| Export | P500 | +40 | P540 |

Daily cap: P500/player/day, enforced server-side.

### 2.2 Molemisi Guild Subscription — P49/month

- **Auto-Collector:** automatically harvests ready crops and collects eggs/milk while the player is offline. This is the one perk that must never touch Botho accrual (Section 4.1) — it moves items into inventory, it does not complete quests or donate to community projects.
- **+50% storage capacity**, stacking on top of whichever Storage tier (Core Systems v2 §1.4) the player has already built.
- **Exclusive cosmetics.**
- **Weekly Pula Stone gift** (a P20-value item at no cost to the subscriber — see Section 8.2 for how this is treated in the margin calculation).
- **Ad-free**, if/when ads exist elsewhere.

### 2.3 Premium Boosts — see Section 3

---

## 3. Premium Boosts ("Badimo Blessings")

| Item | Cost | Effect (MVP) |
|---|---|---|
| Pula Stone | P20 | Instantly refills the Jojo tank by 50%, or guarantees rain within 24h |
| Ancestral Ward | P25 | 3-day shield against wildlife damage |
| **Fertility Shell** | P30 | **Redefined:** the next harvest sold gets +50% sale value (not a quality-grade guarantee — there's no grade system yet; reverts to grade-based once one ships, per Core Systems v2 §6.1) |
| Breath of the Land | P15 | Instantly completes any active crafting or building timer |

---

## 4. Real-World Reward Mechanics

### 4.1 Monthly Community Prize (renamed from "Botho Giveaway" for clarity — same mechanism)

- **Pool:** see Section 8.5 for the actual funding formula — no longer a flat, un-revisited P350 forever.
- **Criteria:** top 3 players by Botho Points — which are the same community-standing number tracked at the Kgotla (Core Systems v2 §5.2), not a separate counter.
- **Legal safeguard, unchanged and still load-bearing:** Botho accrual is strictly decoupled from the Guild subscription. The Auto-Collector generates inventory, never Botho. This is what keeps the prize a loyalty/community program rather than a purchase-linked sweepstakes — it needs its own automated test in CI, not just a design note (Core Systems v2, this document's Section 8.5).
- **KYC:** payout requires the winner's in-game phone number to match their verified mobile money account.

### 4.2 Sponsored Bounties — unchanged, future B2B, out of MVP.

---

## 5. In-Game Economy Balance (Faucets & Sinks)

**Faucets:** selling raw crops and forage, selling crafted goods, Kgotla quests, market contracts.

**Sinks:** seeds and feed, water-truck deliveries when the Jojo tank is empty, crafting fees (Core Systems v2 §2 — now at corrected, margin-positive values), the 5% Market Tax on every sale, exponential land-expansion costs, tool repair/upgrade.

The crafting fees above only function as a sink *and* a legitimate value-add loop because the output values were corrected (Core Systems v2 §6.2) — under the original numbers, crafting was a guaranteed loss and no rational player would ever do it, which would have quietly broken the entire "Bushveld feeds Crafting feeds Market" loop this economy depends on.

---

## 6. Legal, Compliance & Platform Strategy — unchanged

- No EPS license required: Molemisi is a merchant of already-licensed mobile money providers, not an issuer of electronic value.
- No P2P Pula transfers, ever — items and cosmetics can be gifted, currency cannot.
- Distribution: PWA-primary, direct mobile money billing, ~93–97% margin retained. Play Store listing remains a future, separately-evaluated decision given Play Billing's fee structure.
- Webhook-verified payments, KYC at the point of real-world payout, immutable transaction logging.

---

## 7. Technical Implementation

```sql
CREATE TABLE real_world_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  provider_tx_id TEXT UNIQUE NOT NULL,
  amount_bwp DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE player_wallets (
  player_id UUID PRIMARY KEY REFERENCES auth.users(id),
  pula_balance INT NOT NULL DEFAULT 0,
  botho_points INT NOT NULL DEFAULT 0,  -- mirrors/IS the Kgotla community-standing score, not a duplicate counter
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Payment Gateway Service (idempotent on `provider_tx_id`), Economy Service (pure functions for price/fee/buff calculation), and cron workers for subscription expiry and monthly prize calculation — unchanged from the original architecture.

---

## 8. Financial Model

Every number below is a worked illustration built on stated assumptions, not a forecast. The assumptions (conversion rate, payer segmentation, retention) are the first things to replace with real soft-launch data — the formulas are the reusable part.

### 8.1 Crafting Unit Economics (post-fix)

| Recipe | Input Cost | Fee | Total Cost | Sale Value | Margin after 5% tax |
|---|---|---|---|---|---|
| Poleto (Plank) | P4 (2×Wood) | P1 | P5 | P7 | +P1.65 (33%) |
| Thapo (Rope) | P12 (3×Palm Fiber) | P1 | P13 | P18 | +P4.10 (32%) |
| Setena (Brick) | P6 (2×Clay) | P2 | P8 | P11 | +P2.45 (31%) |
| Bupi (Flour) | P12 (3×crop) | P2 | P14 | P20 | +P5.00 (36%) |
| Borotho (Bread) | P40 (2×Bupi) | P3 | P43 | P60 | +P14.00 (33%) |

Every recipe now clears roughly a third over its true cost — consistent, positive, and enough to matter without trivializing the crafting fee's role as a currency sink.

### 8.2 Monetization Unit Economics

Assuming a ~3% mobile money gateway fee (Section 6):

| Flow | Player Pays | Net to Molemisi | Margin |
|---|---|---|---|
| Starter Pack | P5 | P4.85 | 97% |
| Farmer Pack | P50 | P48.50 | 97% |
| Harvest Pack | P100 | P97.00 | 97% (grants P105 value — the +5 bonus costs nothing to grant) |
| Cattle Pack | P250 | P242.50 | 97% |
| Export Pack | P500 | P485.00 | 97% |
| Guild Subscription | P49/mo | P47.53/mo | 97% |

The weekly Pula Stone gift to subscribers isn't a cash cost — it's foregone revenue from a P20 item Molemisi could otherwise have sold that subscriber; it doesn't reduce the P47.53 net figure above, it reduces how much *additional* boost revenue that subscriber is likely to generate elsewhere. Worth tracking separately once there's real data, not netted into the headline margin.

### 8.3 Illustrative Revenue Model — 10,000 Monthly Active Users

Assumption: 3% of MAU make any purchase in a given month (a middle estimate within the typical 2–5% range for casual mobile games; Molemisi's P5 entry point should help toward the higher end of that, but this needs validating against real cohort data before it drives any spending decision).

| Segment | % of Payers | Players | Avg Monthly Spend | Segment Revenue |
|---|---|---|---|---|
| One-time small buyers | 70% | 210 | P60 | P12,600 |
| Guild subscribers | 20% | 60 | P49 | P2,940 |
| Mid spenders | 8% | 24 | P150 | P3,600 |
| High spenders | 2% | 6 | P600 | P3,600 |
| **Total payers** | **100%** | **300** | — | **P22,740** |

- **Blended ARPU** (all 10,000 MAU): P2.27/user/month
- **ARPPU** (payers only): P75.80/payer/month
- **Net after ~3% gateway fee:** ≈ P22,058/month
- **Net after the Monthly Community Prize** (Section 8.5): ≈ P21,708/month at this scale

### 8.4 LTV and Sustainable Acquisition Cost

Using an illustrative average retained-active lifetime of 5 months (blended) and 7 months (payers, who tend to stick around longer than non-payers — again, an assumption to replace with real retention curves):

- **Blended LTV per install:** P2.27 × 5 ≈ **P11.35**
- **Payer LTV:** P75.80 × 7 ≈ **P530.60**

At a common 3:1 LTV:CAC target ratio, sustainable blended acquisition spend is roughly **P3.78 per install**. That's low enough that organic growth, word-of-mouth, and community/Kgotla-driven virality should be the primary growth engine before any paid user-acquisition budget is committed — paid UA only makes sense once real conversion and retention numbers are in hand to confirm the ratio holds.

### 8.5 Funding the Monthly Community Prize — a formula, not a fixed number

Recommended: `pool = clamp(10% × trailing-month Guild subscription revenue, floor = P350, ceiling = P1,500)`

At the illustrative scale above (P2,940 in monthly subscription revenue), 10% is P294 — below the P350 floor, so the floor governs and the pool stays at P350. The floor stops mattering once subscription revenue passes **P3,500/month**, which happens at roughly **72 subscribers** (P3,500 ÷ P49). Past that point, the prize scales with the business instead of staying fixed while everything around it grows — which also keeps it framed, in the plainest possible terms, as funded by and subordinate to a genuine separate transaction (the subscription), which is exactly the framing that keeps this a loyalty program rather than something requiring gambling-style scrutiny.

- **Prize cost as % of total revenue** at the illustrative scale: P350 ÷ P22,740 ≈ **1.5%**
- **Prize cost as % of subscription revenue specifically:** P350 ÷ P2,940 ≈ **11.9%**

### 8.6 Break-Even Framing

`Required MAU = (Fixed Monthly Costs + Target Profit) ÷ Net ARPU`

At this model's Net ARPU (≈P2.17/user/month after fees and the prize pool), covering an illustrative P50,000/month cost base (a placeholder — substitute the team's actual hosting, tooling, and payroll figure) requires roughly **23,000 MAU**. This formula is the useful part; P50,000 is not a claim about Molemisi's actual costs.

### 8.7 What Moves This Model Most

In order of leverage, based on the structure above rather than intuition:

1. **Conversion rate** — the swing from 2% to 5% of MAU converting is a 2.5× revenue difference with everything else held constant. This is the single most valuable number to get real data on first.
2. **High-spender segment size** — 2% of payers currently account for ≈16% of revenue (P3,600 of P22,740); a small shift in whale behavior moves total revenue more than a similar shift anywhere else in the funnel.
3. **Retention/LTV** — determines both the sustainable acquisition budget (8.4) and whether the giveaway formula's floor-to-percentage crossover (8.5) is ever reached.

None of these should be locked in before a soft launch produces real numbers to replace the assumptions in 8.3–8.4 — the model is built so that replacing those inputs doesn't require rebuilding the formulas around them.
