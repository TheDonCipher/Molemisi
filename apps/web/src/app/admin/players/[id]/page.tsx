'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_admin_token');
}

async function apiFetch<T = unknown>(
  method: string,
  path: string,
): Promise<T> {
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

interface PlayerOverview {
  profile: {
    id: string;
    display_name: string;
    email: string;
    currency: number;
    farm_level: number;
    farm_xp: number;
    energy: number;
    created_at: string;
  } | null;
  farm: {
    id: string;
    name: string;
    level: number;
    plot_count: number;
    weather: string;
    season: string;
    current_day: number;
  } | null;
  recentPayments: Array<{
    status: string;
    amount: number;
    sku: string;
    created_at: string;
  }>;
  recentActivity: Array<{
    entry_type: string;
    amount_change: number;
    description: string;
    created_at: string;
  }>;
}

function ModerationCard({
  title,
  icon,
  description,
  actionLabel,
  actionColor,
  onAction,
}: {
  title: string;
  icon: string;
  description: string;
  actionLabel: string;
  actionColor: string;
  onAction: () => void;
}) {
  return (
    <div className="bg-wood-dark p-4 border border-wood-border">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-headline text-sm text-cream-surface font-bold">
          {title}
        </span>
      </div>
      <p className="font-body text-xs text-on-surface-variant mb-3">
        {description}
      </p>
      <button
        onClick={onAction}
        className={`px-4 py-2 font-mono text-xs uppercase font-bold ${actionColor} hover:opacity-80 transition-opacity active:translate-y-0.5`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [player, setPlayer] = useState<PlayerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'activity' | 'payments' | 'moderation'>(
    'overview',
  );

  useEffect(() => {
    apiFetch<PlayerOverview>('GET', `/admin/players/${id}`)
      .then((data) => setPlayer(data))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">👤</div>
          <p className="font-headline text-xs text-primary uppercase font-bold">
            Loading player...
          </p>
        </div>
      </div>
    );
  }

  if (!player?.profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-3xl mb-3">❌</div>
          <p className="font-headline text-sm text-red-400 uppercase font-bold mb-2">
            Player Not Found
          </p>
          <Link
            href="/admin/players"
            className="font-mono text-xs text-primary hover:underline"
          >
            ← Back to Players
          </Link>
        </div>
      </div>
    );
  }

  const { profile, farm, recentPayments, recentActivity } = player;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/players"
        className="font-mono text-xs text-primary hover:underline mb-4 inline-block"
      >
        ← All Players
      </Link>

      {/* Player Header */}
      <div className="bg-wood-dark p-4 border border-wood-border mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-headline text-lg text-cream-surface font-bold">
              {profile.display_name || 'Unnamed Farmer'}
            </h1>
            <p className="font-mono text-xs text-on-surface-variant mt-1">
              {profile.email}
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant mt-0.5">
              ID: {profile.id}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-gold-currency font-bold">
              P{profile.currency?.toLocaleString() || 0}
            </div>
            <div className="font-mono text-xs text-primary font-bold">
              Lv.{profile.farm_level}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'XP', value: `${profile.farm_xp || 0}` },
            { label: 'Energy', value: `${profile.energy || 0}` },
            {
              label: 'Joined',
              value: profile.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—',
            },
            {
              label: 'Farm',
              value: farm ? farm.name : 'No farm',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high p-2 border border-wood-border/50"
            >
              <div className="font-mono text-xs text-cream-surface font-bold">
                {stat.value}
              </div>
              <div className="font-mono text-[9px] text-on-surface-variant uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity' },
            { id: 'payments', label: 'Payments' },
            { id: 'moderation', label: 'Moderation' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 font-mono text-xs uppercase font-bold border transition-all ${
              tab === t.id
                ? 'bg-primary-container text-on-primary-container border-primary'
                : 'bg-surface-container-high text-on-surface-variant border-wood-border hover:border-primary/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && farm && (
        <div className="bg-wood-dark p-4 border border-wood-border">
          <h3 className="font-headline text-sm text-cream-surface font-bold mb-3">
            Farm: {farm.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Plots', value: `${farm.plot_count}` },
              { label: 'Level', value: `${farm.level}` },
              { label: 'Season', value: farm.season || '—' },
              { label: 'Day', value: `${farm.current_day || 1}` },
              { label: 'Weather', value: farm.weather || '—' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-surface-container-high p-2 border border-wood-border/50"
              >
                <div className="font-mono text-xs text-cream-surface font-bold">
                  {s.value}
                </div>
                <div className="font-mono text-[9px] text-on-surface-variant uppercase">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'overview' && !farm && (
        <div className="bg-wood-dark p-4 border border-wood-border text-center">
          <p className="font-body text-xs text-on-surface-variant">
            No farm data available.
          </p>
        </div>
      )}

      {tab === 'activity' && (
        <div className="bg-wood-dark border border-wood-border">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Type</span>
            <span>Amount</span>
            <span className="col-span-2">Description</span>
          </div>
          {recentActivity.map((a, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span className="font-mono text-[10px] text-primary font-bold uppercase">
                {a.entry_type}
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  a.amount_change >= 0
                    ? 'text-status-success'
                    : 'text-status-danger'
                }`}
              >
                {a.amount_change >= 0 ? '+' : ''}
                {a.amount_change}
              </span>
              <span className="col-span-2 font-mono text-[10px] text-on-surface-variant truncate">
                {a.description || '—'}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No recent activity.
              </span>
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-wood-dark border border-wood-border">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-wood-medium border-b border-wood-border font-mono text-[10px] text-on-surface-variant uppercase">
            <span>Status</span>
            <span>Amount</span>
            <span>SKU</span>
            <span>Date</span>
          </div>
          {recentPayments.map((p, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-wood-border/50 items-center"
            >
              <span
                className={`font-mono text-[10px] font-bold uppercase ${
                  p.status === 'COMPLETED'
                    ? 'text-status-success'
                    : 'text-on-surface-variant'
                }`}
              >
                {p.status}
              </span>
              <span className="font-mono text-xs text-gold-currency font-bold">
                P{((p.amount || 0) / 100).toFixed(2)}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant truncate">
                {p.sku || '—'}
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant">
                {p.created_at
                  ? new Date(p.created_at).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          ))}
          {recentPayments.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="font-body text-xs text-on-surface-variant">
                No payment history.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Moderation Tab */}
      {tab === 'moderation' && (
        <div className="space-y-4">
          {/* Warning */}
          <ModerationCard
            title="Send Warning"
            icon="⚠️"
            description="Send a warning notification to this player. They will see it on their next login."
            actionLabel="Send Warning"
            actionColor="bg-status-warning text-wood-dark"
            onAction={() => {
              if (
                window.confirm(
                  `Send a warning to ${profile.display_name || 'this player'}?`,
                )
              ) {
                alert('Warning sent! (API endpoint pending)');
              }
            }}
          />

          {/* Ban */}
          <ModerationCard
            title="Ban Player"
            icon="🚫"
            description="Disable this player\'s account. They will be unable to log in or access the game."
            actionLabel="Ban Player"
            actionColor="bg-status-danger text-white"
            onAction={() => {
              const reason = window.prompt(
                `Enter ban reason for ${profile.display_name || 'this player'}:`,
              );
              if (reason) {
                alert(
                  `Player banned. Reason: ${reason}\n(API endpoint pending)`,
                );
              }
            }}
          />

          {/* Reset Farm */}
          <ModerationCard
            title="Reset Farm"
            icon="🗑️"
            description="Reset this player\'s farm to starting state. This is irreversible — all crops, buildings, and progress will be lost."
            actionLabel="Reset Farm"
            actionColor="bg-red-600 text-white"
            onAction={() => {
              if (
                window.confirm(
                  `RESET FARM for ${profile.display_name || 'this player'}?\n\nThis will delete all crops, buildings, and inventory. This CANNOT be undone.`,
                )
              ) {
                const doubleConfirm = window.confirm(
                  'Are you absolutely sure? Type YES in your mind and click OK.',
                );
                if (doubleConfirm) {
                  alert('Farm reset! (API endpoint pending)');
                }
              }
            }}
          />

          {/* Player Info */}
          <div className="bg-wood-dark p-4 border border-wood-border">
            <h3 className="font-headline text-xs text-on-surface-variant uppercase tracking-wider mb-3 font-bold">
              Player Details
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">User ID</span>
                <span className="text-cream-surface select-all">{profile.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Email</span>
                <span className="text-cream-surface">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Farm ID</span>
                <span className="text-cream-surface select-all">{farm?.id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Created</span>
                <span className="text-cream-surface">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleString()
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
