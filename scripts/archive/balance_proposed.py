"""Proposed crop retune - checks the 24h cliff fix, dominance, and season interaction."""
import math

TAX, WATER_PRICE, TANK = 0.05, 0.50, 60

# name, seed, base, yield_min, yield_max, growth_h, water_per_h
PROPOSED = [
    ("Sorghum",    2,  4, 3, 5, 18, 0.05),
    ("Maize",      2,  4, 4, 6, 22, 0.20),
    ("Millet",     2,  5, 3, 5, 16, 0.06),
    ("Cowpeas",    3,  7, 3, 5, 20, 0.10),
    ("Tomatoes",   5, 10, 3, 5, 24, 0.26),
    ("Watermelon", 6, 12, 3, 5, 44, 0.30),
    ("Groundnuts", 8, 14, 4, 6, 40, 0.10),
    ("Sesame",    10, 20, 2, 4, 46, 0.12),
    ("Pepper",    12, 24, 3, 5, 44, 0.18),
    ("Herbs",     16, 34, 2, 4, 48, 0.14),
    ("Morula",    28, 60, 2, 3, 48, 0.04),
]

CHAPTERS = {
    "Pula (Nov-Jan, rains)":     ["Sorghum", "Maize", "Tomatoes", "Cowpeas", "Groundnuts", "Millet"],
    "Phane (Feb-Apr, late rain)": ["Maize", "Watermelon", "Tomatoes", "Groundnuts", "Sesame", "Pepper"],
    "Moriti (May-Jul, dry)":     ["Sorghum", "Millet", "Cowpeas", "Sesame", "Herbs", "Morula"],
    "Letlhafula (Aug-Oct, wind)": ["Millet", "Sorghum", "Watermelon", "Pepper", "Herbs", "Morula"],
}
# rain frequency by chapter -> how much of the water bill the player actually pays
RAIN_COVER = {"Pula (Nov-Jan, rains)": 0.80, "Phane (Feb-Apr, late rain)": 0.50,
              "Moriti (May-Jul, dry)": 0.05, "Letlhafula (Aug-Oct, wind)": 0.15}


def hpd(growth, visit=24.0):
    return 1.0 if growth <= visit else 1.0 / math.ceil(growth / visit)


def row(c):
    name, seed, base, ymin, ymax, growth, water = c
    avg = (ymin + ymax) / 2
    gross = avg * base
    net_h = gross * (1 - TAX) - seed
    h = hpd(growth)
    wu = water * growth * h                     # water units/day/plot
    wc = wu * WATER_PRICE
    return dict(name=name, seed=seed, base=base, growth=growth, avg=avg, h=h,
                net_h=net_h, net_day=net_h * h, wu=wu, wc=wc,
                true_day=net_h * h - wc)


