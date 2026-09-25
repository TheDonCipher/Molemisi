/**
 * Core simulator types.
 *
 * Nothing here restates an economic number. Constants are imported from
 * `@molemisi/game-config` at the point of use — see the implementation prompt §0.
 */

/** Systems in scope. Superset of v1's list: water/land/building/livestock/progression added. */
export type System =
  | 'farming'
  | 'water'
  | 'land'
  | 'building'
  | 'livestock'
  | 'crafting'
  | 'storage'
  | 'bushveld'
  | 'kgotla'
  | 'market'
  | 'economy'
  | 'progression'
  | 'security'
  | 'anticheat';

export type ActionResult = 'success' | 'rejected' | 'error';

export interface SimEvent {
  /** ISO timestamp of the real wall-clock moment the call was made. */
  timestamp: string;
  /** 1-based simulated day index. */
  simulatedDay: number;
  /**
   * The REAL calendar date this simulated day maps to (YYYY-MM-DD). Chapters and
   * the Mophane window key off the real month, so this must stay truthful.
   */
  realDate: string;
  playerId: string;
  profile: ProfileName;
  system: System;
  action: string;
  result: ActionResult;
  metadata: Record<string, unknown>;
}

export type ProfileName =
  | 'f2p'
  | 'payer'
  | 'subscriber'
  | 'whale'
  | 'churner'
  | 'adversary';

export interface ProfileSpec {
  name: ProfileName;
  /** Relative weight within the payer/non-payer groups — see population.ts. */
  weight: number;
  /** Whether this profile spends real money. */
  payer: boolean;
  /** Days of full engagement before the profile goes quiet (churner). */
  activeDays?: number;
}

/** wide = economy/market impact; calendar = chapters/Mophane windows. */
export type Cohort = 'wide' | 'calendar';

export interface RunConfig {
  target: string;
  /** Global route prefix the API mounts controllers under. Default `/api/v1`. */
  apiPrefix: string;
  /**
   * Client-side cap on mutating requests per rolling minute, kept just under the
   * API's own 60/60s limiter. 0 disables pacing.
   */
  mutationsPerMinute: number;
  players: number;
  days: number;
  seed: number;
  /** Real calendar date simulated day 1 lands on (YYYY-MM-DD). */
  anchor: string;
  /**
   * Unique-per-run token mixed into synthetic account emails.
   *
   * `seed` reproduces *behaviour*, but account identity must be unique per run —
   * otherwise a re-run collides with the previous run's accounts and silently
   * inherits their already-simulated farm state. Pass an explicit value to make a
   * re-run reuse the same accounts deliberately.
   */
  runToken: string;
  cohort: Cohort;
  profiles: ProfileSpec[];
  /** Share of the population that pays, excluding adversary accounts. */
  payerShare: number;
  /** Output directory for the three report files. */
  outDir: string;
  /** Skip population/run and only execute the safeguard checklist. */
  safeguardsOnly: boolean;
  /** Supabase REST endpoint used for the one deliberate DB exception (§4). */
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

export interface Player {
  index: number;
  profile: ProfileName;
  email: string;
  password: string;
  token: string;
  userId: string;
  farmId: string;
  /** Tagged out of the economy/ARPU report (adversary + multi-account probes). */
  synthetic: boolean;
  /**
   * How this account was created. `admin` means service-role provisioning was used
   * because the real `/auth/register` path was unavailable — reports must say so.
   */
  provisionedVia: 'register' | 'admin';
}

export type CheckGroup = 'security' | 'anticheat' | 'deferred' | 'gap';

export interface CheckResult {
  id: string;
  group: CheckGroup;
  name: string;
  passed: boolean;
  detail: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  /** Unwrapped payload: most endpoints return `{ success, data }`. */
  data: T;
  raw: unknown;
}
