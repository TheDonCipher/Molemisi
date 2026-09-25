'use client';

/**
 * Kgotla data layer — docs/Screens/Kgotla/SPEC.md (NORMATIVE).
 *
 * The API's loop is offer → accept → objective (elsewhere) → turn in. There is no
 * "complete a quest" call any more: `POST /npcs/:npcId/quest` paid 50 Pula per tap
 * with no objective and no cap, and it is deleted. The client must never compute a
 * balance, a cap or an allowance — every number here comes from the server.
 *
 * Two failures are deliberately NOT swallowed:
 *   - a failed council fetch sets `councilError`, which the screen renders as an
 *     error row with Retry (AC-09) instead of an empty council;
 *   - a failed action surfaces a toast naming what failed.
 *
 * NOTE on `tl` in dependency arrays: `tl` is a fresh closure each render (it is not
 * memoised), so callbacks that translate their toast strings are also fresh each
 * render. That is harmless here because NO effect depends on these callbacks — only
 * `load` is used in an effect, and it depends on `farmId` alone.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';
import { useTranslation } from './useTranslation';

/* ------------------------------------------------------------------ types */

export type ChargeKind = 'errand' | 'contribute' | 'sell';
export type ChargeStatus = 'none' | 'active' | 'claimed';

export interface ChargeObjective {
  kind: ChargeKind;
  /** Null for `contribute` / `sell`, which are measured in Pula. */
  itemSlug: string | null;
  targetQty: number;
}

export interface ChargeRewards {
  pula: number;
  botho: number;
  chapterTokens: number;
  regard: number;
}

export interface ChargeView {
  status: ChargeStatus;
  objective: ChargeObjective;
  progress: number;
  ready: boolean;
  rewards: ChargeRewards;
}

export interface KgotlaNpc {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
  reputation: number;
  tier: string;
  /** Points to the next tier, or null when maxed (AC-05). */
  toNext: number | null;
  nextTier: string | null;
  /** A decay period elapses within 24h — warn, never punish silently (§4.1). */
  decayWarning: boolean;
  charge: ChargeView;
}

