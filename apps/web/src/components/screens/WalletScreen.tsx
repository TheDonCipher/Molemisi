'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, useGame } from '../../lib/gameState';
import { useTranslation } from '../../lib/useTranslation';
import { CurrencyGuideSection } from '../CurrencyGuide';

interface WalletSnapshot {
  pula: number;
  botho: number;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
}

interface LedgerRow {
  id: string;
  currency: string;
  amount: number;
  balance_after: number | null;
  source: string;
  ref_id: string | null;
  created_at: string;
}

// Human-readable labels for the ledger `source` values. Anything not listed
// falls back to a de-slugged, title-cased string.
const SOURCE_LABEL: Record<string, string> = {
  plant: 'Planting',
  harvest: 'Harvest',
  sell: 'Market sale',
  buy: 'Market buy',
  topup: 'Top-up',
  quest: 'Quest reward',
  kgotla: 'Kgotla',
  donate: 'Community donation',
  building: 'Building',
  craft: 'Crafting',
  chapter: 'Chapter',
  refund: 'Refund',
  water: 'Water',
  daily: 'Daily',
  boost: 'Boost',
  subscription: 'Subscription',
};

const CURRENCY_SHORT: Record<string, string> = {
  pula: 'P',
  botho: 'B',
  chapter_token: 'CT',
  madi: 'M',
};

function sourceLabel(source: string): string {
  if (SOURCE_LABEL[source]) return SOURCE_LABEL[source];
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function currencyShort(currency: string): string {
  return CURRENCY_SHORT[currency] ?? currency.slice(0, 3).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function WalletScreen() {
  const { showToast } = useGame();
  const { tl } = useTranslation();
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, ledgerRes] = await Promise.allSettled([
        apiFetch<WalletSnapshot>('GET', '/wallet'),
        apiFetch<LedgerRow[]>('GET', '/wallet/ledger'),
      ]);
      if (walletRes.status === 'fulfilled') {
        setSnapshot(walletRes.value);
      } else {
        showToast('Wallet', 'Could not load balances.', '⚠️', 'error');
      }
      if (ledgerRes.status === 'fulfilled') {
        setLedger(ledgerRes.value ?? []);
      }
    } catch (e: any) {
      showToast('Wallet', e?.message || 'Could not load wallet.', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full px-4 py-6 max-w-lg mx-auto select-none pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-lg text-primary uppercase font-bold">{tl('wallet')}</h1>
        <button
          onClick={() => load()}
          className="font-mono text-xs text-primary hover:text-cream-surface px-2 py-1"
        >
          {tl('refresh') || '↻'}
        </button>
      </div>

      {loading && !snapshot ? (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-3xl animate-pulse mb-2">💰</span>
          <p className="font-mono text-xs text-on-surface-variant">{tl('loadingFarm')}</p>
        </div>
      ) : (
        <>
          {/* Balances */}
          <section className="mb-6 space-y-3">
            <div className="bg-wood-dark p-4 border border-wood-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="font-mono text-xs text-on-surface-variant uppercase">Pula</span>
              </div>
              <span className="font-mono text-lg text-gold-currency font-bold">
                {(snapshot?.pula ?? 0).toLocaleString()} P
              </span>
            </div>
            <div className="bg-wood-dark p-4 border border-wood-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <span className="font-mono text-xs text-on-surface-variant uppercase">Botho</span>
              </div>
              <span className="font-mono text-lg text-secondary font-bold">
                {(snapshot?.botho ?? 0).toLocaleString()} B
              </span>
            </div>

            {snapshot?.subscriptionStatus ? (
              <div className="bg-wood-dark p-3 border border-wood-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-on-surface-variant uppercase">
                  {tl('subscription') || 'Subscription'}
                </span>
                <span className="font-mono text-[11px] text-cream-surface">
                  {snapshot.subscriptionStatus}
                  {formatExpiry(snapshot.subscriptionExpiresAt)
                    ? ` · ${formatExpiry(snapshot.subscriptionExpiresAt)}`
                    : ''}
                </span>
              </div>
            ) : null}
          </section>

          {/* History */}
          <section>
            <h2 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
              {tl('history') || 'History'}
            </h2>
            {ledger.length === 0 ? (
              <div className="bg-wood-dark p-6 border border-wood-border text-center">
                <span className="text-2xl">📜</span>
                <p className="font-mono text-[10px] text-on-surface-variant mt-2">
                  {tl('noHistory') || 'No transactions yet.'}
                </p>
              </div>
            ) : (
              <div className="bg-wood-dark border border-wood-border divide-y divide-wood-border/50">
                {ledger.map((row) => {
                  const positive = row.amount >= 0;
                  return (
                    <div key={row.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-cream-surface font-bold truncate">
                          {sourceLabel(row.source)}
                        </p>
                        <p className="font-mono text-[9px] text-on-surface-variant">
                          {currencyShort(row.currency)} · {formatTime(row.created_at)}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[12px] font-bold shrink-0 ml-2 ${
                          positive ? 'text-status-success' : 'text-status-error'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {row.amount.toLocaleString()} {currencyShort(row.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Beginner currency reference — explains every economy and that
              Kagiso is a meter, not money (02 §6; Bushveld model). */}
          <CurrencyGuideSection />

          {/* v1 closed-loop note — be honest that hard currency / withdrawal
              is not part of the snapshot (02 §6: Pula must not imply a Pula↔Madi rate). */}
          <p className="font-mono text-[9px] text-on-surface-variant/70 mt-4 text-center">
            {tl('walletNote') ||
              'Madi and withdrawals arrive in v1.1. Pula and Botho are the v1 currencies.'}
          </p>
        </>
      )}
    </div>
  );
}
