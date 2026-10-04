/**
 * P1 — the seeding pipeline (W0.2).
 *
 * WHY THIS FILE EXISTS
 *   `pnpm db:seed` delegated to `ts-node src/database/seed.ts`, but that file did
 *   not exist — so the config canon could not be materialised and every P1
 *   verification was blocked. This restores the pipeline.
 *
 * WHAT IT SEEDS, AND FROM WHERE
 *   The single source of truth for every number and every item is
 *   `packages/game-config` (09 §4). This script READS that package and writes
 *   the rows the runtime expects, so the database can never drift from the
 *   config by a hand-edit.
 *
 *       game-config ITEMS      -> public.item_definitions + public.market_prices
 *       game-config CHAPTERS   -> public.chapters          (never clobbered)
 *       game-config constants  -> public.game_config       (numeric mirror)
 *
 * IDEMPOTENCE (the acceptance test, P1)
 *   Every write is an UPSERT on the table's natural key, so running the script
 *   twice leaves the database in the same state as running it once. `chapters`
 *   is seeded with DO NOTHING on conflict, because the chapter ROLLOVER job
 *   advances `starts_on`/`ends_on` and re-seeding must never drag a window
 *   backwards.
 *
 * USAGE
 *   pnpm db:seed                              (root — builds game-config first)
 *   cd apps/api && pnpm db:seed               (direct)
 *   ts-node src/database/seed.ts --dry-run    (report only, no writes)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ITEMS,
  CHAPTERS,
  COOP_TAX_RATE,
  STARTING_PLOTS,
  MAX_PLOTS,
  STARTING_PULA,
  STARTING_BOTHO,
  STARTING_STORAGE_TIER,
  STARTING_KAGISO,
  BOTHO_DAILY_CAP,
  LETSEMA_COOLDOWN_DAYS,
  KGOTLA_DAILY_CONTRIBUTION_CAP,
  LAND_LADDER_TOTAL,
  MAX_OFFLINE_HOURS,
  MARKET_PRICE_UPDATE_INTERVAL_HOURS,
  DAILY_TOP_UP_CAP_BWP,
  ACHIEVEMENTS,
} from '@molemisi/game-config';

/* ------------------------------------------------------------------ env ---- */

/**
 * Minimal `.env` reader. We deliberately do not depend on `dotenv` (it is only
 * a transitive dep of @nestjs/config); the parser handles the two shapes the
 * repo uses — `KEY=value` and `KEY="value"` — and never overrides a variable
 * already set in the real environment.
 */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/* ------------------------------------------------- catalogue projections --- */

/** item_definitions.category -> the coarse market bucket the Co-op uses. */
const MARKET_CATEGORY: Record<string, string> = {
  DIPEO: 'seed',
  DIJALO: 'crop',
  DIPHOLOGOLO: 'livestock',
  'DITSHIMOLOGO TSA NAGENG': 'material',
  DITSALO: 'crafted',
  DIKUNO: 'crafted',
  DIDIRISIWA: 'tool',
};

interface ItemRow {
  slug: string;
  name: string;
  setswana: string;
  category: string;
  base_value_pula: number;
  max_stack: number;
  is_tool: boolean;
  use_text: string;
  sprite: string;
}

interface PriceRow {
  item_type: string;
  item_name: string;
  base_price: number;
  current_price: number;
  category: string;
}

interface ChapterRow {
  slug: string;
  name: string;
  setswana: string;
  starts_on: string;
  ends_on: string;
}

interface ConfigRow {
  config_key: string;
  config_value: unknown;
  category: string;
  description: string;
}

function itemRows(): ItemRow[] {
  return Object.values(ITEMS).map((d) => ({
    slug: d.slug,
    name: d.name,
    setswana: d.setswana,
    category: d.category,
    base_value_pula: d.baseValue,
    max_stack: d.maxStack,
    is_tool: d.isTool,
    use_text: d.use,
    sprite: d.sprite,
  }));
}

/**
 * Every catalogue item with a positive base value becomes a Co-op price row.
 * `current_price` starts at the base value; the market drifts it on its own
 * 6-hour cycle thereafter, so seeding never fights the live price.
 */
function priceRows(): PriceRow[] {
  return Object.values(ITEMS)
    .filter((d) => d.baseValue > 0)
    .map((d) => ({
      item_type: d.slug,
      item_name: d.name,
      base_price: d.baseValue,
      current_price: d.baseValue,
      category: MARKET_CATEGORY[d.category] ?? 'material',
    }));
}

/**
 * The current occurrence window for a chapter, read on the Botswana calendar.
 * Mirrors `ChapterService.occurrenceWindow` — Pula wraps the year, the rest do
 * not. Seeded with DO NOTHING, so this only ever fills a missing template row.
 */
function chapterWindow(months: number[], now: Date): { start: string; end: string } {
  const first = months[0]!;
  const last = months[months.length - 1]!;
  const dm = now.getUTCMonth() + 1;
  const dy = now.getUTCFullYear();

  let year: number;
  if (first <= last) {
    year = dm < first ? dy : dm > last ? dy + 1 : dy;
  } else {
    year = dm === 1 ? dy - 1 : dy; // Nov/Dec of `dy`; Jan belongs to the previous year
  }

  const endYear = first <= last ? year : year + 1;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: iso(new Date(Date.UTC(year, first - 1, 1))),
    // Last day of the final month: 0-based month index `last` is the month AFTER.
    end: iso(new Date(Date.UTC(endYear, last, 0))),
  };
}

