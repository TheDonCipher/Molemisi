'use client';

import React from 'react';
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
  const { activeNav } = useGame();

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

export default function GamePage() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
