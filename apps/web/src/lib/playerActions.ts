import type { PlayerActionKind } from '@molemisi/game-config';

const KEY = 'molemisi_last_action';

export interface RecordedAction {
  kind: PlayerActionKind;
  at: number;
}

let memory: RecordedAction | null = null;

/**
 * Record the player's most recent meaningful action so the Journal can show a
 * proverb that responds to what they just did (03 §7). Persisted to localStorage
 * (like discoveries) so it survives a refresh; read via `getLastAction`.
 *
 * This is cosmetic only — it never touches the server. The proverb TEXTS
 * themselves still need a native-speaker Setswana pass (see bushveld.ts PROVERBS).
 */
export function recordAction(kind: PlayerActionKind): void {
  const entry: RecordedAction = { kind, at: Date.now() };
  memory = entry;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(entry));
    } catch {
      /* ignore */
    }
  }
}

export function getLastAction(): RecordedAction | null {
  if (memory) return memory;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) memory = JSON.parse(raw) as RecordedAction;
    } catch {
      /* ignore */
    }
  }
  return memory;
}
