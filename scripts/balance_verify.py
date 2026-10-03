"""
balance_verify.py — verify the crop table AS WRITTEN in docs/MVP/02_Economy_And_Currencies.md (6.1).

Purpose: the doc and the tuning model must never disagree. This script reads the doc's
own numbers, runs the full analysis, and asserts the claims the doc makes about them.

If this script fails, the doc is wrong. Fix the doc, not the script.

Sections 7 and 8 were added 2026-09-11 to close two blind spots:
  7. Crafting — this script modelled NO crafting at all, which is how a 6x batch
     duplication bug shipped past it (a batch of 6 cost 1x materials).
  8. The Bushveld — the comparative half of the P10 gate (05 §P10): does gathering
     stay a supplement to the Farm, or does it out-earn the fields (04 §1)?
"""

TAX = 0.05
WATER_UNIT = 1.00
TANK = 60
REFILL = 60

# name, setswana, seed, base, yield_lo, yield_hi, growth_h, water_per_hour, thirst
CROPS = [
    ("Sorghum",    "Mabele",            2,  3, 4, 6, 18, 0.04, 1),
    ("Millet",     "Lebelebele",        2,  4, 3, 5, 16, 0.06, 1),
    ("Maize",      "Mmidi",             3,  5, 4, 6, 22, 0.20, 3),
    ("Cowpeas",    "Dinawa",            3,  6, 3, 5, 20, 0.10, 2),
    ("Tomatoes",   "Tamati",            5, 10, 2, 4, 24, 0.26, 3),
    ("Watermelon", "Legapu",            6, 11, 4, 6, 44, 0.30, 3),
    ("Groundnuts", "Manoko",            8, 11, 4, 6, 40, 0.10, 2),
    ("Sesame",     "Sesame",           10, 15, 3, 5, 46, 0.12, 1),
    ("Pepper",     "Pepere",           12, 17, 3, 5, 44, 0.18, 2),
    ("Herbs",      "Ditlhare tsa Setso",16, 25, 2, 4, 48, 0.14, 2),
    ("Morula",     "Morula",           28, 46, 2, 3, 48, 0.04, 1),
]

# chapter -> (name, seeds stocked, rain coverage)
CHAPTERS = [
    ("Pula (Nov-Jan, rains)",     ["Sorghum","Maize","Tomatoes","Cowpeas","Groundnuts","Millet"], 0.80),
    ("Phane (Feb-Apr, late rain)",["Maize","Watermelon","Tomatoes","Groundnuts","Sesame","Pepper"], 0.50),
    ("Moriti (May-Jul, dry)",     ["Sorghum","Millet","Cowpeas","Sesame","Herbs","Morula"], 0.05),
    ("Letlhafula (Aug-Oct, wind)",["Millet","Sorghum","Watermelon","Pepper","Herbs","Morula"], 0.15),
]

W = 100
def rule(t):
    print("\n" + "=" * W); print(t); print("=" * W)

def metrics(c):
    _, _, seed, base, ylo, yhi, grow, wph, thirst = c
    avg = (ylo + yhi) / 2
    days = 1 if grow <= 24 else 2
    gross = base * avg
    net_h = gross * (1 - TAX) - seed          # tax on gross, seed is a cost
    net_d = net_h / days
    w_day = wph * 24
    return dict(avg=avg, days=days, gross=gross, net_h=net_h, net_d=net_d,
                w_day=w_day, seed=seed, grow=grow, thirst=thirst)

M = {c[0]: metrics(c) for c in CROPS}
BY = {c[0]: c for c in CROPS}

# ---------------------------------------------------------------- 1. table
rule("1. CROP TABLE AS SPECIFIED  (5% tax, water P1.00/unit, tank 60)")
print(f"{'Crop':<11}{'Seed':>6}{'Base':>6}{'Yield':>8}{'Grow':>7}{'Cad':>5}{'H2O/d':>8}"
      f"{'Net/harv':>10}{'Net/day':>9}{'TRUE/d':>9}")
for c in sorted(CROPS, key=lambda x: M[x[0]]['net_d']):
    m = M[c[0]]
    print(f"{c[0]:<11}{c[2]:>6}{c[3]:>6}{f'{c[4]}-{c[5]}':>8}{c[6]:>5}h{m['days']:>5}d"
          f"{m['w_day']:>8.2f}{m['net_h']:>10.2f}{m['net_d']:>9.2f}"
          f"{m['net_d'] - m['w_day']*WATER_UNIT:>9.2f}")

