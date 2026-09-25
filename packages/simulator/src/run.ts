/**
 * Run orchestration.
 *
 * The shape of the loop is dictated by `MAX_OFFLINE_HOURS`: one API-visible
 * step per simulated day, never more than 24 h at a time.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApiClient } from './client';
import { EventLog } from './events';
import { Rng } from './rng';
import { planSteps, monthOf } from './time';
import { DEFAULT_BACKDATE_TARGETS, timeMachineFromConfig, type BackDateTarget } from './db';
import { buildRoster, countByProfile, payerShareOf, registerPlayer } from './population';
import { runPlayerDay } from './actors';
import { runSafeguards } from './safeguards';
import { composeSummary, type RunMeta } from './reports';
import type { CheckResult, Player, RunConfig } from './types';

export interface RunResult {
  exitCode: number;
  outDir: string;
  events: number;
  checks: CheckResult[];
  precondition?: { ok: boolean; detail: string };
}

export async function run(config: RunConfig): Promise<RunResult> {
  const api = new ApiClient(config.target, config.apiPrefix, config.mutationsPerMinute);
  const log = new EventLog(config.outDir);
  const rng = new Rng(config.seed);

  // Environment precondition first: without the market reconciliation migration
  // every market check fails for reasons that are not economic.
  //
  // Skipped for `--safeguards-only`: the checklist never reads the market table,
  // and demanding Supabase credentials for a pure security pass is friction that
  // would stop people running the checks that matter most.
  const tm = timeMachineFromConfig(config);
  let precondition: { ok: boolean; detail: string } | undefined;
  if (config.safeguardsOnly) {
    console.log('--safeguards-only: skipping the market precondition probe.');
  } else if (tm) {
    precondition = await tm.probeMarketReconciliation();
    if (!precondition.ok) {
      writeFileSync(
        join(config.outDir, 'ENV_PRECONDITION_MISSING.txt'),
        `${precondition.detail}\n`,
      );
      console.error(`ENV_PRECONDITION_MISSING: ${precondition.detail}`);
      return { exitCode: 2, outDir: config.outDir, events: 0, checks: [], precondition };
    }
    console.log(`precondition ok: ${precondition.detail}`);
  } else {
    console.warn(
      'No Supabase URL/key supplied: time advancement is DISABLED. The run will exercise ' +
        'the API but simulated days will not advance the game clock.',
    );
  }

  // Population. The service-role key doubles as the admin-provisioning credential
  // when the real register endpoint is rate-limited (see provision.ts).
  const adminCreds =
    config.supabaseUrl && config.supabaseServiceKey
      ? { supabaseUrl: config.supabaseUrl, serviceKey: config.supabaseServiceKey }
      : null;

  const roster = buildRoster(config, rng);
  const players: Player[] = [];
  for (let i = 0; i < roster.slots.length; i++) {
    const profile = roster.slots[i]!;
    try {
      players.push(await registerPlayer(api, i, profile, rng, config.runToken, adminCreds));
    } catch (err) {
      console.error(`registration failed for slot ${i} (${profile}): ${(err as Error).message}`);
    }
  }
  console.log(`registered ${players.length} players: ${JSON.stringify(countByProfile(roster.slots))}`);

  const viaAdmin = players.filter((p) => p.provisionedVia === 'admin').length;
  if (viaAdmin > 0) {
    console.warn(
      `\n*** FIDELITY WARNING: ${viaAdmin}/${players.length} accounts were created via ` +
        'service-role provisioning, NOT the /auth/register endpoint. Account creation ' +
        'is therefore NOT exercised by this run; all gameplay still goes through the ' +
        'real API. Reports are stamped accordingly. ***\n',
    );
  }

  const steps = planSteps(config.days, config.anchor);
  const realDates = steps.map((s) => s.realDate);

  // `--safeguards-only` still registers the population because most checks need
  // a real token and a real farm to act against — it just skips the behaviour
  // loop and every time-advancing call.
  if (config.safeguardsOnly) {
    console.log('--safeguards-only: skipping population activity and time advancement.');
  } else {
    for (const step of steps) {
      for (const player of players) {
        if (player.profile === 'adversary') continue;
        if (player.profile === 'churner' && step.day > 14) continue;
        await runPlayerDay({
          api,
          log,
          rng,
          player,
          day: step.day,
          realDate: step.realDate,
          month: monthOf(step.realDate),
        });
      }
      if (tm) {
        await advanceSimulatedTime({ api, tm, players, hours: step.hours });
      }
      if (step.day % 10 === 0 || step.day === config.days) {
        console.log(`day ${step.day}/${config.days} (${step.realDate}) — ${log.size} events`);
      }
    }
  }

  // Safeguards run after population activity so ownership and threshold checks
  // have real state to act against.
  const checks = await runSafeguards(api, players, { webhookToken: players[0]?.token ?? '' });

  const meta: RunMeta = {
    cohort: config.cohort,
    players: players.length,
    days: config.days,
    profileCounts: countByProfile(roster.slots),
    payerShare: payerShareOf(roster.slots),
    realDates,
    seed: config.seed,
    anchor: config.anchor,
    provisioning: {
      register: players.filter((p) => p.provisionedVia === 'register').length,
      admin: viaAdmin,
    },
  };

  const summary = composeSummary(meta, log.events, checks);
  writeFileSync(join(config.outDir, 'summary.md'), summary);
  writeFileSync(
    join(config.outDir, 'safeguards.json'),
    `${JSON.stringify({ generated: new Date().toISOString(), meta, checks }, null, 2)}\n`,
  );

  const failed = checks.filter((c) => c.group !== 'gap' && !c.passed);
  return {
    exitCode: failed.length > 0 ? 1 : 0,
    outDir: config.outDir,
    events: log.size,
    checks,
    precondition,
  };
}

export interface AdvanceOptions {
  api: ApiClient;
  tm: {
    advance(
      playerId: string,
      farmId: string,
      hours: number,
      targets?: BackDateTarget[],
    ): Promise<string>;
  };
  players: readonly Player[];
  hours: number;
}

/**
 * Advance simulated time by `hours` for every active player.
 *
 * This is the ONE place the simulator touches the database directly. It must be
 * called with `hours <= MAX_OFFLINE_HOURS` — `planSteps` guarantees that, and
 * this function asserts it rather than trusting callers.
 */
export async function advanceSimulatedTime(opts: AdvanceOptions): Promise<void> {
  if (opts.hours > 24) {
    throw new Error(
      `advanceSimulatedTime: ${opts.hours}h exceeds the 24 h offline clamp; ` +
        'the engine would silently discard the remainder.',
    );
  }
  for (const player of opts.players) {
    if (!player.farmId) continue;
    await opts.tm.advance(player.userId, player.farmId, opts.hours, DEFAULT_BACKDATE_TARGETS);
    // The real endpoint resolves the result — the game's own logic, not ours.
    await opts.api.get('/farms/current', player.token);
  }
}
