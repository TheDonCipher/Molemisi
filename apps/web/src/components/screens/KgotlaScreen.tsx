'use client';

import React, { useState } from 'react';
import { useKgotla } from '../../lib/kgotla';
import { useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';

export function KgotlaScreen() {
  const { setActiveNav } = useGame();
  const { tl } = useTranslation();
  const { npcs, projects, botho, journal, elder, contribution, loading, talk, completeQuest, donate } =
    useKgotla();

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

  const pct = (cur: number, req: number) => Math.max(0, Math.min(100, Math.round((cur / req) * 100)));
  const donateBlocked = !!contribution && contribution.remainingToday <= 0;

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background */}
      <div className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-0">
        <img
          alt="Kgotla Gathering"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/kgotla_scene.png"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* Top HUD — Botho (the single standing number, D5) + Field Journal */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-lg">🤝</span>
          <div>
            <span className="font-headline text-xs text-primary uppercase font-bold block">Botho</span>
            <span className="font-mono text-[10px] text-gold-currency font-bold">
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
          <span className="font-mono text-[10px] text-on-surface-variant font-bold">
            {journal ? `${journal.pagesComplete}/${journal.totalPages}` : '—'} pages
          </span>
        </div>
      </div>

      {/* Botho daily cap (legal control, I4) + Elder's guidance (reads real state) */}
      <div className="relative z-10 px-4 space-y-2">
        {botho && (
          <div className="bg-wood-dark/80 px-3 py-1.5 border border-wood-border font-mono text-[10px] text-on-surface-variant">
            Botho earned today: {botho.earnedToday}/{botho.dailyCap} · {botho.remainingToday} left
          </div>
        )}
        {elder && (
          <div className="bg-primary-container/80 px-3 py-2 border border-primary">
            <div className="font-mono text-[9px] uppercase text-primary font-bold mb-0.5">
              Elder&apos;s guidance
            </div>
            <p className="font-body text-[12px] text-on-primary-container leading-snug">{elder.english}</p>
            {elder.setswana && (
              <p className="font-body text-[11px] text-on-primary-container/70 mt-0.5">{elder.setswana}</p>
            )}
          </div>
        )}
      </div>

      {/* NPCs */}
      <div className="relative z-10 px-4 py-4">
        <h3 className="font-headline text-sm text-cream-surface uppercase mb-2">{tl('communityHub')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => openNpc(n.id)}
              className="bg-wood-dark/85 p-3 border text-left transition-all active:scale-95 border-wood-border hover:border-primary/50"
            >
              <div className="font-headline text-xs text-cream-surface font-bold block truncate">{n.name}</div>
              <div className="font-mono text-[9px] text-on-surface-variant block">{n.role}</div>
              <div className="font-mono text-[9px] text-primary mt-1">
                ★ {n.tier} · {n.reputation}
              </div>
            </button>
          ))}
          {npcs.length === 0 && !loading && (
            <div className="col-span-2 bg-wood-dark/70 p-4 border border-wood-border text-center font-body text-xs text-on-surface-variant">
              {tl('talkToNpcs') ?? 'The Kgotla is quiet. Come back soon.'}
            </div>
          )}
        </div>
      </div>

      {/* Community Projects — the capped Letsema Pula sink (02 §9, F7) */}
      <div className="relative z-10 px-4 pb-4">
        <h3 className="font-headline text-sm text-cream-surface uppercase mb-2">Community Projects</h3>
        {contribution && (
          <div className="bg-wood-dark/80 px-3 py-1.5 border border-wood-border font-mono text-[10px] text-on-surface-variant mb-2">
            Given today: {contribution.contributedToday}/{contribution.dailyCap} Pula ·{' '}
            {contribution.remainingToday} left
          </div>
        )}
        <div className="space-y-2">
          {projects.map((p) => (
            <div key={p.id} className="bg-wood-dark/95 p-3 border border-wood-border">
              <div className="flex items-start justify-between mb-1">
                <span className="font-headline text-xs text-cream-surface font-bold">{p.name}</span>
                {p.completed && (
                  <span className="font-mono text-[9px] text-status-success font-bold uppercase">Done</span>
                )}
              </div>
              <p className="font-body text-[10px] text-on-surface-variant mb-2">{p.description}</p>
              <div className="flex justify-between font-mono text-[9px] text-on-surface-variant mb-0.5">
                <span>
                  {p.currentContributions}/{p.requiredContributions} Pula
                </span>
                <span>{pct(p.currentContributions, p.requiredContributions)}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container-lowest overflow-hidden mb-2">
                <div
                  className="h-full bg-status-success transition-all"
                  style={{ width: `${pct(p.currentContributions, p.requiredContributions)}%` }}
                />
              </div>
              <p className="font-mono text-[9px] text-primary mb-2">Reward: {p.reward}</p>
              <div className="flex gap-2">
                <button
                  disabled={donateBlocked}
                  onClick={() => donate(p.id, 10)}
                  className="flex-1 py-1.5 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                >
                  +10
                </button>
                <button
                  disabled={donateBlocked}
                  onClick={() => donate(p.id, 50)}
                  className="flex-1 py-1.5 bg-primary-container text-on-primary-container font-mono text-[10px] uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
                >
                  +50
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && !loading && (
            <div className="bg-wood-dark/70 p-4 border border-wood-border text-center font-body text-xs text-on-surface-variant">
              No community projects right now.
            </div>
          )}
        </div>
      </div>

      {/* NPC dialogue + quest */}
      {selected && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-md mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="text-center mb-3">
              <span className="font-headline text-sm text-cream-surface font-bold block">{selected.name}</span>
              <span className="font-mono text-[10px] text-primary uppercase block">
                {selected.role} · ★ {selected.tier}
              </span>
            </div>
            <p className="font-body text-xs text-cream-surface mb-3 leading-relaxed text-center bg-surface-container-lowest/60 p-2.5 border border-wood-border/50">
              &ldquo;{dialogue ?? selected.greeting}&rdquo;
            </p>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => completeQuest(selected.id)}
                className="flex-1 py-2 bg-primary text-wood-dark font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
              >
                Help (quest)
              </button>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setDialogue(null);
                }}
                className="py-2 px-4 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase border border-wood-border active:translate-y-0.5"
              >
                {tl('leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Farm */}
      <div className="fixed bottom-20 md:bottom-4 right-4 z-20">
        <button
          onClick={() => setActiveNav('Farm')}
          className="bg-wood-dark/90 px-3 py-2 border border-wood-border font-mono text-xs text-cream-surface active:scale-95"
        >
          {tl('backToFarm')}
        </button>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#210e0b]/70">
          <p className="font-headline text-sm text-primary uppercase font-bold">{tl('kgotla')}…</p>
        </div>
      )}
    </div>
  );
}
