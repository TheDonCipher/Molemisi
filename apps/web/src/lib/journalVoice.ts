'use client';

import { JOURNAL_LINES } from '@molemisi/game-config';

/**
 * Field Journal — Mogolo voice.
 *
 * The authoritative lines already live in @molemisi/game-config (bushveld.ts,
 * `JOURNAL_LINES`), written in Mogolo's voice per
 * docs/MOLEMISI_Field_Journal_Narrative_Voice_v1. Each line is one sentence of
 * physical sign followed by the cultural/practical beat ("Mogolo says…").
 *
 * Per the doc's §2/§6 the entry is: one line always (the sign) + one optional
 * collapsed second line ("Mogolo's Note"). No new fields, tables, or endpoints —
 * we simply split the existing line at the first sentence boundary.
 */

export interface MogoloEntry {
  /** The physical sign — always shown. */
  sign: string;
  /** The cultural/practical detail — "Mogolo's Note", collapsed by default. */
  note: string | null;
}

export function mogoloEntry(slug: string, fallbackName?: string): MogoloEntry {
  const line = JOURNAL_LINES[slug]?.journal;
  if (!line) {
    return {
      sign: fallbackName
        ? `Signs of ${fallbackName}. Mogolo only nods.`
        : 'Mogolo says the bush keeps its secrets until you walk it.',
      note: null,
    };
  }
  const idx = line.indexOf('. ');
  if (idx === -1) return { sign: line, note: null };
  return { sign: line.slice(0, idx + 1), note: line.slice(idx + 2) };
}

export function journalMeta(slug: string): { name: string; setswana: string } | null {
  const l = JOURNAL_LINES[slug];
  return l ? { name: l.name, setswana: l.setswana } : null;
}
