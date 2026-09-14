'use client';

/**
 * Store / monetisation data layer — wires the UI to the finished P9 backend
 * (05 §P9; 02 §6.6 top-up packs; 02 §7.1 the sinks).
 *
 * There are deliberately TWO shops, because the money behaves differently:
 *
 *   GET  /store            — Pula-priced goods (boosts + cosmetics). This is the
 *                            F7 unbounded sink: Pula leaves the economy here.
 *                            Debited from the wallet server-side.
 *   GET  /payments/store   — real-money goods (top-up packs, Guild subscription).
 *                            Pula is credited only on provider webhook
 *                            confirmation, never on request.
 *
 * The server is authoritative on every price and every balance (I7). This module
 * computes nothing: it renders the price the server sent, and re-fetches the
 * balance afterwards rather than decrementing locally. Several older actions in
 * gameState (constructBlueprint, buyMarketItem) still mutate `pula` client-side
 * and drift from the truth — that is a known debt, not a pattern to copy.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useGame } from './gameState';

/** A Pula-priced good from GET /store. */
export interface StoreItem {
  sku: string;
  name: string;
  description: string;
  category: 'boost' | 'cosmetic';
  price: number;
  slug: string;
}

/** A real-money good from GET /payments/store. */
export interface RealMoneyItem {
  sku: string;
  name: string;
  description: string;
  category: 'currency' | 'subscription' | 'boost' | 'cosmetic';
  price: number;
  currency: 'BWP' | 'PULA';
  consumable: boolean;
}

export interface PaymentRecord {
  id: string;
  sku: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface PurchaseResult {
  sku: string;
  name: string;
  description: string;
  category: 'boost' | 'cosmetic';
  price: number;
  slug: string;
}

export interface PaymentResult {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  sku: string;
  createdAt: string;
  completedAt: string | null;
}

export function useStore() {
  const { showToast, refresh } = useGame();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [realMoney, setRealMoney] = useState<RealMoneyItem[]>([]);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  /** SKU currently in flight, so its button can show progress and block re-taps. */
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, shop, past] = await Promise.allSettled([
        apiFetch<StoreItem[]>('GET', '/store'),
        apiFetch<{ items: RealMoneyItem[] }>('GET', '/payments/store'),
        apiFetch<{ payments: PaymentRecord[] }>('GET', '/payments/history'),
      ]);
      if (catalog.status === 'fulfilled' && Array.isArray(catalog.value)) setItems(catalog.value);
      if (shop.status === 'fulfilled') setRealMoney(shop.value?.items ?? []);
      if (past.status === 'fulfilled') setHistory(past.value?.payments ?? []);
    } catch (e: any) {
      showToast('Store', e?.message || 'Could not load the store', '⚠️', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /**
   * Buy a Pula-priced good. The server debits the wallet and records ownership;
   * a cosmetic you already own is a no-op there and costs nothing.
   */
  const buy = useCallback(
    async (sku: string): Promise<PurchaseResult | null> => {
      setBusy(sku);
      try {
        const data = await apiFetch<PurchaseResult>('POST', '/store/purchase', { sku });
        showToast('Purchased', `${data.name} · −${data.price} Pula`, '🛍️', 'success');
        // Re-read the balance from the server instead of subtracting locally.
        await refresh();
        await load();
        return data;
      } catch (e: any) {
        showToast(
          'Purchase failed',
          e?.message || 'Could not complete the purchase',
          '⚠️',
          'error',
        );
        return null;
      } finally {
        setBusy(null);
      }
    },
    [load, refresh, showToast],
  );

  /**
   * Start a real-money purchase. With the stub provider this completes inline,
   * so the balance is refreshed immediately; with a real PSP the credit lands
   * when the webhook arrives, and the UI says so.
   */
  const startPayment = useCallback(
    async (sku: string): Promise<PaymentResult | null> => {
      setBusy(sku);
      try {
        const data = await apiFetch<PaymentResult>('POST', '/payments/create', { sku });
        if (data.status === 'COMPLETED') {
          showToast(
            'Payment complete',
            `P${data.amount} · Pula credited to your wallet`,
            '✅',
            'success',
          );
          await refresh();
        } else {
          showToast(
            'Payment pending',
            'Waiting for confirmation from the payment provider',
            '⏳',
            'info',
          );
        }
        await load();
        return data;
      } catch (e: any) {
        showToast('Payment failed', e?.message || 'Could not start the payment', '⚠️', 'error');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [load, refresh, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const byCategory = (c: RealMoneyItem['category']) => realMoney.filter((i) => i.category === c);

  return {
    boosts: items.filter((i) => i.category === 'boost'),
    cosmetics: items.filter((i) => i.category === 'cosmetic'),
    packs: byCategory('currency'),
    plans: byCategory('subscription'),
    history,
    loading,
    busy,
    buy,
    startPayment,
    reload: load,
  };
}
