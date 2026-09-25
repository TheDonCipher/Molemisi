/**
 * Library barrel for `@molemisi/simulator`.
 *
 * The CLI lives in `cli.ts` — importing this module has no side effects and
 * never touches `process.exitCode`.
 *
 * Typical programmatic use:
 *
 * ```ts
 * import { run, parseArgs, checkTarget } from '@molemisi/simulator';
 * const verdict = checkTarget('http://localhost:3001', process.env);
 * if (!verdict.allowed) throw new Error(verdict.reason);
 * const result = await run(parseArgs(process.argv));
 * ```
 */

// Safety rail — export first and loudest. Nothing should run without it.
export { SafetyError, checkTarget, assertTargetAllowed } from './safety';
export type { SafetyVerdict } from './safety';

// Orchestration.
export { run, advanceSimulatedTime } from './run';
export type { RunResult, AdvanceOptions } from './run';

// Configuration and CLI parsing.
export {
  USAGE,
  parseArgs,
  isPayer,
  ConfigError,
  DEFAULT_TARGET,
  DEFAULT_PAYER_SHARE,
  DEFAULT_PAYER_SPLIT,
  DEFAULT_PROFILE_WEIGHTS,
} from './config';

// Deterministic randomness.
export { Rng } from './rng';

// Time: Botswana day boundaries, the 24 h step plan, chapter and Mophane windows.
export {
  BOTSWANA_OFFSET_MINUTES,
  DEFAULT_STEP_HOURS,
  MOPHANE_MONTHS,
  planSteps,
  realDateForDay,
  toBotswana,
  botswanaDayKey,
  monthOf,
  monthsCrossed,
  mophaneWindowsCrossed,
} from './time';
export type { TimeStep } from './time';

// Event log — the single source of truth for every report.
export { EventLog, readEventLog, EVENTS_FILENAME } from './events';

// HTTP client.
export { ApiClient, ApiError, DEFAULT_API_PREFIX } from './client';
export type { RequestOptions } from './client';

// The one deliberate database exception: back-dating timestamps.
export {
  TimeMachine,
  TimeMachineRequired,
  timeMachineFromConfig,
  DEFAULT_BACKDATE_TARGETS,
} from './db';
export type { BackDateTarget } from './db';

// Population.
export {
  ADVERSARY_COUNT,
  buildRoster,
  countByProfile,
  payerShareOf,
  registerPlayer,
} from './population';
export type { Roster } from './population';

// Service-role provisioning fallback (fidelity compromise — see the module docs).
export {
  provisionPlayer,
  adminCreateUser,
  bootstrapPlayer,
  loginForToken,
  ProvisionError,
} from './provision';
export type { AdminCreds } from './provision';

// Player behaviour.
export { runPlayerDay, chapterSeedsForMonth, RECIPE_COUNT } from './actors';
export type { DayContext } from './actors';

// Safeguards.
export { runSafeguards } from './safeguards';
export type { SafeguardOptions } from './safeguards';

// Reports.
export {
  reportFarming,
  reportWater,
  reportLandAndBuildings,
  reportLivestock,
  reportCrafting,
  reportStorage,
  reportBushveld,
  reportKgotla,
  reportMarket,
  reportEconomy,
  reportProgression,
  reportSafeguards,
  composeSummary,
} from './reports';
export type { ReportSection, RunMeta } from './reports';

// Types.
export type {
  System,
  ActionResult,
  SimEvent,
  ProfileName,
  ProfileSpec,
  Cohort,
  RunConfig,
  Player,
  CheckGroup,
  CheckResult,
  ApiResponse,
} from './types';