export interface KgotlaProject {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
  chapterTokenReward: number;
  completed: boolean;
  rewardClaimed: boolean;
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
  /** Doc 11 §3 — Water Whispers listened to (server-counted, never spendable). */
  whispers?: number;
  /** Doc 11 §6 — Guardian of Sesana: Journal 100% AND 500 Botho. */
  isGuardianOfSesana?: boolean;
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

export interface ChargeBoardRow extends ChargeView {
  npcId: string;
  name: string;
}

export interface ChargeBoard {
  date: string;
  poolTotal: number;
  poolUsed: number;
  poolRemaining: number;
  charges: ChargeBoardRow[];
}

export interface ContributionView {
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

export interface ProjectsResponse {
  projects: KgotlaProject[];
  contribution: ContributionView;
}

export interface TurnInResult {
  npcId: string;
  reputationGain: number;
  reputation: number;
  tier: string;
  pulaReward: number;
  bothoReward: number;
  chapterTokens: number;
  consumed: { slug: string; qty: number } | null;
  poolRemaining: number;
}

/**
 * Doc 11 §4 — the Village Feast. `pulaAwarded` is in the contract precisely so
 * the UI can prove it is always 0: sharing is Botho, never an economic act.
 */
export interface VillageFeastResult {
  donated: number;
  cropType: string;
  bothoAwarded: number;
  cosmeticId: string;
  cosmeticGranted: boolean;
  pulaAwarded: number;
}

/**
 * Doc 11 §4 — feast standing, read-only: the keepsake fence (the visible
 * cosmetic) and the Friend of the Feast honour shown on the Journal screen.
 */
export interface FeastStatus {
  hasFeastFence: boolean;
  isFriendOfTheFeast: boolean;
}

export interface DonationResult {
  newTotal: number;
  reward: string | null;
  bothoReward: number;
  chapterTokens: number;
  contributedToday: number;
  dailyCap: number;
  remainingToday: number;
}

/* ------------------------------------------------------------------- hook */

export function useKgotla() {
  const { farmId, showToast } = useGame();
  const { tl } = useTranslation();

  const [npcs, setNpcs] = useState<KgotlaNpc[]>([]);
  const [projects, setProjects] = useState<KgotlaProject[]>([]);
  const [board, setBoard] = useState<ChargeBoard | null>(null);
  const [botho, setBotho] = useState<BothoView | null>(null);
  const [journal, setJournal] = useState<JournalView | null>(null);
  const [elder, setElder] = useState<ElderGuidance | null>(null);
  const [contribution, setContribution] = useState<ContributionView | null>(null);
  const [feastStatus, setFeastStatus] = useState<FeastStatus | null>(null);
  const [loading, setLoading] = useState(false);
  /** Non-null only when the COUNCIL itself failed — drives the Retry row (AC-09). */
  const [councilError, setCouncilError] = useState<string | null>(null);
  /** The elder whose action is in flight, so only that control shows a spinner (AC-08). */
  const [busyId, setBusyId] = useState<string | null>(null);

  const errText = useCallback(
    (e: unknown): string => {
      const msg = (e as { message?: unknown })?.message;
      return typeof msg === 'string' && msg ? msg : tl('somethingWentWrong');
    },
    [tl],
  );

  const load = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [prog, elderRes, npcRes, projRes, boardRes, feastRes] = await Promise.allSettled([
        apiFetch<{ botho: BothoView; journal: JournalView }>('GET', '/progression'),
        apiFetch<ElderGuidance>('GET', '/progression/elder'),
        apiFetch<KgotlaNpc[]>('GET', `/farms/${farmId}/kgotla/npcs`),
        apiFetch<ProjectsResponse>('GET', `/farms/${farmId}/kgotla/projects`),
        apiFetch<ChargeBoard>('GET', `/farms/${farmId}/kgotla/charges`),
        // Doc 11 §4 — feast standing (fence + Friend of the Feast), read-only.
        apiFetch<FeastStatus>('GET', `/farms/${farmId}/kgotla/feast-status`),
      ]);

      if (prog.status === 'fulfilled') {
        setBotho(prog.value.botho);
        setJournal(prog.value.journal);
      }
      if (elderRes.status === 'fulfilled') setElder(elderRes.value);

      // The council is the screen. If it fails, say so and offer Retry rather
      // than rendering an empty hall that looks like "no elders exist".
      if (npcRes.status === 'fulfilled' && Array.isArray(npcRes.value)) {
        setNpcs(npcRes.value);
        setCouncilError(null);
      } else if (npcRes.status === 'rejected') {
        const reason = npcRes.reason as { message?: unknown };
        setCouncilError(
          typeof reason?.message === 'string' && reason.message
            ? reason.message
            : null,
        );
      }

      if (boardRes.status === 'fulfilled') setBoard(boardRes.value);
      if (feastRes.status === 'fulfilled') setFeastStatus(feastRes.value);

      if (projRes.status === 'fulfilled' && projRes.value) {
        setProjects(projRes.value.projects ?? []);
        setContribution(projRes.value.contribution ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  const talk = useCallback(
    async (npcId: string): Promise<TalkResult | null> => {
      if (!farmId) return null;
      try {
        return await apiFetch<TalkResult>(
          'POST',
          `/farms/${farmId}/kgotla/npcs/${npcId}/talk`,
        );
      } catch (e) {
        showToast(tl('kgotla'), errText(e), '⚠️', 'error');
        return null;
      }
    },
    [farmId, showToast, tl, errText],
  );

  /** Accept a charge — spends one slot of today's shared pool (AC-02). */
  const accept = useCallback(
    async (npcId: string) => {
      if (!farmId) return null;
      setBusyId(npcId);
      try {
        const res = await apiFetch<{ charge: ChargeView; poolRemaining: number }>(
          'POST',
          `/farms/${farmId}/kgotla/npcs/${npcId}/accept`,
        );
        await load();
        return res;
      } catch (e) {
        showToast(tl('kgotla'), errText(e), '⚠️', 'error');
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [farmId, load, showToast, tl, errText],
  );

  /** Turn in a charge — the server verifies the objective before paying (AC-03). */
  const turnIn = useCallback(
    async (npcId: string) => {
      if (!farmId) return null;
      setBusyId(npcId);
      try {
        const res = await apiFetch<TurnInResult>(
          'POST',
          `/farms/${farmId}/kgotla/npcs/${npcId}/turn-in`,
        );
        const parts = [
          res.pulaReward > 0 ? `+${res.pulaReward} Pula` : null,
          res.bothoReward > 0 ? `+${res.bothoReward} Botho` : null,
          res.chapterTokens > 0
            ? `+${res.chapterTokens} ${tl('rewardTokens')}`
            : null,
          `+${res.reputationGain} ${tl('regard')}`,
        ].filter(Boolean);
        showToast(tl('chargeCompleteTitle'), parts.join(' · '), '🏛️', 'success');
        await load();
        return res;
      } catch (e) {
        showToast(tl('chargeFailedTitle'), errText(e), '⚠️', 'error');
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [farmId, load, showToast, tl, errText],
  );

  const donate = useCallback(
    async (projectId: string, amount: number) => {
      if (!farmId) return;
      if (!Number.isInteger(amount) || amount <= 0) return;
      setBusyId(`project:${projectId}`);
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
          ? `${tl('projectCompleteTitle')} — ${data.reward}`
          : `${tl('gavePula')} ${amount} Pula · ${data.remainingToday} ${tl('leftToday')}`;
        showToast(tl('supportProject'), msg, '🤝', 'success');
        await load();
      } catch (e) {
        showToast(tl('donationFailedTitle'), errText(e), '⚠️', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [farmId, load, showToast, tl, errText],
  );

  /**
   * Doc 11 §4 — Nako ya Go Arogana (the Village Feast). Hands 20 watermelons to
   * the village for CAPPED Botho and a keepsake fence. The server takes the fruit
   * first and never touches Pula in either direction, so a failure here loses
   * fruit rather than minting anything (I4).
   */
  const donateVillageFeast = useCallback(
    async (cropType = 'watermelon', quantity = 20) => {
      if (!farmId) return null;
      setBusyId('feast');
      try {
        const res = await apiFetch<VillageFeastResult>(
          'POST',
          `/farms/${farmId}/kgotla/village-feast`,
          { cropType, quantity },
        );
        const tail = res.bothoAwarded > 0 ? ` +${res.bothoAwarded} Botho` : '';
        showToast(tl('villageFeast'), `${tl('feastThanks')}${tail}`, '🍉', 'success');
        await load();
        return res;
      } catch (e) {
        showToast(tl('villageFeast'), errText(e), '⚠️', 'error');
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [farmId, load, showToast, tl, errText],
  );

  useEffect(() => {
    if (farmId) load();
  }, [farmId, load]);

  return {
    npcs,
    projects,
    board,
    botho,
    journal,
    elder,
    contribution,
    feastStatus,
    loading,
    councilError,
    busyId,
    talk,
    accept,
    turnIn,
    donate,
    donateVillageFeast,
    reload: load,
  };
}
