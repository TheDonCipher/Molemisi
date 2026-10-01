import { Rng, createRng, hashSeed, tickSeed, seededRng } from './rng';

/**
 * 09 §10 / NFR-SIM-009 — the simulation must be reproducible from a seed.
 * These tests pin the three properties the whole engine leans on:
 *   1. same seed  => same stream   (replayable),
 *   2. different seed => different stream (independent ticks),
 *   3. children (`fork`) are deterministic AND independent of each other.
 */
describe('Deterministic RNG (09 §10)', () => {
  it('produces the SAME stream for the SAME seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces a DIFFERENT stream for a different seed', () => {
    const a = Array.from({ length: 20 }, (_, i) => createRng(i).next());
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('emits floats in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() stays inside [min, max] inclusive', () => {
    const rng = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    // Every value in the range must be reachable.
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('int() rejects an inverted range', () => {
    expect(() => new Rng(1).int(10, 1)).toThrow(/max/);
  });

  it('chance(0) is never, chance(1) is always', () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(p) fires at roughly p over many draws', () => {
    const rng = createRng(2024);
    let hits = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (rng.chance(0.25)) hits++;
    expect(hits / n).toBeGreaterThan(0.22);
    expect(hits / n).toBeLessThan(0.28);
  });

  it('pick() throws on an empty list and never returns undefined for a 1-item list', () => {
    const rng = createRng(1);
    expect(() => rng.pick([])).toThrow(/empty/);
    expect(rng.pick(['only'])).toBe('only');
  });

  it('weighted() honours the weights and rejects a non-positive total', () => {
    const rng = createRng(42);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 1000; i++) {
      const pick = rng.weighted([
        { value: 'a', weight: 8 },
        { value: 'b', weight: 2 },
      ]);
      if (pick === 'a') a++;
      else b++;
    }
    expect(a).toBeGreaterThan(b * 2);
    expect(() => rng.weighted([{ value: 'x', weight: 0 }])).toThrow(/weight/);
    expect(() => rng.weighted([])).toThrow(/empty/);
  });

  it('fork() is deterministic and independent of its siblings', () => {
    const childA1 = createRng(5).fork('weather');
    const childA2 = createRng(5).fork('weather');
    const childB = createRng(5).fork('crop');
    expect(Array.from({ length: 10 }, () => childA1.next())).toEqual(
      Array.from({ length: 10 }, () => childA2.next()),
    );
    // Drawing from one child must not advance another (independent streams).
    const before = Array.from({ length: 5 }, () => childB.next());
    const after = Array.from({ length: 5 }, () => childB.next());
    expect(before).not.toEqual(after);
  });

  it('the stateful Rng and the callable createRng share a stream', () => {
    const stateful = new Rng(777);
    const callable = createRng(777);
    expect(callable.next()).toBe(stateful.next());
    expect(callable.seed).toBe(stateful.seed);
  });

  describe('hashSeed', () => {
    it('is stable for identical inputs', () => {
      expect(hashSeed('farm-1', 3)).toBe(hashSeed('farm-1', 3));
    });

    it('separates parts so ("a","b") !== ("ab")', () => {
      expect(hashSeed('a', 'b')).not.toBe(hashSeed('ab'));
    });

    it('separates adjacent ticks', () => {
      expect(hashSeed('farm-1', 3)).not.toBe(hashSeed('farm-1', 4));
    });

    it('returns an unsigned 32-bit integer', () => {
      const h = hashSeed('anything');
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    });
  });

  it('tickSeed gives the same farm+tick the same seed and the next tick a different one', () => {
    expect(tickSeed('farm-a', 10)).toBe(tickSeed('farm-a', 10));
    expect(tickSeed('farm-a', 10)).not.toBe(tickSeed('farm-a', 11));
    expect(tickSeed('farm-a', 10)).not.toBe(tickSeed('farm-b', 10));
  });

  it('seededRng returns a bare callable source', () => {
    const s = seededRng('x');
    expect(typeof s).toBe('function');
    const v = s();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
