/**
 * CLI configuration. The `--anchor` date is required rather than optional:
 * chapter seed stocking and the Mophane window both key off the real calendar
 * month, so a run without an anchor silently tests one season and reports it as
 * if it were the whole year.
 */

import type { Cohort, ProfileName, ProfileSpec, RunConfig } from './types';
import { botswanaDayKey } from './time';
import { DEFAULT_API_PREFIX } from './client';

export const DEFAULT_TARGET = 'http://localhost:3001';
export const DEFAULT_PAYER_SHARE = 0.03;
/** One-time small / subscriber / mid / high, per specification §2. */
export const DEFAULT_PAYER_SPLIT: Record<'payer' | 'subscriber' | 'mid' | 'whale', number> = {
  payer: 70,
  subscriber: 20,
  mid: 8,
  whale: 2,
};

export const DEFAULT_PROFILE_WEIGHTS: Record<ProfileName, number> = {
  f2p: 92,
  payer: DEFAULT_PAYER_SHARE * 100 * (DEFAULT_PAYER_SPLIT.payer / 100),
  subscriber: DEFAULT_PAYER_SHARE * 100 * (DEFAULT_PAYER_SPLIT.subscriber / 100),
  whale: DEFAULT_PAYER_SHARE * 100 * (DEFAULT_PAYER_SPLIT.whale / 100),
  churner: 5,
  adversary: 0,
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function parseArgs(argv: string[]): RunConfig {
  const flags = new Map<string, string>();
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      flags.set(arg.slice(2), 'true');
    } else {
      flags.set(arg.slice(2, eq), arg.slice(eq + 1));
    }
  }

  const target = flags.get('target') ?? DEFAULT_TARGET;
  const anchor = flags.get('anchor') ?? botswanaDayKey(new Date());

  const days = numberFlag(flags, 'days', 30);
  const players = numberFlag(flags, 'players', 100);
  if (players < 1) throw new ConfigError('--players must be at least 1');
  if (days < 1) throw new ConfigError('--days must be at least 1');

  const cohort = (flags.get('cohort') ?? 'wide') as Cohort;
  if (cohort !== 'wide' && cohort !== 'calendar') {
    throw new ConfigError(`--cohort must be "wide" or "calendar" (got "${cohort}")`);
  }

  const profiles = parseProfiles(flags.get('profiles'));

  return {
    target,
    apiPrefix: flags.get('api-prefix') ?? DEFAULT_API_PREFIX,
    mutationsPerMinute: numberFlag(flags, 'mutations-per-minute', 55),
    // Unique per run so accounts never collide across runs; override to re-run
    // deliberately against the same population.
    runToken: flags.get('run-token') ?? Date.now().toString(36),
    players,
    days,
    seed: numberFlag(flags, 'seed', 1),
    anchor,
    cohort,
    profiles,
    payerShare: DEFAULT_PAYER_SHARE,
    outDir: flags.get('out') ?? 'simulator-out',
    safeguardsOnly: flags.get('safeguards-only') === 'true',
    supabaseUrl: flags.get('supabase-url'),
    supabaseServiceKey: flags.get('supabase-key'),
  };
}

function numberFlag(flags: Map<string, string>, key: string, fallback: number): number {
  const raw = flags.get(key);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new ConfigError(`--${key} must be a number (got "${raw}")`);
  return n;
}

/** `--profiles=f2p:70,payer:20,mid:8,whale:2,churner:5` — relative population weights. */
function parseProfiles(raw: string | undefined): ProfileSpec[] {
  if (!raw) {
    return (Object.keys(DEFAULT_PROFILE_WEIGHTS) as ProfileName[])
      .filter((p) => p !== 'adversary')
      .map((p) => ({ name: p, weight: DEFAULT_PROFILE_WEIGHTS[p], payer: isPayer(p) }));
  }
  return raw.split(',').map((part) => {
    const [rawName, rawWeight] = part.split(':');
    const name = normalizeProfileName(rawName ?? '');
    const weight = Number(rawWeight ?? '1');
    if (!Number.isFinite(weight) || weight < 0) {
      throw new ConfigError(`--profiles: bad weight for "${rawName}"`);
    }
    return { name, weight, payer: isPayer(name) };
  });
}

function normalizeProfileName(raw: string): ProfileName {
  const n = raw.trim().toLowerCase();
  const map: Record<string, ProfileName> = {
    f2p: 'f2p',
    grinder: 'f2p',
    payer: 'payer',
    casual: 'payer',
    subscriber: 'subscriber',
    guild: 'subscriber',
    mid: 'payer',
    whale: 'whale',
    churner: 'churner',
    adversary: 'adversary',
  };
  const resolved = map[n];
  if (!resolved) throw new ConfigError(`--profiles: unknown profile "${raw}"`);
  return resolved;
}

export function isPayer(p: ProfileName): boolean {
  return p === 'payer' || p === 'subscriber' || p === 'whale';
}

export const USAGE = `Molemisi simulator

  pnpm simulate --profiles=f2p:97,payer:2.1,subscriber:0.6,whale:0.06,churner:5 \\
                --players=1000 --days=90 --target=http://localhost:3001 \\
                --seed=1 --anchor=2026-01-01 --cohort=wide

  --target       API base URL. Rejected unless allow-listed (localhost by default).
  --api-prefix   Global route prefix the API mounts controllers under (default /api/v1).
  --mutations-per-minute  Client-side pacing cap on mutating requests (default 55,
                 kept just under the API's own 60/60s limiter). 0 disables pacing.
  --run-token    Token mixed into synthetic account emails. Defaults to a per-run
                 value; set it explicitly to deliberately reuse a run's accounts.
  --players      Total synthetic population.
  --days         Simulated days to compress into the run.
  --seed         RNG seed, for reproducing a specific failing run.
  --anchor       Real calendar date simulated day 1 lands on (YYYY-MM-DD). Required
                 in practice: seasonality keys off the real month.
  --cohort       "wide" (economy / market impact / ARPU) or "calendar" (>=12 real
                 months: chapters, seed rotation, Mophane windows).
  --out          Output directory for summary.md / raw_events.jsonl / safeguards.json.
  --safeguards-only  Skip the population run; execute the checklist only.

Environment:
  SIMULATOR_ALLOW=true          Required gate.
  NODE_ENV                      Must be a test environment (or set SIMULATOR_ALLOW_ENV).
  SIMULATOR_ALLOW_HOSTS         Comma-separated extra hosts to permit.
  --supabase-url / --supabase-key  Needed for time advancement (the one DB exception).
`;
