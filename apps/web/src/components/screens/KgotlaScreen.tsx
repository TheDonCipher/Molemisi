'use client';

import React, { useState } from 'react';
import { useGame } from '../../lib/gameState';

const NPCS = [
  {
    name: 'Elder Neo',
    role: 'Village Chief',
    icon: '👴',
    dialogue: 'The community granary runs low before the dry season. Can you help?',
    action: 'View Contract',
    quest: 'Deliver 20 Sorghum',
    reward: 'P 450',
  },
  {
    name: 'Mama Naledi',
    role: 'Produce Trader',
    icon: '👩',
    dialogue: 'I pay top Pula for drought-resistant cowpeas. Bring what you grow!',
    action: 'Trade',
    quest: null,
    reward: null,
  },
  {
    name: 'Refilwe',
    role: 'Herbalist',
    icon: '🧙‍♀️',
    dialogue: 'Wild marula bark heals both cattle and elders. Forage me 5 bundles.',
    action: 'View Quest',
    quest: 'Forage Wild Herbs',
    reward: 'P 80 + Rare Seeds',
  },
  {
    name: 'Tau',
    role: 'Bush Scout',
    icon: '🧭',
    dialogue: 'The savanna fringe has ripe fruits and mineral caves. Ready to explore?',
    action: 'Explore',
    quest: null,
    reward: null,
  },
];

export function KgotlaScreen() {
  const { reputation, maxReputation, setActiveNav } = useGame();
  const [selectedNpc, setSelectedNpc] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const npc = selectedNpc !== null ? NPCS[selectedNpc] : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden select-none pb-20 md:pb-10">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Kgotla Gathering"
          className="w-full h-full object-cover object-center filter saturate-[1.1]"
          src="/assets/backgrounds/kgotla_scene.png"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDxlXleSeLx2BTGu5q9-PEpnRzGkNsJeH9kp9O6b9tVrlJcebsMwzdVHBeEJbJciX0xhjAjyKoPfjQCR-mrXw0_itapWXC0_XEugtmZgfkpfUFgl8DeidZ9teZyMqunllvdRqywCl-rxOau-vDY_Jm7bsYQ3778pFZuL_PXXl4M4ZXijqIaGMXfUKeGaMZG1MaXDi7ffxQxr04ZjWSrXE4lWBXa0iIMDcreRIDP7cKTx7yW6VojhpCu0Q';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-wood-dark/40 pointer-events-none" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-lg">🏛️</span>
          <div>
            <span className="font-headline text-xs text-primary uppercase font-bold block">
              Kgotla
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant">Community Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-sm">⭐</span>
          <span className="font-mono text-[10px] text-gold-currency font-bold">
            {reputation} / {maxReputation}
          </span>
        </div>
      </div>

      {/* NPCs as spatial points of interest */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* NPC Grid — tap to talk */}
          <div className="grid grid-cols-2 gap-4">
            {NPCS.map((n, i) => (
              <button
                key={n.name}
                onClick={() => setSelectedNpc(selectedNpc === i ? null : i)}
                className={`bg-wood-dark/85 p-4 border text-left transition-all active:scale-95 ${
                  selectedNpc === i
                    ? 'border-primary ring-2 ring-primary/50 shadow-lg'
                    : 'border-wood-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{n.icon}</span>
                  <div>
                    <span className="font-headline text-xs text-cream-surface font-bold block">
                      {n.name}
                    </span>
                    <span className="font-mono text-[9px] text-on-surface-variant">{n.role}</span>
                  </div>
                </div>
                <p className="font-body text-[11px] text-on-surface-variant leading-snug line-clamp-2">
                  &ldquo;{n.dialogue}&rdquo;
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* NPC Dialogue Card — Level 2 context */}
      {npc && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-md mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{npc.icon}</span>
              <div>
                <span className="font-headline text-sm text-cream-surface font-bold">
                  {npc.name}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant block">
                  {npc.role}
                </span>
              </div>
            </div>
            <p className="font-body text-xs text-cream-surface mb-3 leading-relaxed">
              &ldquo;{npc.dialogue}&rdquo;
            </p>

            {/* Quest info if available */}
            {npc.quest && (
              <div className="bg-surface-container-lowest p-2.5 mb-3 border border-wood-border">
                <span className="font-mono text-[10px] text-primary uppercase font-bold block mb-1">
                  {npc.quest}
                </span>
                <span className="font-mono text-[10px] text-gold-currency font-bold">
                  Reward: {npc.reward}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  showToast(`${npc.action} accepted!`);
                  setSelectedNpc(null);
                }}
                className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
              >
                {npc.action}
              </button>
              <button
                onClick={() => setSelectedNpc(null)}
                className="py-2 px-4 bg-surface-container-high text-on-surface-variant font-mono text-xs uppercase border border-wood-border active:translate-y-0.5"
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
