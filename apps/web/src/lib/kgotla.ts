'use client';

/**
 * Kgotla data layer — wires the four-screen UI to the finished Kgotla backend
 * (05 §P5; 02 §6.4 thresholds; 02 §9 community contributions). Server is
 * authoritative: Botho is the single standing number (D5/C12/I10), the daily
 * Botho cap is a legal control (I4), and the community-contribution cap is a
 * 02 §9 anti-grind control. This hook reads `farmId` + `showToast` from the
 * shared game context and never computes a balance or a cap locally.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';

export interface KgotlaNpc {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
  reputation: number;
  tier: string;
}

export interface KgotlaProject {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
  completed: boolean;
}

export interface BothoThreshold {
  value: number;
  label?: string;
  remaining: number;
}

export interface BothoView {
  current: number;
  thresholds: Record<string, number>;
  next: BothoThreshold | null;
  earnedToday: number;
  dailyCap: number;
  remainingToday: number;
}

export interface JournalView {
  pagesComplete: number;
  totalPages: number;
}

export interface ElderGuidance {
  id: string;
  setswana: string;
  english: string;
}

export interface TalkResult {
  npc: KgotlaNpc;
  message: string;
  questAvailable: boolean;
}

export interface QuestResult {
  reputationGain: number;
  pulaReward: number;
  bothoReward: number;
}

export interface DonationResult {
  newTotal: number;
  reward: string | null;
  bothoReward: number;
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

export interface ContributionView {
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

export function useKgotla() {
  const { farmId, showToast } = useGame();
  const [npcs, setNpcs] = useState<KgotlaNpc[]>([]);
  const [projects, setProjects] = useState<KgotlaProject[]>([]);
  const [botho, setBotho] = useState<BothoView | null>(null);
  const [journal, setJournal] = useState<JournalView | null>(null);
  const [elder, setElder] = useState<ElderGuidance | null>(null);
  const [contribution, setContribution] = useState<ContributionView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [prog, elderData, npcData, projData] = await Promise.allSettled([
        apiFetch<{ botho: BothoView; journal: JournalView }>('GET', '/progression'),
        apiFetch<ElderGuidance>('GET', '/progression/elder'),
        apiFetch<KgotlaNpc[]>('GET', `/farms/${farmId}/kgotla/npcs`),
        apiFetch<KgotlaProject[]>('GET', `/farms/${farmId}/kgotla/projects`),
      ]);
      if (prog.status === 'fulfilled') {
        setBotho(prog.value.botho);
        setJournal(prog.value.journal);
      }
      if (elderData.status === 'fulfilled') setElder(elderData.value);
      if (npcData.status === 'fulfilled' && Array.isArray(npcData.value)) setNpcs(npcData.value);
      if (projData.status === 'fulfilled' && Array.isArray(projData.value)) setProjects(projData.value);
    } catch (e: any) {
      showToast('Kgotla', e?.message || 'Could not load the Kgotla', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [farmId, showToast]);

  const talk = useCallback(
    async (npcId: string): Promise<TalkResult | null> => {
      if (!farmId) return null;
      try {
        return await apiFetch<TalkResult>('POST', `/farms/${farmId}/kgotla/npcs/${npcId}/talk`);
      } catch (e: any) {
        showToast('Kgotla', e?.message || 'Could not speak to this elder', '⚠️', 'error');
        return null;
      }
    },
    [farmId, showToast],
  );

  const completeQuest = useCallback(
    async (npcId: string) => {
      if (!farmId) return;
      try {
        const data = await apiFetch<QuestResult>('POST', `/farms/${farmId}/kgotla/npcs/${npcId}/quest`, {
          questType: 'community',
        });
        showToast(
          'Quest complete',
          `+${data.pulaReward} Pula · +${data.bothoReward} Botho`,
          '🏛️',
          'success',
        );
        await load();
      } catch (e: any) {
        showToast('Quest failed', e?.message || 'Could not complete the quest', '⚠️', 'error');
      }
    },
    [farmId, load, showToast],
  );

  const donate = useCallback(
    async (projectId: string, amount: number) => {
      if (!farmId) return;
      if (!Number.isInteger(amount) || amount <= 0) return;
      try {
        const data = await apiFetch<DonationResult>(
          'POST',
          `/farms/${farmId}/kgotla/projects/${projectId}/donate`,
          { amount },
        );
        setContribution({
          contributedToday: data.contributedToday,
          dailyCap: data.dailyCap,
          remainingToday: data.remainingToday,
        });
        const msg = data.reward
          ? `Project complete! ${data.reward}`
          : `Donated ${amount} Pula (${data.remainingToday} left today)`;
        showToast('Community', msg, '🤝', 'success');
        await load();
      } catch (e: any) {
        showToast('Donation failed', e?.message || 'Could not donate', '⚠️', 'error');
      }
    },
    [farmId, load, showToast],
  );

  useEffect(() => {
    if (farmId) load();
  }, [farmId, load]);

  return { npcs, projects, botho, journal, elder, contribution, loading, talk, completeQuest, donate, reload: load };
}
