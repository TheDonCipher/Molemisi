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
    <div className="flex flex-col h-screen">
      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 bg-molemisi-panel border-b border-molemisi-border">
        <button className="text-molemisi-text hover:text-molemisi-accent">☰</button>
        <div className="flex items-center gap-3 text-molemisi-muted">
          {weather && (
            <span className="text-xs">
              {weather.season === 'spring' && '🌱'}
              {weather.season === 'summer' && '☀️'}
              {weather.season === 'autumn' && '🍂'}
              {weather.season === 'winter' && '❄️'}
              {' '}{weather.weather} {weather.temperature}°C
            </span>
          )}
          <span>
            {profile ? `Lv.${profile.farmLevel} • ${profile.displayName}` : 'Loading...'}
          </span>
        </div>
        <div className="text-molemisi-accent font-bold">
          💰 {profile ? profile.currency.toLocaleString() : '---'} P
        </div>
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
