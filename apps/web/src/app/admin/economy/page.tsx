'use client';

import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_token') || localStorage.getItem('token');
}

async function apiFetch<T = unknown>(method: string, path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}

interface EconomyData {
  totalPlayers: number;
  totalCurrencyInCirculation: number;
  averagePlayerWealth: number;
  totalCompletedPayments: number;
  totalRevenue: number;
  activeCrops: number;
}

interface PriceItem {
  itemType: string;
  name: string;
  category: string;
  basePrice: number;
}

interface LedgerEntry {
  player_id: string;
  entry_type: string;
  reference_type: string;
  amount_change: number;
  description: string;
  created_at: string;
}

export default function EconomyPage() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<EconomyData>('GET', '/admin/economy'),
      apiFetch<PriceItem[]>('GET', '/market/prices'),
      apiFetch<LedgerEntry[]>('GET', '/admin/ledger?limit=50'),
    ]).then(([ecoRes, priceRes, ledgerRes]) => {
      if (ecoRes.status === 'fulfilled') setEconomy(ecoRes.value);
      if (priceRes.status === 'fulfilled' && Array.isArray(priceRes.value))
        setPrices(priceRes.value);
      if (ledgerRes.status === 'fulfilled' && Array.isArray(ledgerRes.value))
        setLedger(ledgerRes.value);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">💰</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading economy data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-headline text-xl text-primary uppercase font-bold mb-6">
        Economy Monitoring
      </h1>

      {/* Top Stats */}
      {economy && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            {
              label: 'Total Players',
              value: economy.totalPlayers,
              icon: '👥',
            },
            {
              label: 'Currency Supply',
              value: `P${economy.totalCurrencyInCirculation.toLocaleString()}`,
              icon: '💰',
            },
            {
              label: 'Avg Wealth',
              value: `P${economy.averagePlayerWealth.toLocaleString()}`,
              icon: '📈',
            },
            {
              label: 'Completed Payments',
              value: economy.totalCompletedPayments,
              icon: '✅',
            },
            {
              label: 'Total Revenue',
              value: `P${Math.round(economy.totalRevenue).toLocaleString()}`,
              icon: '💵',
            },
            {
              label: 'Active Crops',
              value: economy.activeCrops,
              icon: '🌾',
            },
          ].map((s) => (
            <div key={s.label} className="bg-wood-dark p-3 border border-wood-border">
              <span className="text-lg">{s.icon}</span>
              <div className="font-mono text-lg text-gold-currency font-bold mt-1">{s.value}</div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Price List */}
      <div className="mb-8">
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Market Prices
        </h2>
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Item</span>
            <span>Category</span>
            <span>Base Price</span>
            <span>Item Type</span>
          </div>
          {prices.map((p) => (
            <div
              key={p.itemType}
              className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-headline text-xs text-cream-surface font-bold">{p.name}</span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase">
                {p.category}
              </span>
              <span className="font-mono text-xs text-gold-currency font-bold">P{p.basePrice}</span>
              <span className="font-mono text-[10px] text-on-surface-variant">{p.itemType}</span>
            </div>
          ))}
          {prices.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No price data available.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ledger */}
      <div>
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Recent Transactions
        </h2>
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Type</span>
            <span>Amount</span>
            <span>Reference</span>
            <span className="col-span-2">Description</span>
          </div>
          {ledger.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-mono text-[10px] text-primary font-bold uppercase">
                {e.entry_type}
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  e.amount_change >= 0 ? 'text-status-success' : 'text-status-danger'
                }`}
              >
                {e.amount_change >= 0 ? '+' : ''}
                {e.amount_change}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {e.reference_type || '—'}
              </span>
              <span className="col-span-2 font-mono text-[10px] text-on-surface-variant truncate">
                {e.description || '—'}
              </span>
            </div>
          ))}
          {ledger.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No transactions recorded.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
