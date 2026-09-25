'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, useGame } from '../../lib/gameState';
import { useKgotla } from '../../lib/kgotla';
import { useTranslation } from '../../lib/useTranslation';
import { useDiscoveries, DiscoveredFind } from '../../lib/discoveries';
import { mogoloEntry } from '../../lib/journalVoice';
import { getLastAction } from '../../lib/playerActions';
import { PROVERBS, selectReactiveProverb, type Proverb } from '@molemisi/game-config';

const RARITY_TONE: Record<string, string> = {
  common: 'border-wood-border text-on-surface-variant',
  uncommon: 'border-gold-currency/50 text-gold-currency',
  rare: 'border-primary/60 text-primary',
};

/**
 * A single Field Journal entry, in Mogolo's voice.
 *
 * Per the narrative-voice doc: one line always (the physical sign), plus an
 * optional "Mogolo's Note" collapsed by default (Progressive Disclosure).
 */
function DiscoveryEntry({ find }: { find: DiscoveredFind }) {
  const { tl } = useTranslation();
  const [open, setOpen] = useState(false);
  const entry = mogoloEntry(find.slug, find.name);
  const tone = RARITY_TONE[find.rarity] ?? RARITY_TONE.common;

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-[11px] text-cream-surface font-bold truncate">
          {find.name}
          {find.setswana ? (
            <span className="text-on-surface-variant font-normal"> · {find.setswana}</span>
          ) : null}
        </span>
        <span className={`font-mono text-[9px] uppercase shrink-0 px-1.5 py-0.5 border ${tone}`}>
          {find.rarity}
        </span>
      </div>

      {/* The sign — always shown. */}
      <p className="font-body text-[12px] text-cream-surface/90 italic leading-snug">
        {entry.sign}
      </p>

      {/* Mogolo's Note — collapsed by default. */}
      {entry.note && (
        <div className="mt-1.5">
          <button
            onClick={() => setOpen((v) => !v)}
            className="font-mono text-[9px] uppercase text-primary/80 hover:text-primary transition-colors"
            aria-expanded={open}
          >
            {open ? '▾ ' : '▸ '}
            {tl('mogoloNote')}
          </button>
          {open && (
            <p className="font-body text-[11px] text-on-surface-variant mt-1 leading-snug border-l-2 border-primary/30 pl-2">
              {entry.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * An accepted contract, shaped for the Journal's quest rows.
 * Mirrors `ActiveContract` in apps/api/src/contracts/contracts.service.ts — the
 * Journal used to render a hardcoded DEMO_QUESTS list, so its "Quests" section
 * was fiction (I7: the server owns contract state).
 */
interface JournalContract {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  done: boolean;
}

interface ActiveContractView {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number; current: number }>;
  completed: boolean;
}

export function JournalScreen() {
  const { farmId, setActiveNav } = useGame();
  const { journal, reload, feastStatus } = useKgotla();
  const { tl } = useTranslation();
  const discoveries = useDiscoveries();
  const [contracts, setContracts] = useState<JournalContract[]>([]);

  // Real accepted contracts — one progress number per contract (summed over its
  // requirements), so the row can still read "14/20" without inventing anything.
  useEffect(() => {
    if (!farmId) return;
    let cancelled = false;
    (async () => {
      try {
        const active = await apiFetch<ActiveContractView[]>(
          'GET',
          `/farms/${farmId}/contracts/active`,
        );
        if (cancelled || !Array.isArray(active)) return;
        setContracts(
          active.map((c) => ({
            id: c.id,
            title: c.name,
            description: c.description,
            icon: '📜',
            current: c.requirements.reduce((sum, r) => sum + r.current, 0),
            target: c.requirements.reduce((sum, r) => sum + r.quantity, 0),
            done: c.completed,
          })),
        );
      } catch {
        // Leave the section empty rather than filling it with sample contracts.
        if (!cancelled) setContracts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  // 03 §7 — Mogolo's proverb reacts to the player's most recent action. Falls
  // back to a rotating daily line when nothing notable was done this session.
  const firstProverb = PROVERBS[0] as Proverb;
  const [proverb, setProverb] = useState<Proverb>(firstProverb);
  const [showReactiveTag, setShowReactiveTag] = useState(false);

  useEffect(() => {
    const last = getLastAction();
    const reactive = selectReactiveProverb(last?.kind);
    if (reactive) {
      setProverb(reactive);
      setShowReactiveTag(true);
    } else {
      // Rotating daily proverb (04 §9.4): pick by day-of-year so it changes
      // once per day without any server state.
      const day = Math.floor(Date.now() / 86_400_000);
      setProverb(PROVERBS[day % PROVERBS.length] as Proverb);
      setShowReactiveTag(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const pages = journal?.pagesComplete ?? 0;
  const total = journal?.totalPages ?? 0;
  const pct = total > 0 ? Math.round((pages / total) * 100) : 0;

  return (
    <div className="w-full px-4 py-6 max-w-lg mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-lg text-primary uppercase font-bold">{tl('journal')}</h1>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          {tl('backToFarm')}
        </button>
      </div>

      {/* Mogolo's proverb (03 §7) — reacts to the player's last action. */}
      <section className="mb-6">
        <div className="bg-wood-dark p-4 border border-wood-border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-on-surface-variant uppercase">{tl('proverb')}</span>
            {showReactiveTag && (
              <span className="font-mono text-[9px] uppercase text-primary/80 px-1.5 py-0.5 border border-primary/30">
                {tl('basedOnRecent')}
              </span>
            )}
          </div>
          <p className="font-body text-[13px] text-cream-surface italic leading-snug">{proverb.setswana}</p>
          <p className="font-mono text-[10px] text-on-surface-variant mt-1 leading-snug">{proverb.english}</p>
          {proverb.confidence === 'low' && (
            <p className="font-mono text-[8px] text-on-surface-variant/70 mt-2">⚠ {tl('proverbReview')}</p>
          )}
        </div>
      </section>

      {/* Restoration progress — the C18 restoration arc. */}
      <section className="mb-6">
        <div className="bg-wood-dark p-4 border border-wood-border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-on-surface-variant uppercase">
              {tl('restoration')}
            </span>
            <span className="font-mono text-[11px] text-gold-currency font-bold">
              {pages}/{total} {tl('pages') || 'pages'}
            </span>
          </div>
          <div className="w-full h-3 bg-surface-container-lowest overflow-hidden border border-wood-border">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-[9px] text-on-surface-variant mt-2">
            {pct}% {tl('restored') || 'restored'}
          </p>
        </div>
      </section>

      {/* Doc 11 §3/§6 — the Deep Time layer: Water Whispers listened to, and the
          Guardian of Sesana honour once it is earned. A quiet counter, not a
          scoreboard: the whispers are +1 journal progress each, forever. */}
      <section className="mb-6">
        <div className="bg-wood-dark p-4 border border-wood-border">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-on-surface-variant uppercase">
              💧 {tl('whispersHeard')}
            </span>
            <span className="font-mono text-[11px] text-sky-blue font-bold">
              {journal?.whispers ?? 0}
            </span>
          </div>
          {journal?.isGuardianOfSesana ? (
            <p className="font-mono text-[10px] text-gold-currency mt-1">
              🌳 {tl('guardianEarned')}
            </p>
          ) : (
            // The requirement is stated, never hidden: the Heritage Tree gate is
            // the same sentence, so the player can see what the title is worth.
            <p className="font-mono text-[9px] text-on-surface-variant mt-1">
              {tl('guardianOnlyHint')}
            </p>
          )}
          {/* Doc 11 §4 — Friend of the Feast: a title the Journal keeps, once
              the first feast is shared. Cosmetic-adjacent, never a currency. */}
          {feastStatus?.isFriendOfTheFeast && (
            <p className="font-mono text-[10px] text-gold-currency mt-1">
              🍽️ {tl('friendOfTheFeast')}
            </p>
          )}
        </div>
      </section>

      {/* Discoveries — Mogolo's voice. */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          {tl('discoveries') || 'Discoveries'}
          {discoveries.length > 0 && (
            <span className="ml-2 text-primary">({discoveries.length})</span>
          )}
        </h2>
        {discoveries.length === 0 ? (
          <div className="bg-wood-dark p-6 border border-wood-border text-center">
            <span className="text-2xl">🪶</span>
            <p className="font-body text-[11px] text-on-surface-variant mt-2 italic leading-snug">
              {tl('journalEmpty')}
            </p>
          </div>
        ) : (
          <div className="bg-wood-dark border border-wood-border divide-y divide-wood-border/50">
            {discoveries.map((d) => (
              <DiscoveryEntry key={d.slug} find={d} />
            ))}
          </div>
        )}
      </section>

      {/* Quest log */}
      <section>
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          {tl('quests') || 'Quests'}
        </h2>
        {contracts.length === 0 ? (
          <div className="bg-wood-dark p-6 border border-wood-border text-center">
            <span className="text-2xl">📖</span>
            <p className="font-mono text-[10px] text-on-surface-variant mt-2">
              {tl('noQuests') || 'No quests yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-wood-dark border border-wood-border divide-y divide-wood-border/50">
            {contracts.map((q) => {
              const done = q.done;
              const complete = q.current >= q.target;
              return (
                <div key={q.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-cream-surface font-bold truncate">
                      {q.icon} {q.title}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase shrink-0 px-1.5 py-0.5 border ${
                        done
                          ? 'border-status-success/50 text-status-success'
                          : complete
                            ? 'border-gold-currency/50 text-gold-currency'
                            : 'border-wood-border text-on-surface-variant'
                      }`}
                    >
                      {done
                        ? tl('claimed') || 'Claimed'
                        : complete
                          ? tl('ready') || 'Ready'
                          : `${q.current}/${q.target}`}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-on-surface-variant mt-0.5 truncate">
                    {q.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
