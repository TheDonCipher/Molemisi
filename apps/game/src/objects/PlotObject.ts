import * as Phaser from 'phaser';
import { hasAsset } from '../generated-assets';

interface CropData {
  type: string;
  growthStage: number;
  hydration: number;
}

interface ActionType {
  type: string;
  label: string;
  color?: string;
}

const SOIL_EMPTY = 'plot_empty';
const SOIL_TILLED = 'plot_soil';

/**
 * A farm plot rendered with generated pixel art:
 * - soil tile (empty or tilled) as the base
 * - crop-stage sprite (sorghum_stage_0, ...) when planted
 * - hydration bar, selection highlight and growth pulse feedback
 */
export class PlotObject extends Phaser.GameObjects.Container {
  public plotId: string;
  public slotIndex: number;
  public state: string = 'EMPTY';
  public crop: CropData | undefined;

  private background: Phaser.GameObjects.Image;
  private stateText: Phaser.GameObjects.Text;
  private cropSprite: Phaser.GameObjects.Image | null = null;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  private hydrationBar: Phaser.GameObjects.Rectangle | null = null;
  private hydrationBg: Phaser.GameObjects.Rectangle | null = null;
  private readyPulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, plotId: string, slotIndex: number) {
    super(scene, x, y);

    this.plotId = plotId;
    this.slotIndex = slotIndex;

    // Soil tile (32x32 art scaled to the 64x64 plot)
    const soilKey = hasAsset(SOIL_EMPTY) ? SOIL_EMPTY : '__MISSING';
    this.background = scene.add.image(0, 0, soilKey);
    this.background.setDisplaySize(64, 64);
    this.add(this.background);

    // State label (crop name / Ready! / Withered)
    this.stateText = scene.add.text(0, -27, '', {
      font: '9px monospace',
      color: '#F5E6D3',
      backgroundColor: '#3e2723',
      padding: { x: 3, y: 1 },
    });
    this.stateText.setOrigin(0.5, 0.5);
    this.add(this.stateText);

    // Make interactive
    this.setSize(64, 64);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerdown', this.handleClick, this);
    this.on('pointerover', this.handleHover, this);
    this.on('pointerout', this.handleHoverOut, this);

    scene.add.existing(this);
  }

  private handleClick(): void {
    // Emit click event for FarmScene to handle
    if (this.scene) this.scene.events.emit('plot-clicked', this);
  }

  private handleHover(): void {
    if (this.state !== 'EMPTY') {
      this.background.setTint(0xd0b090);
    }
  }

  private handleHoverOut(): void {
    this.background.clearTint();
  }

  select(): void {
    if (!this.scene) return;
    if (!this.highlight) {
      this.highlight = this.scene.add.rectangle(0, 0, 68, 68);
      this.highlight.setStrokeStyle(3, 0xff8f00);
      this.highlight.setFillStyle(0xff8f00, 0.15);
      this.highlight.setOrigin(0.5);
      this.add(this.highlight);
      this.sendToBack(this.highlight);
    }
    this.highlight.setVisible(true);
  }

  deselect(): void {
    if (this.highlight) {
      this.highlight.setVisible(false);
    }
  }

  updateState(state: string, crop?: CropData): void {
    const prevState = this.state;
    const prevStage = this.crop?.growthStage;
    this.state = state;
    this.crop = crop;
    this.updateBackground();
    this.updateDisplay();
    this.updateHydrationBar();

    // Pulse animation when crop advances to a new growth stage
    if (
      crop &&
      (state === 'GROWING' || state === 'READY') &&
      (prevState !== state || (prevStage !== undefined && crop.growthStage > prevStage))
    ) {
      this.playGrowthPulse();
    }
  }

  private playGrowthPulse(): void {
    if (!this.scene) return;
    // Quick scale-up then back to normal
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Emit a small particle burst at the crop position using the sparkle texture
    if (hasAsset('sparkle_gold')) {
      const particles = this.scene.add.particles(this.x, this.y - 10, 'sparkle_gold', {
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        lifespan: 600,
        quantity: 5,
        scale: { start: 0.6, end: 0 },
        emitting: false,
      });
      particles.explode(5);
      this.scene.time.delayedCall(700, () => particles.destroy());
    }
  }

  private updateHydrationBar(): void {
    // Remove old bars
    if (this.hydrationBg) {
      this.hydrationBg.destroy();
      this.hydrationBg = null;
    }
    if (this.hydrationBar) {
      this.hydrationBar.destroy();
      this.hydrationBar = null;
    }

    // Only show hydration bar for planted/growing crops
    if ((this.state === 'PLANTED' || this.state === 'GROWING') && this.crop && this.scene) {
      const barWidth = 48;
      const barHeight = 4;
      const barX = -barWidth / 2;
      const barY = 26;

      // Background
      this.hydrationBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x333333);
      this.hydrationBg.setOrigin(0, 0.5);
      this.add(this.hydrationBg);

      // Fill
      const fillWidth = barWidth * Math.max(0, Math.min(1, this.crop.hydration));
      const fillColor =
        this.crop.hydration > 0.5 ? 0x2196f3 : this.crop.hydration > 0.2 ? 0xff9800 : 0xf44336;
      this.hydrationBar = this.scene.add.rectangle(barX, barY, fillWidth, barHeight, fillColor);
      this.hydrationBar.setOrigin(0, 0.5);
      this.add(this.hydrationBar);
    }
  }

  private updateBackground(): void {
    const soilKey = this.state === 'EMPTY' || this.state === 'WITHERED' ? SOIL_EMPTY : SOIL_TILLED;
    if (hasAsset(soilKey)) {
      this.background.setTexture(soilKey);
      this.background.setDisplaySize(64, 64);
    }
    this.background.clearTint();
  }

  private getCropTexture(stage: number): string | null {
    if (!this.crop) return null;
    // Crop stage textures follow the pattern: <crop>_stage_<n> (e.g. sorghum_stage_2)
    // Clamp to the last generated stage so READY/WITHERED never request a missing texture.
    let key = `${this.crop.type}_stage_${Math.max(0, stage)}`;
    if (hasAsset(key)) return key;
    for (let s = 6; s >= 0; s--) {
      key = `${this.crop.type}_stage_${s}`;
      if (hasAsset(key)) return key;
    }
    return null;
  }

  private updateDisplay(): void {
    // Tear down previous sprite + ready pulse
    if (this.cropSprite) {
      this.cropSprite.destroy();
      this.cropSprite = null;
    }
    if (this.readyPulse) {
      this.readyPulse.stop();
      this.readyPulse = null;
    }

    switch (this.state) {
      case 'EMPTY':
        this.stateText.setText('');
        break;
      case 'PLANTED': {
        const key = this.getCropTexture(0);
        if (key) this.showCropSprite(key);
        this.stateText.setText(this.crop?.type ?? 'Crop');
        break;
      }
      case 'GROWING': {
        const stage = this.crop?.growthStage ?? 0;
        const key = this.getCropTexture(stage);
        if (key) this.showCropSprite(key);
        this.stateText.setText(this.crop?.type ?? 'Crop');
        break;
      }
      case 'READY': {
        const stage = this.crop?.growthStage ?? 0;
        const key = this.getCropTexture(stage);
        if (key) this.showCropSprite(key);
        this.stateText.setText('Ready!');
        this.stateText.setColor('#FFD54F');
        this.startReadyPulse();
        break;
      }
      case 'WITHERED':
        this.stateText.setText('Withered');
        this.stateText.setColor('#9E9E9E');
        break;
    }
  }

  private showCropSprite(textureKey: string): void {
    // Crop sprites are 32x64 art; display at native pixel size anchored to the soil
    if (!this.scene) return;
    this.cropSprite = this.scene.add.image(0, 26, textureKey);
    this.cropSprite.setOrigin(0.5, 1);
    this.cropSprite.setDepth(2);
    this.add(this.cropSprite);
  }

  private startReadyPulse(): void {
    if (!this.cropSprite || !this.scene) return;
    this.readyPulse = this.scene.tweens.add({
      targets: this.cropSprite,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getAvailableActions(): ActionType[] {
    const actions: ActionType[] = [];

    switch (this.state) {
      case 'EMPTY':
        actions.push({ type: 'plant', label: '🌱 Plant', color: '#4CAF50' });
        break;
      case 'GROWING':
      case 'PLANTED':
        if (this.crop && this.crop.hydration < 1.0) {
          actions.push({ type: 'water', label: '💧 Water', color: '#2196F3' });
        }
        actions.push({ type: 'fertilize', label: '🧪 Fertilize', color: '#9C27B0' });
        break;
      case 'READY':
        actions.push({ type: 'harvest', label: '🌾 Harvest', color: '#FF8F00' });
        break;
      case 'WITHERED':
        actions.push({ type: 'clear', label: '🗑️ Clear', color: '#F44336' });
        break;
    }

    return actions;
  }
}
