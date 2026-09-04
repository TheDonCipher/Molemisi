'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('molemisi_token') ||
    localStorage.getItem('token')
  );
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

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/players', label: 'Players', icon: '👥' },
  { href: '/admin/economy', label: 'Economy', icon: '💰' },
  { href: '/admin/audit', label: 'Audit Log', icon: '📜' },
  { href: '/game', label: '← Back to Game', icon: '🎮' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    // Verify admin access by hitting the admin endpoint
    apiFetch('GET', '/admin/economy')
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#210e0b]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔒</div>
          <p className="font-headline text-sm text-primary uppercase font-bold">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#210e0b]">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="font-headline text-lg text-red-400 uppercase font-bold mb-2">
            Access Denied
          </h1>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            You don&apos;t have admin privileges. This area is restricted
            to authorized administrators only.
          </p>
          <Link
            href="/game"
            className="inline-block px-6 py-2 bg-primary text-wood-dark font-headline text-sm uppercase font-bold rounded hover:bg-primary/80 transition-colors"
          >
            Back to Game
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#210e0b] text-[#ffdad4]">
      {/* Sidebar */}
      <aside className="w-56 bg-wood-medium border-r-2 border-wood-border shrink-0 hidden md:flex flex-col">
        <div className="px-4 py-4 border-b-2 border-wood-border">
          <span className="font-headline text-sm text-primary uppercase font-bold">
            🌾 Admin Panel
          </span>
        </div>
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 font-mono text-xs transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:text-cream-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t-2 border-wood-border">
          <span className="font-mono text-[9px] text-on-surface-variant">
            Molemisi Admin v0.1.0
          </span>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-wood-medium border-t-2 border-wood-border">
        <nav className="grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center text-center ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-mono text-[9px] uppercase mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
