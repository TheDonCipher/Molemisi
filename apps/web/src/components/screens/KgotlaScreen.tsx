'use client';

import React, { useState } from 'react';
import { useGame, DeliveryContract } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';

const NPCS = [
  {
    name: 'Elder Neo',
    role: 'Village Chief',
    roleKey: 'communityHub' as const,
    avatar: '/assets/sprites/npcs/elder_neo.png',
    fallback: '👴',
    dialogue: 'The community granary runs low before the dry season. Can you help?',
    contractFilter: (c: DeliveryContract) =>
      c.title.toLowerCase().includes('grain') || c.title.toLowerCase().includes('granary'),
  },
  {
    name: 'Mama Naledi',
    role: 'Produce Trader',
    roleKey: 'communityHub' as const,
    avatar: '/assets/sprites/npcs/mama_naledi.png',
    fallback: '👩',
    dialogue: 'I pay top Pula for drought-resistant cowpeas. Bring what you grow!',
    contractFilter: (c: DeliveryContract) =>
      c.title.toLowerCase().includes('safari') || c.title.toLowerCase().includes('kitchen'),
  },
  {
    name: 'Refilwe',
    role: 'Herbalist',
    roleKey: 'communityHub' as const,
    avatar: '/assets/sprites/npcs/refilwe.png',
    fallback: '🧙‍♀️',
    dialogue: 'Wild marula bark heals both cattle and elders. Forage me 5 bundles.',
    contractFilter: () => false,
  },
  {
    name: 'Tau',
    role: 'Bush Scout',
    roleKey: 'communityHub' as const,
    avatar: '/assets/sprites/npcs/bushveld_scout.png',
    fallback: '🧭',
    dialogue: 'The savanna fringe has ripe fruits and mineral caves. Ready to explore?',
    contractFilter: () => false,
  },
  {
    name: 'Vendor Kabelo',
    role: 'Market Trader',
    roleKey: 'communityHub' as const,
    avatar: '/assets/sprites/npcs/market_vendor.png',
    fallback: '🛒',
    dialogue: 'Everything has a price, friend. What are you looking to trade today?',
    contractFilter: (c: DeliveryContract) =>
      c.title.toLowerCase().includes('brewery') || c.title.toLowerCase().includes('supply'),
  },
];