def main():
    rows = [row(c) for c in PROPOSED]

    print("=" * 112)
    print("PROPOSED CROP TABLE  (daily check-in, 5% tax, water P0.50/unit)")
    print("=" * 112)
    print(f"{'Crop':<11}{'Seed':>5}{'Base':>5}{'Grow':>6}{'Cad':>5}{'Yield':>7}"
          f"{'Net/harv':>10}{'Net/day':>9}{'Water':>8}{'W.P':>6}{'TRUE/day':>10}{'%water':>8}")
    for r in sorted(rows, key=lambda r: r["true_day"]):
        cad = "1d" if r["h"] == 1.0 else "2d"
        print(f"{r['name']:<11}{r['seed']:>5}{r['base']:>5}{r['growth']:>5}h{cad:>5}"
              f"{r['avg']:>7.1f}{r['net_h']:>10.2f}{r['net_day']:>9.2f}"
              f"{r['wu']:>8.2f}{'P'+format(r['wc'],'.2f'):>6}{r['true_day']:>10.2f}"
              f"{r['wc']/r['net_day']*100:>7.0f}%")

    best = max(r["true_day"] for r in rows)
    worst = min(r["true_day"] for r in rows)
    print(f"\n  Spread: {best/worst:.1f}x (was 8.0x)   "
          f"Best {max(rows,key=lambda r:r['true_day'])['name']}, "
          f"worst {min(rows,key=lambda r:r['true_day'])['name']}")

    print("\n  Dominance check (is any crop worse than another on EVERY axis?):")
    dom = []
    for a in rows:
        for b in rows:
            if a is b:
                continue
            if (b["true_day"] >= a["true_day"] and b["seed"] <= a["seed"]
                    and b["growth"] <= a["growth"] and b["wu"] <= a["wu"]):
                dom.append((a["name"], b["name"]))
    if dom:
        for a, b in dom:
            print(f"    !! {a} is dominated by {b}")
    else:
        print("    None fully dominated - every crop wins on at least one axis.")

    print()
    print("=" * 112)
    print("SEASON INTERACTION  (water bill changes with rain cover; tank holds 60 units)")
    print("=" * 112)
    for ch, seeds in CHAPTERS.items():
        cover = RAIN_COVER[ch]
        print(f"\n  {ch}   rain covers {cover*100:.0f}% of water")
        sub = [r for r in rows if r["name"] in seeds]
        print(f"    {'Crop':<12}{'net/day':>9}{'water cost':>12}{'TRUE/day':>10}"
              f"{'20 plots TRUE':>15}{'tank days @20':>15}")
        for r in sorted(sub, key=lambda r: -(r["net_day"] - r["wc"] * (1 - cover))):
            wc = r["wc"] * (1 - cover)
            td = r["net_day"] - wc
            tank_days = TANK / (r["wu"] * (1 - cover) * 20) if r["wu"] > 0 else 999
            print(f"    {r['name']:<12}{r['net_day']:>9.2f}{wc:>12.2f}{td:>10.2f}"
                  f"{td*20:>15.0f}{tank_days:>15.1f}")

    print()
    print("=" * 112)
    print("BEST PER SEASON  (does the calendar force rotation?)")
    print("=" * 112)
    for ch, seeds in CHAPTERS.items():
        cover = RAIN_COVER[ch]
        sub = [r for r in rows if r["name"] in seeds]
        best = max(sub, key=lambda r: r["net_day"] - r["wc"] * (1 - cover))
        worst = min(sub, key=lambda r: r["net_day"] - r["wc"] * (1 - cover))
        print(f"  {ch:<30} best: {best['name']:<11} P{best['net_day']-best['wc']*(1-cover):>6.2f}/plot/day"
              f"   worst: {worst['name']:<11} P{worst['net_day']-worst['wc']*(1-cover):>6.2f}")

    print()
    print("=" * 112)
    print("FARM INCOME & LAND PAYBACK (best available crop per season, 20 plots)")
    print("=" * 112)
    for plots in (4, 8, 12, 20):
        pass
    for lo, hi, cost in ((4, 8, 800), (8, 12, 3000), (12, 20, 12000)):
        n = hi - lo
        # median crop net/day across all seasons
        vals = [r["net_day"] - r["wc"] * (1 - RAIN_COVER[ch])
                for ch, seeds in CHAPTERS.items() for r in rows if r["name"] in seeds]
        med = sorted(vals)[len(vals) // 2]
        print(f"  {lo}->{hi} plots P{cost:>6,}  P{cost/n:>6.0f}/plot  "
              f"payback @median crop {cost/n/med:>5.1f}d   "
              f"@best {cost/n/max(vals):>5.1f}d   @worst {cost/n/min(vals):>5.1f}d")
    print(f"\n  Total to max P{sum(c for _,_,c in ((4,8,800),(8,12,3000),(12,20,12000))):,}")
    medv = sorted([r["net_day"] - r["wc"]*(1-RAIN_COVER[ch]) for ch,s in CHAPTERS.items()
                   for r in rows if r["name"] in s])[len([r for ch,s in CHAPTERS.items() for r in rows if r["name"] in s])//2]
    print(f"  Median 16-plot income delta P{medv*16:.0f}/day -> ladder payback {15800/(medv*16):.0f} days")

    print()
    print("=" * 112)
    print("CRAFTING WITH CORRECTED (opportunity-cost) INPUT VALUATION")
    print("=" * 112)
    R = [("Poleto", "2x Wood", 2, 2, 1, 7), ("Thapo", "3x Palm", 4, 3, 1, 18),
         ("Setena", "2x Clay / clay+stone", 3, 2, 2, 11),
         ("Bupi", "3x Sorghum/Maize", 4, 3, 2, 20), ("Borotho", "2x Bupi", 20, 2, 3, 60)]
    print(f"{'Recipe':<9}{'Inputs':<22}{'In(opp)':>9}{'Fee':>5}{'Total':>7}{'Sale':>6}"
          f"{'Net':>7}{'Profit':>8}{'ROI':>7}")
    for n, i, base, qty, fee, sale in R:
        opp = base * 0.95 * qty
        tot = opp + fee
        net = sale * 0.95
        p = net - tot
        print(f"{n:<9}{i:<22}{opp:>9.2f}{fee:>5}{tot:>7.2f}{sale:>6}{net:>7.2f}{p:>8.2f}{p/tot*100:>6.1f}%")
    print("  <- this table closes horizontally (Total + Profit == Net)")


if __name__ == "__main__":
    main()
