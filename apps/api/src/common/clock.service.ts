import { Injectable } from '@nestjs/common';

/**
 * The one clock every time-dependent system should read.
 *
 * WHY THIS EXISTS. D9 ruled that dev affordances live *in* the game (a long-press
 * on the calendar header jumps the date), so validating I13 — "Chapter Tokens
 * expire to zero at chapter end" — must not require waiting a season. That needs
 * a clock that can be moved. Rather than sprinkle `new Date()` overrides through
 * call sites, the offset lives here and the systems read `clock.now()`.
 *
 * IT IS AN OFFSET, NOT A REPLACEMENT. `now()` returns wall-clock time shifted by
 * `offsetMs`. Resetting is exact and leaves no residue in any system.
 *
 * THE STANDING HAZARD (`09 §7`). A simulator pointed at the live project creates
 * real accounts and writes real rows. `isLiveProjectUrl` is the pure predicate
 * the dev tools use to refuse to run against production.
 */
@Injectable()
export class ClockService {
  private offsetMs = 0;

  /** Wall-clock time, shifted by any dev override. */
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  /** Move the clock so that `now()` returns `target`. Returns the new offset. */
  set(target: Date): number {
    this.offsetMs = target.getTime() - Date.now();
    return this.offsetMs;
  }

  reset(): void {
    this.offsetMs = 0;
  }

  get isOverridden(): boolean {
    return this.offsetMs !== 0;
  }

  get offset(): number {
    return this.offsetMs;
  }
}

/**
 * Is this Supabase URL the LIVE project? Pure, so it is unit-testable without a
 * database — the dev tools' "never point at the live project" guard is a
 * correctness claim, not a convention.
 *
 * Local Supabase (`localhost`, `127.0.0.1`, the Kong container host) is a
 * throwaway stack and is always safe. A hosted URL (`*.supabase.co`,
 * `*.supabase.in`) is production.
 */
export function isLiveProjectUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('localhost') || u.includes('127.0.0.1') || u.includes('kong')) return false;
  return u.includes('supabase.co') || u.includes('supabase.in');
}