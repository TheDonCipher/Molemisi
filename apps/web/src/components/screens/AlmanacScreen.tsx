'use client';

/**
 * The Almanac — the calendar EDUCATION surface (08 §8, D8; W8.4 / B6).
 *
 * This screen exists to teach the real year: the **twelve Setswana months** and
 * the **four `Sekala sa …` chapters**, why each chapter matters to a farmer, and
 * how long is left before the next rollover.
 *
 * All of it is read from `@molemisi/game-config` — `SETSWANA_MONTHS`,
 * `CHAPTERS`, `chapterForDate`, `daysUntilChapterEnd`, `botswanaMonth` — which
 * is the single source of truth (`09 §4`). The screen computes **no dates and no
 * calendar logic of its own**; it renders what the config says. That is why it
 * needs no month-notes copy to be complete: the month NAMES are the data, and
 * they are ruled correct.
 *
 * The chapter illustration tiles are new art (`calendar_*` keys in
 * `assets/manifest.json`); until they are generated each tile falls back to the
 * chapter's slug, so the grid never shows a hole.
 */

import React, { useState } from 'react';
import {
  CHAPTERS,
  SETSWANA_MONTHS,
  botswanaMonth,
  chapterForDate,
  daysUntilChapterEnd,
} from '@molemisi/game-config';
import { WorldTree } from '../WorldTree';
import { DevAffordance, DevLongPressZone } from '../dev/DevAffordance';

/** The four chapter verbs (D2): Begin · Give · Keep · Leave. */
const VERBS: Record<string, { en: string; tn: string }> = {
  pula: { en: 'Begin', tn: 'Tshoma' },
  phane: { en: 'Give', tn: 'Naya' },
  moriti: { en: 'Keep', tn: 'Tshoma' },
  letlhafula: { en: 'Leave', tn: 'Tloga' },
};

const NOTE_TILE: Record<string, string> = {
  pula: 'calendar_pula_note',
  phane: 'calendar_phane_note',
  moriti: 'calendar_moriti_note',
  letlhafula: 'calendar_letlhafula_note',
};

function ChapterTile({ slug }: { slug: string }) {
  const [broken, setBroken] = useState(false);
  const src = `/assets/ui/calendar/${NOTE_TILE[slug]}.png`;
  if (broken) {
    return (
      <div
        aria-hidden="true"
        className="h-20 w-full flex items-center justify-center bg-surface-container-high/60 border border-wood-border"
      >
        <span className="font-mono text-[10px] uppercase text-on-surface-variant">{slug}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="w-full h-20 object-cover border border-wood-border"
      style={{ imageRendering: 'pixelated' as const }}
      onError={() => setBroken(true)}
    />
  );
}
export function AlmanacScreen({ botho = 0, bothoGoal = 500 }: { botho?: number; bothoGoal?: number }) {
  const now = new Date();
  const chapter = chapterForDate(now);
  const monthIndex = botswanaMonth(now); // 1-12
  const currentMonthName = SETSWANA_MONTHS[monthIndex - 1] ?? '';
  const daysLeft = daysUntilChapterEnd(now);
  const verb = VERBS[chapter.slug] ?? { en: '', tn: '' };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-4 py-4 pb-24 space-y-4">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="font-headline text-base text-cream-surface font-bold uppercase">
            Kalantari · Almanac
          </h1>
          <span className="font-mono text-[10px] text-on-surface-variant italic">Nako ya Sesana</span>
        </div>
        <img
          src="/assets/ui/calendar/almanac_header.png"
          alt=""
          className="h-10 w-auto"
          style={{ imageRendering: 'pixelated' as const }}
          onError={(e) => {
            // Placeholder until the art lands — the header text carries the screen.
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </header>

      {/* Explicit gear as well as the long-press: discoverable without guessing. */}
      <div className="flex justify-end">
        <DevAffordance surface="calendar" />
      </div>

      {/* D9: the chapter header is the canonical long-press target — it is the
          thing a dev wants to jump. The affordance is invisible to players. */}
      <DevLongPressZone surface="calendar" className="contents">
        <section className="border-2 border-primary bg-primary-container/80 px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="font-headline text-sm font-bold text-on-primary-container uppercase">
            Sekala sa {chapter.name}
          </span>
          <span className="font-mono text-[11px] text-on-primary-container/90">
            {currentMonthName} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to rollover
          </span>
        </div>
        <p className="font-body text-[13px] text-on-primary-container leading-snug mt-1">
          {chapter.character}
        </p>
        <p className="font-mono text-[10px] text-on-primary-container/80 mt-1">
          This chapter is <strong>{verb.en}</strong> — {verb.tn}.
        </p>
      </section>
      </DevLongPressZone>

      {/* The twelve Setswana months, in calendar order, current one marked. */}
      <section className="border-2 border-wood-border bg-wood-dark/90 px-3 py-2.5">
        <h2 className="font-headline text-xs text-primary uppercase font-bold mb-2">
          Maebele a Setswana · The twelve months
        </h2>
        <ol className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {SETSWANA_MONTHS.map((name, i) => {
            const monthNo = i + 1;
            const isCurrent = monthNo === monthIndex;
            const inChapter = chapter.months.includes(monthNo);
            return (
              <li
                key={name}
                aria-current={isCurrent ? 'date' : undefined}
                className={`px-2 py-1.5 border text-center ${
                  isCurrent
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : inChapter
                      ? 'border-wood-border bg-surface/50 text-cream-surface/85'
                      : 'border-wood-border/50 bg-surface/30 text-on-surface-variant'
                }`}
              >
                <span className="font-mono text-[11px] block leading-tight">{name}</span>
                <span className="font-mono text-[9px] opacity-70 block">{monthNo}</span>
              </li>
            );
          })}
        </ol>
        <p className="font-mono text-[9px] text-on-surface-variant/70 mt-2">
          Highlighted: this month. Outlined: the months in this Sekala.
        </p>
      </section>

      {/* The four chapters, each with what it means for the farm. */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHAPTERS.map((c) => {
          const isCurrent = c.slug === chapter.slug;
          return (
            <article
              key={c.slug}
              className={`border-2 px-2.5 py-2 ${
                isCurrent ? 'border-gold-currency bg-wood-dark/95' : 'border-wood-border bg-wood-dark/80'
              }`}
            >
              <ChapterTile slug={c.slug} />
              <h3 className="font-headline text-[13px] font-bold text-cream-surface mt-1.5">
                Sekala sa {c.name}
                {isCurrent && (
                  <span className="font-mono text-[9px] uppercase text-gold-currency ml-1.5">now</span>
                )}
              </h3>
              <p className="font-mono text-[10px] text-primary italic">
                {VERBS[c.slug]?.en} · {VERBS[c.slug]?.tn}
              </p>
              <p className="font-body text-[12px] text-cream-surface/85 leading-snug mt-0.5">
                {c.character}
              </p>
              <p className="font-mono text-[9px] text-on-surface-variant/70 mt-1">
                {c.months.join(' · ')} · token: {c.tokenName}
              </p>
            </article>
          );
        })}
      </section>

      {/* The macro goal (D2): a different meter from the Bushveld's per-scene one. */}
      <WorldTree botho={botho} bothoGoal={bothoGoal} projectsCompleted={0} projectsTotal={4} />

      <img
        src="/assets/ui/calendar/month_strip.png"
        alt=""
        className="w-full h-6 object-cover opacity-80"
        style={{ imageRendering: 'pixelated' as const }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