export function KgotlaScreen() {
  const { reputation, maxReputation, setActiveNav, contracts, claimContract } = useGame();
  const { tl } = useTranslation();

  const [selectedNpc, setSelectedNpc] = useState<number | null>(null);
  const [showContracts, setShowContracts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const npc = selectedNpc !== null ? NPCS[selectedNpc] : null;
  const npcContracts = npc ? contracts.filter((c) => npc.contractFilter(c)) : [];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

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

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-lg">🏛️</span>
          <div>
            <span className="font-headline text-xs text-primary uppercase font-bold block">
              Kgotla
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant">
              {tl('communityHub')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-wood-dark/90 px-3 py-1.5 border border-wood-border">
          <span className="text-sm">⭐</span>
          <span className="font-mono text-[10px] text-gold-currency font-bold">
            {reputation} / {maxReputation}
          </span>
        </div>
      </div>

      {/* NPCs */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 bg-black/25">
        <div className="w-full max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            {NPCS.map((n, i) => (
              <button
                key={n.name}
                onClick={() => {
                  setSelectedNpc(selectedNpc === i ? null : i);
                  setShowContracts(false);
                }}
                className={`bg-wood-dark/85 p-3 border text-left transition-all active:scale-95 ${
                  selectedNpc === i
                    ? 'border-primary ring-2 ring-primary/50 shadow-lg'
                    : 'border-wood-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-16 h-16 bg-surface-container-low border-2 border-wood-border overflow-hidden flex items-center justify-center shrink-0 rounded-sm"
                    style={{ imageRendering: 'pixelated' }}
                  >
                    <img
                      src={n.avatar}
                      alt={n.name}
                      className="w-14 h-14 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove(
                          'hidden',
                        );
                      }}
                    />
                    <span className="text-3xl hidden">{n.fallback}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-headline text-xs text-cream-surface font-bold block truncate">
                      {n.name}
                    </span>
                    <span className="font-mono text-[9px] text-on-surface-variant block">
                      {n.role}
                    </span>
                  </div>
                </div>
                <p className="font-body text-[11px] text-on-surface-variant leading-snug line-clamp-2">
                  &ldquo;{n.dialogue}&rdquo;
                </p>
              </button>
            ))}
          </div>

          {/* Contracts Button */}
          <button
            onClick={() => {
              setShowContracts(!showContracts);
              setSelectedNpc(null);
            }}
            className={`w-full mt-4 p-3 border transition-all ${
              showContracts
                ? 'bg-primary-container border-primary'
                : 'bg-wood-dark/85 border-wood-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <span className="font-headline text-xs text-cream-surface font-bold uppercase">
                  {tl('activeContracts')}
                </span>
              </div>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {contracts.filter((c) => !c.claimed).length}
              </span>
            </div>
          </button>

          {/* Contracts List */}
          {showContracts && (
            <div className="mt-2 space-y-2 animate-slide-up">
              {contracts.map((contract) => {
                const progressPct = Math.round((contract.current / contract.target) * 100);
                const isComplete = contract.current >= contract.target;
                return (
                  <div key={contract.id} className="bg-wood-dark/95 p-3 border border-wood-border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-headline text-xs text-cream-surface font-bold block">
                          {contract.title}
                        </span>
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          {contract.source} • {contract.expiresIn}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-gold-currency font-bold">
                        P{contract.pulaReward}
                      </span>
                    </div>
                    <p className="font-body text-[10px] text-on-surface-variant mb-2">
                      {contract.description}
                    </p>
                    <div className="mb-2">
                      <div className="flex justify-between font-mono text-[9px] text-on-surface-variant mb-0.5">
                        <span>
                          {contract.current}/{contract.target} {contract.unit}
                        </span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-lowest overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isComplete ? 'bg-status-success' : 'bg-status-warning'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-primary font-bold">
                        +{contract.xpReward} XP
                      </span>
                      {contract.claimed ? (
                        <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant font-mono text-[10px] uppercase font-bold">
                          {tl('claimed')}
                        </span>
                      ) : isComplete ? (
                        <button
                          onClick={() => claimContract(contract.id)}
                          className="px-3 py-1 bg-status-success text-wood-dark font-mono text-[10px] uppercase font-bold active:translate-y-0.5"
                        >
                          {tl('claimReward')}
                        </button>
                      ) : (
                        <span className="font-mono text-[9px] text-on-surface-variant">
                          {tl('inProgress')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {contracts.length === 0 && (
                <div className="bg-wood-dark/80 p-4 border border-wood-border text-center">
                  <span className="font-body text-xs text-on-surface-variant">
                    {tl('talkToNpcs')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NPC Dialogue Card */}
      {npc && !showContracts && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-30 max-w-md mx-auto animate-slide-up">
          <div className="bg-wood-dark/95 p-4 border border-wood-border shadow-[2px_2px_0px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 bg-surface-container-low border-2 border-wood-border overflow-hidden flex items-center justify-center shrink-0 rounded-sm"
                style={{ imageRendering: 'pixelated' }}
              >
                <img
                  src={npc.avatar}
                  alt={npc.name}
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <span className="text-2xl hidden">{npc.fallback}</span>
              </div>
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

            {npcContracts.length > 0 && (
              <div className="mb-3">
                {npcContracts.map((c) => {
                  const progressPct = Math.round((c.current / c.target) * 100);
                  const isComplete = c.current >= c.target;
                  return (
                    <div
                      key={c.id}
                      className="bg-surface-container-lowest p-2.5 border border-wood-border mb-1.5"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-headline text-[11px] text-primary font-bold">
                          {c.title}
                        </span>
                        <span className="font-mono text-[9px] text-gold-currency font-bold">
                          P{c.pulaReward}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant block mb-1.5">
                        {c.description}
                      </span>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1 bg-surface-container-high overflow-hidden">
                            <div
                              className="h-full bg-status-warning"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[9px] text-on-surface-variant">
                            {c.current}/{c.target}
                          </span>
                        </div>
                        {c.claimed ? (
                          <span className="font-mono text-[9px] text-status-success font-bold">
                            {tl('claimed')}
                          </span>
                        ) : isComplete ? (
                          <button
                            onClick={() => {
                              claimContract(c.id);
                              showToast(tl('claimReward'));
                            }}
                            className="px-2 py-0.5 bg-status-success text-wood-dark font-mono text-[9px] uppercase font-bold active:translate-y-0.5"
                          >
                            {tl('claimReward')}
                          </button>
                        ) : (
                          <span className="font-mono text-[9px] text-on-surface-variant">
                            {tl('inProgress')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              {npcContracts.length > 0 && (
                <button
                  onClick={() => {
                    setShowContracts(true);
                    setSelectedNpc(null);
                  }}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container font-mono text-xs uppercase font-bold active:translate-y-0.5"
                >
                  {tl('viewContracts')}
                </button>
              )}
              <button
                onClick={() => setSelectedNpc(null)}
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-status-success/90 text-wood-dark px-4 py-2 font-mono text-xs font-bold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
