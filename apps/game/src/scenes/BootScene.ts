import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load minimal assets needed for loading screen
    // These will be replaced with actual assets later
    this.load.on('progress', (value: number) => {
      console.log(`Loading: ${Math.round(value * 100)}%`);
    });
  }

  create(): void {
    console.log('[BootScene] Created - Phaser is running!');
    this.scene.start('PreloadScene');
  }
}
