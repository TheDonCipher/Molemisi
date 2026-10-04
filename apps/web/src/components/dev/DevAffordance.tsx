'use client';

import React, { useState } from 'react';
import { useDevTools, useLongPress } from '../../lib/dev';

/**
 * The contextual dev affordance (08 §9, D9; W10).
 *
 * D9: dev tools are placed *in* the game, not behind a walled `/dev` panel, so a
 * dev navigates by playing. This is that affordance — a small gear that is
 * **invisible to players**: `useDevTools().enabled` only becomes true when the API
 * confirms a dev/admin role, so for a player this component renders `null` and
 * costs nothing. A 403 is the expected path, not an error.
 *
 * Placement is contextual, per W10:
 *   - `calendar` — long-press the chapter header (the canonical D9 example) or
 *     tap the gear, to date-jump and validate I13;
 *   - `farm`      — spawn stock;
 *   - `kgotla`    — force-complete an active Charge.
 *
 * The shared state panel (W10.5) is on every surface, because a corrupt state is
 * diagnosed wherever it is noticed.
 *
 * SAFETY IS SHOWN, NOT ASSUMED. When the API reports the live project the panel
 * renders a loud banner and disables every mutating button, because the server
 * will refuse them anyway — the UI must not imply a tool is safe when it is not.
 */

export type DevSurface = 'farm' | 'kgotla' | 'calendar';

function Action({
  label,
  onClick,
  busy,
  disabled,
  hint,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="w-full text-left px-2.5 py-2.5 touch-secondary border-2 border-wood-border bg-surface-container-high/30 font-mono text-[11px] uppercase text-cream-surface disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? '...' : label}
      {hint && (
        <span className="block normal-case text-[10px] text-on-surface-variant/80">{hint}</span>
      )}
    </button>
  );
}

export function DevAffordance({ surface }: { surface: DevSurface }) {
  const dev = useDevTools();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grantQty, setGrantQty] = useState(10);
  const [grantSlug, setGrantSlug] = useState('sorghum_seed');
  const [jump, setJump] = useState('2026-11-15');

  const press = useLongPress(() => setOpen(true));

  // Invisible to players. This is the whole gating contract.
  if (!dev.enabled) return null;

  const guard = !dev.status?.toolsEnabled;
  const safe = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message || 'That dev action failed.');
    }
  };

  return (
    <>
      <button
        {...press}
        aria-label="Developer tools (long press)"
        title="Long press for developer tools"
        className="w-8 h-8 flex items-center justify-center border border-wood-border bg-wood-dark/80 text-on-surface-variant/70 shrink-0"
      >
        <span aria-hidden="true" className="text-xs">
          ⚙
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-3">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto border-2 border-primary bg-wood-dark/95 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="font-headline text-xs text-primary uppercase font-bold">
                Dev · {surface}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close developer tools"
                className="w-9 h-9 border border-wood-border font-mono text-xs text-cream-surface"
              >
                ✕
              </button>
            </div>
            <DevBody surface={surface} guard={guard} error={error} dev={dev} jump={jump} setJump={setJump} grantSlug={grantSlug} setGrantSlug={setGrantSlug} grantQty={grantQty} setGrantQty={setGrantQty} safe={safe} />
            <DevReport dev={dev} />
          </div>
        </div>
      )}
    </>
  );
}
/**
 * The panel body, split out purely to keep the component readable — it holds no
 * state of its own.
 */
