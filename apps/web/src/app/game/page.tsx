'use client';

import { useEffect, useRef, useState } from 'react';

interface ProfileData {
  displayName: string;
  currency: number;
  farmLevel: number;
}

interface WeatherData {
  weather: string;
  temperature: number;
  season: string;
}

export default function GamePage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const gameRef = useRef<unknown>(null);

  useEffect(() => {
    const initGame = async () => {
      if (!gameContainerRef.current) return;

      const Phaser = await import('phaser');
      const { BootScene } = await import('@/game/scenes/BootScene');
      const { PreloadScene } = await import('@/game/scenes/PreloadScene');
      const { FarmScene } = await import('@/game/scenes/FarmScene');

      const game = new Phaser.Game({
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

      gameRef.current = game;

      // Listen for profile updates from Phaser
      game.events.on('profile-updated', (data: ProfileData) => {
        setProfile(data);
      });

      // Listen for weather updates from Phaser
      game.events.on('weather-updated', (data: WeatherData) => {
        setWeather(data);
      });
    };

    initGame();

    return () => {
      if (gameRef.current) {
        (gameRef.current as { destroy: () => void }).destroy();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen touch-none select-none">
      {/* Top HUD - Mobile Optimized */}
      <div className="flex items-center justify-between px-3 py-2 bg-molemisi-panel border-b border-molemisi-border">
        <div className="flex items-center gap-2">
          {weather && (
            <span className="text-xs px-2 py-1 rounded bg-molemisi-night">
              {weather.season === 'spring' && '🌱'}
              {weather.season === 'summer' && '☀️'}
              {weather.season === 'autumn' && '🍂'}
              {weather.season === 'winter' && '❄️'}
              {' '}{weather.weather} {weather.temperature}°C
            </span>
          )}
        </div>
        <div className="text-molemisi-accent font-bold text-sm">
          💰 {profile ? profile.currency.toLocaleString() : '---'} P
        </div>
        <div className="text-molemisi-muted text-xs">
          {profile ? `Lv.${profile.farmLevel}` : '...'}
        </div>
      </div>

      {/* Game Container - Flex grow to fill space */}
      <div ref={gameContainerRef} className="flex-1 bg-black overflow-hidden" />

      {/* Bottom Navigation - Touch Friendly */}
      <div className="flex items-center justify-around py-2 bg-molemisi-panel border-t border-molemisi-border safe-bottom">
        <button className="flex flex-col items-center text-molemisi-accent p-2 min-w-[60px]">
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">Farm</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted p-2 min-w-[60px]">
          <span className="text-xl">🏛️</span>
          <span className="text-xs mt-1">Kgotla</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted p-2 min-w-[60px]">
          <span className="text-xl">🌿</span>
          <span className="text-xs mt-1">Bush</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted p-2 min-w-[60px]">
          <span className="text-xl">📦</span>
          <span className="text-xs mt-1">Bag</span>
        </button>
        <button className="flex flex-col items-center text-molemisi-muted p-2 min-w-[60px]">
          <span className="text-xl">⚙️</span>
          <span className="text-xs mt-1">More</span>
        </button>
      </div>
    </div>
  );
}
