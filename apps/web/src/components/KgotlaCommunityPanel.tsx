'use client';

/**
 * The Kgotla community panel — the social half of the Kgotla (08 §5 / D5).
 *
 * Three tabs, all additive to the council hall below:
 *
 *   Talk    — the global chat. ONE shared channel for every player (B1).
 *             RULING (2026-10-04, third pass): NO moderation. There is no filter
 *             in the send path and nothing here hides a message. The only guard is
 *             anti-flood, so the send button goes quiet for a few seconds rather
 *             than spending a round trip the server will refuse.
 *   Events  — the seasonal live service (B3). The Event GRANTS the goods (D7
 *             defers crafting) and the Kgotla pays Chapter Tokens for the turn-in.
 *   Honours — the earned honorific ladder (B2). Display-only: it never grants an
 *             advantage, and nothing in the game can buy a rung.
 *
 * D4 identity split, applied here: the chat author line is the PLAYER name and
 * the player's avatar. The farm name never appears on this screen.
 *
 * Bilingual copy is written inline as Setswana + English pairs, the same way
 * StoreScreen does it, rather than adding translation keys per string.
 */

import React, { useState } from 'react';
import { useChat } from '../lib/chat';
import { useEvents } from '../lib/events';
import { useAchievements } from '../lib/achievements';
import { useAvatar } from '../lib/avatar';
import { AvatarSprite } from './AvatarSprite';

type Tab = 'talk' | 'events' | 'honours';

const TABS: Array<{ id: Tab; en: string; tn: string }> = [
  { id: 'talk', en: 'Talk', tn: 'Pula' },
  { id: 'events', en: 'Events', tn: 'Tiragayo' },
  { id: 'honours', en: 'Honours', tn: 'Lebaka' },
];

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-wood-dark/90 border-2 border-wood-border px-3 py-2.5 shadow-[3px_3px_0_rgba(0,0,0,0.5)]">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ talk -- */

