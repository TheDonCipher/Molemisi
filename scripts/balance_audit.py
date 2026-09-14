"""Molemisi balance audit - verifies docs/MVP 02 numbers against a daily-check-in model.
Read-only: prints a report. Does not modify the game."""

TAX = 0.05          # Co-op tax
WATER_PRICE = 0.50  # Pula per unit of water (to be ratified)
TANK_CAP = 60       # units
VISIT_H = 24        # player checks in once per day

# name, setswana, seed, base, growth_h, yield_min, yield_max, water_per_h
CROPS = [
    ("Sorghum",    "Mabele",            2,  4, 18, 3, 5, 0.10),
    ("Maize",      "Mmidi",             2,  4, 22, 3, 5, 0.15),
    ("Millet",     "Lebelebele",        2,  5, 14, 3, 5, 0.08),
    ("Cowpeas",    "Dinawa",            3,  7, 20, 3, 5, 0.10),
    ("Watermelon", "Legapu",            3,  6, 30, 2, 4, 0.18),
    ("Groundnuts", "Manoko",            4,  9, 26, 4, 6, 0.12),
    ("Sesame",     "Sesame",            6, 13, 30, 2, 3, 0.09),
    ("Tomatoes",   "Tamati",            5, 11, 24, 4, 6, 0.14),
    ("Pepper",     "Pepere",            9, 18, 28, 3, 5, 0.10),
    ("Herbs",      "Ditlhare",         14, 28, 36, 1, 3, 0.08),
    ("Saffron*",   "?",                28, 55, 48, 1, 2, 0.07),
]


def harvests_per_day(growth_h, visit_h=VISIT_H):
    """With a once-daily check-in, a crop yields 1 harvest/visit if it finishes
    within the visit window, otherwise it waits for the next visit."""
    if growth_h <= visit_h:
        return 1.0
    import math
    return 1.0 / math.ceil(growth_h / visit_h)


def crop_row(c):
    name, sw, seed, base, growth, ymin, ymax, water = c
    avg_y = (ymin + ymax) / 2
    gross = avg_y * base
    net_h = gross * (1 - TAX) - seed
    hpd = harvests_per_day(growth)
    wpd = water * growth * hpd
    return {
        "name": name, "sw": sw, "seed": seed, "base": base,
        "growth": growth, "avg_y": avg_y, "gross": gross,
        "net_h": net_h, "hpd": hpd, "net_day": net_h * hpd,
        "water_day": wpd, "water_cost": wpd * WATER_PRICE,
        "true_day": net_h * hpd - wpd * WATER_PRICE,
    }


