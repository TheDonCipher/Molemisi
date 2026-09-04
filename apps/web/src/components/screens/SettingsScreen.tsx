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
    pixelScale,
    setPixelScale,
    pula,
    farmLevel,
    farmXp,
    showToast,
    setActiveNav,
  } = useGame();

  const handleSave = () => {
    showToast('Settings Saved', 'Farmer profile and audio preferences stored in cloud.', '💾', 'success');
  };

  return (
    <div className="w-full px-3 md:px-6 py-6 max-w-4xl mx-auto select-none space-y-6 pb-20 md:pb-10">
      {/* Top Header */}
      <div className="bg-wood-dark p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.6)] border border-wood-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">
            settings
          </span>
          <div className="flex flex-col">
            <h1 className="font-headline text-base md:text-lg text-primary uppercase font-bold tracking-wider">
              Game Preferences & Compound Config
            </h1>
            <span className="font-mono text-[10px] text-on-surface-variant">
              Audio, Localization & Visual Polish Settings
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveNav('Farm')}
          className="bg-wood-medium hover:bg-surface-container-high text-cream-surface px-3 py-1.5 rounded font-mono text-xs uppercase border border-wood-border active:translate-y-0.5 transition-all"
        >
          ← Back to Farm
        </button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio & Music Panel */}
        <div className="bg-wood-medium/95 p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-wood-border/50 pb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              volume_up
            </span>
            <h2 className="font-headline text-sm text-cream-surface font-bold uppercase">
              Audio & Acoustics
            </h2>
          </div>

          {/* BGM Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Kalahari Sunset Ambient (BGM)</span>
              <span className="text-gold-currency font-bold">{bgmVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(Number(e.target.value))}
              className="w-full accent-primary-container cursor-pointer h-2 bg-wood-dark rounded-none"
            />
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-on-surface-variant">Sound Effects & Livestock (SFX)</span>
              <span className="text-gold-currency font-bold">{sfxVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              className="w-full accent-primary-container cursor-pointer h-2 bg-wood-dark rounded-none"
            />
          </div>
        </div>

        {/* Language & Cultural Localization */}
        <div className="bg-wood-medium/95 p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-wood-border/50 pb-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              language
            </span>
            <h2 className="font-headline text-sm text-cream-surface font-bold uppercase">
              Language & Dialect
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-on-surface-variant">
              Select Dialogue & Notice Board Language:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setLanguage('en');
                  showToast('Language Changed', 'Display set to English (Botswana Standard).', '🌐', 'info');
                }}
                className={`py-2 px-3 font-mono text-xs uppercase font-bold rounded border transition-all ${
                  language === 'en'
                    ? 'bg-primary-container text-on-primary-container border-primary shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-dark text-on-surface-variant hover:text-cream-surface border-wood-border'
                }`}
              >
                English (Botswana)
              </button>

              <button
                onClick={() => {
                  setLanguage('tn');
                  showToast('Puo e Fetotswe', 'Puo e fetotswe go Setswana sa Serowe.', '🇧🇼', 'info');
                }}
                className={`py-2 px-3 font-mono text-xs uppercase font-bold rounded border transition-all ${
                  language === 'tn'
                    ? 'bg-primary-container text-on-primary-container border-primary shadow-[1px_1px_0px_rgba(0,0,0,0.4)]'
                    : 'bg-wood-dark text-on-surface-variant hover:text-cream-surface border-wood-border'
                }`}
              >
                Setswana (Serowe)
              </button>
            </div>
          </div>
        </div>

        {/* Visual & Graphics */}
        <div className="bg-wood-medium/95 p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-wood-border/50 pb-2">
            <span className="material-symbols-outlined text-sky-blue text-[20px]">
              palette
            </span>
            <h2 className="font-headline text-sm text-cream-surface font-bold uppercase">
              Pixel Rendering & Visuals
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-headline text-xs text-cream-surface font-bold">
                16-Bit Crisp Pixel Scaling
              </span>
              <span className="font-body text-[11px] text-on-surface-variant">
                Avoids sub-pixel blurring on high-res displays
              </span>
            </div>
            <button
              onClick={() => setPixelScale(!pixelScale)}
              className={`w-12 h-6 rounded-none p-0.5 transition-colors border ${
                pixelScale
                  ? 'bg-secondary border-secondary'
                  : 'bg-wood-dark border-wood-border'
              }`}
            >
              <div
                className={`w-4 h-4 bg-cream-surface transition-transform ${
                  pixelScale ? 'translate-x-6 bg-wood-dark' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Profile & Cloud Backup */}
        <div className="bg-wood-medium/95 p-4 rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border border-wood-border flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 border-b border-wood-border/50 pb-2 mb-3">
              <span className="material-symbols-outlined text-gold-currency text-[20px]">
                cloud_sync
              </span>
              <h2 className="font-headline text-sm text-cream-surface font-bold uppercase">
                Farmer Identity & Sync
              </h2>
            </div>

            <div className="space-y-1 font-mono text-xs text-on-surface-variant">
              <div>
                Status: <strong className="text-secondary">Connected</strong>
              </div>
              <div>
                Compound: <strong className="text-cream-surface">Morama Kraal Lv.{farmLevel}</strong>
              </div>
              <div>
                Purse:{' '}
                <strong className="text-gold-currency">{pula.toLocaleString()} Pula</strong>
              </div>
              <div>
                Experience:{' '}
                <strong className="text-primary">{farmXp.toLocaleString()} XP</strong>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2 bg-primary-container hover:bg-primary text-wood-dark font-mono text-xs uppercase font-bold rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5 transition-all"
          >
            Save Profile & Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