spread = max(m['net_d'] for m in M.values()) / min(m['net_d'] for m in M.values())
lo = min(M, key=lambda k: M[k]['net_d']); hi = max(M, key=lambda k: M[k]['net_d'])
print(f"\n  Spread: {spread:.2f}x   ({M[lo]['net_d']:.2f} {lo} -> {M[hi]['net_d']:.2f} {hi})")

# ---------------------------------------------------------------- 2. dead zone
rule("2. THE 24-40h DEAD ZONE")
bad = [c[0] for c in CROPS if 24 < c[6] < 40]
c1 = [c[0] for c in CROPS if c[6] <= 24]
c2 = [c[0] for c in CROPS if c[6] >= 40]
print(f"  1-day crops (<=24h): {len(c1)}  {', '.join(c1)}")
print(f"  2-day crops (>=40h): {len(c2)}  {', '.join(c2)}")
print(f"  IN THE DEAD ZONE:    {len(bad)}  {', '.join(bad) if bad else 'none'}")
assert not bad, f"F1 REGRESSION: {bad} sit in the 24-40h dead zone"
assert min(c[6] for c in CROPS) >= 12, "no crop may mature under 12h"
print("  -> PASS: every crop is explicitly 1-day or 2-day")

# ---------------------------------------------------------------- 3. dominance
rule("3. WITHIN-SEASON DOMINANCE  (B dominates A if B earns more AND costs no more seed)")
total_dom = 0
best_per_chapter = []
for name, stock, rain in CHAPTERS:
    rows = []
    for cn in stock:
        m = M[cn]
        true_d = m['net_d'] - m['w_day'] * (1 - rain) * WATER_UNIT
        rows.append((cn, m['seed'], m['days'], m['thirst'], true_d, m['grow'], m['w_day']))
    rows.sort(key=lambda r: -r[4])
    print(f"\n  {name}   (rain covers {rain:.0%} of water)")
    for cn, seed, days, thirst, td, _, _ in rows:
        print(f"    {cn:<12} seed P{seed:<3} {days}d  {'*'*thirst:<3}  "
              f"P{td:>7.2f}/plot/day   P{td*20:>8.0f} @20 plots")
    # Pareto dominance: B must beat A on earnings AND be no worse on seed, time AND water.
    for a in rows:
        for b in rows:
            if a[0] == b[0]:
                continue
            if (b[4] >= a[4] and b[1] <= a[1] and b[5] <= a[5] and b[6] <= a[6]):
                print(f"    !! {a[0]} dominated by {b[0]}")
                total_dom += 1
                break
    best_per_chapter.append(rows[0][0])
print(f"\n  Total within-season dominances: {total_dom}")
print(f"  Best crop rotates: {' -> '.join(best_per_chapter)}")

# ---------------------------------------------------------------- 4. water
rule("4. WATER PRESSURE  (tank 60; days a full tank lasts at 20 plots)")
print(f"{'Crop':<12}{'units/d/plot':>14}{'20 plots/d':>12}{'tank days':>11}"
      f"{'P/day wet':>11}{'P/day dry':>11}")
for c in sorted(CROPS, key=lambda x: -M[x[0]]['w_day']):
    m = M[c[0]]
    per20 = m['w_day'] * 20
    print(f"{c[0]:<12}{m['w_day']:>14.2f}{per20:>12.1f}{TANK/per20:>11.2f}"
          f"{m['w_day']*20*0.20*WATER_UNIT:>11.2f}{m['w_day']*20*0.95*WATER_UNIT:>11.2f}")
worst = max(CROPS, key=lambda c: M[c[0]]['w_day'])
best = min(CROPS, key=lambda c: M[c[0]]['w_day'])
print(f"\n  Thirstiest {worst[0]}: full tank lasts {TANK/(M[worst[0]]['w_day']*20):.2f}d at 20 plots "
      f"-> {1/(TANK/(M[worst[0]]['w_day']*20)):.1f} refills/day")
print(f"  Thriftiest {best[0]}: full tank lasts {TANK/(M[best[0]]['w_day']*20):.2f}d at 20 plots "
      f"-> {1/(TANK/(M[best[0]]['w_day']*20)):.2f} refills/day")
ratio = M[worst[0]]['w_day'] / M[best[0]]['w_day']
print(f"  Thirst spread: {ratio:.1f}x  (needs to be wide enough to be a real decision)")
assert ratio >= 4, "F5 REGRESSION: water spread too narrow to matter"

