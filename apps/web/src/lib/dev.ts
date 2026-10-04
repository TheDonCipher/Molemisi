'use client';

/**
 * In-game dev tools — client half (08 §9, D9; W10).
 *
 * D9 ruled the affordances belong *inside* the real screens, not behind a walled
 * `/dev` page, so a dev navigates by playing the game.
 *
 * THE GATING IS THE IMPORTANT PART. `enabled` starts **false** and only becomes
 * true when `GET /dev/status` answers with a dev/admin role. A player never sees
 * a gear, never renders the panel, and cannot call the routes (they are behind
 * `DevGuard` regardless). A 403 — the normal response for a player — leaves the
 * UI exactly as it was, so the dev affordances are not merely hidden but absent.
 *
 * `status.toolsEnabled` carries the second safety fact: the server will refuse to
 * mutate anything while attached to the live project. The UI surfaces that as a
 * warning rather than pretending the tool is usable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './gameState';

export interface DevStatus {
  role: string;
  userId: string;
  email: string;
  serverTime: string;
  wallClock: string;
  clockOverridden: boolean;
  clockOffsetMs: number;
  isLiveProject: boolean;
  toolsEnabled: boolean;
  env: string;
}

export interface DevStateReport {
  valid: boolean;
  summary: string;
  issues: Array<{ code: string; message: string; entity?: string }>;
  recovery: Array<{ kind?: string; description?: string; [k: string]: unknown }>;
}

export function useDevTools() {
  const [status, setStatus] = useState<DevStatus | null>(null);
  /** False until the API proves this account is dev/admin. Never optimistically true. */
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<DevStateReport | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await apiFetch<DevStatus>('GET', '/dev/status');
      setStatus(s);
      setEnabled(true);
    } catch {
      // A player gets a 403 here. That is the expected path, not an error.
      setStatus(null);
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const run = useCallback(async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(label);
    try {
      return await fn();
    } catch (e: any) {
      // Surface the server's plain-language refusal (e.g. the live-project guard).
      throw e;
    } finally {
      setBusy(null);
    }
  }, []);

  const dateJump = useCallback(
    (date: string) =>
      run('date-jump', async () => {
        const data = await apiFetch<DevStatus & { chapter: unknown; rollover: unknown }>(
          'POST',
          '/dev/date-jump',
          { date },
        );
        await loadStatus();
        return data;
      }),
    [loadStatus, run],
  );

  const resetClock = useCallback(
    () =>
      run('clock-reset', async () => {
        const data = await apiFetch<{ now: string }>('POST', '/dev/clock/reset');
        await loadStatus();
        return data;
      }),
    [loadStatus, run],
  );

  const refreshState = useCallback(
    () =>
      run('state', async () => {
        const data = await apiFetch<DevStateReport>('GET', '/dev/state');
        setReport(data);
        return data;
      }),
    [run],
  );

  const grant = useCallback(
    (slug: string, qty: number) =>
      run('grant', async () => {
        const data = await apiFetch<{ added: number; overflow: number }>(
          'POST',
          '/dev/inventory/grant',
          { slug, qty },
        );
        return data;
      }),
    [run],
  );

  const completeCharge = useCallback(
    () =>
      run('charge', async () => {
        const data = await apiFetch<{ questId: string; bothoAwarded: number }>(
          'POST',
          '/dev/kgotla/complete-charge',
        );
        return data;
      }),
    [run],
  );

  return {
    enabled,
    status,
    busy,
    report,
    dateJump,
    resetClock,
    refreshState,
    grant,
    completeCharge,
    reload: loadStatus,
  };
}

/**
 * A long-press recogniser for the contextual dev affordances (D9: "long-press
 * any date / the chapter header"). 600 ms with a 12 px slop tolerance, so an
 * ordinary scroll or a tap never triggers it.
 */
export function useLongPress(onLongPress: () => void, ms = 600) {
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      clear();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, ms);
      const move = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - startX) > 12 || Math.abs(ev.clientY - startY) > 12) clear();
      };
      const up = () => {
        clear();
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}