function TalkPanel() {
  const { messages, loading, sending, language, setLanguage, cooldownSeconds, send } = useChat();
  const [draft, setDraft] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await send(draft);
    if (ok) setDraft('');
  };

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="font-headline text-xs text-primary uppercase font-bold">
          Mafoko otlhe a lekgotla a mantle
        </h3>
        <div className="flex shrink-0" role="group" aria-label="Language">
          {(['en', 'tn'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              aria-pressed={language === l}
              className={`px-2 py-1 font-mono text-[10px] uppercase border-2 ${
                language === l
                  ? 'bg-primary-container text-on-primary-container border-primary'
                  : 'bg-surface-container-high/40 text-on-surface-variant border-wood-border'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Fixed-height, scrollable, and pinned to the newest message at the end. */}
      <div
        className="overflow-y-auto bg-surface/70 border border-wood-border px-2 py-1.5 flex flex-col gap-1.5"
        style={{ maxHeight: 232 }}
        aria-live="polite"
        aria-label="Kgotla messages"
      >
        {loading && messages.length === 0 && (
          <p className="font-mono text-[10px] text-on-surface-variant">Loading the talk...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="font-mono text-[10px] text-on-surface-variant">
            No words yet. Be the first to greet the kgotla.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="font-body text-[12px] leading-snug">
            <span
              className={`font-mono text-[10px] font-bold ${m.mine ? 'text-gold-currency' : 'text-primary'}`}
            >
              {m.displayName}
            </span>
            <span className="text-cream-surface/90 ml-1.5 break-words">{m.body}</span>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-stretch gap-1.5 mt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={280}
          placeholder="Morago wa go bua... / Say something..."
          aria-label="Your message"
          className="flex-1 min-w-0 bg-surface text-cream-surface border-2 border-wood-border px-2 py-2 font-body text-[12px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || cooldownSeconds > 0 || draft.trim().length === 0}
          className="shrink-0 px-3 py-2 border-2 border-primary bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cooldownSeconds > 0 ? `${cooldownSeconds}s` : sending ? '...' : 'Send'}
        </button>
      </form>
      <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1">
        Shared by everyone in the kgotla. No filter — words are your own.
      </p>
    </Panel>
  );
}
/* ---------------------------------------------------------------- events -- */

function EventsPanel() {
  const { events, loading, claiming, claim } = useEvents();

  return (
    <Panel>
      <h3 className="font-headline text-xs text-primary uppercase font-bold mb-1.5">
        Tiragayo ya Motsweape · Ward events
      </h3>
      {loading && events.length === 0 && (
        <p className="font-mono text-[10px] text-on-surface-variant">Reading the ward board...</p>
      )}
      {!loading && events.length === 0 && (
        <p className="font-mono text-[10px] text-on-surface-variant">
          No event open this chapter. Come back when the ward calls.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {events.map((ev) => {
          const busy = claiming === ev.id;
          const done = Boolean(ev.claimed);
          return (
            <div key={ev.id ?? ev.slug} className="border border-wood-border bg-surface/60 px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-headline text-[13px] font-bold text-cream-surface">
                    {ev.name}
                  </div>
                  <div className="font-mono text-[10px] text-primary italic">{ev.setswana}</div>
                </div>
                <button
                  onClick={() => ev.id && claim(ev.id)}
                  disabled={done || busy || !ev.id}
                  className="shrink-0 px-3 py-2 border-2 border-primary bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {done ? 'Claimed' : busy ? '...' : 'Join'}
                </button>
              </div>
              <p className="font-body text-[12px] text-cream-surface/85 leading-snug mt-1">
                {ev.description}
              </p>
              <p className="font-mono text-[9px] text-on-surface-variant/80 mt-1">
                Grants {ev.grantQty} {ev.grantItem} · {ev.chapterTokenReward} chapter token
                {ev.chapterTokenReward === 1 ? '' : 's'} on turn-in
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
/* --------------------------------------------------------------- honours -- */

function HonoursPanel() {
  const { ladder, title, achievements, attainedCount, total, loading, evaluate } = useAchievements();
  const { avatar } = useAvatar();

  return (
    <Panel>
      <div className="flex items-center gap-3 mb-2">
        {avatar && (
          <AvatarSprite
            baseSprite={`/assets/${avatar.base.sprite}`}
            outfitKey={avatar.outfitKey}
            name={title?.title ?? 'Molemisi'}
            size={34}
          />
        )}
        <div className="min-w-0">
          <h3 className="font-headline text-xs text-primary uppercase font-bold">Lebaka · Honours</h3>
          <div className="font-mono text-[11px] text-gold-currency font-bold">
            {title?.title ?? 'Molemi'}
          </div>
          {title?.meaning && (
            <p className="font-body text-[11px] text-cream-surface/80 leading-snug">{title.meaning}</p>
          )}
        </div>
      </div>

      {/* Display-only by ruling (D10): it grants no advantage and is not
          purchasable — which is why nothing on this ladder has a price. */}
      <ol className="flex flex-col gap-1">
        {ladder.map((h) => (
          <li key={h.rung} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`w-4 text-center font-mono text-[12px] ${h.attained ? 'text-gold-currency' : 'text-on-surface-variant/50'}`}
            >
              {h.attained ? '★' : '☆'}
            </span>
            <span
              className={`font-mono text-[11px] ${h.attained ? 'text-cream-surface font-bold' : 'text-on-surface-variant'}`}
            >
              {h.title}
            </span>
            <span className="ml-auto font-mono text-[9px] text-on-surface-variant truncate">
              {h.meaning}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-wood-border">
        <span className="font-mono text-[10px] text-on-surface-variant">
          {loading ? '...' : `${attainedCount}/${total} earned`}
        </span>
        <button
          onClick={() => evaluate()}
          className="px-2.5 py-1.5 border-2 border-wood-border bg-surface-container-high/40 font-mono text-[10px] uppercase text-cream-surface"
        >
          Check again
        </button>
      </div>

      <ul className="flex flex-col gap-1 mt-2">
        {achievements.map((a) => (
          <li key={a.slug} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={`font-mono text-[11px] ${a.attained ? 'text-gold-currency' : 'text-on-surface-variant/50'}`}
            >
              {a.attained ? '✔' : '·'}
            </span>
            <span className="min-w-0">
              <span
                className={`font-mono text-[11px] block ${a.attained ? 'text-cream-surface font-bold' : 'text-on-surface-variant'}`}
              >
                {a.name}
              </span>
              <span className="font-body text-[11px] text-on-surface-variant/90 leading-snug">
                {a.description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------------ root -- */

export function KgotlaCommunityPanel() {
  const [tab, setTab] = useState<Tab>('talk');
  const { avatar } = useAvatar();

  return (
    <div className="relative z-10 px-4 pt-3">
      <div className="mx-auto max-w-2xl">
        {/* Tab bar, headed by the player's honorific + avatar — the social
            identity at the Kgotla (D4: player name + avatar, never farm name). */}
        <div className="flex items-stretch gap-1.5 mb-1.5">
          <div className="flex shrink-0 items-center gap-1.5 bg-wood-dark/90 border-2 border-wood-border px-2">
            {avatar && (
              <AvatarSprite
                baseSprite={`/assets/${avatar.base.sprite}`}
                outfitKey={avatar.outfitKey}
                size={18}
              />
            )}
            <span className="font-mono text-[10px] text-gold-currency font-bold uppercase">
              You
            </span>
          </div>
          <div className="flex-1 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`flex-1 py-2 border-2 ${
                  tab === t.id
                    ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                    : 'bg-wood-dark/80 text-on-surface-variant border-wood-border'
                }`}
              >
                <span className="font-mono text-[10px] uppercase block">{t.en}</span>
                <span className="font-mono text-[9px] italic block">{t.tn}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Only the active tab mounts, so the chat stops polling when it is not
            on screen (mobile-data discipline, `20 §5.4`). */}
        {tab === 'talk' && <TalkPanel />}
        {tab === 'events' && <EventsPanel />}
        {tab === 'honours' && <HonoursPanel />}
      </div>
    </div>
  );
}
