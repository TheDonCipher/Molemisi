/**
 * The event log. Built before any player-behaviour code, because every report is
 * an aggregation over it — "a new question later is a new query, not a new
 * tracking feature".
 *
 * One `SimEvent` per simulated action, success or failure, streamed to
 * `raw_events.jsonl` and retained in memory for the report pass.
 */

import { appendFileSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ActionResult, SimEvent, System } from './types';

export const EVENTS_FILENAME = 'raw_events.jsonl';

export class EventLog {
  private readonly file: string;
  private readonly buffer: SimEvent[] = [];

  constructor(readonly outDir: string) {
    mkdirSync(outDir, { recursive: true });
    this.file = join(outDir, EVENTS_FILENAME);
    writeFileSync(this.file, '');
  }

  append(event: SimEvent): void {
    this.buffer.push(event);
    appendFileSync(this.file, `${JSON.stringify(event)}\n`);
  }

  /** Convenience writer so actor code reads as one line per action. */
  record(params: {
    simulatedDay: number;
    realDate: string;
    playerId: string;
    profile: SimEvent['profile'];
    system: System;
    action: string;
    result: ActionResult;
    metadata?: Record<string, unknown>;
  }): void {
    this.append({
      timestamp: new Date().toISOString(),
      simulatedDay: params.simulatedDay,
      realDate: params.realDate,
      playerId: params.playerId,
      profile: params.profile,
      system: params.system,
      action: params.action,
      result: params.result,
      metadata: params.metadata ?? {},
    });
  }

  get events(): readonly SimEvent[] {
    return this.buffer;
  }

  get size(): number {
    return this.buffer.length;
  }
}

/** Read a log back off disk — reports must be reproducible from the file alone. */
export function readEventLog(outDir: string): SimEvent[] {
  const file = join(outDir, EVENTS_FILENAME);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as SimEvent);
}
