'use client';

import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_admin_token');
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

interface LedgerEntry {
  player_id: string;
  entry_type: string;
  reference_type: string;
  amount_change: number;
  description: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  CROP_SALE: 'text-status-success',
  CROP_PURCHASE: 'text-status-danger',
  SEED_PURCHASE: 'text-status-danger',
  CONTRACT_REWARD: 'text-gold-currency',
  FORAGING: 'text-sky-blue',
  XP_GAIN: 'text-primary',
  LEVEL_UP: 'text-primary',
  BUILDING: 'text-on-surface-variant',
  WATER: 'text-sky-blue',
  HARVEST: 'text-status-success',
  PLANT: 'text-status-success',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<LedgerEntry[]>('GET', '/admin/ledger?limit=200')
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? entries.filter(
        (e) =>
          e.entry_type.toLowerCase().includes(filter.toLowerCase()) ||
          (e.description || '').toLowerCase().includes(filter.toLowerCase()),
      )
    : entries;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">📜</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading audit logs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-headline text-xl text-primary uppercase font-bold mb-6">Audit Log</h1>

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by type or description..."
          className="w-full px-4 py-2.5 bg-wood-dark border border-wood-border font-mono text-sm text-cream-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
        />
      </div>

      {/* Entry count */}
      <div className="mb-3">
        <span className="font-mono text-[10px] text-on-surface-variant">
          {filtered.length} entries
          {filter ? ` (filtered from ${entries.length})` : ''}
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-wood-dark border border-wood-border overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
          <span>Time</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Ref</span>
          <span className="col-span-2">Description</span>
        </div>
        {filtered.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-wood-border/50 items-center hover:bg-surface-container-high/30 transition-colors"
          >
            <span className="font-mono text-[10px] text-on-surface-variant whitespace-nowrap">
              {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
            </span>
            <span
              className={`font-mono text-[10px] font-bold uppercase ${
                TYPE_COLORS[e.entry_type] || 'text-on-surface-variant'
              }`}
            >
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
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <span className="font-body text-xs text-on-surface-variant">
              No audit entries found.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
