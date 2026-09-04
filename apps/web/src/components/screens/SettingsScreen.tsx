'use client';

import React from 'react';
import { useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';

export function SettingsScreen() {
  const {
    bgmVolume,
    setBgmVolume,
    sfxVolume,
    setSfxVolume,
    language,
    setLanguage,
    pula,
    farmLevel,
    farmXp,
    setActiveNav,
  } = useGame();
  const { tl } = useTranslation();

  return (
    <div className="w-full px-4 py-6 max-w-lg mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-lg text-primary uppercase font-bold">{tl('settings')}</h1>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          {tl('backToFarm')}
        </button>
      </div>

      {/* Audio */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          {tl('audio')}
        </h2>
        <div className="space-y-4 bg-wood-dark p-4 border border-wood-border">
          <div>
            <div className="flex justify-between font-mono text-xs text-cream-surface mb-1">
              <span>{tl('music')}</span>
              <span className="text-gold-currency font-bold">{bgmVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(Number(e.target.value))}
              className="w-full accent-primary-container cursor-pointer h-2"
            />
          </div>
          <div>
            <div className="flex justify-between font-mono text-xs text-cream-surface mb-1">
              <span>{tl('soundEffects')}</span>
              <span className="text-gold-currency font-bold">{sfxVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              className="w-full accent-primary-container cursor-pointer h-2"
            />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          {tl('language')}
        </h2>
        <div className="flex gap-2 bg-wood-dark p-4 border border-wood-border">
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold border transition-all ${
              language === 'en'
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border'
            }`}
          >
            {tl('english')}
          </button>
          <button
            onClick={() => setLanguage('tn')}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold border transition-all ${
              language === 'tn'
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border'
            }`}
          >
            {tl('setswana')}
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          {tl('account')}
        </h2>
        <div className="bg-wood-dark p-4 border border-wood-border space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">{tl('status')}</span>
            <span className="text-secondary font-bold">{tl('connected')}</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">{tl('farm')}</span>
            <span className="text-cream-surface font-bold">
              {tl('level')} {farmLevel}
            </span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">{tl('experience')}</span>
            <span className="text-primary font-bold">{farmXp} XP</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">{tl('purse')}</span>
            <span className="text-gold-currency font-bold">{pula.toLocaleString()} P</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <div className="bg-wood-dark p-3 border border-wood-border text-center">
          <span className="font-mono text-[10px] text-on-surface-variant">
            Molemisi v0.1.0 • {tl('madeInBotswana')}
          </span>
        </div>
      </section>
    </div>
  );
}
