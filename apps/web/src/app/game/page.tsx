'use client';

import React, { useRef, useState, useEffect } from 'react';
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

function PhaserCanvasView() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<unknown>(null);
  const { activeNav } = useGame();

  useEffect(() => {
    if (gameRef.current) return;

    const initGame = async () => {
      if (!gameContainerRef.current) return;

      const Phaser = await import('phaser');
      const { BootScene } = await import('@/game/scenes/BootScene');
      const { PreloadScene } = await import('@/game/scenes/PreloadScene');
      const { FarmScene } = await import('@/game/scenes/FarmScene');
      const { KgotlaScene } = await import('@/game/scenes/KgotlaScene');
      const { BushveldScene } = await import('@/game/scenes/BushveldScene');
      const { MarketScene } = await import('@/game/scenes/MarketScene');

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        backgroundColor: '#210e0b',
        parent: gameContainerRef.current,
        width: 800,
        height: 480,
        pixelArt: true,
        roundPixels: true,
        antialias: false,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BootScene, PreloadScene, FarmScene, KgotlaScene, BushveldScene, MarketScene],
      });

      gameRef.current = game;
    };

    initGame().catch((err) => console.error('[Game] Init error:', err));

    return () => {
      if (gameRef.current) {
        (gameRef.current as { destroy: () => void }).destroy();
        gameRef.current = null;
      }
    };
  }, []);

  // Switch scene in Phaser when activeNav changes
  useEffect(() => {
    const g = gameRef.current as {
      scene?: {
        scenes: Array<{ scene: { key: string }; sys: { settings: { active: boolean } } }>;
        stop: (key: string) => void;
        start: (key: string) => void;
      };
    } | null;
    if (!g || !g.scene) return;

    const navLower = activeNav.toLowerCase();
    const targetScene =
      navLower === 'farm'
        ? 'FarmScene'
        : navLower === 'kgotla'
          ? 'KgotlaScene'
          : navLower === 'bushveld' || navLower === 'wild'
            ? 'BushveldScene'
            : navLower === 'market'
              ? 'MarketScene'
              : null;

    if (targetScene) {
      g.scene.scenes
        .filter(
          (s) =>
            s.sys.settings.active &&
            s.scene.key !== 'BootScene' &&
            s.scene.key !== 'PreloadScene'
        )
        .forEach((s) => g.scene!.stop(s.scene.key));
      g.scene.start(targetScene);
    }
  }, [activeNav]);

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center bg-[#210e0b] p-2">
      <div
        ref={gameContainerRef}
        className="w-full h-full max-w-[1200px] border-2 border-wood-border shadow-[4px_4px_0px_rgba(0,0,0,0.7)]"
        style={{ aspectRatio: '800/480' }}
      />
    </div>
  );
}

function GameContent() {
  const { activeNav } = useGame();
  const [engineMode, setEngineMode] = useState<'ui' | 'phaser'>('ui');

  const renderScreen = () => {
    if (engineMode === 'phaser') {
      return <PhaserCanvasView />;
    }

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

      {/* Mode View Switcher Floating Badge (Top Right below header) */}
      <div className="fixed top-20 right-4 z-40 hidden sm:flex items-center gap-1 bg-wood-dark/90 px-2 py-1 border border-wood-border rounded shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setEngineMode('ui')}
          className={`px-2 py-0.5 font-mono text-[10px] uppercase font-bold rounded ${
            engineMode === 'ui'
              ? 'bg-primary-container text-wood-dark'
              : 'text-on-surface-variant hover:text-cream-surface'
          }`}
          title="Google Stitch High-Fidelity UI/GX Experience"
        >
          Stitch GX
        </button>
        <button
          onClick={() => setEngineMode('phaser')}
          className={`px-2 py-0.5 font-mono text-[10px] uppercase font-bold rounded ${
            engineMode === 'phaser'
              ? 'bg-primary-container text-wood-dark'
              : 'text-on-surface-variant hover:text-cream-surface'
          }`}
          title="Phaser 800x480 Pixel Canvas Engine"
        >
          Phaser Canvas
        </button>
      </div>

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
