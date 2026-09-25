#!/usr/bin/env node
/**
 * CLI entry point: `pnpm simulate ...`
 *
 * Kept separate from `index.ts` so that the package's `main` is a library
 * barrel (importable from tests or a future dashboard) rather than a process
 * that calls `process.exitCode`.
 *
 * See `docs/Simulator/MOLEMISI_Simulator_Implementation_Prompt.md` and
 * `docs/Simulator/MOLEMISI_Simulator_Specification.md`.
 */

import { USAGE, parseArgs } from './config';
import { assertTargetAllowed, SafetyError } from './safety';
import { run } from './run';
import type { RunConfig } from './types';

async function main(): Promise<number> {
  const argv = process.argv;
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  let config: RunConfig;
  try {
    config = parseArgs(argv);
  } catch (err) {
    console.error(`${(err as Error).message}\n\n${USAGE}`);
    return 2;
  }

  // The safety rail runs before anything else.
  try {
    assertTargetAllowed(config.target, process.env);
  } catch (err) {
    if (err instanceof SafetyError) {
      console.error(err.message);
      return 2;
    }
    throw err;
  }

  console.log(
    `simulator: target=${config.target} cohort=${config.cohort} players=${config.players} ` +
      `days=${config.days} anchor=${config.anchor} seed=${config.seed}` +
      (config.safeguardsOnly ? ' safeguards-only' : ''),
  );

  const result = await run(config);

  // On an environment-precondition failure `run()` returns before writing the
  // reports. Saying "wrote ..." there is a lie that sends people looking for
  // files that do not exist.
  if (result.precondition && !result.precondition.ok) {
    console.error(
      `\nRun aborted on environment precondition. No population was registered and no ` +
        `report files were written to ${result.outDir}. See ENV_PRECONDITION_MISSING.txt.`,
    );
    return result.exitCode;
  }

  console.log(`\nwrote summary.md, raw_events.jsonl, safeguards.json to ${result.outDir}`);
  console.log(`events: ${result.events}`);

  const failed = result.checks.filter((c) => c.group !== 'gap' && !c.passed);
  const gaps = result.checks.filter((c) => c.group === 'gap');
  if (failed.length > 0) {
    console.error(`\n${failed.length} safeguard check(s) FAILED:`);
    for (const c of failed) console.error(`  [${c.group}] ${c.id} — ${c.name}: ${c.detail}`);
  }
  if (gaps.length > 0) {
    console.warn(`\n${gaps.length} known gap(s), reported not passed:`);
    for (const c of gaps) console.warn(`  ${c.id} — ${c.name}: ${c.detail}`);
  }

  return result.exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exitCode = 2;
  });
