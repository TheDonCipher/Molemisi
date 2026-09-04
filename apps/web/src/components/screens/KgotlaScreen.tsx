'use client';

import React, { useState } from 'react';
import { useGame } from '../../lib/gameState';

const NPC_DATA: Record<
  string,
  {
    role: string;
    icon: string;
    level: number;
    dialogue: string;
    honorBonus: string;
    voiceDialect: string;
    primaryAction: { label: string; questId: string };
  }
> = {
  'Elder Neo': {
    role: 'Village Chief',
    icon: 'elderly',
    level: 45,
    dialogue:
      '"Dumela, young farmer! The rains have been kind, but our Serowe village granary runs precariously low before the dry season. The community relies on your harvest to prepare the ancestral porridge."',
    honorBonus: 'Setswana Traditional Honor +50',
    voiceDialect: 'Serowe Dialect',
    primaryAction: {
      label: 'Accept: Deliver 20 Sorghum',
      questId: 'quest-granary',
    },
  },
  'Mama Naledi': {
    role: 'Produce Trader',
    icon: 'shopping_basket',
    level: 38,
    dialogue:
      '"Ahe farmer! Look at those fresh greens on my stall. I pay top Pula for drought-resistant cowpeas, and I have imported marrow squash seeds ready for your loam beds!"',
    honorBonus: 'Market Discount Available: 5%',
    voiceDialect: 'Ngamiland Dialect',
    primaryAction: {
      label: 'Trade With Mama Naledi',
      questId: 'market',
    },
  },
  Refilwe: {
    role: 'Traditional Herbalist',
    icon: 'compost',
    level: 32,
    dialogue:
      '"The wild marula bark and kalahari devil\'s claw possess potent healing properties for both cattle and elders. Bring me wild savanna herbs and I will teach you herbal tonics."',
    honorBonus: 'Herbalist Standing +30',
    voiceDialect: 'Kgalagadi Dialect',
    primaryAction: {
      label: 'Accept: Forage Wild Herbs',
      questId: 'quest-herbs',
    },
  },
  Tau: {
    role: 'Bush Scout',
    icon: 'explore',
    level: 41,
    dialogue:
      '"I tracked a herd of springbok near the dry riverbeds this morning. The savanna fringe is teeming with ripe fruits and exposed mineral salt caves if you have the stamina."',
    honorBonus: 'Wilderness Intel +40',
    voiceDialect: 'Chobe Dialect',
    primaryAction: {
      label: 'Explore Bushveld Fringe',
      questId: 'bushveld',
    },
  },
};

