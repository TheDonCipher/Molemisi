import Phaser from 'phaser';

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

  updateState(state: string, crop?: CropData): void {
    this.state = state;
    this.crop = crop;
    this.updateBackground();
    this.updateDisplay();
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
    switch (this.state) {
      case 'EMPTY':
        this.stateText.setText('Empty');
        this.cropIcon.setText('');
        break;
      case 'PLANTED':
        this.stateText.setText('Planted');
        this.cropIcon.setText('🌱');
        break;
      case 'GROWING':
        this.stateText.setText(`${this.crop?.type || 'Crop'} (${this.crop?.growthStage || 0})`);
        this.cropIcon.setText('🌿');
        break;
      case 'READY':
        this.stateText.setText('Ready!');
        this.cropIcon.setText('🌾');
        break;
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