function chapterRows(now: Date): ChapterRow[] {
  return CHAPTERS.map((c) => {
    const w = chapterWindow(c.months, now);
    return { slug: c.slug, name: c.name, setswana: c.setswana, starts_on: w.start, ends_on: w.end };
  });
}

/** The D5 achievement catalog, materialised from game-config (data, not code). */
function achievementRows() {
  return ACHIEVEMENTS.map((a) => ({
    slug: a.slug,
    rung: a.rung,
    name: a.name,
    description: a.description,
    milestones: a.milestones,
  }));
}

/** The numeric canon, mirrored for admin/telemetry reads (06 §2). */
function configRows(): ConfigRow[] {
  const rows: Array<[string, unknown, string, string]> = [
    ['STARTING_PLOTS', STARTING_PLOTS, 'farm', 'Plots a new farm starts with (02 §6.5).'],
    ['MAX_PLOTS', MAX_PLOTS, 'farm', 'Maximum plots a farm can reach (02 §6.5).'],
    ['STARTING_PULA', STARTING_PULA, 'economy', 'Pula granted at signup (02 §6.6).'],
    ['STARTING_BOTHO', STARTING_BOTHO, 'economy', 'Botho at signup (02 §6.4).'],
    ['STARTING_STORAGE_TIER', STARTING_STORAGE_TIER, 'inventory', 'Storage tier at signup.'],
    ['STARTING_KAGISO', STARTING_KAGISO, 'bushveld', 'New scenes start settled (04 §4.2).'],
    [
      'COOP_TAX_RATE',
      COOP_TAX_RATE,
      'economy',
      "The Co-op's tax rate on every sale (02 §4.1) — 0.05, not 5.",
    ],
    ['BOTHO_DAILY_CAP', BOTHO_DAILY_CAP, 'economy', 'Botho cap per Botswana day (I4).'],
    ['LETSEMA_COOLDOWN_DAYS', LETSEMA_COOLDOWN_DAYS, 'kgotla', 'Letsema cooldown (02 §6.4).'],
    [
      'KGOTLA_DAILY_CONTRIBUTION_CAP',
      KGOTLA_DAILY_CONTRIBUTION_CAP,
      'kgotla',
      'Daily Kgotla contribution cap (Pula).',
    ],
    ['LAND_LADDER_TOTAL', LAND_LADDER_TOTAL, 'farm', 'Total Pula to reach 20 plots.'],
    ['MAX_OFFLINE_HOURS', MAX_OFFLINE_HOURS, 'simulation', 'Offline simulation clamp.'],
    [
      'MARKET_UPDATE_HOURS',
      MARKET_PRICE_UPDATE_INTERVAL_HOURS,
      'economy',
      'Hours between market price ticks.',
    ],
    ['DAILY_TOP_UP_CAP_BWP', DAILY_TOP_UP_CAP_BWP, 'monetisation', 'Daily real-money top-up cap.'],
  ];
  return rows.map(([config_key, config_value, category, description]) => ({
    config_key,
    config_value,
    category,
    description,
  }));
}

/* ------------------------------------------------------------------ main ---- */

/**
 * Find the repo `.env`, walking up from this file.
 *
 * The depth differs by invocation: `ts-node src/database/seed.ts` sits at
 * `apps/api/src/database`, while the compiled build sits at `apps/api/dist/database`.
 * A hardcoded `../../../.env` silently resolves to `apps/.env` under ts-node —
 * which is exactly the kind of quiet failure the old broken `db:seed` was.
 * Walking up to the first directory containing an env file is correct for both.
 */
function findEnvFile(startDir: string): string | undefined {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    for (const name of ['.env', '.env.local']) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

async function upsert(
  admin: SupabaseClient,
  table: string,
  rows: unknown[],
  onConflict: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`  [dry-run] ${table}: would upsert ${rows.length} row(s) on "${onConflict}"`);
    return;
  }
  if (rows.length === 0) {
    console.log(`  ${table}: nothing to seed`);
    return;
  }
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} seed failed: ${error.message}`);
  console.log(`  ${table}: upserted ${rows.length} row(s)`);
}

export async function seed(dryRun = false): Promise<void> {
  const envFile = findEnvFile(__dirname);
  if (envFile) loadEnvFile(envFile);

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required` +
        (envFile ? ` (read from ${envFile}).` : ` — no .env found above ${__dirname}.`),
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date();

  console.log(`Seeding Molemisi config from @molemisi/game-config${dryRun ? ' (dry run)' : ''}\n`);

  await upsert(admin, 'item_definitions', itemRows(), 'slug', dryRun);
  await upsert(admin, 'market_prices', priceRows(), 'item_type', dryRun);
  await upsert(admin, 'game_config', configRows(), 'config_key', dryRun);
  await upsert(admin, 'achievements', achievementRows(), 'slug', dryRun);

  // chapters: DO NOTHING on conflict so a rollover-advanced window is preserved.
  if (dryRun) {
    console.log(`  [dry-run] chapters: would insert-if-missing ${chapterRows(now).length} row(s)`);
  } else {
    const rows = chapterRows(now);
    const { error } = await admin
      .from('chapters')
      .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true });
    if (error) throw new Error(`chapters seed failed: ${error.message}`);
    console.log(`  chapters: ensured ${rows.length} template(s)`);
  }

  console.log('\nSeed complete. Re-running is a no-op.');
}

/* ts-node entry point — only run the CLI when invoked directly. */
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  seed(dryRun)
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(`\nSeed failed: ${(err as Error).message}`);
      process.exit(1);
    });
}
