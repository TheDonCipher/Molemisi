'use client';

import React from 'react';
import { useGame } from '../../lib/gameState';

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

  return (
    <div className="w-full px-4 py-6 max-w-lg mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-lg text-primary uppercase font-bold">Settings</h1>
        <button
          onClick={() => setActiveNav('Farm')}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          ← Farm
        </button>
      </div>

      {/* Audio */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Audio
        </h2>
        <div className="space-y-4 bg-wood-dark p-4 border border-wood-border">
          <div>
            <div className="flex justify-between font-mono text-xs text-cream-surface mb-1">
              <span>Music</span>
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
              <span>Sound Effects</span>
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
          Language
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
            English
          </button>
          <button
            onClick={() => setLanguage('tn')}
            className={`flex-1 py-2 font-mono text-xs uppercase font-bold border transition-all ${
              language === 'tn'
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border'
            }`}
          >
            Setswana
          </button>
        </div>
      </section>

      {/* Account */}
      <section className="mb-6">
        <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Account
        </h2>
        <div className="bg-wood-dark p-4 border border-wood-border space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">Status</span>
            <span className="text-secondary font-bold">✓ Connected</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">Farm</span>
            <span className="text-cream-surface font-bold">Level {farmLevel}</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">Experience</span>
            <span className="text-primary font-bold">{farmXp} XP</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-on-surface-variant">Purse</span>
            <span className="text-gold-currency font-bold">{pula.toLocaleString()} P</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <div className="bg-wood-dark p-3 border border-wood-border text-center">
          <span className="font-mono text-[10px] text-on-surface-variant">
            Molemisi v0.1.0 • Made in Botswana 🇧🇼
          </span>
        </div>
      </section>
    </div>
  );
}
