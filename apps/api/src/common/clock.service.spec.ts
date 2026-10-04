import { ClockService, isLiveProjectUrl } from './clock.service';

/**
 * The dev clock and the live-project guard (09 §7 hazard 2, D9).
 *
 * Two claims are under test: the clock is an exact, reversible offset, and the
 * "is this production?" predicate tells a throwaway stack from the hosted
 * project. Both are pure enough to assert without a database.
 */
describe('ClockService', () => {
  let clock: ClockService;
  beforeEach(() => {
    clock = new ClockService();
  });

  it('reads wall-clock time when untouched', () => {
    expect(clock.isOverridden).toBe(false);
    expect(clock.offset).toBe(0);
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it('jumps to a target date', () => {
    const target = new Date('2027-02-01T00:00:00.000Z');
    clock.set(target);
    expect(clock.isOverridden).toBe(true);
    // Within a second of drift; the jump itself is the point.
    expect(Math.abs(clock.now().getTime() - target.getTime())).toBeLessThan(1000);
  });

  it('resets exactly, leaving no residue', () => {
    clock.set(new Date('2030-01-01T00:00:00.000Z'));
    clock.reset();
    expect(clock.isOverridden).toBe(false);
    expect(clock.offset).toBe(0);
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it('applies the same offset to every read (so callers agree)', () => {
    clock.set(new Date('2027-11-01T00:00:00.000Z'));
    const a = clock.now().getTime();
    const b = clock.now().getTime();
    expect(Math.abs(a - b)).toBeLessThan(50);
  });
});

describe('isLiveProjectUrl — the never-point-at-live guard', () => {
  it('treats a local stack as throwaway', () => {
    expect(isLiveProjectUrl('http://localhost:54321')).toBe(false);
    expect(isLiveProjectUrl('http://127.0.0.1:54321')).toBe(false);
    expect(isLiveProjectUrl('http://kong:8000')).toBe(false);
  });

  it('treats a hosted project as live', () => {
    expect(isLiveProjectUrl('https://nyapfgawanqvnkkjudxb.supabase.co')).toBe(true);
    expect(isLiveProjectUrl('https://abc123.supabase.in')).toBe(true);
  });

  it('is safe with a missing URL', () => {
    expect(isLiveProjectUrl(undefined)).toBe(false);
    expect(isLiveProjectUrl(null)).toBe(false);
    expect(isLiveProjectUrl('')).toBe(false);
  });
});