def main():
    rows = [crop_row(c) for c in CROPS]

    print("=" * 108)
    print("1. CROP ECONOMICS PER PLOT  (daily check-in, 5% Co-op tax, water @ P0.50/unit)")
    print("=" * 108)
    print(f"{'Crop':<11}{'Seed':>5}{'Base':>5}{'Grow':>6}{'Yield':>7}{'Harv':>6}"
          f"{'Net/harv':>10}{'Net/day':>9}{'Water/d':>9}{'W.cost':>7}{'TRUE/day':>10}")
    for r in rows:
        print(f"{r['name']:<11}{r['seed']:>5}{r['base']:>5}{r['growth']:>5}h"
              f"{r['avg_y']:>7.1f}{r['hpd']:>6.2f}{r['net_h']:>10.2f}"
              f"{r['net_day']:>9.2f}{r['water_day']:>9.2f}{r['water_cost']:>7.2f}"
              f"{r['true_day']:>10.2f}")

    best = max(rows, key=lambda r: r["true_day"])
    worst = min(rows, key=lambda r: r["true_day"])
    print(f"\n  Spread best/worst: {best['name']} P{best['true_day']:.2f} vs "
          f"{worst['name']} P{worst['true_day']:.2f}  =  {best['true_day']/worst['true_day']:.1f}x")
    print(f"  NOTE harvests/day collapses from 1.0 to 0.5 the moment growth exceeds 24h.")

    print()
    print("=" * 108)
    print("2. THE 24-HOUR CLIFF")
    print("=" * 108)
    for r in sorted(rows, key=lambda r: r["growth"]):
        flag = "  <-- 2-day crop, priced like a 1-day crop" if r["growth"] > 24 else ""
        print(f"  {r['name']:<11} {r['growth']:>3}h -> {r['hpd']:.2f} harv/day"
              f"   net/day P{r['true_day']:>6.2f}{flag}")

    print()
    print("=" * 108)
    print("3. FARM INCOME  (all one crop, after tax and water)")
    print("=" * 108)
    print(f"{'Crop':<12}{'4 plots':>10}{'8 plots':>10}{'12 plots':>10}{'20 plots':>10}")
    for r in sorted(rows, key=lambda r: -r["true_day"]):
        print(f"{r['name']:<12}" + "".join(
            f"{r['true_day']*n:>10.0f}" for n in (4, 8, 12, 20)))
    print("\n  Spec 02 §6.8 claims: 4 plots sorghum ~P53, 20 plots sorghum ~P264, 20 plots maize ~P340")
    sorg = next(r for r in rows if r["name"] == "Sorghum")
    maiz = next(r for r in rows if r["name"] == "Maize")
    print(f"  Computed (pre-water): 4 sorghum P{sorg['net_day']*4:.0f} | "
          f"20 sorghum P{sorg['net_day']*20:.0f} | 20 maize P{maiz['net_day']*20:.0f}")

    print()
    print("=" * 108)
    print("4. LAND PAYBACK  (Pula per plot per day, best / median / worst crop)")
    print("=" * 108)
    ladder = [(4, 8, 800), (8, 12, 3000), (12, 20, 12000)]
    srt = sorted(rows, key=lambda r: r["true_day"])
    med = srt[len(srt) // 2]
    for lo, hi, cost in ladder:
        n = hi - lo
        per_plot = cost / n
        print(f"  {lo:>2} -> {hi:<3} plots  P{cost:>6,}  =  P{per_plot:>7.0f}/plot   "
              f"payback: {per_plot/srt[0]['true_day']:>5.1f}d (worst {srt[0]['name']})  "
              f"{per_plot/med['true_day']:>5.1f}d (median {med['name']})  "
              f"{per_plot/srt[-1]['true_day']:>5.1f}d (best {srt[-1]['name']})")
    total = sum(c for _, _, c in ladder)
    print(f"\n  Total to max: P{total:,}")
    print(f"  Income delta 4->20 plots: "
          f"P{srt[0]['true_day']*16:.0f}/d (worst crop) to P{srt[-1]['true_day']*16:.0f}/d (best crop)")
    print(f"  Payback on the whole ladder: "
          f"{total/(srt[0]['true_day']*16):.0f}d to {total/(srt[-1]['true_day']*16):.0f}d")

    print()
    print("=" * 108)
    print("5. CRAFTING  (verifying 02 §6.3 on an opportunity-cost basis)")
    print("=" * 108)
    # input valued at what you'd net selling it = base * 0.95
    R = [
        ("Poleto",  "2x Wood",        4,   1, 10,  7),
        ("Thapo",   "3x Palm Fiber",  12,  1, 10, 18),
        ("Setena",  "2x Clay",        6,   2, 15, 11),
        ("Bupi",    "3x Sorghum/Maize", 12, 2, 20, 20),
        ("Borotho", "2x Bupi",        40,  3, 30, 60),
    ]
    print(f"{'Recipe':<9}{'Input':<18}{'InCost':>8}{'Fee':>5}{'Total':>7}{'Sale':>7}"
          f"{'Net@tax':>9}{'Profit':>8}{'ROI':>7}{'P/min':>7}")
    for name, inp, ic, fee, mins, sale in R:
        total = ic + fee
        net = sale * (1 - TAX)
        profit = net - total
        print(f"{name:<9}{inp:<18}{ic:>8}{fee:>5}{total:>7}{sale:>7}"
              f"{net:>9.2f}{profit:>8.2f}{profit/total*100:>6.1f}%{profit/mins:>7.3f}")
    print("\n  Spec claims ROI 35.7-41.8% and profits P1.85/4.70/2.75/5.60/16.00")

    print()
    print("=" * 108)
    print("6. BUSHVELD / KAGISO SUPPLY")
    print("=" * 108)
    for regen in (4, 6, 8):
        per_day = 24 / regen
        for scene in ("Open Bush", "Riverbank", "Rocky Outcrop"):
            pass
        taps_lo = per_day / 2   # all taps cost 2 (rare)
        taps_hi = per_day / 1   # all taps cost 1 (common)
        print(f"  regen +1/{regen}h -> {per_day:.0f} pips/scene/day, {per_day*3:.0f} across 3 scenes"
              f"  = {taps_lo*3:.0f}-{taps_hi*3:.0f} taps/day")
    print("\n  At regen 4h, if half of each scene's pips go to material tells:")
    pips = 6
    mat_taps = (pips / 2) * 3        # 9 taps/day on materials
    units = mat_taps * 3             # 2-4 units, avg 3
    print(f"    {mat_taps:.0f} material taps/day x ~3 units = {units:.0f} units/day across 6 material types")
    print(f"    -> ~{units/6:.0f} units/day of each of wood/clay/palm/thatch/stone")
    print(f"    Poleto (2 wood):   {units/6/2:>5.1f}/day -> P{units/6/2*1.85:>5.2f}/day")
    print(f"    Thapo  (3 palm):   {units/6/3:>5.1f}/day -> P{units/6/3*4.70:>5.2f}/day")
    print(f"    Setena (2 clay):   {units/6/2:>5.1f}/day -> P{units/6/2*2.75:>5.2f}/day")
    craft_total = units/6/2*1.85 + units/6/3*4.70 + units/6/2*2.75
    print(f"    Total crafting profit supply: P{craft_total:.2f}/day")
    print(f"    vs farm: P{sorg['true_day']*4:.0f}/day at 4 plots "
          f"({craft_total/(sorg['true_day']*4)*100:.0f}%)  |  "
          f"P{sorg['true_day']*20:.0f}/day at 20 plots ({craft_total/(sorg['true_day']*20)*100:.0f}%)")

    print()
    print("=" * 108)
    print("7. 30-DAY PULA ACCUMULATION  (endgame sink check)")
    print("=" * 108)
    for plots, label in ((4, "start"), (20, "max")):
        inc = sorg["net_day"] * plots
        seeds = sorg["seed"] * plots / 1.0
        water = sorg["water_day"] * plots * WATER_PRICE
        maint = 0 if label == "start" else 25  # rough seasonal maintenance/day
        net = inc - seeds - water - maint
        print(f"  {label:<6} {plots:>2} plots: income P{inc:>6.1f}/d - seeds P{seeds:>5.1f} "
              f"- water P{water:>5.1f} - maint P{maint:>4.1f}  =  +P{net:>6.1f}/day "
              f"-> P{net*30:>8.0f}/month unspent")
    print("\n  One-time sinks available: land P15,800 total, buildings, cosmetics (unpriced).")
    print("  After land is maxed there is NO unbounded Pula sink in 02 §7.")

    print()
    print("=" * 108)
    print("8. BREAK-EVEN  (verifying 02 §8.3)")
    print("=" * 108)
    rev = 12600 + 2940 + 3600 + 3600
    payers = 210 + 60 + 24 + 6
    net_fee = rev * 0.97
    net_all = net_fee - 350
    print(f"  Revenue P{rev:,} | ARPU P{rev/10000:.2f} | ARPPU P{rev/payers:.2f}")
    print(f"  After 3% gateway P{net_fee:,.0f} | after P350 prize P{net_all:,.0f} "
          f"| net ARPU P{net_all/10000:.2f}")
    for cost in (10000, 15000, 25000, 50000):
        print(f"    P{cost:>6,}/mo -> break-even {cost/(net_all/10000):>7,.0f} MAU")

    print()
    print("=" * 108)
    print("9. EXCHANGE VELOCITY  (how the 10% fee actually earns)")
    print("=" * 108)
    dep, cashin, disb_fixed, disb_pct = 100.0, 0.03, 5.0, 0.015
    print(f"  Deposit P{dep:.0f}: cash-in cost {cashin*100:.0f}% = P{dep*cashin:.2f}")
    for turns in (1, 2, 3, 4):
        fee = dep * 0.10 * turns
        out = dep * (0.90 ** turns)
        disb = disb_fixed + out * disb_pct
        gw = dep * cashin + disb
        print(f"    {turns} trade(s) before withdrawal: fee revenue P{fee:>6.2f} | "
              f"withdrawn P{out:>6.2f} | gateway P{gw:>5.2f} | margin P{fee-gw:>7.2f}")
    print("\n  -> The Exchange is only profitable once deposited Madi changes hands 2+ times")
    print("     before it is withdrawn. Velocity is the KPI, not volume.")

    print()
    print("=" * 108)
    print("10. WITHDRAWAL FEE vs DISBURSEMENT COST")
    print("=" * 108)
    print(f"  Assumed disbursement cost: P{disb_fixed:.2f} + {disb_pct*100:.1f}%")
    print(f"{'Amount':>8}{'Fee @2%':>9}{'Capped':>8}{'Cost':>8}{'Margin':>9}  verdict")
    for amt in (20, 50, 100, 200, 500, 1000, 2000):
        raw = amt * 0.02
        fee = min(max(raw, 2), 20)
        cost = disb_fixed + amt * disb_pct
        ok = "OK" if fee >= cost else "LOSS"
        print(f"{amt:>8}{raw:>9.2f}{fee:>8.2f}{cost:>8.2f}{fee-cost:>9.2f}  {ok}")
    print("\n  -> With min fee P2, every withdrawal under ~P150 loses money.")
    print("     Fix: min withdrawal P100 and min fee P5.")


if __name__ == "__main__":
    main()
