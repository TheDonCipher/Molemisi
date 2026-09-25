#!/usr/bin/env python
"""
Livestock production probe — READ ONLY, not the economy gate.

Replays the exact arithmetic of simulation.service.simulateLivestock()
against realistic player check-in cadences, to answer one question:

    can a player who logs in once a day EVER collect an egg?

Formulas mirrored from apps/api/src/simulation/simulation.service.ts:
  hunger   -= hungerDecayRate * elapsedHours          (floor 0)
  health   -= healthDecayRate * elapsedHours  if hunger < 0.2
  productTimer += elapsedHours  ONLY IF hunger > 0.5 and health > 0.5
                                and not already productReady
  feed     ->  hunger = min(1.0, hunger + 0.3)        (livestock.service)
  collect  ->  productReady = False, productTimer = 0

MAX_OFFLINE_HOURS is 24, so elapsedHours is capped at 24 and the
self-sustaining branch (offlineDays > 3) can never fire.
"""

ANIMALS = {
    # id: (purchaseCost, prodCycleH, productQty, basePrice, hungerDecay/h)
    'chicken': (50, 12, 2, 5, 0.15),
    'goat':    (150, 24, 1, 15, 0.12),
    'cow':     (400, 24, 3, 15, 0.10),
    'pig':     (300, 48, 1, 50, 0.13),
}

START_HUNGER = 0.8
FEED_GAIN = 0.30
MAX_OFFLINE_HOURS = 24


def run(animal, cadence_hours, feeds_per_visit, days=14, feed_each_visit=True):
    """Simulate `days` of play. Player visits every `cadence_hours` and feeds
    `feeds_per_visit` times per visit (hunger caps at 1.0, so extra feeds stack
    only if spaced). Returns (products_collected, gross_pula)."""
    cost, cycle, qty, price, decay = ANIMALS[animal]
    hunger = START_HUNGER
    health = 1.0
    timer = 0.0
    ready = False
    collected = 0

    hours = 0.0
    while hours < days * 24:
        # --- visit: feed (up to 1.0 cap) ---
        if feed_each_visit:
            for _ in range(feeds_per_visit):
                hunger = min(1.0, hunger + FEED_GAIN)
        # --- collect if a product is waiting ---
        if ready:
            collected += 1
            ready = False
            timer = 0.0
        # --- time passes ---
        elapsed = min(cadence_hours, MAX_OFFLINE_HOURS)
        hunger = max(0.0, hunger - decay * elapsed)
        if hunger < 0.2:
            health = max(0.0, health - 0.1 * elapsed)
        # --- server production check at NEXT sim, using decayed hunger ---
        if hunger > 0.5 and health > 0.5 and not ready:
            timer += elapsed
            if timer >= cycle:
                ready = True
                timer = 0.0
        hours += elapsed

    return collected, collected * qty * price


print("=" * 78)
print("LIVESTOCK PRODUCTION PROBE  —  can a once-a-day player collect anything?")
print("=" * 78)
print(f"{'animal':<9}{'cadence':>9}{'feeds/visit':>13}{'products/14d':>14}{'Pula/14d':>11}{'P/day':>8}")
print("-" * 78)

for animal in ANIMALS:
    for cadence in (24, 12, 8, 6, 4, 3, 2, 1):
        for feeds in (1, 2, 3, 6):
            got, pula = run(animal, cadence, feeds)
            print(f"{animal:<9}{cadence:>8}h{feeds:>13}{got:>14}{pula:>11}{pula/14:>8.2f}")
    print("-" * 78)

print()
print("CROP COMPARISON — net Pula per plot per day (post Co-op tax):")
crops = [
    ('sorghum', 2, 3, 5, 1), ('millet', 2, 4, 4, 1), ('maize', 3, 5, 5, 1),
    ('cowpeas', 3, 6, 4, 1), ('tomatoes', 5, 10, 3, 1), ('watermelon', 6, 11, 5, 2),
    ('groundnuts', 8, 11, 5, 2), ('sesame', 10, 15, 4, 2), ('pepper', 12, 17, 4, 2),
    ('herbs', 16, 25, 3, 2), ('morula', 28, 46, 2.5, 2),
]
for name, seed, value, avg_yield, cadence_days in crops:
    net = (value * avg_yield * 0.95 - seed) / cadence_days
    print(f"  {name:<12} {net:>7.2f} P/plot/day   (capital at risk: {seed} P)")
