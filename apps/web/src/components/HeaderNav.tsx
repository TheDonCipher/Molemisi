'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../lib/gameState';
import { useTranslation } from '../lib/useTranslation';

const API_BASE = 'http://localhost:3001/api/v1';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('molemisi_token') || localStorage.getItem('token');
}

export function HeaderNav() {
  const { pula, farmLevel, activeNav, setActiveNav } = useGame();
  const { tl } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const NAV_TABS = [
    { id: 'farm', label: tl('farm') },
    { id: 'kgotla', label: tl('kgotla') },
    { id: 'bushveld', label: tl('wild') },
    { id: 'market', label: tl('market') },
    { id: 'inventory', label: tl('bag') },
    { id: 'settings', label: tl('config') },
  ];

  // Poll for unread count every 30s
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (showPanel) fetchNotifications();
  }, [showPanel, fetchNotifications]);

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'ban':
        return '🚫';
      case 'warning':
        return '⚠️';
      case 'reset':
        return '🗑️';
      case 'achievement':
        return '🏆';
      case 'info':
        return '💰';
      default:
        return '📢';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-wood-medium border-b-2 border-wood-border select-none">
      <div className="h-12 md:h-14 w-full px-2 md:px-4 flex items-center justify-between gap-1">
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <img
            src="/assets/branding/logo.png"
            alt="Molemisi"
            width={28}
            height={28}
            className="w-7 h-7 md:w-8 md:h-8"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const fallback = img.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <span className="hidden text-lg md:text-xl">🌾</span>
          <span className="font-headline text-xs md:text-sm text-primary font-bold uppercase hidden sm:block">
            Molemisi
          </span>
        </div>

        {/* Pula + Level chip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border">
            <span className="text-[10px]">💰</span>
            <span className="font-mono text-[10px] md:text-[11px] text-gold-currency font-bold">
              {pula.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border">
            <span className="font-mono text-[10px] text-primary font-bold">Lv.{farmLevel}</span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 flex justify-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5">
            {NAV_TABS.map((tab) => {
              const isActive =
                activeNav.toLowerCase() === tab.id ||
                (tab.id === 'bushveld' && activeNav.toLowerCase() === 'wild') ||
                (tab.id === 'inventory' && activeNav.toLowerCase() === 'bag') ||
                (tab.id === 'settings' && activeNav.toLowerCase() === 'config');
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    const navName =
                      tab.id === 'farm'
                        ? 'Farm'
                        : tab.id === 'kgotla'
                          ? 'Kgotla'
                          : tab.id === 'bushveld'
                            ? 'Bushveld'
                            : tab.id === 'market'
                              ? 'Market'
                              : tab.id === 'inventory'
                                ? 'Inventory'
                                : 'Settings';
                    setActiveNav(navName);
                  }}
                  className={`px-2 md:px-3 py-1 font-mono text-[10px] md:text-xs uppercase whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-cream-surface'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Notification bell + Profile icon */}
        <div className="flex items-center gap-1 shrink-0 relative">
          {/* Notification bell */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="relative w-8 h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-status-danger text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile icon */}
          <button
            onClick={() => setActiveNav('Settings')}
            className="w-8 h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors"
          >
            ⚙
          </button>

          {/* Notification dropdown */}
          {showPanel && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
              {/* Panel */}
              <div className="absolute top-10 right-0 z-50 w-72 max-h-80 bg-wood-dark border-2 border-wood-border shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-wood-border bg-wood-medium">
                  <span className="font-headline text-xs text-cream-surface font-bold uppercase">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="font-mono text-[9px] text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-60">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <span className="text-lg">🔔</span>
                      <p className="font-mono text-[10px] text-on-surface-variant mt-1">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`px-3 py-2 border-b border-wood-border/50 ${
                          !n.read ? 'bg-primary-container/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] text-cream-surface font-bold truncate">
                              {n.title}
                            </p>
                            <p className="font-mono text-[9px] text-on-surface-variant line-clamp-2">
                              {n.message}
                            </p>
                            <p className="font-mono text-[8px] text-on-surface-variant/60 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