function DevBody(props: {
  surface: DevSurface;
  guard: boolean;
  error: string | null;
  dev: ReturnType<typeof useDevTools>;
  jump: string;
  setJump: (v: string) => void;
  grantSlug: string;
  setGrantSlug: (v: string) => void;
  grantQty: number;
  setGrantQty: (v: number) => void;
  safe: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const {
    surface,
    guard,
    error,
    dev,
    jump,
    setJump,
    grantSlug,
    setGrantSlug,
    grantQty,
    setGrantQty,
    safe,
  } = props;

  return (
    <>
      {guard && (
        <p className="mb-2 border-2 border-status-error bg-status-error/20 px-2 py-1.5 font-mono text-[10px] text-status-error">
          LIVE PROJECT — tools disabled. Point SUPABASE_URL at a throwaway stack.
        </p>
      )}
      {dev.status?.clockOverridden && (
        <p className="mb-2 border-2 border-gold-currency/60 bg-surface-container-high/40 px-2 py-1.5 font-mono text-[10px] text-gold-currency">
          Clock offset {Math.round((dev.status.clockOffsetMs ?? 0) / 3600000)}h
        </p>
      )}
      {error && (
        <p className="mb-2 border-2 border-status-warning bg-status-warning/15 px-2 py-1.5 font-mono text-[10px] text-status-warning">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {surface === 'calendar' && (
          <>
            <input
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              aria-label="Target date"
              className="w-full bg-surface border-2 border-wood-border px-2 py-2 font-mono text-[11px] text-cream-surface"
            />
            <Action
              label="Jump date"
              hint="Re-derives the chapter and zeroes tokens past a rollover (I13)"
              busy={dev.busy === 'date-jump'}
              disabled={guard}
              onClick={() => safe(() => dev.dateJump(jump))}
            />
            <Action
              label="Back to real time"
              busy={dev.busy === 'clock-reset'}
              disabled={guard}
              onClick={() => safe(() => dev.resetClock())}
            />
          </>
        )}

        {surface === 'farm' && (
          <>
            <div className="flex gap-1.5">
              <select
                value={grantSlug}
                onChange={(e) => setGrantSlug(e.target.value)}
                aria-label="Item to spawn"
                className="flex-1 bg-surface border-2 border-wood-border px-2 py-2 font-mono text-[11px] text-cream-surface"
              >
                <option value="sorghum_seed">Sorghum seed</option>
                <option value="maize_seed">Maize seed</option>
                <option value="water">Water</option>
                <option value="poleto">Poleto (plank)</option>
                <option value="wood">Wood</option>
              </select>
              <input
                type="number"
                min={1}
                value={grantQty}
                onChange={(e) => setGrantQty(Number(e.target.value))}
                aria-label="Quantity"
                className="w-20 bg-surface border-2 border-wood-border px-2 py-2 font-mono text-[11px] text-cream-surface"
              />
            </div>
            <Action
              label="Spawn items"
              hint="Uses the sanctioned writer, so caps still apply"
              busy={dev.busy === 'grant'}
              disabled={guard}
              onClick={() => safe(() => dev.grant(grantSlug, grantQty))}
            />
          </>
        )}

        {surface === 'kgotla' && (
          <Action
            label="Complete active Charge"
            hint="Marks the quest claimed and pays capped Botho"
            busy={dev.busy === 'charge'}
            disabled={guard}
            onClick={() => safe(() => dev.completeCharge())}
          />
        )}

        <Action
          label="Scan game state"
          hint="The seven corruption classes + the named recovery action"
          busy={dev.busy === 'state'}
          onClick={() => safe(() => dev.refreshState())}
        />
</div>
    </>
  );
}

/** The corruption-class report, rendered under the actions (W10.5). */
/** The corruption-class report, rendered under the actions (W10.5). */
function DevReport({ dev }: { dev: ReturnType<typeof useDevTools> }) {
  if (!dev.report) return null;
  return (
    <div className="mt-2 pt-2 border-t border-wood-border">
      <p
        className={`font-mono text-[11px] ${
          dev.report.valid ? 'text-status-success' : 'text-status-error'
        }`}
      >
        {dev.report.valid ? 'State is clean.' : dev.report.summary}
      </p>
      {dev.report.issues.map((i, k) => (
        <p key={k} className="font-mono text-[10px] text-cream-surface/85">
          {i.code}
        </p>
      ))}
      {dev.report.recovery.map((r, k) => (
        <p key={k} className="font-mono text-[10px] text-on-surface-variant">
          → {String(r.kind ?? '')} {String(r.description ?? '')}
        </p>
      ))}
    </div>
  );
}

/**
 * The D9 long-press host: wrap a REAL screen element and a long press opens the
 * dev panel. Used on the Almanac's chapter header, so the affordance is found by
 * playing rather than by hunting for a menu.
 */
export function DevLongPressZone({
  surface,
  children,
  className = '',
}: {
  surface: DevSurface;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const press = useLongPress(() => setOpen(true));

  return (
    <div {...press} className={className}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-3">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto overflow-x-hidden border-2 border-primary bg-wood-dark/95 p-3">
            <DevAffordance surface={surface} />
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full touch-secondary border-2 border-wood-border bg-wood-dark/95 py-2.5 font-mono text-[11px] uppercase text-cream-surface"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
