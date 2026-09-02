import Phaser from 'phaser';
import { PlotObject } from '../objects/PlotObject';
import { ApiClient } from '../services/ApiClient';

interface FarmData {
  farm: {
    id: string;
    name: string;
    level: number;
    plotCount: number;
    weather: string;
    season: string;
  };
  plots: Array<{
    id: string;
    slotIndex: number;
    state: string;
    crop?: {
      type: string;
      growthStage: number;
      hydration: number;
    };
  }>;
}

export class FarmScene extends Phaser.Scene {
  private plots: PlotObject[] = [];
  private apiClient!: ApiClient;
  private selectedPlot: PlotObject | null = null;
  private contextMenu: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.apiClient = new ApiClient();

    // Set background color
    this.cameras.main.setBackgroundColor('#5A8F3C');

    // Create farm grid
    this.createFarmGrid();

    // Load farm data from API
    this.loadFarmData();

    // Create HUD elements
    this.createHUD();
  }

  private createFarmGrid(): void {
    const startX = 100;
    const startY = 100;
    const plotWidth = 64;
    const plotHeight = 64;
    const gap = 16;
    const plotsPerRow = 6;

    // Create 12 plots (6x2 grid)
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / plotsPerRow);
      const col = i % plotsPerRow;
      const x = startX + col * (plotWidth + gap);
      const y = startY + row * (plotHeight + gap);

      const plot = new PlotObject(this, x, y, `plot-${i}`, i);
      this.plots.push(plot);
    }
  }

  private async loadFarmData(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // No token - show demo mode
        this.showDemoMode();
        return;
      }

      const data = await this.apiClient.get<FarmData>('/farms/current');
      this.updatePlotsFromServer(data.plots);
    } catch {
      // API not available - show demo mode
      this.showDemoMode();
    }
  }

  private showDemoMode(): void {
    // Set up demo plots with sample data
    const demoPlots = [
      { state: 'EMPTY' },
      { state: 'PLANTED', crop: { type: 'sorghum', growthStage: 0, hydration: 0.5 } },
      { state: 'GROWING', crop: { type: 'maize', growthStage: 2, hydration: 0.7 } },
      { state: 'READY', crop: { type: 'sorghum', growthStage: 4, hydration: 0.8 } },
    ];

    demoPlots.forEach((demo, index) => {
      if (this.plots[index]) {
        this.plots[index].updateState(demo.state, demo.crop);
      }
    });
  }

  private updatePlotsFromServer(
    plots: Array<{ id: string; slotIndex: number; state: string; crop?: { type: string; growthStage: number; hydration: number } }>,
  ): void {
    plots.forEach((plotData) => {
      const plot = this.plots.find((p) => p.slotIndex === plotData.slotIndex);
      if (plot) {
        plot.updateState(plotData.state, plotData.crop);
      }
    });
  }

  private createHUD(): void {
    // HUD is handled by the React shell
    // This is just for Phaser-specific visual feedback
  }

  private showContextMenu(plot: PlotObject): void {
    this.hideContextMenu();

    const actions = plot.getAvailableActions();
    if (actions.length === 0) return;

    this.contextMenu = this.add.container(plot.x + 40, plot.y);

    // Background
    const bg = this.add.rectangle(0, 0, 120, actions.length * 30 + 10, 0x3e2723, 0.9);
    bg.setStrokeStyle(1, 0x5d4037);
    this.contextMenu.add(bg);

    // Action buttons
    actions.forEach((action, index) => {
      const text = this.add.text(0, -actions.length * 15 + index * 30 + 5, action.label, {
        font: '14px monospace',
        color: action.color || '#F5E6D3',
      });
      text.setOrigin(0.5, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        this.executeAction(plot, action.type);
        this.hideContextMenu();
      });
      this.contextMenu?.add(text);
    });
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.destroy();
      this.contextMenu = null;
    }
  }

  private async executeAction(plot: PlotObject, actionType: string): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) {
      // Demo mode - simulate action locally
      this.simulateAction(plot, actionType);
      return;
    }

    try {
      let result: unknown;
      switch (actionType) {
        case 'plant':
          result = await this.apiClient.post(`/farms/current/plots/${plot.plotId}/plant`, {
            cropType: 'sorghum',
            seedId: 'seed_sorghum_001',
          });
          break;
        case 'water':
          result = await this.apiClient.post(`/farms/current/plots/${plot.plotId}/water`, {});
          break;
        case 'harvest':
          result = await this.apiClient.post(`/farms/current/plots/${plot.plotId}/harvest`, {});
          break;
      }
      console.log('Action result:', result);
      // Refresh plot state
      await this.loadFarmData();
    } catch (error) {
      console.error('Action failed:', error);
    }
  }

  private simulateAction(plot: PlotObject, actionType: string): void {
    switch (actionType) {
      case 'plant':
        plot.updateState('PLANTED', { type: 'sorghum', growthStage: 0, hydration: 0.5 });
        this.showFloatingText(plot.x, plot.y - 20, 'Planted! +5 XP', '#4CAF50');
        break;
      case 'water':
        if (plot.crop) {
          plot.crop.hydration = Math.min(1.0, plot.crop.hydration + 0.3);
          this.showFloatingText(plot.x, plot.y - 20, 'Watered! +2 XP', '#2196F3');
        }
        break;
      case 'harvest':
        if (plot.state === 'READY') {
          plot.updateState('EMPTY');
          this.showFloatingText(plot.x, plot.y - 20, 'Harvested! +10 XP', '#FF8F00');
        }
        break;
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const floatingText = this.add.text(x, y, text, {
      font: '16px monospace',
      color,
    });
    floatingText.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => floatingText.destroy(),
    });
  }

  update(): void {
    // Handle any per-frame updates (animations, etc.)
  }
}
