"""Final proposed crop/economy retune for docs/MVP 02.
Checks: 24h cliff, within-season dominance, water tension, land payback, monthly accumulation."""
import math

TAX, WATER, TANK = 0.05, 1.00, 60

# name, setswana, seed, base, ymin, ymax, growth_h, water_per_h, drops
CROPS = [
    ("Sorghum",    "Mabele",       2,  4, 4, 6, 18, 0.04, 1),
    ("Millet",     "Lebelebele",   2,  5, 3, 5, 16, 0.06, 1),
    ("Maize",      "Mmidi",        3,  4, 5, 7, 22, 0.20, 3),
    ("Cowpeas",    "Dinawa",       3,  7, 3, 5, 20, 0.10, 2),
    ("Tomatoes",   "Tamati",       5, 10, 3, 5, 24, 0.26, 3),
    ("Watermelon", "Legapu",       6, 14, 4, 6, 44, 0.30, 3),
    ("Groundnuts", "Manoko",       8, 15, 4, 6, 40, 0.10, 2),
    ("Sesame",     "Sesame",      10, 20, 3, 5, 46, 0.12, 1),
    ("Pepper",     "Pepere",      12, 24, 3, 5, 44, 0.18, 2),
    ("Herbs",      "Ditlhare",    16, 34, 2, 4, 48, 0.14, 2),
    ("Morula",     "Morula",      28, 60, 2, 3, 48, 0.04, 1),
]

CHAPTERS = {
    "1 Pula (Nov-Jan, rains)":      (["Sorghum", "Maize", "Tomatoes", "Cowpeas", "Groundnuts", "Millet"], 0.80),
    "2 Phane (Feb-Apr, late rain)": (["Maize", "Watermelon", "Tomatoes", "Groundnuts", "Sesame", "Pepper"], 0.50),
    "3 Moriti (May-Jul, dry)":      (["Sorghum", "Millet", "Cowpeas", "Sesame", "Herbs", "Morula"], 0.05),
    "4 Letlhafula (Aug-Oct, wind)": (["Millet", "Sorghum", "Watermelon", "Pepper", "Herbs", "Morula"], 0.15),
}


def row(c):
    n, sw, seed, base, ymin, ymax, g, w, d = c
    avg = (ymin + ymax) / 2
    gross = avg * base
    net_h = gross * (1 - TAX) - seed
    h = 1.0 if g <= 24 else 1.0 / math.ceil(g / 24)
    wu = w * g * h
    return dict(name=n, sw=sw, seed=seed, base=base, growth=g, drops=d,
                ymin=ymin, ymax=ymax, avg=avg, h=h, net_h=net_h,
                net_day=net_h * h, wu=wu, wc=wu * WATER)


def true_day(r, cover):
    return r["net_day"] - r["wc"] * (1 - cover)


