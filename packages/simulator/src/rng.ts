/**
 * Seeded RNG. A run must be reproducible from `--seed`, or a failing run cannot
 * be investigated. mulberry32 is small, fast and good enough for behaviour
 * scripting — it is not used for anything cryptographic.
 */
export class Rng {
  private state: number;

  constructor(public readonly seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Weighted pick. Weights need not be normalised. */
  weighted<T>(entries: readonly { value: T; weight: number }[]): T {
    const total = entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) throw new Error('Rng.weighted: total weight must be positive');
    let r = this.next() * total;
    for (const e of entries) {
      r -= e.weight;
      if (r <= 0) return e.value;
    }
    return entries[entries.length - 1]!.value;
  }
}
