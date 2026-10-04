'use client';

/**
 * Global Kgotla chat — data layer (08 §5 / D5, B1).
 *
 * "Mafoko otlhe a lekgotla a mantle." One shared channel for every player.
 *
 * RULING (2026-10-04, third pass): **no chat moderation.** There is nothing in
 * this file that filters, reports or hides a message — the client renders what
 * the server stores. What the client does enforce is purely anti-flood: it
 * disables the send button for `MIN_SECONDS_BETWEEN` so the round trip is not
 * spent on a request the server will refuse anyway.
 *
 * COST DISCIPLINE (`20 §5.4`): the target audience is on mobile data, so this
 * polls on a slow interval and ONLY while the tab is visible. No chatty polling,
 * no socket.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, useGame } from './gameState';
import { CHAT_RATE_LIMITS, type ChatLanguage } from '@molemisi/game-config';

export interface ChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  body: string;
  language: string;
  createdAt: string;
  /** True when the viewer wrote it. */
  mine: boolean;
}

/** How often the channel is re-read while the tab is visible. */
const POLL_MS = 15000;

export function useChat(pollMs = POLL_MS) {
  const { showToast } = useGame();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState<ChatLanguage>('en');
  /** Epoch ms before which the send button stays disabled (anti-flood). */
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const cooldownTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ChatMessage[]>('GET', '/chat');
      if (Array.isArray(data)) setMessages(data);
    } catch (e: any) {
      showToast('Kgotla', e?.message || 'Could not load the chat', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      // Only while visible: a background tab polling on mobile data is the
      // exact cost `20 §5.4` forbids.
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void load();
      }
    }, pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  // Clear the cooldown timer on unmount so we do not setState after teardown.
  useEffect(() => {
    return () => {
      if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    const until = Date.now() + CHAT_RATE_LIMITS.minSecondsBetween * 1000;
    setCooldownUntil(until);
    if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current);
    cooldownTimer.current = window.setTimeout(
      () => setCooldownUntil(0),
      CHAT_RATE_LIMITS.minSecondsBetween * 1000,
    );
  }, []);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      const text = (body ?? '').trim();
      if (!text || sending) return false;
      setSending(true);
      try {
        await apiFetch<ChatMessage>('POST', '/chat/messages', { body: text, language });
        startCooldown();
        await load();
        return true;
      } catch (e: any) {
        showToast('Kgotla', e?.message || 'Could not send that', '⚠️', 'error');
        return false;
      } finally {
        setSending(false);
      }
    },
    [language, load, showToast, startCooldown],
  );

  return {
    messages,
    loading,
    sending,
    language,
    setLanguage,
    /** Remaining cooldown in seconds, for the disabled-button hint. */
    cooldownSeconds: Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
    send,
    reload: load,
  };
}