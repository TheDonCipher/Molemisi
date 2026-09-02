'use client';

import { useEffect, useRef } from 'react';

export default function GamePage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import Phaser to avoid SSR issues
    const initGame = async () => {
      if (!gameContainerRef.current) return;

      const { Game } = await import('phaser');
      const { BootScene } = await import('@/game/scenes/BootScene');
      const { PreloadScene } = await import('@/game/scenes/PreloadScene');
      const { FarmScene } = await import('@/game/scenes/FarmScene');

      new Game({
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        width: 800,
        height: 600,
        pixelArt: true,
        roundPixels: true,
        antialias: false,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [BootScene, PreloadScene, FarmScene],
      });
    };

    initGame();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-molemisi-panel border-b border-molemisi-border">
        <button className="text-molemisi-text hover:text-molemisi-accent">☰</button>
        <div className="text-molemisi-muted">Day 1 • Spring ☀️</div>
        <div className="text-molemisi-accent">💰 100 P</div>
      </div>

      {/* Game Container */}
      <div ref={gameContainerRef} className="flex-1 bg-black" />

      {/* Bottom Navigation */}
      <div className="flex items-center justify-around py-2 bg-molemisi-panel border-t border-molemisi-border">
        <button className="flex flex-col items-center text-molemisi-accent">
          <span>🏠</span>
          <span className="text-xs">Farm</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted hover:text-molemisi-text">
          <span>🏘️</span>
          <span className="text-xs">Kgotla</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted hover:text-molemisi-text">
          <span>🌿</span>
          <span className="text-xs">Bush</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted hover:text-molemisi-text">
          <span>📦</span>
          <span className="text-xs">Bag</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted hover:text-molemisi-text">
          <span>⚙️</span>
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  );
}
