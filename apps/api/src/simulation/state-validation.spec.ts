/**
 * State validation & recovery tests (11 §5).
 *
 * Every rule in the 11 §5 table is asserted, plus the recovery plan it maps to,
 * because the anti-cheat sweep and the recovery routine both read these.
 */

import {
  validateGameState,
  checkSimulationTimestamp,
  planRecovery,
  describeIssues,
  type GameStateSnapshot,
} from './state-validation';

const NOW = new Date('2026-09-15T12:00:00.000Z');
// `fresh` must sit inside the last MAX_OFFLINE_HOURS (24 h) window —
// checkSimulationTimestamp reports anything older as STALE (11 §5).
const fresh = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(); // 1 h ago

const snapshot = (over: Partial<GameStateSnapshot> = {}): GameStateSnapshot => ({
  farmId: 'farm-1',
  playerId: 'u1',
  currency: 250,
  plots: [],
  inventory: [],
  lastSimulatedAt: fresh,
  ...over,
});

// validateGameState / checkSimulationTimestamp default `now` to the wall clock;
// the spec pins NOW so decade-old fixtures stay "recent".
const validate = (over: Partial<GameStateSnapshot> = {}) => validateGameState(snapshot(over), NOW);

describe('validateGameState (11 §5)', () => {
  it('accepts a healthy snapshot', () => {
    const r = validate({
      plots: [
        { id: 'p1', state: 'GROWING', cropId: 'c1' },
        { id: 'p2', state: 'EMPTY' },
      ],
      inventory: [{ itemType: 'sorghum', quantity: 12 }],
    });
    expect(r.valid).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(describeIssues(r)).toBe('state valid');
  });

  it('flags negative currency', () => {
    const r = validate({ currency: -5 });
    expect(r.valid).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('NEGATIVE_CURRENCY');
    expect(planRecovery(r)[0]!.kind).toBe('SET_CURRENCY_ZERO');
  });

  it('flags negative Botho', () => {
    const r = validate({ botho: -3 });
    expect(r.issues.map((i) => i.code)).toContain('NEGATIVE_BOTHO');
    expect(planRecovery(r)[0]!.kind).toBe('SET_BOTHO_ZERO');
  });

  it('flags NaN currency (corrupt, not merely negative)', () => {
    const r = validate({ currency: Number.NaN });
    expect(r.issues.map((i) => i.code)).toContain('NEGATIVE_CURRENCY');
  });

  it('flags negative inventory quantities', () => {
    const r = validate({ inventory: [{ itemType: 'maize', quantity: -2 }] });
    expect(r.issues.map((i) => i.code)).toContain('NEGATIVE_INVENTORY');
    expect(planRecovery(r)[0]).toMatchObject({ kind: 'SET_INVENTORY_ZERO', entity: 'maize' });
  });

  it('flags an orphan crop: occupied plot with no crop row', () => {
    const r = validate({ plots: [{ id: 'p1', state: 'GROWING' }] });
    expect(r.issues.map((i) => i.code)).toContain('ORPHAN_CROP');
    expect(planRecovery(r)[0]).toMatchObject({ kind: 'REMOVE_ORPHAN_CROP', entity: 'p1' });
  });

  it('flags the inverse: crop row on an EMPTY plot', () => {
    const r = validate({ plots: [{ id: 'p1', state: 'EMPTY', cropId: 'c1' }] });
    expect(r.issues.map((i) => i.code)).toContain('PLOT_WITHOUT_CROP');
    expect(planRecovery(r)[0]!.kind).toBe('REMOVE_ORPHAN_CROP');
  });

  it('reports every issue at once with an auditable summary line', () => {
    const r = validate({
      currency: -1,
      inventory: [{ itemType: 'herbs', quantity: -1 }],
      plots: [{ id: 'p1', state: 'READY' }],
      lastSimulatedAt: null,
    });
    expect(r.issues).toHaveLength(4);
    expect(describeIssues(r)).toContain('NEGATIVE_CURRENCY');
    expect(describeIssues(r)).toContain('ORPHAN_CROP');
    expect(describeIssues(r)).toContain('STALE_SIMULATION');
    expect(planRecovery(r).map((a) => a.kind)).toEqual([
      'SET_CURRENCY_ZERO',
      'REMOVE_ORPHAN_CROP',
      'SET_INVENTORY_ZERO',
      'RERUN_SIMULATION',
    ]);
  });
});

describe('checkSimulationTimestamp (11 §5)', () => {
  it('accepts a recent timestamp', () => {
    expect(checkSimulationTimestamp(fresh, NOW)).toBeNull();
  });

  it('treats a missing timestamp as never-simulated', () => {
    expect(checkSimulationTimestamp(undefined, NOW)?.code).toBe('STALE_SIMULATION');
    expect(checkSimulationTimestamp(null, NOW)?.message).toContain('never been simulated');
  });

  it('treats an unparseable timestamp as stale', () => {
    expect(checkSimulationTimestamp('not-a-date', NOW)?.code).toBe('STALE_SIMULATION');
  });

  it('treats a FUTURE timestamp as tamper/skew and asks for a re-run', () => {
    const future = new Date(NOW.getTime() + 3_600_000).toISOString();
    const issue = checkSimulationTimestamp(future, NOW)!;
    expect(issue.code).toBe('FUTURE_SIMULATION');
    expect(planRecovery({ valid: false, issues: [issue] })[0]!.kind).toBe('RERUN_SIMULATION');
  });

  it('flags anything older than the 24 h offline cap as stale', () => {
    const old = new Date(NOW.getTime() - 25 * 3_600_000).toISOString();
    expect(checkSimulationTimestamp(old, NOW)?.code).toBe('STALE_SIMULATION');
  });
});
