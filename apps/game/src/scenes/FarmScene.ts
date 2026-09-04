import * as Phaser from 'phaser';
import { PlotObject } from '../objects/PlotObject';
import { ApiClient, ProfileData } from '../services/ApiClient';
import { CROPS } from '@molemisi/game-config';
import { hasAsset } from '../generated-assets';
import { TutorialOverlay } from '../ui/TutorialOverlay';

interface FarmData {
  farm: {
    id: string;
    name: string;
    level: number;
    plotCount: number;
    weather: string;
    weatherTemperature: number;
    weatherHumidity: number;
    season: string;
    currentDay: number;
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
  private farmId: string | null = null;
  private profile: ProfileData | null = null;

  private tutorial!: TutorialOverlay;

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.apiClient = new ApiClient();

    // Set background color
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Build the visual farm world (sky, ground decor, buildings, animals)
    this.createBackdrop();

    // Listen for plot click events from PlotObject
    this.events.on('plot-clicked', (plot: PlotObject) => {
      // Deselect previous plot
      if (this.selectedPlot && this.selectedPlot !== plot) {
        this.selectedPlot.deselect();
      }
      this.selectedPlot = plot;
      plot.select();
      this.showContextMenu(plot);
    });

    // Click on empty space closes context menu
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const hitObjects = this.input.hitTestPointer(pointer);
      const clickedPlot = hitObjects.some(
        (obj: Phaser.GameObjects.GameObject) => obj instanceof PlotObject,
      );
      if (!clickedPlot && this.contextMenu) {
        this.hideContextMenu();
        if (this.selectedPlot) {
          this.selectedPlot.deselect();
        }
        this.selectedPlot = null;
      }
    });

    // Scene switching is now handled by the React page via Phaser scene manager.
    // Nav tabs start/stop scenes directly — no panel toggles needed here.

    // Create farm grid
    this.createFarmGrid();

    // Load farm data from API
    this.loadFarmData();

    // Create HUD elements
    this.createHUD();

    // Show tutorial for new players
    if (TutorialOverlay.shouldShow()) {
      this.tutorial = new TutorialOverlay(this, () => {});
      this.time.delayedCall(500, () => this.tutorial.start());
    }
  }

  private createBackdrop(): void {
    // Stitch-generated farm scene background (800×480 pixel art)
    // The background contains all the trees, buildings, animals, fences etc.
    // We just render it as a full-bleed backdrop.
    if (this.textures.exists('farm_scene')) {
      const bg = this.add.image(400, 240, 'farm_scene');
      bg.setDisplaySize(800, 480);
      bg.setDepth(-100);
    } else if (hasAsset('farm_day')) {
      const bg = this.add.image(400, 240, 'farm_day');
      bg.setDisplaySize(800, 480);
      bg.setDepth(-100);
    }
  }

  private createFarmGrid(plotCount: number = 4): void {
    // Destroy existing plots
    this.plots.forEach((p) => p.destroy());
    this.plots = [];

    // Calculate grid layout dynamically
    const cols = 4;
    const cellSize = 88;
    const plotSize = 64;
    const rows = Math.ceil(plotCount / cols);
    const gridW = cols * cellSize;
    const gridH = rows * cellSize;
    const areaLeft = 140;
    const areaRight = 570;
    const areaTop = 50;
    const areaBottom = 400;
    const areaW = areaRight - areaLeft;
    const areaH = areaBottom - areaTop;
    const startX = areaLeft + (areaW - gridW) / 2 + plotSize / 2;
    const startY = areaTop + (areaH - gridH) / 2 + plotSize / 2;

    for (let i = 0; i < plotCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * cellSize;
      const y = startY + row * cellSize;

      const plot = new PlotObject(this, x, y, `plot-${i}`, i);
      this.plots.push(plot);
    }
  }

  private async loadFarmData(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.showDemoMode();
        return;
      }

      // Fetch profile and farm data in parallel
      const [profileData, farmData] = await Promise.all([
        this.apiClient.getProfile().catch(() => null),
        this.apiClient.get<FarmData>('/farms/current'),
      ]);

      if (profileData) {
        this.profile = profileData;
        // Emit event so React HUD can update
        this.game.events.emit('profile-updated', profileData);
      }

      this.farmId = farmData.farm.id;

      // Recreate grid with correct number of plots from server
      this.createFarmGrid(farmData.plots.length);
      this.updatePlotsFromServer(farmData.plots);

      // Show welcome-back notification if simulation ran
      this.showWelcomeBackIfNeeded();

      // Emit weather update for React HUD
      this.game.events.emit('weather-updated', {
        weather: farmData.farm.weather,
        temperature: farmData.farm.weatherTemperature,
        season: farmData.farm.season,
      });
    } catch {
      this.showDemoMode();
      // Initialize panels with a dummy farmId so nav buttons work in demo mode
      const demoFarmId = 'demo';
      this.farmId = demoFarmId;
    }
  }

  private showDemoMode(): void {
    // Recreate grid with 4 demo plots
    this.createFarmGrid(4);

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
    plots: Array<{
      id: string;
      slotIndex: number;
      state: string;
      crop?: { type: string; growthStage: number; hydration: number };
    }>,
  ): void {
    plots.forEach((plotData) => {
      const plot = this.plots.find((p) => p.slotIndex === plotData.slotIndex);
      if (plot) {
        plot.plotId = plotData.id;
        plot.updateState(plotData.state, plotData.crop);
      }
    });
  }

  private showWelcomeBackIfNeeded(): void {
    // Check if there are any crops in READY state — indicates simulation advanced
    const readyPlots = this.plots.filter((p) => p.state === 'READY');
    const witheredPlots = this.plots.filter((p) => p.state === 'WITHERED');

    if (readyPlots.length > 0 || witheredPlots.length > 0) {
      const messages: string[] = [];
      if (readyPlots.length > 0) {
        messages.push(`${readyPlots.length} crop(s) ready to harvest!`);
      }
      if (witheredPlots.length > 0) {
        messages.push(`${witheredPlots.length} crop(s) withered!`);
      }

      // Show a welcome-back banner
      const width = this.cameras.main.width;
      const banner = this.add.container(width / 2, 80);

      const bg = this.add.rectangle(0, 0, 300, 50, 0x1b5e20, 0.95);
      bg.setStrokeStyle(2, 0x4caf50);
      banner.add(bg);

      const text = this.add.text(0, 0, `🌾 Welcome back! ${messages.join(' ')}`, {
        font: '12px monospace',
        color: '#F5E6D3',
        wordWrap: { width: 280 },
        align: 'center',
      });
      text.setOrigin(0.5, 0.5);
      banner.add(text);

      banner.setDepth(100);

      // Auto-hide after 4 seconds
      this.time.delayedCall(4000, () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: 60,
          duration: 500,
          onComplete: () => banner.destroy(),
        });
      });
    }
  }

  private createHUD(): void {
    // Navigation is now handled by the React header/footer.
    // FarmScene only renders the interactive plot grid and in-scene overlays.
    // Weather, currency, and level info are displayed in the React header.
  }

  private showContextMenu(plot: PlotObject): void {
    this.hideContextMenu();

    const actions = plot.getAvailableActions();
    if (actions.length === 0) return;

    // For plant action, show crop picker instead of single button
    if (actions.length === 1 && actions[0]?.type === 'plant') {
      this.showCropPicker(plot);
      return;
    }

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

  private showCropPicker(plot: PlotObject): void {
    const farmLevel = this.profile?.farmLevel ?? 1;
    const availableCrops = Object.values(CROPS).filter((c) => c.unlockLevel <= farmLevel);

    const itemHeight = 28;
    const panelWidth = 160;
    const panelHeight = availableCrops.length * itemHeight + 40;

    this.contextMenu = this.add.container(plot.x + 40, plot.y);

    // Background
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x3e2723, 0.95);
    bg.setStrokeStyle(1, 0x5d4037);
    this.contextMenu.add(bg);

    // Title
    const title = this.add.text(0, -panelHeight / 2 + 12, 'Choose Crop:', {
      font: '11px monospace',
      color: '#BCAAA4',
    });
    title.setOrigin(0.5, 0.5);
    this.contextMenu.add(title);

    // Crop buttons
    availableCrops.forEach((crop, index) => {
      const y = -panelHeight / 2 + 30 + index * itemHeight;

      const btn = this.add.text(0, y, `${crop.name} (${crop.seedCost}P)`, {
        font: '12px monospace',
        color: '#F5E6D3',
      });
      btn.setOrigin(0.5, 0.5);
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#FF8F00'));
      btn.on('pointerout', () => btn.setColor('#F5E6D3'));
      btn.on('pointerdown', () => {
        this.executePlantAction(plot, crop.id);
        this.hideContextMenu();
      });

      this.contextMenu?.add(btn);
    });
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.destroy();
      this.contextMenu = null;
    }
  }

  private async executePlantAction(plot: PlotObject, cropType: string): Promise<void> {
    const token = localStorage.getItem('molemisi_token') || localStorage.getItem('token');
    if (!token || !this.farmId) {
      this.simulateAction(plot, 'plant');
      return;
    }

    try {
      // Find a seed of this type in inventory
      const invResult = await this.apiClient.get<{
        inventory: Array<{ id: string; itemType: string; quantity: number }>;
      }>(`/farms/${this.farmId}/inventory`);
      const items = invResult?.inventory || [];

      const seed = items.find((item) => item.itemType === `${cropType}_seed` && item.quantity > 0);

      if (!seed) {
        this.showFloatingText(plot.x, plot.y - 20, `No ${cropType} seeds!`, '#F44336');
        return;
      }

      await this.apiClient.post(`/farms/${this.farmId}/plots/${plot.plotId}/plant`, {
        cropType,
        seedId: seed.id,
      });

      await this.loadFarmData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Plant failed!';
      console.error('Plant failed:', msg);
      this.showFloatingText(plot.x, plot.y - 20, msg, '#F44336');
    }
  }

  private async executeAction(plot: PlotObject, actionType: string): Promise<void> {
    const token = localStorage.getItem('molemisi_token') || localStorage.getItem('token');
    if (!token || !this.farmId) {
      this.simulateAction(plot, actionType);
      return;
    }

    try {
      const farmId = this.farmId;
      const plotId = plot.plotId;
      switch (actionType) {
        case 'plant':
          // Default to sorghum if called without crop picker
          await this.executePlantAction(plot, 'sorghum');
          return;
        case 'water':
          await this.apiClient.post(`/farms/${farmId}/plots/${plotId}/water`, {});
          break;
        case 'harvest':
          await this.apiClient.post(`/farms/${farmId}/plots/${plotId}/harvest`, {});
          break;
      }
      // Refresh plot state from server
      await this.loadFarmData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Action failed!';
      console.error('Action failed:', msg);
      this.showFloatingText(plot.x, plot.y - 20, msg, '#F44336');
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
