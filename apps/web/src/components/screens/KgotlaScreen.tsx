'use client';

import React, { useState } from 'react';
import { useKgotla } from '../../lib/kgotla';
import { useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';

/**
 * NPC portrait — generated PixelLab art, served from /assets/sprites/npcs/.
 *
 * Two art sources:
 *   - `{id}.png`      : the full 32x64 bust, used in the council chamber seats.
 *   - `{id}_head.png` : a 48x48 close-up head, used in the quest dialogue modal.
 *
 * The council chamber puts these portraits centre-stage: they ARE the
 * cozyness and the identity of the Kgotla, so they are rendered large and
 * warmly framed. If a portrait is missing we degrade to an initials crest
 * rather than a broken image, so the hall never looks broken.
 *
 * `tall` switches the frame to the portrait's native 1:2 aspect (the source
 * art is a 32x64 bust) so it fills its carved frame instead of floating in a
 * square — used in the council seats. `head` swaps to the square close-up
 * head art (used in the dialogue modal).
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
    // image-rendering: pixelated keeps the pixel-art portrait crisp at display size
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
 * A carved wooden seat framing one council member's portrait. This is the
 * identity tile of the whole screen — the portrait sits in a warm wood frame,
 * and the active (speaking) member gets a gold ring so the eye knows who holds
 * the floor.
 */
function CouncilSeat({
  id,
  name,
  role,
  tier,
  size = 72,
  active = false,
  onClick,
}: {
  id: string;
  name: string;
  role: string;
  tier: string;
  size?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`group flex flex-col items-center text-center transition-all active:scale-95 ${
        active ? 'scale-[1.04]' : ''
      }`}
    >
      <div
        className={`relative p-1.5 rounded-sm border-2 shadow-[2px_2px_0_rgba(0,0,0,0.55)] transition-all
          bg-gradient-to-b from-wood-medium to-wood-dark border-wood-border
          ${active ? 'ring-2 ring-gold-currency ring-offset-2 ring-offset-black/30' : 'group-hover:border-primary/60'}`}
      >
        <NpcPortrait id={id} name={name} size={size} />
      </div>
      <span className="mt-1.5 font-headline text-xs text-cream-surface font-bold leading-tight block max-w-[7rem] truncate">
        {name}
      </span>
      <span className="font-mono text-[10px] text-cream-surface/90 block max-w-[7rem] truncate">
        {role}
      </span>
      <span className="font-mono text-[10px] text-primary mt-0.5 block">★ {tier}</span>
    </button>
  );
}

