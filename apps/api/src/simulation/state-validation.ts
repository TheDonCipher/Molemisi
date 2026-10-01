/**
 * State validation and recovery (11 §5).
 *
 * The simulation is server-authoritative, so it is also the last line of defence
 * against a corrupted state: a negative balance, an orphan crop, a negative
 * inventory row or a stale timestamp. Per 11 §5 the engine does not merely
 * *detect* these — it names the corrective action so a caller can apply it and
 * log an incident.
 *
 * Both halves are PURE so they can run inside the anti-cheat pass, inside a
 * migration's reconciliation block, or inside a Jest test with no database.
 */

import { MAX_OFFLINE_HOURS } from '@molemisi/game-config';

export interface PlotState {
  id: string;
  /** farm_plots.state — EMPTY | PLANTED | GROWING | READY | WITHERED ... */
  state: string;
  /** The crop currently on the plot, if any. */
  cropId?: string | null;
}

export interface InventoryState {
  itemType: string;
  quantity: number;
}

/** The snapshot of one farm/player that validation inspects. */
export interface GameStateSnapshot {
  farmId?: string;
  playerId?: string;
  /** Canonical Pula balance (player_wallets.pula_balance). */
  currency: number;
  /** Canonical Botho balance (player_wallets.botho_points). */
  botho?: number;
  plots: PlotState[];
  inventory: InventoryState[];
  /** ISO timestamp of the last successful simulation pass. */
  lastSimulatedAt?: string | null;
}

export type ValidationCode =
  | 'NEGATIVE_CURRENCY'
  | 'NEGATIVE_BOTHO'
  | 'NEGATIVE_INVENTORY'
  | 'ORPHAN_CROP'
  | 'STALE_SIMULATION'
  | 'FUTURE_SIMULATION'
  | 'PLOT_WITHOUT_CROP';

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  /** The entity the issue is attached to (plot id, item slug, …). */
  entity?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const OCCUPIED_STATES = new Set(['PLANTED', 'GROWING', 'READY']);

/** Detect corrupted state (11 §5 "Corrupted State Detection"). Pure. */
export function validateGameState(
  snapshot: GameStateSnapshot,
  now: Date = new Date(),
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(snapshot.currency) || snapshot.currency < 0) {
    issues.push({
      code: 'NEGATIVE_CURRENCY',
      message: `Currency is negative (${snapshot.currency})`,
    });
  }
  if (snapshot.botho !== undefined && (!Number.isFinite(snapshot.botho) || snapshot.botho < 0)) {
    issues.push({
      code: 'NEGATIVE_BOTHO',
      message: `Botho is negative (${snapshot.botho})`,
    });
  }

  for (const plot of snapshot.plots) {
    // A plot claims a crop but carries no crop id — an orphaned plot.
    if (OCCUPIED_STATES.has(plot.state) && !plot.cropId) {
      issues.push({
        code: 'ORPHAN_CROP',
        message: `Plot ${plot.id} is ${plot.state} but has no crop`,
        entity: plot.id,
      });
    }
    // The inverse: a crop row whose plot is EMPTY.
    if (!OCCUPIED_STATES.has(plot.state) && plot.cropId) {
      issues.push({
        code: 'PLOT_WITHOUT_CROP',
        message: `Plot ${plot.id} is ${plot.state} but still references crop ${plot.cropId}`,
        entity: plot.id,
      });
    }
  }

  for (const item of snapshot.inventory) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      issues.push({
        code: 'NEGATIVE_INVENTORY',
        message: `Item ${item.itemType} has negative quantity (${item.quantity})`,
        entity: item.itemType,
      });
    }
  }

  const staleness = checkSimulationTimestamp(snapshot.lastSimulatedAt, now);
  if (staleness) issues.push(staleness);

  return { valid: issues.length === 0, issues };
}

/**
 * A timestamp is stale when the farm has not been simulated for longer than the
 * offline cap allows, or when it is set in the FUTURE (a clock skew / tamper
 * signal — the sim would compute a negative elapsed time).
 */
export function checkSimulationTimestamp(
  lastSimulatedAt: string | null | undefined,
  now: Date = new Date(),
): ValidationIssue | null {
  if (!lastSimulatedAt) {
    return { code: 'STALE_SIMULATION', message: 'Farm has never been simulated' };
  }
  const last = Date.parse(lastSimulatedAt);
  if (!Number.isFinite(last)) {
    return {
      code: 'STALE_SIMULATION',
      message: `Unparseable last_simulated_at: ${lastSimulatedAt}`,
    };
  }
  const ageHours = (now.getTime() - last) / 3_600_000;
  if (ageHours < 0) {
    return {
      code: 'FUTURE_SIMULATION',
      message: `last_simulated_at is ${Math.abs(ageHours).toFixed(1)} h in the future`,
    };
  }
  if (ageHours > MAX_OFFLINE_HOURS) {
    return {
      code: 'STALE_SIMULATION',
      message: `last_simulated_at is ${ageHours.toFixed(1)} h old (> ${MAX_OFFLINE_HOURS} h cap)`,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ Recovery */

export type RecoveryKind =
  | 'SET_CURRENCY_ZERO'
  | 'SET_BOTHO_ZERO'
  | 'SET_INVENTORY_ZERO'
  | 'REMOVE_ORPHAN_CROP'
  | 'RERUN_SIMULATION';

export interface RecoveryAction {
  kind: RecoveryKind;
  /** The entity the action targets (plot id / item slug), when relevant. */
  entity?: string;
  /** Human-readable incident note for the audit log (11 §5 "log incident"). */
  note: string;
}

/**
 * Map validation issues to corrective actions (11 §5 "Recovery Actions" table).
 * Deterministic: same issues => same ordered plan.
 */
export function planRecovery(result: ValidationResult): RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  for (const issue of result.issues) {
    switch (issue.code) {
      case 'NEGATIVE_CURRENCY':
        actions.push({
          kind: 'SET_CURRENCY_ZERO',
          note: `Reset negative currency to 0 (${issue.message})`,
        });
        break;
      case 'NEGATIVE_BOTHO':
        actions.push({ kind: 'SET_BOTHO_ZERO', note: `Reset negative Botho to 0 (${issue.message})` });
        break;
      case 'NEGATIVE_INVENTORY':
        actions.push({
          kind: 'SET_INVENTORY_ZERO',
          entity: issue.entity,
          note: `Reset ${issue.entity} to 0`,
        });
        break;
      case 'ORPHAN_CROP':
      case 'PLOT_WITHOUT_CROP':
        actions.push({
          kind: 'REMOVE_ORPHAN_CROP',
          entity: issue.entity,
          note: `Cleared ${issue.entity}`,
        });
        break;
      case 'STALE_SIMULATION':
      case 'FUTURE_SIMULATION':
        actions.push({ kind: 'RERUN_SIMULATION', note: `Re-ran simulation (${issue.message})` });
        break;
      /* c8 ignore next 2 — exhaustive over ValidationCode */
      default:
        break;
    }
  }
  return actions;
}

/** A one-line incident report for the audit log. */
export function describeIssues(result: ValidationResult): string {
  if (result.valid) return 'state valid';
  return result.issues.map((i) => `${i.code}: ${i.message}`).join('; ');
}

