import * as Phaser from 'phaser';
import { ASSET_MANIFEST, assetUrl, GeneratedAsset } from '../generated-assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x3e2723, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#F5E6D3',
    });
    loadingText.setOrigin(0.5, 0.5);

    // Update loading bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xff8f00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load Stitch-generated scene backgrounds
    const stitchBg: Array<[string, string]> = [
      ['farm_scene', '/assets/backgrounds/farm_scene.png'],
      ['kgotla_scene', '/assets/backgrounds/kgotla_scene.png'],
      ['bushveld_scene', '/assets/backgrounds/bushveld_scene.png'],
      ['market_scene', '/assets/backgrounds/market_scene.png'],
    ];
    for (const [key, url] of stitchBg) {
      this.load.image(key, url);
    }

    // Register every asset from the generated manifest.
    // Images (pixen / pixflux / ui) -> Phaser image textures keyed by manifest id.
    // Tilesets -> raw JSON (tile rendering is wired up separately).
    for (const asset of ASSET_MANIFEST) {
      const url = assetUrl(asset.id);
      if (!url) continue;
      if (asset.kind === 'tileset') {
        this.load.json(asset.id, url);
      } else {
        this.load.image(asset.id, url);
      }
    }
  }

  create(): void {
    const failed: GeneratedAsset[] = [];
    for (const asset of ASSET_MANIFEST) {
      if (asset.kind === 'tileset') {
        if (!this.cache.json.exists(asset.id)) failed.push(asset);
      } else if (!this.textures.exists(asset.id)) {
        failed.push(asset);
      }
    }
    if (failed.length > 0) {
      console.warn(
        `[PreloadScene] ${failed.length} assets failed to load:`,
        failed.map((a) => a.id).join(', '),
      );
    }
    this.scene.start('FarmScene');
  }
}
