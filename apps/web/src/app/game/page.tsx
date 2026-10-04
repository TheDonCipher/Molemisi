'use client';

import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from '../../lib/gameState';
import { HeaderNav } from '../../components/HeaderNav';
import { MobileFooterNav } from '../../components/MobileFooterNav';
import { ToastNotification } from '../../components/ToastNotification';
import { FarmScreen } from '../../components/screens/FarmScreen';
import { BushveldScreen } from '../../components/screens/BushveldScreen';
import { InventoryScreen } from '../../components/screens/InventoryScreen';
import { KgotlaScreen } from '../../components/screens/KgotlaScreen';
import { MarketScreen } from '../../components/screens/MarketScreen';
import { StoreScreen } from '../../components/screens/StoreScreen';
import { CraftingScreen } from '../../components/screens/CraftingScreen';
import { SettingsScreen } from '../../components/screens/SettingsScreen';
import { WalletScreen } from '../../components/screens/WalletScreen';
import { JournalScreen } from '../../components/screens/JournalScreen';
import { AlmanacScreen } from '../../components/screens/AlmanacScreen';
import { hydrateTokenFromSession, initAuthSync } from '../../lib/auth';
import { GameHotkeys } from '../../components/GameHotkeys';

/**
 * Initial-load skeleton. The old markup was a bouncing logo — a spinner with
 * no shape hint, which reads as "broken" past ~2s on a slow 4G connect. A
 * skeleton mirrors the real Farm layout (HUD chips, plot grid, action row) so
 * the transition into loaded content is a fill, not a jump.
 */
function GameSkeleton() {
  return (
    <div
      className="min-h-screen bg-surface px-3 py-4"
      style={{ paddingTop: 'calc(var(--header-h) + 1rem)' }}
      role="status"
      aria-live="polite"
      aria-label="Loading your farm"
    >
      {/* HUD chip row */}
      <div className="flex gap-2 mb-4">
        <div className="h-8 flex-1 bg-surface-container border border-wood-border animate-pulse" />
        <div className="h-8 w-20 bg-surface-container border border-wood-border animate-pulse" />
        <div className="h-8 w-20 bg-surface-container border border-wood-border animate-pulse" />
      </div>
      {/* Plot grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-surface-container border border-wood-border animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      {/* Action row */}
      <div className="mt-4 flex gap-2">
        <div className="h-12 flex-1 bg-surface-container-high border border-wood-border animate-pulse" />
        <div className="h-12 w-24 bg-surface-container-high border border-wood-border animate-pulse" />
      </div>
      <p className="font-mono text-[11px] text-on-surface-variant mt-4 text-center">
        Preparing today&apos;s work...
      </p>
    </div>
  );
}

function GameContent() {
  const { activeNav, loading, botho } = useGame();

  const renderScreen = () => {
    const current = activeNav.toLowerCase();
    switch (current) {
      case 'farm':
        return <FarmScreen />;
      case 'bushveld':
      case 'wild':
        return <BushveldScreen />;
      case 'inventory':
      case 'bag':
        return <InventoryScreen />;
      case 'kgotla':
        return <KgotlaScreen />;
      case 'market':
        return <MarketScreen />;
      case 'store':
        return <StoreScreen />;
      case 'crafting':
        return <CraftingScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'journal':
        return <JournalScreen />;
      case 'almanac':
      case 'calendar':
        return <AlmanacScreen botho={botho ?? 0} />;
      case 'settings':
      case 'config':
        return <SettingsScreen />;
      default:
        return <FarmScreen />;
    }
  };

  if (loading) return <GameSkeleton />;

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface font-body select-none">
      {/* Top Header */}
      <HeaderNav />

      {/* Main Screen Content View. The padding is `var(--header-h)` rather than
          a literal `pt-16 md:pt-20` so the fixed header (which now also carries
          the notch inset) is always cleared by exactly its own height. */}
      <main
        className="w-full flex-1 flex flex-col bg-surface overflow-x-hidden"
        style={{ paddingTop: 'var(--header-h)' }}
      >
        {renderScreen()}
      </main>

      {/* Floating Retro Toast System */}
      <ToastNotification />

      {/* Bottom Mobile Navigation */}
      <MobileFooterNav />

      {/* Global keyboard layer (Space/M/I/B/K/X/Esc/1-9/F1). Mounted once, here,
          so it works from every screen without each screen wiring its own. */}
      <GameHotkeys />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let token = localStorage.getItem('molemisi_token') || localStorage.getItem('token');
      if (!token) {
        // localStorage may be empty while the browser Supabase session is still
        // valid (e.g. after a hard refresh) — hydrate the token mirror from it.
        token = await hydrateTokenFromSession();
      }
      if (!token) {
        window.location.href = '/auth/login';
        return;
      }
      if (!cancelled) setMounted(true);
    };
    run();

    // Keep the token mirror fresh as Supabase rotates the JWT, and bounce to the
    // login page on a real sign-out.
    const unsubscribe = initAuthSync(() => {
      window.location.href = '/auth/login';
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
      >
        <img
          src="/assets/branding/logo.png"
          alt=""
          width={96}
          height={96}
          className="w-24 h-24 animate-pulse"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        <div className="hidden text-4xl animate-pulse" aria-hidden="true">
          🌾
        </div>
        <p className="font-headline text-sm text-primary uppercase font-bold">
          Checking credentials...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function GamePage() {
  return (
    <AuthGuard>
      <GameProvider>
        <GameContent />
      </GameProvider>
    </AuthGuard>
  );
}
