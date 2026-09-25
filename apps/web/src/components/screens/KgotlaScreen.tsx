'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getItemDef } from '@molemisi/game-config';
import { useKgotla } from '../../lib/kgotla';
import type { ChargeBoardRow, ChargeView, KgotlaNpc } from '../../lib/kgotla';
import { useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';

/**
 * NPC portrait — generated PixelLab art, served from /assets/sprites/npcs/.
 *
 * Two art sources:
 *   - `{id}.png`      : the full 32x64 bust, used in the council chamber seats.
 *   - `{id}_head.png` : a 48x48 close-up head, used in the dialogue sheet.
 *
 * The council chamber puts these portraits centre-stage: they ARE the cozyness and
 * the identity of the Kgotla, so they are rendered large and warmly framed. If a
 * portrait is missing we degrade to an initials crest rather than a broken image
 * (AC-13), so the hall never looks broken.
 */
function NpcPortrait({
  id,
  name,
  size = 72,
  tall = false,
  head = false,
}: {
  id: string;
  name: string;
  size?: number;
  tall?: boolean;
  head?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const px = {
    width: size,
    height: head ? size : tall ? size * 2 : size,
  } as const;
  const src = head
    ? `/assets/sprites/npcs/${id}_head.png`
    : `/assets/sprites/npcs/${id}.png`;

  if (broken) {
    return (
      <div
        className="flex items-center justify-center bg-primary-container text-on-primary-container font-headline shrink-0 rounded-sm"
        style={{ ...px, fontSize: size * 0.4, lineHeight: 1 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className="object-contain shrink-0 rounded-sm"
      style={{ ...px, imageRendering: 'pixelated' as const }}
      onError={() => setBroken(true)}
    />
  );
}

/**
 * SPEC §4 — regard renders as five stars AND the tier word AND progress to the
 * next tier. Never a star beside a bare word, never the raw number alone.
 *
 * The tier word is always present, so the star glyph is never the only signal
 * (accessibility §9).
 */
function starsFor(reputation: number): number {
  if (reputation < 0) return 0;
  if (reputation >= 100) return 5;
  if (reputation >= 75) return 4;
  if (reputation >= 50) return 3;
  if (reputation >= 25) return 2;
  return 1;
}

function RegardLine({
  reputation,
  tier,
  toNext,
  nextTier,
}: {
  reputation: number;
  tier: string;
  toNext: number | null;
  nextTier: string | null;
}) {
  const { tl } = useTranslation();
  const filled = starsFor(reputation);
  const stars = '★'.repeat(filled) + '☆'.repeat(5 - filled);

  return (
    <span className="font-mono text-[10px] text-primary mt-0.5 block max-w-[8rem] leading-tight">
      <span aria-hidden="true">{stars}</span>
      <span className="block">
        {tier}
        {toNext !== null && nextTier ? ` · ${toNext} ${tl('regardToNext')} ${nextTier}` : ''}
      </span>
    </span>
  );
}

/**
 * A carved wooden seat framing one council member. This is the identity tile of
 * the whole screen. The active (speaking) member gets a gold ring so the eye knows
 * who holds the floor.
 *
 * `aria-expanded` (not `aria-pressed`): the seat opens a dialogue, it is not a
 * toggle (§9).
 */
function CouncilSeat({
  npc,
  size = 72,
  active = false,
  raised = false,
  onOpen,
  buttonRef,
}: {
  npc: KgotlaNpc;
  size?: number;
  active?: boolean;
  raised?: boolean;
  onOpen: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const { tl } = useTranslation();
  const filled = starsFor(npc.reputation);
  const label = `${npc.name}, ${npc.role}, ${npc.tier}, ${filled} ${
    filled === 1 ? 'star' : 'stars'
  }`;

  return (
    <button
      ref={buttonRef}
      onClick={onOpen}
      aria-expanded={active}
      aria-label={label}
      className={`group flex flex-col items-center text-center transition-all active:scale-95 ${
        active ? 'scale-[1.04]' : ''
      }`}
    >
      <div
        className={`relative p-1.5 rounded-sm border-2 shadow-[2px_2px_0_rgba(0,0,0,0.55)] transition-all
          bg-gradient-to-b from-wood-medium to-wood-dark
          ${raised ? 'border-gold-currency' : 'border-wood-border'}
          ${active ? 'ring-2 ring-gold-currency ring-offset-2 ring-offset-black/30' : 'group-hover:border-primary/60'}`}
      >
        <NpcPortrait id={npc.id} name={npc.name} size={size} />
      </div>
      <span className="mt-1.5 font-headline text-xs text-cream-surface font-bold leading-tight block max-w-[7rem] truncate">
        {npc.name}
      </span>
      <span className="font-mono text-[10px] text-cream-surface/90 block max-w-[7rem] truncate">
        {npc.role}
      </span>
      <RegardLine
        reputation={npc.reputation}
        tier={npc.tier}
        toNext={npc.toNext}
        nextTier={npc.nextTier}
      />
      {/* §4.1 — decay is visible. Nobody is silently punished. */}
      {npc.decayWarning && (
        <span className="mt-0.5 font-mono text-[9px] text-status-warning block max-w-[8rem] leading-tight">
          {tl('regardFading')}
        </span>
      )}
    </button>
  );
}

/** Human-readable objective, composed from translated fragments (§10). */
function objectiveText(
  charge: ChargeView,
  tl: (k: Parameters<ReturnType<typeof useTranslation>['tl']>[0]) => string,
): string {
  const { kind, itemSlug, targetQty } = charge.objective;
  if (kind === 'errand') {
    const def = itemSlug ? getItemDef(itemSlug) : undefined;
    return `${tl('objectiveBring')} ${targetQty} ${def?.setswana ?? itemSlug ?? ''}`.trim();
  }
  if (kind === 'contribute') {
    return `${tl('objectiveGive')} ${targetQty} ${tl('objectiveToProject')}`;
  }
  return `${tl('objectiveSell')} ${targetQty} ${tl('objectiveOfGoods')}`;
}

function rewardText(
  charge: ChargeView,
  tl: (k: Parameters<ReturnType<typeof useTranslation>['tl']>[0]) => string,
): string {
  const r = charge.rewards;
  const parts = [
    r.pula > 0 ? `${r.pula} Pula` : null,
    r.botho > 0 ? `${r.botho} Botho` : null,
    r.chapterTokens > 0 ? `${r.chapterTokens} ${tl('rewardTokens')}` : null,
    r.regard > 0 ? `+${r.regard} ${tl('regard')}` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function KgotlaScreen() {
  const { setActiveNav, inventory } = useGame();
  const { tl } = useTranslation();
  const {
    npcs,
    projects,
    board,
    botho,
    journal,
    elder,
    contribution,
    feastStatus,
    loading,
    councilError,
    busyId,
    talk,
    accept,
    turnIn,
    donate,
    donateVillageFeast,
    reload,
  } = useKgotla();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [questAvailable, setQuestAvailable] = useState<boolean | null>(null);
  const [talkBusy, setTalkBusy] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selected = npcs.find((n) => n.id === selectedId) ?? null;
  const selectedCharge: ChargeView | null = selected?.charge ?? null;

  // AC-12 — Elder Neo heads the council: raised, centred, its own row.
  const head = useMemo(() => npcs.find((n) => n.id === 'elder_neo') ?? null, [npcs]);
  const rest = useMemo(() => npcs.filter((n) => n.id !== 'elder_neo'), [npcs]);

  const openNpc = async (id: string) => {
    setSelectedId(id);
    setDialogue(null);
    setQuestAvailable(null);
    setTalkBusy(true);
    const t = await talk(id);
    setDialogue(t?.message ?? null);
    setQuestAvailable(t?.questAvailable ?? null);
    setTalkBusy(false);
  };

  const closeNpc = () => {
    setSelectedId(null);
    setDialogue(null);
    setQuestAvailable(null);
  };

  // AC-10 — Escape closes the sheet; focus is trapped inside while open and
  // restored to the seat that opened it on close.
  useEffect(() => {
    if (!selectedId) return;
    const node = dialogRef.current;
    const opener = seatRefs.current[selectedId] ?? null;
    node?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
        setDialogue(null);
        setQuestAvailable(null);
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [selectedId]);

  const pct = (cur: number, req: number) =>
    Math.max(0, Math.min(100, Math.round((cur / req) * 100)));

  const poolSpent = !!board && board.poolRemaining <= 0;
  const donateBlocked = !!contribution && contribution.remainingToday <= 0;

  // Doc 11 §4 — the feast takes exactly 20 watermelons (the server re-checks the
  // count and refuses anything else), so the button is live only when they are
  // actually in the basket. Botho only; the copy never quotes a Pula figure.
  const melons = inventory.find((i) => i.itemType === 'watermelon')?.quantity ?? 0;
  const feastBusy = busyId === 'feast';
  const canFeast = melons >= 20 && !feastBusy && !loading;
  const showSkeleton = loading && npcs.length === 0;

  /** One row of the quest board (AC-16). */
  const BoardRow = ({ row }: { row: ChargeBoardRow }) => {
    const busy = busyId === row.npcId;
    const canAccept = row.status === 'none' && !poolSpent && !busy;
    const canTurnIn = row.status === 'active' && row.ready && !busy;

    return (
      <div className="bg-wood-dark/95 px-3 py-2 border border-wood-border">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-headline text-xs text-cream-surface font-bold truncate">
            {row.name}
          </span>
          <span className="font-mono text-[10px] text-primary shrink-0">
            {row.status === 'claimed'
              ? tl('chargeDone')
              : row.status === 'active'
                ? row.ready
                  ? tl('chargeReady')
                  : tl('chargeInFlight')
                : tl('chargeNone')}
          </span>
        </div>

        <p className="font-body text-[11px] text-cream-surface/90 mt-0.5">
          {objectiveText(row, tl)}
        </p>

        {row.status !== 'none' && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full bg-status-success transition-all"
                style={{
                  width: `${pct(row.progress, row.objective.targetQty)}%`,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-cream-surface/90 shrink-0">
              {Math.min(row.progress, row.objective.targetQty)} {tl('progressOf')}{' '}
              {row.objective.targetQty}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="font-mono text-[10px] text-gold-currency truncate">
            {tl('questReward')}: {rewardText(row, tl)}
          </span>
          {canAccept && (
            <button
              onClick={() => accept(row.npcId)}
              className="px-2 py-1 bg-primary text-wood-dark font-mono text-[10px] uppercase font-bold active:translate-y-0.5 shrink-0"
            >
              {tl('takeQuest')}
            </button>
          )}
          {canTurnIn && (
            <button
              onClick={() => turnIn(row.npcId)}
              className="px-2 py-1 bg-gold-currency text-wood-dark font-mono text-[10px] uppercase font-bold active:translate-y-0.5 shrink-0"
            >
              {tl('turnIn')}
            </button>
          )}
          {busy && (
            <span className="font-mono text-[10px] text-cream-surface/70 shrink-0">…</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-24 md:pb-10">
      {/* Background — the generated Kgotla gathering-place scene, warmed with a
          vignette and a low firelight glow so the chamber feels lived-in. */}
      <div className="fixed left-0 right-0 bottom-0 top-0 z-0">
        <img
          alt=""
          className="w-full h-full object-cover object-center"
          src="/assets/tiles/sky/kgotla.png"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/60 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,143,0,0.22),transparent_70%)] pointer-events-none" />
      </div>

      {/* Council-hall header plaque */}
      <header className="relative z-10 pt-4 px-4">
        <div className="mx-auto max-w-md bg-wood-dark/90 border-2 border-wood-border px-4 py-2 text-center shadow-[3px_3px_0_rgba(0,0,0,0.5)]">
          <h1 className="font-headline text-lg text-cream-surface uppercase tracking-wide">
            {tl('kgotla')}
          </h1>
          <p className="font-mono text-[10px] text-primary uppercase mt-0.5">
            {tl('kgotlaSubtitle')}
          </p>
        </div>
      </header>

      {/* Botho meter (AC-06) — current · next pillar · today's remaining. One line,
          not three stacked blocks. The daily cap is a legal control (I4): shown. */}
      <div className="relative z-10 px-4 py-2">
        <div className="mx-auto max-w-2xl flex items-stretch gap-2">
          <div className="flex-1 bg-wood-dark/90 px-3 py-2 border border-wood-border">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-headline text-xs text-primary uppercase font-bold">
                Botho
              </span>
              <span className="font-mono text-[11px] text-gold-currency font-bold">
                {botho ? botho.current : '—'}
                {botho?.next
                  ? ` → ${botho.next.label ?? botho.next.value} (${botho.next.remaining})`
                  : botho
                    ? ` · ${tl('maxed')}`
                    : ''}
              </span>
            </div>
            {botho && (
              <div className="font-mono text-[10px] text-cream-surface/90 mt-0.5">
                {tl('bothoEarnedToday')}: {botho.earnedToday}/{botho.dailyCap} ·{' '}
                {botho.remainingToday} {tl('leftToday')}
              </div>
            )}
          </div>
          <div className="bg-wood-dark/90 px-3 py-2 border border-wood-border flex flex-col justify-center shrink-0">
            <span className="font-mono text-[10px] text-primary uppercase font-bold">
              {tl('journal')}
            </span>
            <span className="font-mono text-[11px] text-cream-surface/90 font-bold">
              {journal ? `${journal.pagesComplete}/${journal.totalPages}` : '—'}{' '}
              {tl('pages')}
            </span>
          </div>
        </div>
      </div>

      {/* Doc 11 §4 — the Village Feast (Nako ya Go Arogana): 20 watermelons shared
          with the village for CAPPED Botho and a keepsake fence. No Pula moves in
          either direction — sharing is not a transaction. */}
      <div className="relative z-10 px-4 mt-2">
        <div className="mx-auto max-w-2xl bg-wood-dark/80 px-3 py-2 border border-wood-border">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase text-primary font-bold block">
                {tl('villageFeast')}
              </span>
              <p className="font-body text-[12px] text-cream-surface/90 leading-snug">
                {tl('villageFeastBlurb')}
              </p>
            </div>
            <button
              onClick={() => donateVillageFeast()}
              disabled={!canFeast}
              className={`shrink-0 px-3 py-2 border font-mono text-[10px] uppercase font-bold ${
                canFeast
                  ? 'bg-primary-container text-on-primary-container border-primary active:translate-y-0.5'
                  : 'bg-surface-container-high/50 border-wood-border opacity-50 cursor-not-allowed'
              }`}
            >
              {feastBusy ? '…' : tl('feastDonate')}
            </button>
          </div>
          <p className="font-mono text-[9px] text-on-surface-variant mt-1">
            🍉 {melons}/20 · {tl('feastNeedMelons')}
          </p>
          {/* Doc 11 §4 — the honour is permanent and shown once earned; the
              donation itself stays repeatable (capped Botho every time). */}
          {feastStatus?.isFriendOfTheFeast && (
            <p className="font-mono text-[9px] text-gold-currency mt-1">
              🍽️ {tl('friendOfTheFeast')}
              {feastStatus.hasFeastFence ? ` · ${tl('feastFenceOwned')}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Orientation — orientation yields to the thing it describes, so this sits
          below the meter and above nothing important. */}
      <div className="relative z-10 px-4">
        <div className="mx-auto max-w-2xl bg-wood-dark/80 px-3 py-2 border border-wood-border font-body text-xs text-cream-surface/90 leading-snug">
          {tl('kgotlaIntro')}
        </div>
        {elder && (
          <div className="mx-auto max-w-2xl mt-2 bg-primary-container/80 px-3 py-2 border border-primary">
            <div className="font-mono text-[10px] uppercase text-primary font-bold mb-0.5">
              {tl('eldersGuidance')}
            </div>
            <p className="font-body text-[12px] text-on-primary-container leading-snug">
              {elder.english}
            </p>
            {elder.setswana && (
              <p className="font-body text-xs text-on-primary-container/85 mt-0.5">
                {elder.setswana}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 1) THE COUNCIL — portraits centre-stage in carved seats. Elder Neo heads
            the council on its own raised row (AC-12). */}
      <section className="relative z-10 px-4 py-4">
        <h2 className="mx-auto max-w-2xl font-headline text-sm text-cream-surface uppercase mb-1">
          {tl('speakWithElders')}
        </h2>
        <p className="mx-auto max-w-2xl font-mono text-[10px] text-cream-surface/90 mb-3">
          {tl('communityHub')}
        </p>

        {/* AC-09 — a failed council fetch is an error with Retry, never an empty hall. */}
        {councilError && (
          <div className="mx-auto max-w-2xl bg-wood-dark/90 p-3 border border-status-danger text-center">
            <p className="font-body text-xs text-cream-surface/90 mb-2">
              {tl('councilUnavailable')}
            </p>
            <button
              onClick={() => reload()}
              className="px-3 py-1.5 bg-primary text-wood-dark font-mono text-[10px] uppercase font-bold active:translate-y-0.5"
            >
              {tl('retry')}
            </button>
          </div>
        )}

        {showSkeleton && !councilError && (
          <div className="mx-auto max-w-2xl bg-wood-dark/40 border-y border-wood-border py-4">
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-[72px] h-[72px] bg-wood-medium/40 rounded-sm" />
                  <div className="w-14 h-2 bg-wood-medium/40" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!showSkeleton && !councilError && npcs.length > 0 && (
          <div className="mx-auto max-w-2xl bg-gradient-to-b from-wood-dark/70 to-wood-dark/40 border-y border-wood-border py-4">
            {head && (
              <div className="flex justify-center mb-5">
                <CouncilSeat
                  npc={head}
                  size={88}
                  raised
                  active={selectedId === head.id}
                  onOpen={() => openNpc(head.id)}
                  buttonRef={(el) => {
                    seatRefs.current[head.id] = el;
                  }}
                />
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-5">
              {rest.map((n) => (
                <CouncilSeat
                  key={n.id}
                  npc={n}
                  size={72}
                  active={selectedId === n.id}
                  onOpen={() => openNpc(n.id)}
                  buttonRef={(el) => {
                    seatRefs.current[n.id] = el;
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!selected && npcs.length > 0 && !loading && (
          <p className="mx-auto max-w-2xl mt-3 bg-wood-dark/60 px-3 py-2 border border-wood-border font-mono text-[11px] text-cream-surface/90 text-center">
            {tl('councilHint')}
          </p>
        )}
      </section>

      {/* 2) THE QUEST BOARD — the shared pool of three, and every elder's charge. */}
      <section className="relative z-10 px-4 pb-4">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline text-sm text-cream-surface uppercase mb-1">
            {tl('chargeBoard')}
          </h2>
          {board && (
            <p className="font-mono text-[10px] text-cream-surface/90 mb-2">
              {board.poolRemaining}/{board.poolTotal} {tl('chargesRemaining')}
            </p>
          )}
          {poolSpent && (
            <div className="bg-wood-dark/80 px-3 py-1.5 border border-wood-border mb-2 font-body text-[11px] text-cream-surface/90">
              {tl('chargePoolSpent')}
            </div>
          )}
          <div className="space-y-2">
            {(board?.charges ?? []).map((row) => (
              <BoardRow key={row.npcId} row={row} />
            ))}
          </div>
        </div>
      </section>

      {/* 3) THE VILLAGE DECIDES — support a community project. The allowance is
            visible on load, before any Pula is spent (AC-07). */}
      <section className="relative z-10 px-4 pb-4">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline text-sm text-cream-surface uppercase mb-1">
            {tl('supportProject')}
          </h2>
          <p className="font-mono text-[10px] text-cream-surface/90 mb-2">
            {tl('villageDecidesHint')}
          </p>
          {contribution && (
            <div className="bg-wood-dark/80 px-3 py-1.5 border border-wood-border font-mono text-[11px] text-cream-surface/90 mb-2">
              {tl('pulaPerDay')}: {contribution.contributedToday}/{contribution.dailyCap} ·{' '}
              {contribution.remainingToday} {tl('leftToday')}
            </div>
          )}
          {donateBlocked && (
            <div className="bg-surface-container-high/80 px-3 py-1.5 border border-wood-border mb-2 font-mono text-[11px] text-cream-surface/90">
              {tl('dailyLimitReached')}
            </div>
          )}
          <div className="space-y-2">
            {projects.map((p) => {
              const busy = busyId === `project:${p.id}`;
              return (
                <div key={p.id} className="bg-wood-dark/95 px-3 py-2 border border-wood-border">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-headline text-xs text-cream-surface font-bold truncate">
                      {p.name}
                    </span>
                    {p.completed && (
                      <span className="font-mono text-[10px] text-status-success font-bold uppercase shrink-0">
                        {p.rewardClaimed ? tl('projectRewardClaimed') : tl('done')}
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[10px] text-cream-surface/90 mb-1 truncate">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 h-1.5 bg-surface-container-lowest overflow-hidden">
                      <div
                        className="h-full bg-status-success transition-all"
                        style={{
                          width: `${pct(p.currentContributions, p.requiredContributions)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-cream-surface/90 shrink-0">
                      {p.currentContributions}/{p.requiredContributions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-primary truncate">
                      {tl('questReward')}: {p.reward}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        disabled={donateBlocked || busy}
                        onClick={() => donate(p.id, 10)}
                        className="px-2 py-1 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                      >
                        +10
                      </button>
                      <button
                        disabled={donateBlocked || busy}
                        onClick={() => donate(p.id, 50)}
                        className="px-2 py-1 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && !loading && (
              <div className="bg-wood-dark/70 p-4 border border-wood-border text-center font-body text-xs text-cream-surface/90">
                {tl('noProjects')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Back to Farm */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-20">
        <button
          onClick={() => setActiveNav('Farm')}
          className="bg-wood-dark/90 px-3 py-2 border border-wood-border font-mono text-xs text-cream-surface active:scale-95"
        >
          {tl('backToFarm')}
        </button>
      </div>

      {/* Charge dialogue — portrait | words. Two columns on desktop; a sheet on
          mobile. Dismiss by backdrop, ✕, or Escape (AC-10). */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
        >
          <button
            type="button"
            aria-label={tl('leave')}
            onClick={closeNpc}
            className="absolute inset-0 bg-black/70 cursor-default"
          />

          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative w-full md:max-w-2xl bg-wood-dark border-t-2 md:border-2 border-wood-border shadow-[4px_4px_0_rgba(0,0,0,0.6)] flex flex-col md:flex-row max-h-[90vh] md:max-h-[82vh] overflow-y-auto rounded-t-2xl md:rounded-2xl motion-safe:animate-slide-up outline-none"
          >
            <div className="flex items-center justify-center p-5 bg-gradient-to-b from-wood-dark/60 to-wood-dark/30 border-b md:border-b-0 md:border-r border-wood-border md:w-56 md:shrink-0">
              <div className="p-1.5 bg-gradient-to-b from-wood-medium to-wood-dark border-2 border-wood-border rounded-sm shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                <NpcPortrait id={selected.id} name={selected.name} size={108} head />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-gold-currency text-wood-dark font-mono text-[10px] uppercase font-bold">
                  {tl('inDeliberation')}
                </span>
                <button
                  type="button"
                  onClick={closeNpc}
                  aria-label={tl('leave')}
                  className="text-cream-surface/70 hover:text-cream-surface text-base leading-none px-1"
                >
                  ✕
                </button>
              </div>

              <span className="font-headline text-base text-cream-surface font-bold block">
                {selected.name}
              </span>
              <span className="font-mono text-[11px] text-primary uppercase block mb-1">
                {selected.role}
              </span>
              <RegardLine
                reputation={selected.reputation}
                tier={selected.tier}
                toNext={selected.toNext}
                nextTier={selected.nextTier}
              />
              {/* `personality` is in the payload — the seat hides it, the sheet shows it. */}
              <span className="font-body text-[11px] text-cream-surface/80 block mb-3">
                {selected.personality}
              </span>

              <p className="font-body text-xs text-cream-surface leading-relaxed bg-surface-container-lowest/60 p-3 border border-wood-border/50 mb-3 overflow-y-auto">
                &ldquo;{dialogue ?? selected.greeting}&rdquo;
              </p>

              {selectedCharge && (
                <div className="bg-surface-container-lowest/60 p-3 border border-wood-border/50 mb-3">
                  <p className="font-body text-[11px] text-cream-surface/90">
                    {objectiveText(selectedCharge, tl)}
                  </p>
                  {selectedCharge.status !== 'none' && (
                    <p className="font-mono text-[10px] text-cream-surface/80 mt-1">
                      {Math.min(selectedCharge.progress, selectedCharge.objective.targetQty)}{' '}
                      {tl('progressOf')} {selectedCharge.objective.targetQty}
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-gold-currency mt-1">
                    {tl('questReward')}: {rewardText(selectedCharge, tl)}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  disabled={talkBusy}
                  onClick={async () => {
                    setTalkBusy(true);
                    const t = await talk(selected.id);
                    setDialogue(t?.message ?? null);
                    setQuestAvailable(t?.questAvailable ?? null);
                    setTalkBusy(false);
                  }}
                  className="w-full py-2 bg-surface-container-high text-cream-surface/90 font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                >
                  {tl('askGuidance')}
                </button>

                {/* Honour `questAvailable` from talk() — the button must not offer
                    a charge the server will refuse (§5.1). */}
                {selectedCharge?.status === 'none' && questAvailable !== false && (
                  <button
                    disabled={busyId === selected.id || poolSpent}
                    onClick={() => accept(selected.id)}
                    className="w-full py-2 bg-primary text-wood-dark font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                  >
                    {tl('takeQuest')}
                  </button>
                )}
                {selectedCharge?.status === 'active' && selectedCharge.ready && (
                  <button
                    disabled={busyId === selected.id}
                    onClick={() => turnIn(selected.id)}
                    className="w-full py-2 bg-gold-currency text-wood-dark font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                  >
                    {tl('turnIn')}
                  </button>
                )}
                {selectedCharge?.status === 'claimed' && (
                  <span className="w-full py-2 text-center font-mono text-[10px] uppercase text-status-success">
                    {tl('chargeDone')}
                  </span>
                )}

                <button
                  onClick={closeNpc}
                  className="py-2 px-4 bg-wood-medium text-cream-surface font-mono text-xs uppercase border border-wood-border active:translate-y-0.5"
                >
                  {tl('leave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
