import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { FarmScene } from './scenes/FarmScene';
import { ensureGameFont } from './fonts';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
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
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
};

// Boot after the Molemisi Pixel font resolves so Phaser text metrics use it.
// .finally guarantees the game still boots if the font fails to load.
ensureGameFont().finally(() => new Phaser.Game(config));