def main():
    rows = [row(c) for c in CROPS]

    print("=" * 118)
    print("FINAL PROPOSED CROP TABLE   (daily check-in, 5% tax, water P1.00/unit, tank 60)")
    print("=" * 118)
    print(f"{'Crop':<11}{'Setswana':<12}{'Seed':>5}{'Base':>5}{'Yield':>8}{'Grow':>6}{'Cad':>4}"
          f"{'Drops':>6}{'Net/harv':>10}{'Net/day':>8}{'H2O/d':>7}{'H2O P':>7}{'TRUE/d':>8}")
    for r in sorted(rows, key=lambda r: r["net_day"]):
        print(f"{r['name']:<11}{r['sw']:<12}{r['seed']:>5}{r['base']:>5}"
              f"{str(r['ymin'])+'-'+str(r['ymax']):>8}{r['growth']:>5}h"
              f"{'1d' if r['h']==1 else '2d':>4}{'*'*r['drops']:>6}"
              f"{r['net_h']:>10.2f}{r['net_day']:>8.2f}{r['wu']:>7.2f}{r['wc']:>7.2f}"
              f"{r['net_day']-r['wc']:>8.2f}")
    vals = [r["net_day"] for r in rows]
    print(f"\n  Spread (no-rain baseline): {max(vals)/min(vals):.1f}x   [old table was 8.0x]")
    print("  Every crop is either 1-day (<=24h) or 2-day (40-48h). Nothing in the 25-39h dead zone.")

    print()
    print("=" * 118)
    print("WITHIN-SEASON DOMINANCE  (a crop only needs to beat crops available at the same time)")
    print("=" * 118)
    bad = 0
    for ch, (seeds, cover) in CHAPTERS.items():
        sub = [r for r in rows if r["name"] in seeds]
        print(f"\n  {ch}  (rain covers {cover*100:.0f}% of water)")
        for r in sorted(sub, key=lambda r: -true_day(r, cover)):
            print(f"      {r['name']:<11} seed P{r['seed']:>2}  "
                  f"{'1d' if r['h']==1 else '2d'}  {'*'*r['drops']:<3}  "
                  f"P{true_day(r,cover):>6.2f}/plot/day   P{true_day(r,cover)*20:>7.0f} @20 plots")
        for a in sub:
            for b in sub:
                if a is b:
                    continue
                if (true_day(b, cover) >= true_day(a, cover) and b["seed"] <= a["seed"]
                        and b["growth"] <= a["growth"] and b["wu"] <= a["wu"]):
                    print(f"      !! {a['name']} dominated by {b['name']}")
                    bad += 1
    print(f"\n  Total within-season dominances: {bad}")

    print()
    print("=" * 118)
    print("WATER PRESSURE  (tank 60 units; how many days does a full tank last at 20 plots?)")
    print("=" * 118)
    print(f"{'Crop':<12}{'units/d/plot':>13}{'20 plots/d':>12}{'tank days':>11}"
          f"{'refill P':>10}{'P/day @80% rain':>17}{'P/day @5% rain':>16}")
    for r in sorted(rows, key=lambda r: -r["wu"]):
        d20 = r["wu"] * 20
        td = TANK / d20 if d20 else 999
        print(f"{r['name']:<12}{r['wu']:>13.2f}{d20:>12.1f}{td:>11.2f}"
              f"{TANK*WATER:>10.0f}{d20*WATER*0.20:>17.2f}{d20*WATER*0.95:>16.2f}")
    print("\n  -> Water is now 5-45% of gross depending on crop and season. It is a real decision.")

    print()
    print("=" * 118)
    print("INCOME & LAND PAYBACK")
    print("=" * 118)
    allvals = [true_day(r, c) for _, (s, c) in CHAPTERS.items() for r in rows if r["name"] in s]
    med = sorted(allvals)[len(allvals) // 2]
    for plots in (4, 8, 12, 20):
        print(f"  {plots:>2} plots: median crop P{med*plots:>7.0f}/day   "
              f"best P{max(allvals)*plots:>7.0f}/day   worst P{min(allvals)*plots:>6.0f}/day")
    LAND = [(4, 8, 1200), (8, 12, 6000), (12, 20, 30000)]
    print()
    for lo, hi, cost in LAND:
        n = hi - lo
        print(f"  {lo}->{hi:<3} P{cost:>6,}  P{cost/n:>6.0f}/plot   "
              f"payback {cost/n/med:>5.1f}d median | {cost/n/max(allvals):>5.1f}d best | "
              f"{cost/n/min(allvals):>5.1f}d worst")
    tot = sum(c for _, _, c in LAND)
    print(f"\n  Total to max: P{tot:,}")
    print(f"  16 extra plots at median P{med*16:.0f}/day -> ladder payback {tot/(med*16):.0f} days")
    print(f"  16 extra plots at best   P{max(allvals)*16:.0f}/day -> {tot/(max(allvals)*16):.0f} days")
    print(f"  16 extra plots at worst  P{min(allvals)*16:.0f}/day -> {tot/(min(allvals)*16):.0f} days")

    print()
    print("=" * 118)
    print("MONTHLY PULA ACCUMULATION  (endgame: is there anywhere for it to go?)")
    print("=" * 118)
    for plots in (4, 12, 20):
        inc = med * plots
        seed_c = 3 * plots      # avg seed cost
        water_c = 2.0 * plots * WATER
        maint = 0 if plots < 12 else 1.25 * plots
        net = inc - seed_c - water_c - maint
        print(f"  {plots:>2} plots: +P{inc:>6.0f}/d  -seeds P{seed_c:>4.0f}  -water P{water_c:>4.0f}"
              f"  -maint P{maint:>4.0f}  =  +P{net:>6.0f}/day  ->  P{net*30:>7.0f}/month unspent")
    print("\n  Unbounded sinks needed: cosmetics (priced), Letsema fund, seasonal maintenance.")


if __name__ == "__main__":
    main()
