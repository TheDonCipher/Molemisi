'use client';

import { useEffect, useState } from 'react';

/**
 * Field Journal discovery log.
 *
 * The server persists discoveries in `field_journal_entries` and reports the
 * COUNT (findsDiscovered/findsTotal) on the scene view, but the narrative voice
 * doc (§6) forbids new endpoints, so the client keeps the discovered slugs it
 * has seen via `collect()` and renders them from game-config's JOURNAL_LINES.
 *
 * localStorage-backed so the journal survives a reload. No new DB fields.
 */

export interface DiscoveredFind {
  slug: string;
  name: string;
  setswana: string;
  rarity: string;
  at: string;
}

const STORAGE_KEY = 'molemisi_discoveries';

let cache: DiscoveredFind[] | null = null;
const listeners = new Set<() => void>();

function read(): DiscoveredFind[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as DiscoveredFind[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: DiscoveredFind[]): void {
  cache = list;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* storage full / unavailable — keep in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

/**
 * Record a find. Returns true if it was new (first collection), matching the
 * doc's "materials get entries on first collection" rule.
 */
export function recordDiscovery(find: Omit<DiscoveredFind, 'at'>): boolean {
  const list = read();
  if (list.some((f) => f.slug === find.slug)) return false;
  write([{ ...find, at: new Date().toISOString() }, ...list]);
  return true;
}

export function clearDiscoveries(): void {
  write([]);
}

/** Reactive list of discovered finds, newest first. */
export function useDiscoveries(): DiscoveredFind[] {
  const [list, setList] = useState<DiscoveredFind[]>([]);

  useEffect(() => {
    setList(read());
    const listener = () => setList(read());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return list;
}
