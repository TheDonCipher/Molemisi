/**
 * Deterministic pseudo-random number generation.
 *
 * WHY THIS EXISTS (09 §10 / NFR-SIM-009):
 *   `last_simulated_at + elapsed_time + game_state + rules = new_game_state`.
 *   That contract is only true if EVERY stochastic outcome in the simulation
 *   draws from a seeded generator. Weather, disease, pest and market events all
 *   used `Math.random()`, which made "given the same inputs, the same outputs"
 *   impossible to test and impossible to reproduce from a bug report.
 *
 * mulberry32 is small, fast and stable across platforms — the same seed yields
 * the same stream on Node, in a browser and inside Jest. It is NOT cryptographic
 * and must never be used to mint tokens, ids or secrets.
 *
 * The generator lives here (the shared, dependency-free config package) rather
 * than in the API or the simulator so BOTH draw from one implementation: a run
 * reproduced in `packages/simulator` and the same run replayed against the live
 * API cannot drift because the generator drifted.
 */

/** A function that returns the next float in [0, 1). The unit of injection. */
export type RngSource = () => number;

/** The stateful generator's surface (no call signature — the class form). */
export interface RngLike {
  /** The seed this stream was created from — the reproducibility handle. */
  readonly seed: number;
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p`. `chance(0)` is never true, `chance(1)` is always. */
  chance(p: number): boolean;
  /** Uniform pick from a non-empty list. Throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights need not be normalised. Throws on non-positive total. */
  weighted<T>(entries: readonly { value: T; weight: number }[]): T;
  /**
   * A deterministic child stream for a labelled sub-system, so adding a new
   * draw in one system (say crop disease) cannot shift the weather sequence
   * another system already depends on. Same seed + same label => same child.
   */
  fork(label: string): RngLike;
}

/** A CALLABLE seeded stream — `rng()` and `rng.next()` are the same draw. */
export interface CallableRng extends RngSource {
  readonly seed: number;
  /** Next float in [0, 1) — identical to calling `rng()`. */
  next(): number;
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(entries: readonly { value: T; weight: number }[]): T;
  fork(label: string): CallableRng;
}

/**
 * The stateful generator. `new Rng(seed)` yields a reproducible stream;
 * `createRng(seed)` wraps the same stream in a callable form.
 */
export class Rng implements RngLike {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    // Fold any (possibly negative / fractional) seed into an unsigned 32-bit int.
    this.seed = hashSeed(seed);
    this.state = this.seed;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  weighted<T>(entries: readonly { value: T; weight: number }[]): T {
    if (entries.length === 0) throw new Error('Rng.weighted: empty array');
    const total = entries.reduce((s, e) => s + e.weight, 0);
    if (total <= 0) throw new Error('Rng.weighted: total weight must be positive');
    let roll = this.next() * total;
    for (const e of entries) {
      roll -= e.weight;
      if (roll <= 0) return e.value;
    }
    return entries[entries.length - 1]!.value;
  }

  fork(label: string): Rng {
    return new Rng(hashSeed(this.seed, label));
  }
}

/**
 * Turn any label/value into a stable 32-bit seed. Strings use a 32-bit FNV-1a
 * hash; numbers are folded directly. Multiple parts are mixed in order, so
 * `hashSeed('farm-1', 3)` !== `hashSeed('farm-1', 4)`.
 *
 * Stability matters: this is what makes "tick N of farm X" reproducible.
 */
export function hashSeed(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (const part of parts) {
    const s = typeof part === 'number' ? `#${part}` : `$${part}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193); // FNV prime
    }
    // Separator so ('a','b') cannot collide with ('ab').
    h ^= 0x9e3779b9;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Wrap a stateful generator as a callable stream. */
function makeCallable(gen: Rng): CallableRng {
  const fn = (() => gen.next()) as unknown as CallableRng;
  Object.defineProperty(fn, 'seed', { value: gen.seed, enumerable: true });
  fn.next = () => gen.next();
  fn.int = (min, max) => gen.int(min, max);
  fn.chance = (p) => gen.chance(p);
  fn.pick = <T>(items: readonly T[]) => gen.pick(items);
  fn.weighted = <T>(entries: readonly { value: T; weight: number }[]) => gen.weighted(entries);
  fn.fork = (label: string) => makeCallable(gen.fork(label));
  return fn;
}

/** Create a seeded, callable `Rng`. `createRng('farm-1', 3)` mixes both parts. */
export function createRng(
  seed: number | string,
  ...extra: readonly (string | number)[]
): CallableRng {
  // A bare number must take the SAME path as `new Rng(seed)` (which folds the
  // seed once) — mixing it a second time here yields a different stream.
  if (typeof seed === 'number' && extra.length === 0) {
    return makeCallable(new Rng(seed));
  }
  return makeCallable(new Rng(hashSeed(seed, ...extra)));
}

/**
 * Derive a per-tick seed for a farm. Two properties are load-bearing:
 *  - the SAME farm + SAME tick always yields the SAME weather/disease stream
 *    (determinism — a replay reproduces a bug exactly);
 *  - the NEXT tick yields a DIFFERENT stream (independence — weather is not
 *    frozen for a farm forever).
 */
export function tickSeed(farmId: string, tickIndex: number): number {
  return hashSeed('sim', farmId, tickIndex);
}

/** A plain `() => number` source from a seed, for consumers that need no extras. */
export function seededRng(seed: number | string): RngSource {
  const rng = createRng(seed);
  return () => rng();
}

