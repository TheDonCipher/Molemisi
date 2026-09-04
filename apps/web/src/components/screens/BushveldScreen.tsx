'use client';

import React, { useState, useCallback } from 'react';
import { useGame } from '../../lib/gameState';

const RESOURCES = [
  {
    id: 'marula',
    name: 'Wild Marula',
    icon: '🌿',
    reward: '+3 Marula Fruit',
    energy: 0,
    position: 'left-[8%] bottom-[25%]',
  },
  {
    id: 'waterhole',
    name: 'Fresh Waterhole',
    icon: '💧',
    reward: '+2 River Reeds',
    energy: 5,
    position: 'left-[45%] bottom-[30%]',
  },
  {
    id: 'baobab',
    name: 'Ancient Baobab',
    icon: '🌳',
    reward: '+15 Energy',
    energy: -15,
    position: 'right-[18%] top-[35%]',
  },
  {
    id: 'cave',
    name: 'Granite Cave',
    icon: '🪨',
    reward: '+2 Raw Stone',
    energy: 10,
    position: 'right-[8%] bottom-[28%]',
  },
];

export function BushveldScreen() {
  const { energy, maxEnergy, forageBushveld, setActiveNav } = useGame();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const energyPercent = Math.round((energy / maxEnergy) * 100);
  const resource = RESOURCES.find((r) => r.id === selectedResource);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleForage = (r: (typeof RESOURCES)[0]) => {
    if (r.energy > 0 && energy < r.energy) {
      showToast('Not enough energy! Rest under the Baobab.');
      return;
    }
    const lootName =
      r.id === 'marula'
        ? 'Marula Fruit'
        : r.id === 'cave'
          ? 'Granite Stone'
          : r.id === 'waterhole'
            ? 'River Reeds'
            : undefined;
    forageBushveld(
      r.id,
      r.energy,
      r.reward,
      `Foraged from ${r.name}`,
      'spa',
      lootName,
      r.id === 'cave' ? 2 : 2,
    );
    showToast(r.reward);
    setSelectedResource(null);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          alt="Botswana Savanna"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/bushveld_scene.png"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://lh3.googleusercontent.com/aida-public/AB6AXuATAeRwEE_FMm52FkrWo_6vXz-MMHe3AGwc607kyjIFrEYgBEW054rYKsJxVjInit3vI3AlI_q0aLN0BvlJjOU3LnUjNJs9DXrHTOUTTYvltrO30_KhYjO2lakHBbKU_JIMgYk2fJtInIVUCLh5-LI5ROSxkjCd3TwPDci4bl7KWWsiB51gCe7mgTSlOzTCRHa8Vrs-MWlzPTNswmmFWW1QuajHX1hbd6Kfd-rv2PoenxTNzpTrTnv04Q';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* Top HUD — Energy + Biome */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-lg">🧭</span>
          <div>
            <span className="font-headline text-xs text-primary uppercase font-bold block">
              Bushveld
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant">
              Okavango Savanna Fringe
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-sm">⚡</span>
          <div className="w-16 h-2 bg-surface-container-lowest overflow-hidden">
            <div
              className={`h-full transition-all ${
                energy < 20
                  ? 'bg-status-danger'
                  : energy < 50
                    ? 'bg-status-warning'
                    : 'bg-status-success'
              }`}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-cream-surface font-bold">{energy}</span>
        </div>
      </div>

      {/* Resources as spatial points — tap to forage */}
      <div className="relative z-10 flex-1 bg-black/25" style={{ minHeight: '60vh' }}>
        {RESOURCES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedResource(selectedResource === r.id ? null : r.id)}
            className={`absolute ${r.position} z-20 transition-all active:scale-95`}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 shadow-lg ${
                selectedResource === r.id
                  ? 'border-primary ring-2 ring-primary/50 bg-primary-container'
                  : 'border-wood-border bg-wood-dark/80 hover:border-primary/50'
              }`}
            >
              {r.icon}
            </div>
            <span className="block text-center font-mono text-[9px] text-cream-surface mt-1 bg-wood-dark/60 px-1">
              {r.name}
            </span>
          </button>
        ))}
      </div>

      {/* Resource Action Card — Level 2 context */}
      {resource && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-sm mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{resource.icon}</span>
              <span className="font-headline text-sm text-cream-surface font-bold">
                {resource.name}
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant mb-3">
              {resource.reward}
              {resource.energy > 0 && (
                <span className="text-status-warning ml-1">(-{resource.energy} Energy)</span>
              )}
              {resource.energy < 0 && (
                <span className="text-status-success ml-1">
                  (+{Math.abs(resource.energy)} Energy)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleForage(resource)}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
              >
                {resource.energy < 0 ? 'Rest' : 'Collect'}
              </button>
              <button
                onClick={() => setSelectedResource(null)}
                className="py-2 px-3 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase border border-wood-border active:translate-y-0.5"
              >
                Leave
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
          ← Farm
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-status-success/90 text-wood-dark px-4 py-2 font-mono text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
