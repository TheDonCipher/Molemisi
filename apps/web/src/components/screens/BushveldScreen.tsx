'use client';

import React, { useState } from 'react';
import { useBushveld, BushveldHotspot } from '../../lib/bushveld';
import { useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';
import { PixelSprite } from '../PixelSprite';
import { PixelUiIcon } from '../PixelUiIcon';
import { ChapterParticles } from '../ChapterParticles';

const STAGE_LABEL = ['Degraded', 'Partial', 'Recovered', 'Full'];

function fmtPip(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BushveldScreen() {
  const { setActiveNav } = useGame();
  const { tl } = useTranslation();
  const { scenes, active, hotspots, loading, busy, selectScene, collect } = useBushveld();
  const [selected, setSelected] = useState<BushveldHotspot | null>(null);

  const bgSrc = active?.restorationAssetKey
    ? `/assets/${active.restorationAssetKey}`
    : '/assets/tiles/sky/bushveld_savanna.png';

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background — prefers the API's restoration asset key, falls back to the
          generic Bushveld backdrop (the stage/hotspot PNGs are a pending art drop). */}
      <div className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-0">
        <img
          alt="Bushveld"
          className="w-full h-full object-cover object-center"
          src={bgSrc}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = '/assets/tiles/sky/bushveld_savanna.png';
            img.onerror = null;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* 2.9/V-11 — the season drifts over the scene itself, so the Bushveld reads as
          the same world as the farm rather than a static photograph. Decorative. */}
      <ChapterParticles className="fixed left-0 right-0 bottom-0 top-12 md:top-14 z-[1]" />

      {/* Scene tabs */}
      <div className="relative z-10 flex gap-1 px-2 py-2 overflow-x-auto">
        {scenes.map((s) => (
          <button
            key={s.slug}
            onClick={() => selectScene(s.slug)}
            className={`px-3 py-1.5 text-xs font-mono uppercase border whitespace-nowrap ${
              active?.slug === s.slug
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-wood-dark/80 text-on-surface-variant border-wood-border'
            }`}
          >
            {s.name}
            {!s.unlocked && ' 🔒'}
          </button>
        ))}
      </div>

      {/* Kagiso + restoration HUD (replaces the retired Energy bar, D5) */}
      {active && (
        <div className="relative z-10 flex items-center justify-between px-4 py-2 gap-2">
          <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
            <span className="font-headline text-xs text-primary uppercase font-bold">{tl('kagiso')}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: active.kagisoMax }).map((_, i) => (
                // 2.7/V-6 — Kagiso is drawn from its own pip sprite, not a CSS
                // square. Empty pips are the same art desaturated by opacity, so
                // the row keeps a constant shape at any fill level.
                <PixelUiIcon
                  key={i}
                  name="status_kagiso_pip"
                  emoji={i < active.kagiso ? '🟢' : '⚪'}
                  size={12}
                  label={i < active.kagiso ? tl('kagiso') : `${tl('kagiso')} (empty)`}
                  style={{
                    display: 'block',
                    opacity: i < active.kagiso ? 1 : 0.28,
                    filter: i < active.kagiso ? undefined : 'grayscale(1)',
                  }}
                />
              ))}
            </div>
            {active.secondsToNextPip > 0 && (
              <span className="font-mono text-[9px] text-on-surface-variant">
                +1 {fmtPip(active.secondsToNextPip)}
              </span>
            )}
          </div>
          <div className="bg-wood-dark/90 px-3 py-1.5 border border-wood-border text-right">
            <span className="font-mono text-[9px] text-on-surface-variant block">
              {tl('restoration')}
            </span>
            <span className="font-headline text-xs text-primary uppercase font-bold">
              {STAGE_LABEL[active.restorationStage] ?? ''} ({active.findsDiscovered}/
              {active.findsTotal})
            </span>
          </div>
        </div>
      )}

      {/* Hotspots */}
      <div className="relative z-10 flex-1" style={{ minHeight: '55vh' }}>
        {active && active.unlocked && hotspots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-body text-sm text-cream-surface bg-wood-dark/70 px-3 py-2 border border-wood-border">
              {tl('comingSoon')}
            </p>
          </div>
        )}
        {active && !active.unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-wood-dark/80 px-4 py-3 border border-wood-border">
              <p className="font-headline text-sm text-primary uppercase font-bold">
                {tl('sceneLocked')}
              </p>
              <p className="font-body text-xs text-on-surface-variant mt-1">
                {tl('bothoNeeded').replace('{n}', '300')}
              </p>
            </div>
          </div>
        )}
        {hotspots.map((h) => {
          const isReady = h.state === 'ready';
          return (
            <button
              key={h.id}
              onClick={() => setSelected(h)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
            >
              {/* 2.8/V-14 — the glow marks a ready hotspot, but does NOT pulse on
                  every one of them: with thirteen hotspots that was thirteen
                  simultaneous pulses and the cue meant nothing (03 §13). The
                  gather-able state is shown statically; the single highest-priority
                  pulse on this screen belongs to the scene's own resource meter. */}
              <span
                className={`block w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg relative ${
                  isReady
                    ? 'bg-primary-container/90 border-primary'
                    : 'bg-wood-dark/70 border-wood-border opacity-60'
                }`}
              >
                {/* 2.6/V-5 — the real hotspot sprite (config `spriteKey`, already
                    served by the API) instead of one hardcoded 🌿 for all thirteen.
                    Falls back to 🌿 only if the PNG is missing. */}
                <PixelSprite
                  src={`/assets/${h.spriteKey}`}
                  scale={1}
                  nativeWidth={24}
                  fallback="🌿"
                  alt={h.tell}
                />
                {h.isSparklingToday && (
                  <PixelUiIcon
                    name="status_ready"
                    emoji="✦"
                    size={14}
                    label={tl('sparkling')}
                    className="absolute -top-2 -right-2"
                    style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,0,0.7))' }}
                  />
                )}
                {h.isSeasonalActiveToday && (
                  <PixelUiIcon
                    name="weather_wind"
                    emoji="🌸"
                    size={14}
                    label={tl('seasonal')}
                    className="absolute -bottom-2 -right-2"
                  />
                )}
              </span>
              <span className="block text-center font-mono text-[9px] text-cream-surface mt-0.5 bg-wood-dark/60 px-1 max-w-[80px] truncate">
                {h.tell}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected hotspot action */}
      {selected && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-sm mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 mb-2">
              <PixelSprite
                src={`/assets/${selected.spriteKey}`}
                scale={1}
                nativeWidth={24}
                fallback="🌿"
                alt={selected.tell}
              />
              <span className="font-headline text-sm text-cream-surface font-bold">
                {selected.tell}
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant mb-1">
              {tl('kagiso')} cost: {selected.kagisoCost}
            </p>
            {selected.state === 'ready' && (
              <p className="font-mono text-[10px] text-status-success mb-3">{tl('tapToGather')}</p>
            )}
            {selected.state === 'scene_not_settled' && (
              <p className="font-mono text-[10px] text-status-warning mb-3">
                {tl('notSettled')} — {tl('needsKagiso').replace('{n}', String(selected.kagisoCost))}
              </p>
            )}
            {selected.state === 'resting' && (
              <p className="font-mono text-[10px] text-status-warning mb-3">
                {tl('resting')} · ~{Math.ceil((selected.etaSeconds ?? 0) / 60)} min
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={!isReady(selected) || busy}
                onClick={() => {
                  collect(selected);
                  setSelected(null);
                }}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5 disabled:opacity-40"
              >
                {tl('collect')}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="py-2 px-3 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase border border-wood-border active:translate-y-0.5"
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
          <p className="font-headline text-sm text-primary uppercase font-bold">{tl('bushveld')}…</p>
        </div>
      )}
    </div>
  );
}

function isReady(h: BushveldHotspot) {
  return h.state === 'ready';
}
