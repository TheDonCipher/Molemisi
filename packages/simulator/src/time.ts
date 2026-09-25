/**
 * Simulated time, the Botswana day boundary, and the ≤24 h stepping rule.
 *
 * THE CONSTRAINT THAT SHAPES THIS FILE (implementation prompt §4):
 * `simulation.service.ts:101` and `water.service.ts:73` both clamp elapsed time to
 * `MAX_OFFLINE_HOURS` (24). Back-dating by 30 days and calling the endpoint once
 * yields 24 hours of simulation and silently discards the rest. So time advances
 * in steps no larger than one day, each followed by a real API call.
 */

import { MAX_OFFLINE_HOURS } from '@molemisi/game-config';

/** Botswana is UTC+2 year-round; there is no DST. Every daily cap uses this. */
export const BOTSWANA_OFFSET_MINUTES = 120;

/** One step per simulated day, and never larger than the engine's own clamp. */
export const DEFAULT_STEP_HOURS = Math.min(24, MAX_OFFLINE_HOURS);

export interface TimeStep {
  /** 1-based simulated day index. */
  day: number;
  /** Hours to advance in this step. Must be <= MAX_OFFLINE_HOURS. */
  hours: number;
  /** The real calendar date this day maps to (YYYY-MM-DD). */
  realDate: string;
}

/**
 * Build the step plan for a run. One step per simulated day by construction, so
 * the ≤24 h rule is satisfied structurally rather than by a runtime assertion
 * that someone can later widen.
 */
export function planSteps(days: number, anchor: string, stepHours = DEFAULT_STEP_HOURS): TimeStep[] {
  if (days < 1) throw new Error(`planSteps: days must be >= 1 (got ${days})`);
  if (stepHours > MAX_OFFLINE_HOURS) {
    throw new Error(
      `planSteps: stepHours ${stepHours} exceeds MAX_OFFLINE_HOURS ${MAX_OFFLINE_HOURS}; ` +
        'the engine would clamp it and silently discard the remainder.',
    );
  }
  const steps: TimeStep[] = [];
  for (let day = 1; day <= days; day++) {
    steps.push({ day, hours: stepHours, realDate: realDateForDay(anchor, day) });
  }
  return steps;
}

/** The real calendar date (YYYY-MM-DD) for a 1-based simulated day index. */
export function realDateForDay(anchor: string, day: number): string {
  const base = parseDate(anchor);
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + (day - 1));
  return formatDate(d);
}

/** Shift an instant into Botswana local time. */
export function toBotswana(at: Date): Date {
  return new Date(at.getTime() + BOTSWANA_OFFSET_MINUTES * 60_000);
}

/** The Botswana calendar day an instant falls on (YYYY-MM-DD). */
export function botswanaDayKey(at: Date): string {
  return formatDate(toBotswana(at));
}

/** Calendar month (1-12) of a YYYY-MM-DD date. */
export function monthOf(realDate: string): number {
  return Number(realDate.slice(5, 7));
}

/** The set of real calendar months a run's days touched. */
export function monthsCrossed(realDates: readonly string[]): number[] {
  const seen = new Set<number>();
  for (const d of realDates) seen.add(monthOf(d));
  return [...seen].sort((a, b) => a - b);
}

/** `ob_setlhare_sa_phane` carries its seasonal table in Moranang and Sedimonthole. */
export const MOPHANE_MONTHS = [4, 12] as const;

export function mophaneWindowsCrossed(realDates: readonly string[]): number[] {
  const crossed = monthsCrossed(realDates);
  return MOPHANE_MONTHS.filter((m) => crossed.includes(m));
}

function parseDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date "${iso}" — expected YYYY-MM-DD`);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
