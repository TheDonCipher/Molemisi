'use client';

import React, { useEffect, useState } from 'react';
import { getStoredRole, supabaseLogout } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface DevStatus {
  role: string;
  userId: string;
  email: string;
  serverTime: string;
  uptimeSeconds: number;
  node: string;
  env: string;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  role?: string;
  [key: string]: unknown;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Dev Tools — the separate /dev area for developer accounts (role='dev').
 *
 * This is NOT the admin panel: dev accounts test and debug the app, admins
 * control users and game config. Gated client-side on role, and every server
 * call hits DevGuard (profiles.role='dev').
 */
export default function DevPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<DevStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== 'dev') {
      window.location.href = '/game';
      return;
    }
    setAllowed(true);

    const token = localStorage.getItem('molemisi_token') || localStorage.getItem('token');
    setTokenPresent(Boolean(token));
    if (token) setPayload(decodeJwt(token));

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/dev/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) {
          setStatusError(json?.error?.message || `Request failed (${res.status})`);
          return;
        }
        setStatus((json?.data ?? json) as DevStatus);
      } catch {
        setStatusError('Network error — is the API running?');
      }
    })();
  }, []);

  const clearLocalState = () => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith('molemisi') || k.startsWith('sb-'),
    );
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.href = '/auth/login';
  };

  const handleSignOut = async () => {
    setBusy(true);
    await supabaseLogout();
    window.location.href = '/auth/login';
  };

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#210e0b]">
        <p className="font-mono text-sm text-primary uppercase animate-pulse">
          Checking dev access…
        </p>
      </div>
    );
  }

  const expiry = payload?.exp ? new Date(payload.exp * 1000).toLocaleString() : '—';

  return (
    <div className="min-h-screen bg-[#210e0b] px-4 py-8 font-mono text-cream-surface">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-xl text-primary uppercase font-bold">Dev Tools</h1>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Developer area — testing &amp; debugging. Separate from the admin panel.
            </p>
          </div>
          <a
            href="/game"
            className="text-[11px] text-primary hover:text-cream-surface px-2 py-1 border border-wood-border rounded"
          >
            ← Game
          </a>
        </div>

        {/* Server status (validates DevGuard) */}
        <section className="bg-wood-dark border border-wood-border rounded-lg p-4 mb-4">
          <h2 className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">
            Server status
          </h2>
          {statusError ? (
            <p className="text-status-error text-xs">{statusError}</p>
          ) : status ? (
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-on-surface-variant">Role</dt>
              <dd className="text-secondary font-bold">{status.role}</dd>
              <dt className="text-on-surface-variant">Env</dt>
              <dd>{status.env}</dd>
              <dt className="text-on-surface-variant">Node</dt>
              <dd>{status.node}</dd>
              <dt className="text-on-surface-variant">Uptime</dt>
              <dd>{status.uptimeSeconds}s</dd>
              <dt className="text-on-surface-variant">Server time</dt>
              <dd>{new Date(status.serverTime).toLocaleString()}</dd>
              <dt className="text-on-surface-variant">Account</dt>
              <dd className="truncate">{status.email}</dd>
            </dl>
          ) : (
            <p className="text-on-surface-variant text-xs animate-pulse">Loading…</p>
          )}
        </section>

        {/* Session / token inspector */}
        <section className="bg-wood-dark border border-wood-border rounded-lg p-4 mb-4">
          <h2 className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">
            Session
          </h2>
          <dl className="grid grid-cols-2 gap-y-2 text-xs mb-3">
            <dt className="text-on-surface-variant">Token</dt>
            <dd>{tokenPresent ? 'present' : 'missing'}</dd>
            <dt className="text-on-surface-variant">Expires</dt>
            <dd>{expiry}</dd>
          </dl>
          {payload ? (
            <pre className="text-[10px] leading-relaxed bg-surface-container-lowest border border-wood-border rounded p-3 overflow-x-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          ) : (
            <p className="text-on-surface-variant text-xs">No decodable token.</p>
          )}
        </section>

        {/* Actions */}
        <section className="bg-wood-dark border border-wood-border rounded-lg p-4">
          <h2 className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">
            Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearLocalState}
              className="px-3 py-2 text-[11px] uppercase font-bold border border-status-warning/50 text-status-warning hover:bg-status-warning/10 rounded"
            >
              Clear local state
            </button>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="px-3 py-2 text-[11px] uppercase font-bold border border-status-error/50 text-status-error hover:bg-status-error/10 rounded disabled:opacity-50"
            >
              {busy ? '…' : 'Sign out'}
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-3">
            Clear local state removes all <code>molemisi*</code> and <code>sb-*</code> keys from
            localStorage and returns to login — useful when testing fresh-session flows.
          </p>
        </section>
      </div>
    </div>
  );
}
