import * as Phaser from 'phaser';

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

export class PlotObject extends Phaser.GameObjects.Container {
  public plotId: string;
  public slotIndex: number;
  public state: string = 'EMPTY';
  public crop: CropData | undefined;

  private background: Phaser.GameObjects.Rectangle;
  private stateText: Phaser.GameObjects.Text;
  private cropIcon: Phaser.GameObjects.Text;
  private highlight: Phaser.GameObjects.Rectangle | null = null;
  private hydrationBar: Phaser.GameObjects.Rectangle | null = null;
  private hydrationBg: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, plotId: string, slotIndex: number) {
    super(scene, x, y);

    this.plotId = plotId;
    this.slotIndex = slotIndex;

    // Create background
    this.background = scene.add.rectangle(0, 0, 64, 64, 0x8b5e3c);
    this.background.setStrokeStyle(2, 0x5d4037);
    this.add(this.background);

    // Create state text
    this.stateText = scene.add.text(0, -15, 'Empty', {
      font: '10px monospace',
      color: '#BCAAA4',
    });
    this.stateText.setOrigin(0.5, 0.5);
    this.add(this.stateText);

    // Create crop icon
    this.cropIcon = scene.add.text(0, 10, '', {
      font: '24px monospace',
    });
    this.cropIcon.setOrigin(0.5, 0.5);
    this.add(this.cropIcon);

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
    this.scene.events.emit('plot-clicked', this);
  }

  private handleHover(): void {
    if (this.state !== 'EMPTY') {
      this.background.setFillStyle(0xa07050);
    }
  }

  private handleHoverOut(): void {
    this.updateBackground();
  }

  select(): void {
    if (!this.highlight) {
      this.highlight = this.scene.add.rectangle(0, 0, 68, 68);
      this.highlight.setStrokeStyle(3, 0xFF8F00);
      this.highlight.setFillStyle(0xFF8F00, 0.15);
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
    // Quick scale-up then back to normal
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Emit a small particle burst at the crop position
    const particles = this.scene.add.particles(this.x, this.y, '✨', {
      speed: { min: 20, max: 50 },
      angle: { min: 0, max: 360 },
      lifespan: 600,
      quantity: 5,
      scale: { start: 0.5, end: 0 },
      emitting: false,
    });
    particles.explode(5);
    this.scene.time.delayedCall(700, () => particles.destroy());
  }

  private updateHydrationBar(): void {
    // Remove old bars
    if (this.hydrationBg) { this.hydrationBg.destroy(); this.hydrationBg = null; }
    if (this.hydrationBar) { this.hydrationBar.destroy(); this.hydrationBar = null; }

    // Only show hydration bar for planted/growing crops
    if ((this.state === 'PLANTED' || this.state === 'GROWING') && this.crop) {
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
      const fillColor = this.crop.hydration > 0.5 ? 0x2196F3 : this.crop.hydration > 0.2 ? 0xFF9800 : 0xF44336;
      this.hydrationBar = this.scene.add.rectangle(barX, barY, fillWidth, barHeight, fillColor);
      this.hydrationBar.setOrigin(0, 0.5);
      this.add(this.hydrationBar);
    }
  }

  private updateBackground(): void {
    switch (this.state) {
      case 'EMPTY':
        this.background.setFillStyle(0x8b5e3c);
        break;
      case 'PLANTED':
        this.background.setFillStyle(0x6b4423);
        break;
      case 'GROWING':
        this.background.setFillStyle(0x4a7f2e);
        break;
      case 'READY':
        this.background.setFillStyle(0xd4a520);
        break;
      case 'WITHERED':
        this.background.setFillStyle(0x5d4037);
        break;
    }
  }

  private updateDisplay(): void {
    // Crop-specific icons by growth stage
    const cropIcons: Record<string, string[]> = {
      sorghum: ['🌱', '🌿', '🌾', '🌾', '🌾'],
      maize: ['🌱', '🌿', '🌽', '🌽', '🌽'],
      millet: ['🌱', '🌿', '🌾', '🌾'],
      cowpeas: ['🌱', '🌿', '🫘', '🫘'],
      groundnuts: ['🌱', '🌿', '🥜', '🥜', '🥜'],
      sesame: ['🌱', '🌿', '🌱', '🌾'],
      watermelon: ['🌱', '🌿', '🍃', '🍃', '🍉', '🍉'],
      tomatoes: ['🌱', '🌿', '🍅', '🍅', '🍅'],
      pepper: ['🌱', '🌿', '🌶️', '🌶️'],
      herbs: ['🌱', '🌿', '🌿'],
      saffron: ['🌱', '🌿', '🌸', '🌸', '🌸'],
    };

    switch (this.state) {
      case 'EMPTY':
        this.stateText.setText('Empty');
        this.cropIcon.setText('');
        break;
      case 'PLANTED': {
        const icons = this.crop ? (cropIcons[this.crop.type] || ['🌱']) : ['🌱'];
        this.stateText.setText(this.crop?.type || 'Crop');
        this.cropIcon.setText(icons[0]);
        break;
      }
      case 'GROWING': {
        const icons = this.crop ? (cropIcons[this.crop.type] || ['🌿']) : ['🌿'];
        const stage = this.crop?.growthStage || 0;
        const iconIndex = Math.min(stage, icons.length - 1);
        this.stateText.setText(`${this.crop?.type || 'Crop'} (${stage})`);
        this.cropIcon.setText(icons[iconIndex]);
        break;
      }
      case 'READY': {
        const icons = this.crop ? (cropIcons[this.crop.type] || ['🌾']) : ['🌾'];
        this.stateText.setText('Ready!');
        this.cropIcon.setText(icons[icons.length - 1]);
        break;
      }
      case 'WITHERED':
        this.stateText.setText('Withered');
        this.cropIcon.setText('🥀');
        break;
    }
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
