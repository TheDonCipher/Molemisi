'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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

interface EconomyData {
  totalPlayers: number;
  totalCurrencyInCirculation: number;
  averagePlayerWealth: number;
  totalCompletedPayments: number;
  totalRevenue: number;
  activeCrops: number;
}

interface Player {
  id: string;
  display_name: string;
  currency: number;
  farm_level: number;
  created_at: string;
}

export default function AdminDashboard() {
  const [economy, setEconomy] = useState<EconomyData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<EconomyData>('GET', '/admin/economy'),
      apiFetch<Player[]>('GET', '/admin/players?q='),
    ]).then(([ecoRes, playerRes]) => {
      if (ecoRes.status === 'fulfilled') setEconomy(ecoRes.value);
      if (playerRes.status === 'fulfilled')
        setPlayers(Array.isArray(playerRes.value) ? playerRes.value : []);
      setLoading(false);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await apiFetch<Player[]>(
        'GET',
        `/admin/players?q=${encodeURIComponent(searchQuery)}`,
      );
      setPlayers(Array.isArray(results) ? results : []);
    } catch {
      /* ignore */
    }
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">📊</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-headline text-xl text-primary uppercase font-bold mb-6">
        Admin Dashboard
      </h1>

      {/* Economy Stats */}
      {economy && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            {
              label: 'Players',
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
              label: 'Payments',
              value: economy.totalCompletedPayments,
              icon: '🛒',
            },
            {
              label: 'Revenue',
              value: `P${Math.round(economy.totalRevenue).toLocaleString()}`,
              icon: '💵',
            },
            {
              label: 'Active Crops',
              value: economy.activeCrops,
              icon: '🌾',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-wood-dark p-3 border border-wood-border">
              <span className="text-lg">{stat.icon}</span>
              <div className="font-mono text-lg text-gold-currency font-bold mt-1">
                {stat.value}
              </div>
              <div className="font-mono text-[10px] text-on-surface-variant uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Search */}
      <div className="mb-6">
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Player Search
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name..."
            className="flex-1 px-4 py-2.5 bg-wood-dark border border-wood-border font-mono text-sm text-cream-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 bg-primary text-wood-dark font-headline text-xs uppercase font-bold hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Player List */}
      <div>
        <h2 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
          Players ({players.length})
        </h2>
        <div className="bg-wood-dark border border-wood-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span className="col-span-2">Player</span>
            <span>Level</span>
            <span>Currency</span>
            <span>Joined</span>
          </div>
          {/* Rows */}
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/admin/players/${p.id}`}
              className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-wood-border/50 hover:bg-surface-container-high transition-colors items-center"
            >
              <div className="col-span-2">
                <span className="font-headline text-xs text-cream-surface font-bold block">
                  {p.display_name || 'Unnamed'}
                </span>
                <span className="font-mono text-[9px] text-on-surface-variant block truncate">
                  {p.id}
                </span>
              </div>
              <span className="font-mono text-xs text-primary font-bold">Lv.{p.farm_level}</span>
              <span className="font-mono text-xs text-gold-currency font-bold">
                P{p.currency?.toLocaleString() || 0}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
              </span>
            </Link>
          ))}
          {players.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">No players found.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