# ---------------------------------------------------------------- 5. land
rule("5. INCOME & LAND PAYBACK")
LAND = [(4, 8, 1200), (8, 12, 6000), (12, 20, 30000)]
season_true = []
for _, stock, rain in CHAPTERS:
    for cn in stock:
        m = M[cn]
        season_true.append(m['net_d'] - m['w_day'] * (1 - rain) * WATER_UNIT)
season_true.sort()
med = season_true[len(season_true) // 2]
lo_v, hi_v = season_true[0], season_true[-1]
print(f"  Median crop across all seasons: P{med:.2f}/plot/day")
print(f"  Range: P{lo_v:.2f} (worst) .. P{hi_v:.2f} (best)\n")
for a, b, cost in LAND:
    n = b - a
    print(f"  {a:>2}->{b:<3} P{cost:>6,}  P{cost/n:>6.0f}/plot   payback "
          f"{cost/(n*med):>6.1f}d median | {cost/(n*hi_v):>6.1f}d best | {cost/(n*lo_v):>6.1f}d worst")
total = sum(c for _, _, c in LAND)
inc = 16 * med
print(f"\n  Total to max: P{total:,}")
print(f"  16 extra plots at median P{inc:.0f}/day -> ladder payback {total/inc:.0f} days")
print(f"  16 extra plots at best   P{16*hi_v:.0f}/day -> {total/(16*hi_v):.0f} days")
print(f"  16 extra plots at worst  P{16*lo_v:.0f}/day -> {total/(16*lo_v):.0f} days")

# ---------------------------------------------------------------- 6. sinks
rule("6. MONTHLY PULA ACCUMULATION  (is there anywhere for it to go?)")
for plots in (4, 8, 12, 20):
    gross = plots * med
    seeds = plots * 3
    water = plots * M['Cowpeas']['w_day'] * 0.6 * WATER_UNIT
    maint = 0 if plots < 8 else (15 if plots < 20 else 25)
    net = gross - seeds - water - maint
    print(f"  {plots:>2} plots: +P{gross:>6.0f}/d  -seeds P{seeds:>3}  -water P{water:>5.0f}  "
          f"-maint P{maint:>3}  =  +P{net:>5.0f}/day  ->  P{net*30:>7,.0f}/month unspent")
print("\n  Unbounded sinks required: cosmetics (priced), Letsema fund, seasonal maintenance.")

# ---------------------------------------------------------------- 7. crafting
rule("7. CRAFTING MARGINS  (02 §6.3 — every row must close horizontally)")
# name, [(item, qty, base_value)], fee, sale, timer_minutes
CRAFTING = [
    ("Poleto (Plank)",  [("wood", 2, 2)],        1,  7, 120),
    ("Thapo (Rope)",    [("palm_fiber", 3, 4)],  1, 18, 120),
    ("Setena (Brick)",  [("clay", 2, 3)],        2, 11, 180),  # any 2 of clay/stone
    ("Bupi (Flour)",    [("sorghum", 4, 3)],     2, 20, 240),  # 4x sorghum or millet
    ("Borotho (Bread)", [("bupi", 2, 20)],       3, 60, 360),
]
print(f"{'Recipe':<17}{'Input@opp':>10}{'Fee':>5}{'Total':>7}{'Sale':>6}{'Net(5%)':>9}"
      f"{'Profit':>8}{'ROI':>7}{'Hrs':>5}")
for name, inputs, fee, sale, mins in CRAFTING:
    # Opportunity cost = what you'd NET from selling the input (base x 0.95) — the
    # real alternative, and the only basis on which "craft or sell?" is honest (F4).
    input_opp = sum(q * base * 0.95 for _, q, base in inputs)
    ctotal = input_opp + fee
    cnet = sale * 0.95
    profit = cnet - ctotal
    roi = profit / ctotal * 100
    print(f"{name:<17}{input_opp:>10.2f}{fee:>5}{ctotal:>7.2f}{sale:>6}{cnet:>9.2f}"
          f"{profit:>8.2f}{roi:>6.1f}%{mins/60:>5.0f}")
    # The bug F4 fixed: the input column printed BASE while profit used OPPORTUNITY,
    # so the row did not add up. Now every row closes.
    assert abs((ctotal + profit) - cnet) < 0.005, f"{name}: row does not close horizontally"
    assert profit > 0, f"{name}: a recipe that loses money is a trap, not a choice"
assert all(mins >= 120 for *_, mins in CRAFTING), "F14 REGRESSION: a craft timer is under 2h"
print("\n  Every row closes (Total + Profit == Net) at opportunity cost, all profitable (F4).")

# ---------------------------------------------------------------- 8. bushveld
rule("8. BUSHVELD vs FARM  (04 §1 — the bush must never out-earn the fields)")
# Kagiso: max 6 per scene, +1 per 4h -> 6/day per scene. FOUR scenes ship in v1
# (04 §5): open_bush, riverbank, rocky_outcrop and deep_bushveld. Deep Bushveld
# shipped hotspots in batch 2 (G5, 2026-09-23) — `SCENES` in bushveld.ts has four
# entries and `DEEP_BUSHVELD_HOTSPOTS` carries four. This script modelled only 3,
# so it has been UNDERSTATING Bushveld income by exactly the deep scene.
SCENE_COUNT = 4
PIPS_PER_SCENE = 6
# Only hotspots carrying a saleable ITEM can produce Pula. Of the 23 v1 hotspots
# only 7 do — the rest are journal Discoveries, which never enter inventory (R3,
# 04 §6). The best COST-1 material tap per scene:
#   open_bush  ob_deadfall   -> wood       P2   qty 2-4 -> avg 3
#   riverbank  rv_palm       -> palm_fiber P4   qty 2-4 -> avg 3   (best cost-1)
#   rocky      ro_glint      -> stone      P3   qty 2-4 -> avg 3
#   deep       db_heartwood  -> hardwood   P8   qty 1-3 -> avg 2   (G5, 04 §5)
# The remaining material hotspots are cost-1 too but strictly worse per pip
# (rv_driftwood wood P2, rv_clay P3, rv_reeds P3, db_kopje P3), and
# ob_setlhare_sa_phane costs 2 and is seasonal (Apr/Dec only), so none of them
# beats the row above. `db_spoor` costs 2 and is Discovery-only.
#
# The yield averages are per-tap and DIFFER between scenes: hardwood drops 1-3
# (avg 2) where every other material drops 2-4 (avg 3). Using one global AVG_QTY
# would overstate the deep scene by 50% (6x3xP8 = P144 instead of P96).
BEST_MATERIAL_PER_SCENE = [
    ("open_bush",     "ob_deadfall",  "wood",       2, 3),
    ("riverbank",     "rv_palm",      "palm_fiber", 4, 3),
    ("rocky_outcrop", "ro_glint",     "stone",      3, 3),
    ("deep_bushveld", "db_heartwood", "hardwood",   8, 2),
]
BAND_LO, BAND_HI = 0.5, 2.0   # 02 §4.1: raw/foraged goods drift 0.5x-2.0x base

bush_gross = sum(PIPS_PER_SCENE * qty * value for _, _, _, value, qty in BEST_MATERIAL_PER_SCENE)
bush_base = bush_gross * (1 - TAX)
# The three always-open scenes, kept so the report shows the change rather than
# replacing the old figure: Deep Bushveld is gated at Botho 300 (04 §5), so a
# sub-Botho-300 player genuinely cannot earn it.
ALWAYS_OPEN = 3
three_gross = sum(
    PIPS_PER_SCENE * qty * value
    for _, _, _, value, qty in BEST_MATERIAL_PER_SCENE[:ALWAYS_OPEN]
)
three_base = three_gross * (1 - TAX)

print(f"  Kagiso ceiling: {PIPS_PER_SCENE} pips/scene x {SCENE_COUNT} scenes = "
      f"{PIPS_PER_SCENE * SCENE_COUNT} pips/day")
print(f"  Worst case for the invariant: every pip spent on a cost-1 material tap")
for scene, hotspot, item, value, qty in BEST_MATERIAL_PER_SCENE:
    u = PIPS_PER_SCENE * qty
    print(f"    {scene:<14} {hotspot:<14} {PIPS_PER_SCENE} taps x {qty} = {u:>2} {item:<11} "
          f"@ P{value} = P{u * value:>4}")
print(f"\n  Bushveld gross/day            P{bush_gross:>7.2f}   (all {SCENE_COUNT} scenes)")
print(f"    x band floor ({BAND_LO}x)         P{bush_gross*BAND_LO*(1-TAX):>7.2f}")
print(f"    x base (1.0x)              P{bush_base:>7.2f}")
print(f"    x band ceiling ({BAND_HI}x)      P{bush_gross*BAND_HI*(1-TAX):>7.2f}")
print(f"    (was P{three_base:.2f} on 3 scenes; Deep Bushveld adds "
      f"P{bush_base - three_base:.2f}/day, Botho 300-gated)")

starter = M['Sorghum']['net_d']   # 02 §6.8's "starter crops (sorghum/millet)" basis
print(f"\n  {'Farm':<10}{'starter P/d':>13}{'Bush/Farm':>11}   {'median P/d':>11}{'Bush/Farm':>11}")
inversion = []
for plots in (4, 8, 12, 20):
    f_starter = plots * starter
    f_med = plots * med
    r_starter = bush_base / f_starter
    r_med = bush_base / f_med
    if r_starter > 1.0:
        inversion.append(plots)
    print(f"  {plots:>2} plots{'':<2}{f_starter:>13.2f}{r_starter:>10.2f}x"
          f"{f_med:>13.2f}{r_med:>10.2f}x")

# The same table on the three always-open scenes, so the Deep Bushveld effect is
# visible as a delta rather than asserted. Before batch 2 this was the whole
# model, and every figure quoted in 04 §1 / KNOWN_LIMITATIONS was the 3-scene one.
print(f"\n  Sub-Botho-300 player (3 always-open scenes only, P{three_base:.2f}/day):")
inv3 = []
for plots in (4, 8, 12, 20):
    r_starter = three_base / (plots * starter)
    r_med = three_base / (plots * med)
    if r_starter > 1.0:
        inv3.append(plots)
    print(f"  {plots:>2} plots{'':<2}{plots * starter:>13.2f}{r_starter:>10.2f}x"
          f"{plots * med:>13.2f}{r_med:>10.2f}x")

if inversion:
    print(f"\n  !! 04 §1 COMPARATIVE INVARIANT — ACCEPTED STATE (ruled 2026-09-11):")
    print(f"     at {', '.join(str(p) for p in inversion)} plots a material-maximising player")
    print(f"     earns more from the Bushveld (P{bush_base:.0f}/day) than from the fields "
          f"(P{min(inversion) * starter:.0f}/day).")
    print(f"     NOT ASSERTED — the model assumes a twice-daily, material-maximising player")
    print(f"     spending the full Kagiso budget on the single best material per scene.")
    print(f"     Princess Eugenia ruled that LIVE INCOME TELEMETRY answers this post-launch,")
    print(f"     not the model, so the inversion is recorded rather than outstanding.")
    print(f"     If live data shows gathering is the optimal route, fix the economy spec")
    print(f"     (Kagiso regen / tap cost / material value / farm income), never this script.")
    print(f"     See 04 §1, 05 §P10, and docs/KNOWN_LIMITATIONS.md.")
    if set(inversion) != set(inv3):
        gained = [p for p in inversion if p not in inv3]
        print(f"\n  !! SCENE-COUNT CORRECTION (this run): modelling all {SCENE_COUNT} scenes WIDENS")
        print(f"     the inversion. It now covers {', '.join(str(p) for p in inversion)} plots;")
        print(f"     the old 3-scene model covered {', '.join(str(p) for p in inv3)}.")
        if gained:
            print(f"     Newly inverted: {', '.join(str(p) for p in gained)} plot(s) — a player at")
            print(f"     that size used to break even on the fields and now does not.")
        print(f"     Bushveld base P{three_base:.2f} -> P{bush_base:.2f} "
              f"(+{bush_base - three_base:.2f}/day, x{bush_base / three_base:.2f}).")
        print(f"     The Deep Bushveld scene is Botho 300-gated, so this is the post-ladder")
        print(f"     figure; the sub-300 table above is the launch figure.")
else:
    print("\n  -> PASS: the Bushveld stays a supplement at every farm size modelled.")

# ---------------------------------------------------------------- verdict
rule("VERDICT")
print(f"  dead-zone violations : {len(bad)}        (must be 0)")
print(f"  dominance pairs      : {total_dom}        (target <= 3)")
print(f"  value spread         : {spread:.2f}x     (target 3-4x)")
print(f"  thirst spread        : {ratio:.1f}x      (target >= 4x)")
print(f"  best-crop rotation   : {' -> '.join(best_per_chapter)}")
print(f"  crafting             : 5 recipes, all close horizontally and profitable")
print(f"  bushveld supplement  : "
      f"{'SUPPLEMENT at every farm size' if not inversion else 'INVERSION at ' + ', '.join(str(p) for p in inversion) + ' plots — RULED: telemetry (P10 by data)'}"
      f"  [{SCENE_COUNT} scenes, P{bush_base:.2f}/day]")
ok = (not bad) and total_dom <= 3 and 3.0 <= spread <= 4.0 and ratio >= 4
print(f"\n  {'PASS — doc and model agree, and the model is sound' if ok else 'FAIL — see above'}")
if inversion:
    print(f"  (the Bushveld inversion is reported, not asserted — ruled 2026-09-11:")
    print(f"   live income telemetry answers it post-launch; see KNOWN_LIMITATIONS.md)")
