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
import { SettingsScreen } from '../../components/screens/SettingsScreen';

function GameContent() {
  const { activeNav, loading } = useGame();

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
      case 'settings':
      case 'config':
        return <SettingsScreen />;
      default:
        return <FarmScreen />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#210e0b]">
        <img
          src="/assets/branding/logo.png"
          alt="Molemisi"
          width={96}
          height={96}
          className="w-24 h-24 mb-4 animate-bounce"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        <div className="hidden text-4xl mb-4 animate-bounce">🌾</div>
        <p className="font-headline text-sm text-primary uppercase font-bold">Loading Farm...</p>
        <p className="font-body text-xs text-on-surface-variant mt-1">
          Preparing today&apos;s work...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface font-body select-none">
      {/* Top Header */}
      <HeaderNav />

      {/* Main Screen Content View */}
      <main className="w-full pt-16 md:pt-20 flex-1 flex flex-col bg-surface overflow-x-hidden">
        {renderScreen()}
      </main>

      {/* Floating Retro Toast System */}
      <ToastNotification />

      {/* Bottom Mobile Navigation */}
      <MobileFooterNav />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('molemisi_token') || localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth/login';
      return;
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#210e0b]">
        <img
          src="/assets/branding/logo.png"
          alt="Molemisi"
          width={96}
          height={96}
          className="w-24 h-24 mb-4 animate-pulse"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
        <div className="hidden text-4xl mb-4 animate-pulse">🌾</div>
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
