/**
 * The ONE deliberate exception to "everything goes through the API".
 *
 * Simulated time is advanced by back-dating the relevant `_at` columns in the
 * test database, then calling the real endpoints that already compute state from
 * elapsed time — so the game's own logic resolves the result rather than a
 * parallel implementation of it.
 *
 * This is done over PostgREST (plain `fetch`) rather than a Postgres driver, so
 * the package adds no dependency: `PATCH /rest/v1/<table>?<filter>` with the
 * service-role key.
 *
 * WHICH COLUMNS, AND WHY (verified against the services that read them):
 *   - `farms.last_simulated_at` drives the whole elapsed-time pass: crop growth
 *     (delegated to `waterService.advanceFarmGrowth`, which itself reads
 *     `last_sim`), livestock decay, building timers, weather and season.
 *   - `crafting_jobs.started_at` is separate because crafting is computed ON READ
 *     from `started_at`; the elapsed-time pass does not complete jobs. Without
 *     this, a 4-hour Bupi never finishes and the crafting report is fiction.
 *
 * Columns that would DOUBLE-COUNT are deliberately excluded: `crop_instances.
 * planted_at` is not back-dated, because growth is elapsed-driven from
 * `last_simulated_at`, not wall-clock minus planted_at.
 */

import { ApiClient } from './client';
import type { RunConfig } from './types';

export interface BackDateTarget {
  table: string;
  /** Column to rewrite. */
  column: string;
  /** Filter column on the target table. */
  filterColumn: string;
  /**
   * Which identifier to filter on. Not every table is farm-scoped: `crafting_jobs`
   * is keyed by `player_id` (verified against migration
   * `20260908000019_p3_inventory_crafting.sql` and against the live schema, where
   * `crafting_jobs.farm_id` does not exist).
   */
  filterSource: 'farm' | 'player';
}

/** Conservative default set. Extend with `--backdate`, never by guessing. */
export const DEFAULT_BACKDATE_TARGETS: BackDateTarget[] = [
  { table: 'farms', column: 'last_simulated_at', filterColumn: 'id', filterSource: 'farm' },
  {
    table: 'crafting_jobs',
    column: 'started_at',
    filterColumn: 'player_id',
    filterSource: 'player',
  },
];

export class TimeMachineRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeMachineRequired';
  }
}

export class TimeMachine {
  private readonly rest: ApiClient;

  constructor(supabaseUrl: string, serviceKey: string) {
    // PostgREST is a separate surface from the NestJS app — no /api/v1 prefix.
    this.rest = new ApiClient(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1`, '');
    this.serviceKey = serviceKey;
  }

  private readonly serviceKey: string;

  private authHeaders(): Record<string, string> {
    return {
      apikey: this.serviceKey,
      authorization: `Bearer ${this.serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    };
  }

  /** Rewrite one column to an absolute ISO timestamp for every matching row. */
  async backDate(target: BackDateTarget, filterValue: string, iso: string): Promise<number> {
    const qs = `${target.filterColumn}=eq.${encodeURIComponent(filterValue)}`;
    const res = await fetch(`${this.rest.baseUrl}/${target.table}?${qs}`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify({ [target.column]: iso }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new TimeMachineRequired(
        `back-date of ${target.table}.${target.column} failed: HTTP ${res.status} ${text.slice(0, 200)}`,
      );
    }
    return res.status;
  }

  /**
   * Advance one player's farm by `hours`. Returns the ISO instant the columns were
   * set to, which is `now - hours` — the engine then computes `now - that` as elapsed.
   */
  async advance(
    playerId: string,
    farmId: string,
    hours: number,
    targets: BackDateTarget[] = DEFAULT_BACKDATE_TARGETS,
  ): Promise<string> {
    const iso = new Date(Date.now() - hours * 3_600_000).toISOString();
    for (const t of targets) {
      const value = t.filterSource === 'player' ? playerId : farmId;
      if (!value) continue;
      await this.backDate(t, value, iso);
    }
    return iso;
  }

  /**
   * Environment precondition (implementation prompt §0). Migration
   * `20260924000000_reconcile_market_prices_to_catalogue.sql` adds `morula`, which
   * had no `market_prices` row at all and therefore sold for P0. If it is missing,
   * the run would emit a wall of market failures that look like game bugs.
   */
  async probeMarketReconciliation(): Promise<{ ok: boolean; detail: string }> {
    const res = await fetch(`${this.rest.baseUrl}/market_prices?item_type=eq.morula&select=item_type,base_price`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      return { ok: false, detail: `probe failed: HTTP ${res.status}` };
    }
    const rows = (await res.json()) as unknown;
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) {
      return {
        ok: false,
        detail:
          'no market_prices row for "morula" — migration 20260924000000_reconcile_market_prices_to_catalogue.sql is not applied (ENV_PRECONDITION_MISSING)',
      };
    }
    return { ok: true, detail: `market_prices reconciled (morula present, ${list.length} row(s))` };
  }
}

/** Build a TimeMachine from run config, or explain precisely what is missing. */
export function timeMachineFromConfig(config: RunConfig): TimeMachine | null {
  const url = config.supabaseUrl;
  const key = config.supabaseServiceKey;
  if (!url || !key) {
    return null;
  }
  return new TimeMachine(url, key);
}