export function KgotlaScreen() {
  const { setActiveNav } = useGame();
  const { tl } = useTranslation();
  const {
    npcs,
    projects,
    botho,
    journal,
    elder,
    contribution,
    loading,
    talk,
    completeQuest,
    donate,
  } = useKgotla();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = npcs.find((n) => n.id === selectedId) ?? null;

  const openNpc = async (id: string) => {
    setSelectedId(id);
    setBusy(true);
    const t = await talk(id);
    setDialogue(t?.message ?? null);
    setBusy(false);
  };

  const closeNpc = () => {
    setSelectedId(null);
    setDialogue(null);
  };

  const pct = (cur: number, req: number) => Math.max(0, Math.min(100, Math.round((cur / req) * 100)));
  const donateBlocked = !!contribution && contribution.remainingToday <= 0;

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-24 md:pb-10">
      {/* Background — the generated Kgotla gathering-place scene, warmed with a
          vignette and a low firelight glow so the chamber feels lived-in. */}
      <div className="fixed left-0 right-0 bottom-0 top-0 z-0">
        <img
          alt="Kgotla gathering place"
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

      {/* Top HUD — Botho (the single standing number, D5) + Field Journal */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-lg">🤝</span>
          <div>
            <span className="font-headline text-xs text-primary uppercase font-bold block">Botho</span>
            <span className="font-mono text-[11px] text-gold-currency font-bold">
              {botho ? botho.current : '—'}
              {botho?.next
                ? ` → ${botho.next.label ?? botho.next.value} (${botho.next.remaining})`
                : botho
                  ? ' · maxed'
                  : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-sm">📖</span>
          <span className="font-mono text-[11px] text-cream-surface/90 font-bold">
            {journal ? `${journal.pagesComplete}/${journal.totalPages}` : '—'} pages
          </span>
        </div>
      </div>

      {/* Orientation — tells the player, up front, what the Kgotla is for. */}
      <div className="relative z-10 px-4 pt-2">
        <div className="bg-wood-dark/80 px-3 py-2 border border-wood-border font-body text-xs text-cream-surface/90 leading-snug">
          {tl('kgotlaIntro')}
        </div>
        {botho && (
          <div className="mt-2 bg-wood-dark/80 px-3 py-1.5 border border-wood-border font-mono text-[11px] text-cream-surface/90">
            Botho earned today: {botho.earnedToday}/{botho.dailyCap} · {botho.remainingToday} left
          </div>
        )}
        {elder && (
          <div className="mt-2 bg-primary-container/80 px-3 py-2 border border-primary">
            <div className="font-mono text-[10px] uppercase text-primary font-bold mb-0.5">
              Elder&apos;s guidance
            </div>
            <p className="font-body text-[12px] text-on-primary-container leading-snug">{elder.english}</p>
            {elder.setswana && (
              <p className="font-body text-xs text-on-primary-container/85 mt-0.5">{elder.setswana}</p>
            )}
          </div>
        )}
      </div>

      {/* 1) THE COUNCIL — portraits centre-stage, in carved wooden seats on a
            dais. Selecting a member opens the quest dialogue (portrait + words)
            as a modal: two columns on desktop, a sheet on top on mobile. */}
      <section className="relative z-10 px-4 py-4">
        <h2 className="font-headline text-sm text-cream-surface uppercase mb-1">
          {tl('speakWithElders')}
        </h2>
        <p className="font-mono text-[10px] text-cream-surface/90 mb-3">{tl('communityHub')}</p>

        {npcs.length === 0 && !loading && (
          <div className="bg-wood-dark/70 p-4 border border-wood-border text-center font-body text-xs text-cream-surface/90">
            {tl('talkToNpcs')}
          </div>
        )}

        {/* The dais the council sits on */}
        <div className="bg-gradient-to-b from-wood-dark/70 to-wood-dark/40 border-y border-wood-border py-4">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-5">
            {npcs.map((n) => (
              <CouncilSeat
                key={n.id}
                id={n.id}
                name={n.name}
                role={n.role}
                tier={n.tier}
                size={72}
                active={selectedId === n.id}
                onClick={() => openNpc(n.id)}
              />
            ))}
          </div>
        </div>

        {!selected && npcs.length > 0 && !loading && (
          <p className="mt-3 bg-wood-dark/60 px-3 py-2 border border-wood-border font-mono text-[11px] text-cream-surface/90 text-center">
            {tl('councilHint')}
          </p>
        )}
      </section>

      {/* 2) THE VILLAGE DECIDES — support a community project. */}
      <section className="relative z-10 px-4 pb-4 max-w-md mx-auto">
        <h2 className="font-headline text-sm text-cream-surface uppercase mb-1">
          {tl('supportProject')}
        </h2>
        <p className="font-mono text-[10px] text-cream-surface/90 mb-2">
          {tl('villageDecidesHint')}
        </p>
        {contribution && (
          <div className="bg-wood-dark/80 px-3 py-1.5 border border-wood-border font-mono text-[11px] text-cream-surface/90 mb-2">
            {tl('pulaPerDay')}: {contribution.contributedToday}/{contribution.dailyCap} ·{' '}
            {contribution.remainingToday} left
          </div>
        )}
        {donateBlocked && (
          <div className="bg-surface-container-high/80 px-3 py-1.5 border border-wood-border mb-2 font-mono text-[11px] text-cream-surface/90">
            {tl('dailyLimitReached')}
          </div>
        )}
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="bg-wood-dark/95 px-3 py-2 border border-wood-border">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-headline text-xs text-cream-surface font-bold truncate">{p.name}</span>
                {p.completed && (
                  <span className="font-mono text-[10px] text-status-success font-bold uppercase shrink-0">Done</span>
                )}
              </div>
              <p className="font-body text-[10px] text-cream-surface/90 mb-1 truncate">{p.description}</p>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-surface-container-lowest overflow-hidden">
                  <div
                    className="h-full bg-status-success transition-all"
                    style={{ width: `${pct(p.currentContributions, p.requiredContributions)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-cream-surface/90 shrink-0">
                  {p.currentContributions}/{p.requiredContributions}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-primary truncate">Reward: {p.reward}</span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    disabled={donateBlocked}
                    onClick={() => donate(p.id, 10)}
                    className="px-2 py-1 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                  >
                    +10
                  </button>
                  <button
                    disabled={donateBlocked}
                    onClick={() => donate(p.id, 50)}
                    className="px-2 py-1 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && !loading && (
            <div className="bg-wood-dark/70 p-4 border border-wood-border text-center font-body text-xs text-cream-surface/90">
              No community projects right now.
            </div>
          )}
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

      {/* Quest dialogue — NPC portrait + words in a modal. Two columns on
          desktop (portrait | words); on mobile it is a sheet laid on top of the
          screen. Dismiss by tapping the dim backdrop or the ✕. */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
        >
          {/* Dim backdrop — tap anywhere outside the card to dismiss */}
          <button
            type="button"
            aria-label={tl('leave')}
            onClick={closeNpc}
            className="absolute inset-0 bg-black/70 cursor-default"
          />

          <div className="relative w-full md:max-w-2xl bg-wood-dark border-t-2 md:border-2 border-wood-border shadow-[4px_4px_0_rgba(0,0,0,0.6)] flex flex-col md:flex-row max-h-[90vh] md:max-h-[82vh] overflow-y-auto rounded-t-2xl md:rounded-2xl animate-slide-up">
            {/* Portrait column — the NPC's close-up head portrait, not a sprite icon */}
            <div className="flex items-center justify-center p-5 bg-gradient-to-b from-wood-dark/60 to-wood-dark/30 border-b md:border-b-0 md:border-r border-wood-border md:w-56 md:shrink-0">
              <div className="p-1.5 bg-gradient-to-b from-wood-medium to-wood-dark border-2 border-wood-border rounded-sm shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                <NpcPortrait id={selected.id} name={selected.name} size={108} head />
              </div>
            </div>

            {/* Words column */}
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
              <span className="font-mono text-[11px] text-primary uppercase block mb-3">
                {selected.role} · ★ {selected.tier}
              </span>

              <p className="font-body text-xs text-cream-surface leading-relaxed bg-surface-container-lowest/60 p-3 border border-wood-border/50 mb-4 overflow-y-auto">
                &ldquo;{dialogue ?? selected.greeting}&rdquo;
              </p>

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const t = await talk(selected.id);
                    setDialogue(t?.message ?? null);
                    setBusy(false);
                  }}
                  className="w-full py-2 bg-surface-container-high text-cream-surface/90 font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                >
                  {tl('askGuidance')}
                </button>
                <button
                  disabled={busy}
                  onClick={() => completeQuest(selected.id)}
                  className="w-full py-2 bg-primary text-wood-dark font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                >
                  {tl('takeQuest')}
                </button>
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

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#210e0b]/70">
          <p className="font-headline text-sm text-primary uppercase font-bold">{tl('kgotla')}…</p>
        </div>
      )}
    </div>
  );
}
