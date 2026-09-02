import Phaser from 'phaser';

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
    // Initialize any global systems here
    this.scene.start('PreloadScene');
  }
}
