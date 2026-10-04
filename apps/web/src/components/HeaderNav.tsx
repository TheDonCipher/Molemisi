'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame, apiFetch } from '../lib/gameState';
import { useTranslation } from '../lib/useTranslation';
import { MoreNavMenu } from './MoreNavMenu';
import { CurrencyGuideModal } from './CurrencyGuide';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function HeaderNav() {
  const { pula, activeNav, setActiveNav } = useGame();
  const { tl } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Hybrid nav (per 2026-09 ruling): 4 primary screens + a 'More' menu.
  const PRIMARY_TABS = [
    { id: 'farm', label: tl('farm') },
    { id: 'kgotla', label: tl('kgotla') },
    { id: 'bushveld', label: tl('wild') },
    { id: 'market', label: tl('market') },
  ];
  const SECONDARY_TABS = [
    { id: 'store', label: tl('store'), icon: 'shopping_cart', navTarget: 'Store' },
    { id: 'wallet', label: tl('wallet'), icon: 'account_balance_wallet', navTarget: 'Wallet' },
    { id: 'crafting', label: tl('crafting'), icon: 'handyman', navTarget: 'Crafting' },
    { id: 'inventory', label: tl('bag'), icon: 'backpack', navTarget: 'Inventory' },
    { id: 'journal', label: tl('journal'), icon: 'menu_book', navTarget: 'Journal' },
    { id: 'almanac', label: 'Almanac', icon: 'calendar_month', navTarget: 'Almanac' },
    { id: 'settings', label: tl('config'), icon: 'settings', navTarget: 'Settings' },
  ];

  // Poll for unread count every 30s. Uses the shared apiFetch so the base URL
  // comes from NEXT_PUBLIC_API_URL — this component used to hardcode
  // http://localhost:3001, which silently broke the badge on every deployed env.
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ unreadCount: number }>('GET', '/notifications/unread-count');
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // silent — the badge is non-critical and must never surface an error toast
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{ notifications: Notification[]; unreadCount: number }>(
        'GET',
        '/notifications',
      );
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // silent — the panel simply shows the empty state
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
    try {
      await apiFetch('POST', '/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Re-fetch the authoritative count rather than lying to the player.
      void fetchNotifications();
    }
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-wood-medium border-b-2 border-wood-border select-none safe-px">
      {/* safe-pt pads the bar below the notch; the inner row keeps its own
          h-12/md:h-14 so the visual rhythm is unchanged. */}
      <div className="safe-pt">
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

          {/* Pula chip + currency guide. The number is the player's most
            important always-on readout, so it is a live region rather than
            bare text — a screen-reader user hears the balance after a sale. */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className="flex items-center gap-1 bg-wood-dark px-2 py-1 border border-wood-border"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Pula balance: ${pula.toLocaleString()}`}
            >
              <span className="text-[10px]" aria-hidden="true">
                💰
              </span>
              <span className="font-mono text-[10px] md:text-[11px] text-gold-currency font-bold">
                {pula.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              aria-label="Currency guide"
              title="Currency guide"
              className="w-8 h-8 md:w-7 md:h-7 bg-wood-dark border border-wood-border flex items-center justify-center text-[11px] font-mono text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors shrink-0 touch-target md:min-h-0 md:min-w-0"
            >
              ?
            </button>
          </div>

          {/* Nav tabs */}
          <nav className="flex-1 flex justify-center overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-0.5">
              {PRIMARY_TABS.map((tab) => {
                const isActive =
                  activeNav.toLowerCase() === tab.id ||
                  (tab.id === 'bushveld' && activeNav.toLowerCase() === 'wild') ||
                  (tab.id === 'inventory' && activeNav.toLowerCase() === 'bag') ||
                  (tab.id === 'settings' && activeNav.toLowerCase() === 'config');
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() =>
                      // Screens are matched case-insensitively, so the nav id
                      // capitalised is the whole mapping — no lookup table.
                      setActiveNav(tab.id.charAt(0).toUpperCase() + tab.id.slice(1))
                    }
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
              <MoreNavMenu
                items={SECONDARY_TABS}
                activeNav={activeNav}
                onSelect={(t) => setActiveNav(t)}
                variant="header"
              />
            </div>
          </nav>

          {/* Notification bell + Profile icon */}
          <div className="flex items-center gap-1 shrink-0 relative">
            {/* Notification bell */}
            <button
              type="button"
              onClick={() => setShowPanel(!showPanel)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showPanel}
              aria-haspopup="dialog"
              className="relative w-8 h-8 md:w-8 md:h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors touch-target md:min-h-0 md:min-w-0"
            >
              🔔
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 bg-status-danger text-white text-[8px] font-bold rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile icon */}
            <button
              type="button"
              onClick={() => setActiveNav('Settings')}
              aria-label="Settings"
              className="w-8 h-8 md:w-8 md:h-8 bg-wood-dark border border-wood-border flex items-center justify-center text-sm hover:border-primary/50 transition-colors touch-target md:min-h-0 md:min-w-0"
            >
              ⚙
            </button>

            {/* Notification dropdown */}
            {showPanel && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
                {/* Panel */}
                <div
                  role="dialog"
                  aria-modal="false"
                  aria-label="Notifications"
                  className="absolute top-10 right-0 z-50 w-72 max-h-80 bg-wood-dark border-2 border-wood-border shadow-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-wood-border bg-wood-medium">
                    <span className="font-headline text-xs text-cream-surface font-bold uppercase">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="font-mono text-[9px] text-primary hover:underline px-2 py-1 min-h-[44px] flex items-center"
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
      </div>
      <CurrencyGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </header>
  );
}