export function KgotlaScreen() {
  const {
    reputation,
    maxReputation,
    activeNpc,
    setActiveNpc,
    quests,
    acceptQuest,
    claimQuest,
    showToast,
    setActiveNav,
  } = useGame();

  const [dialogueOverride, setDialogueOverride] = useState<string | null>(null);
  const currentNpcInfo = NPC_DATA[activeNpc] ?? NPC_DATA['Elder Neo']!;
  const repPercent = Math.min(100, Math.round((reputation / maxReputation) * 100));

  const showVillageHistory = () => {
    setDialogueOverride(
      '"Our forefathers gathered under these wild acacia trees centuries ago. Here, every voice is heard before the Kgosi makes judgment. Remember: Mafoko a kgotla a mantle otlhe — all words spoken at the kgotla are worthy."'
    );
    showToast('Lore Entry Unlocked', 'Setswana Tradition: Mafoko a kgotla a mantle otlhe.', '🏛️', 'info');
  };

  const selectNpc = (name: string) => {
    setActiveNpc(name);
    setDialogueOverride(null);
  };

  return (
    <div className="w-full flex flex-col relative select-none pb-20 md:pb-10">
      {/* Top Ambient Banner Strip */}
      <div className="w-full bg-surface-container-high px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-wood-border z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded bg-primary-container text-on-primary-container font-headline text-lg font-bold shadow-[1px_1px_0px_rgba(0,0,0,0.4)]">
            🏛️
          </span>
          <div className="flex flex-col">
            <span className="font-headline text-xs md:text-sm text-primary uppercase tracking-wider font-bold">
              Kgotla Village Council
            </span>
            <span className="font-body text-[10px] text-on-surface-variant">
              Traditional Meeting Ground of Serowe Clan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Reputation Meter */}
          <div className="flex items-center gap-2 bg-wood-dark px-3 py-1.5 rounded shadow-sm border border-wood-border">
            <span
              className="material-symbols-outlined text-gold-currency text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-secondary font-bold">Friendly</span>
                <span className="font-mono text-[9px] text-on-surface-variant">
                  {reputation} / {maxReputation} Rep
                </span>
              </div>
              <div className="w-28 h-1.5 bg-surface-container-lowest overflow-hidden mt-0.5">
                <div
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${repPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Session Status */}
          <div className="hidden sm:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-wood-border">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="font-mono text-[10px] text-cream-surface uppercase font-bold">
              Kgotla in Session
            </span>
          </div>
        </div>
      </div>

      {/* Primary Stage Container */}
      <div className="w-full relative min-h-[580px] lg:min-h-[640px] flex flex-col justify-between overflow-hidden">
        {/* Visual Backdrop Canvas */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            alt="Kgotla Gathering Scene Botswana"
            className="w-full h-full object-cover object-center filter saturate-[1.1]"
            src="/assets/backgrounds/kgotla_scene.png"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDxlXleSeLx2BTGu5q9-PEpnRzGkNsJeH9kp9O6b9tVrlJcebsMwzdVHBeEJbJciX0xhjAjyKoPfjQCR-mrXw0_itapWXC0_XEugtmZgfkpfUFgl8DeidZ9teZyMqunllvdRqywCl-rxOau-vDY_Jm7bsYQ3778pFZuL_PXXl4M4ZXijqIaGMXfUKeGaMZG1MaXDi7ffxQxr04ZjWSrXE4lWBXa0iIMDcreRIDP7cKTx7yW6VojhpCu0Q';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        </div>

        {/* Council Members Quick-Bar */}
        <div className="relative z-10 w-full px-4 md:px-8 pt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mr-1 bg-wood-dark/80 px-2.5 py-1 rounded border border-wood-border whitespace-nowrap">
            Elders & Villagers:
          </span>

          {Object.entries(NPC_DATA).map(([name, data]) => {
            const isSelected = activeNpc === name;
            return (
              <button
                key={name}
                onClick={() => selectNpc(name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded shadow-md transition-all whitespace-nowrap font-mono text-xs uppercase border ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container font-bold border-primary shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                    : 'bg-wood-dark/90 text-on-surface-variant hover:text-cream-surface hover:bg-wood-medium border-wood-border'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{data.icon}</span>
                <span>
                  {name} ({data.role.split(' ')[0]})
                </span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-gold-currency animate-ping" />}
              </button>
            );
          })}
        </div>

        {/* Main Grid: Dialogue Box + Notice Board */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 px-4 md:px-8 my-4 items-end">
          {/* LEFT: Live Dialogue Box */}
          <div className="lg:col-span-8 flex flex-col gap-2">
            <div className="bg-wood-medium/95 rounded shadow-xl p-4 backdrop-blur-sm border border-wood-border">
              {/* Dialogue Header */}
              <div className="flex items-center justify-between bg-wood-dark px-3 py-1.5 rounded mb-3 shadow-sm border border-wood-border">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    record_voice_over
                  </span>
                  <span className="font-headline text-sm text-primary uppercase font-bold">
                    {activeNpc}
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant tracking-widest">
                    [{currentNpcInfo.role}]
                  </span>
                </div>
                <span className="font-mono text-[10px] text-secondary flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">psychology</span> Pula ya Leebana
                </span>
              </div>

              {/* Avatar & Text */}
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-surface-container-lowest rounded flex-shrink-0 flex items-center justify-center p-2 relative shadow-inner border border-wood-border">
                  <span className="material-symbols-outlined text-[54px] text-primary">
                    {currentNpcInfo.icon}
                  </span>
                  <div className="absolute bottom-1 right-1 px-1 bg-wood-dark text-gold-currency font-mono text-[9px] rounded font-bold border border-wood-border">
                    LVL {currentNpcInfo.level}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between min-h-[90px]">
                  <p className="font-body text-sm md:text-base text-cream-surface leading-relaxed drop-shadow-sm">
                    {dialogueOverride || currentNpcInfo.dialogue}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-wood-border/40">
                    <span className="font-mono text-[10px] text-primary-fixed uppercase tracking-wider font-bold">
                      {currentNpcInfo.honorBonus}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">volume_up</span> Voice:{' '}
                      {currentNpcInfo.voiceDialect}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dialogue Option Actions */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    if (currentNpcInfo.primaryAction.questId === 'market') {
                      setActiveNav('Market');
                    } else if (currentNpcInfo.primaryAction.questId === 'bushveld') {
                      setActiveNav('Bushveld');
                    } else {
                      acceptQuest(currentNpcInfo.primaryAction.questId);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-2 rounded font-mono text-xs uppercase shadow hover:brightness-110 active:translate-y-0.5 transition-all font-bold text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>{currentNpcInfo.primaryAction.label}</span>
                </button>

                <button
                  onClick={showVillageHistory}
                  className="flex items-center justify-center gap-1.5 bg-wood-dark hover:bg-surface-variant text-cream-surface px-3 py-2 rounded font-mono text-xs uppercase shadow hover:text-primary active:translate-y-0.5 transition-all border border-wood-border"
                >
                  <span className="material-symbols-outlined text-[16px]">history_edu</span>
                  <span>Village History</span>
                </button>

                <button
                  onClick={() => selectNpc('Mama Naledi')}
                  className="flex items-center justify-center gap-1.5 bg-wood-dark hover:bg-surface-variant text-cream-surface px-3 py-2 rounded font-mono text-xs uppercase shadow hover:text-secondary active:translate-y-0.5 transition-all border border-wood-border"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Trade With Traders</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Notice Board & Quests Panel */}
          <div className="lg:col-span-4 flex flex-col gap-2">
            <div className="bg-wood-medium/95 rounded shadow-xl p-4 backdrop-blur-sm flex flex-col gap-3 border border-wood-border">
              {/* Board Header */}
              <div className="flex items-center justify-between bg-wood-dark px-3 py-1.5 rounded shadow-sm border border-wood-border">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold-currency text-[18px]">
                    assignment
                  </span>
                  <span className="font-headline text-xs md:text-sm text-primary uppercase font-bold">
                    Council Notice Board
                  </span>
                </div>
                <span className="bg-primary-container text-on-primary-container font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                  {quests.filter((q) => !q.claimed).length} Active
                </span>
              </div>

              {/* Quest Items */}
              {quests.map((quest) => {
                const isComplete = quest.current >= quest.target;
                const progressPct = Math.min(100, Math.round((quest.current / quest.target) * 100));

                return (
                  <div
                    key={quest.id}
                    className="bg-surface-container-high p-2.5 rounded shadow-sm flex flex-col gap-1 border border-wood-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-xs text-cream-surface font-bold flex items-center gap-1">
                        <span>{quest.icon}</span> {quest.title}
                      </span>
                      <span className="bg-wood-dark text-secondary font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                        {quest.category}
                      </span>
                    </div>

                    <p className="font-body text-[11px] text-on-surface-variant leading-tight">
                      {quest.description}
                    </p>

                    <div className="w-full bg-wood-dark rounded h-1.5 overflow-hidden mt-1">
                      <div
                        className="bg-status-success h-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between font-mono text-[10px] mt-1">
                      <span className="text-on-surface-variant">
                        Progress:{' '}
                        <strong className="text-status-success">
                          {quest.current} / {quest.target} {quest.unit}
                        </strong>
                      </span>
                      <span className="text-gold-currency font-bold">{quest.rewardText}</span>
                    </div>

                    {isComplete && !quest.claimed && (
                      <button
                        onClick={() => claimQuest(quest.id)}
                        className="mt-1 w-full bg-status-success hover:bg-secondary text-wood-dark font-mono text-[10px] uppercase font-bold py-1 rounded shadow animate-bounce"
                      >
                        Claim Reward
                      </button>
                    )}

                    {quest.claimed && (
                      <div className="mt-1 text-center font-mono text-[10px] text-secondary font-bold">
                        ✓ Quest Completed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Council Ledger & Status Strip */}
        <div className="relative z-10 w-full bg-surface-container-lowest/90 backdrop-blur-md px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-wood-border">
          <div className="flex items-center gap-4 md:gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                psychology_alt
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-on-surface-variant uppercase leading-none">
                  Council Decision
                </span>
                <span className="font-mono text-xs text-cream-surface font-bold">
                  Water Allocation Approved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                wb_twilight
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-on-surface-variant uppercase leading-none">
                  Sunset Assembly
                </span>
                <span className="font-mono text-xs text-primary font-bold">
                  In 2 In-Game Hours
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-currency text-[18px]">
                account_balance_wallet
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-on-surface-variant uppercase leading-none">
                  Village Granary
                </span>
                <span className="font-mono text-xs text-gold-currency font-bold">
                  62% Full
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase">
              Kgotla Tradition:
            </span>
            <span className="bg-wood-dark text-primary px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-wood-border">
              Mafisa Cattle Lending Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
