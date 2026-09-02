import Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface AvailableBuilding {
  id: string;
  name: string;
  description: string;
  cost: { currency: number; wood?: number; stone?: number; iron?: number };
  constructionTime: number;
  capacity: number;
  owned: boolean;
}

interface OwnedBuilding {
  id: string;
  buildingType: string;
  level: number;
  state: string;
  capacity: number;
  wear: number;
  constructionEndsAt: string | null;
}

export class BuildPanel {
  private scene: Phaser.Scene;
  private apiClient: ApiClient;
  private farmId: string;
  private container: Phaser.GameObjects.Container | null = null;
  private isOpen = false;
  private onRefresh: () => void;

  constructor(
    scene: Phaser.Scene,
    apiClient: ApiClient,
    farmId: string,
    onRefresh: () => void,
  ) {
    this.scene = scene;
    this.apiClient = apiClient;
    this.farmId = farmId;
    this.onRefresh = onRefresh;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private async open(): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(width / 2, height / 2);
    this.container.setDepth(100);

    // Background overlay
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.5);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());
    this.container.add(overlay);

    // Panel background
    const panelWidth = Math.min(500, width - 40);
    const panelHeight = Math.min(450, height - 80);
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2d1b0e, 0.98);
    panel.setStrokeStyle(2, 0x8b5e3c);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🏗️ Buildings', {
      font: '18px monospace',
      color: '#FF8F00',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(panelWidth / 2 - 20, -panelHeight / 2 + 20, '✕', {
      font: '16px monospace',
      color: '#F44336',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Loading text
    const loading = this.scene.add.text(0, 0, 'Loading...', {
      font: '14px monospace',
      color: '#BCAAA4',
    });
    loading.setOrigin(0.5, 0.5);
    this.container.add(loading);

    try {
      // Fetch available buildings and owned buildings in parallel
      const [available, owned] = await Promise.all([
        this.apiClient.get<AvailableBuilding[]>(`/farms/${this.farmId}/buildings/available`),
        this.apiClient.get<OwnedBuilding[]>(`/farms/${this.farmId}/buildings`),
      ]);

      loading.destroy();
      this.renderBuildings(available, owned, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load buildings');
    }
  }

  private renderBuildings(
    available: AvailableBuilding[],
    owned: OwnedBuilding[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;

    const ownedMap = new Map(owned.map((b) => [b.buildingType, b]));
    const scrollY = -panelHeight / 2 + 50;

    // Render owned buildings first
    if (owned.length > 0) {
      const ownedTitle = this.scene.add.text(-panelWidth / 2 + 20, scrollY, 'Your Buildings:', {
        font: '12px monospace',
        color: '#81C784',
      });
      this.container.add(ownedTitle);

      owned.forEach((building, index) => {
        const y = scrollY + 25 + index * 40;
        const config = available.find((a) => a.id === building.buildingType);
        const name = config?.name || building.buildingType;
        const stateEmoji =
          building.state === 'ACTIVE'
            ? '✅'
            : building.state === 'CONSTRUCTION'
              ? '🔨'
              : building.state === 'MAINTENANCE_NEEDED'
                ? '⚠️'
                : '❌';

        const text = this.scene.add.text(
          -panelWidth / 2 + 30,
          y,
          `${stateEmoji} ${name} Lv.${building.level} - ${building.state}`,
          { font: '11px monospace', color: '#F5E6D3' },
        );
        this.container.add(text);

        // Show wear bar
        if (building.state === 'ACTIVE' && building.wear > 0) {
          const wearPercent = Math.round(building.wear * 100);
          const wearColor = wearPercent > 80 ? '#F44336' : wearPercent > 50 ? '#FF9800' : '#4CAF50';
          const wearText = this.scene.add.text(
            panelWidth / 2 - 30,
            y,
            `Wear: ${wearPercent}%`,
            { font: '10px monospace', color: wearColor },
          );
          wearText.setOrigin(1, 0.5);
          this.container.add(wearText);
        }
      });
    }

    // Render available buildings
    const availableStartY = scrollY + 25 + owned.length * 40 + 20;
    const availableTitle = this.scene.add.text(
      -panelWidth / 2 + 20,
      availableStartY,
      'Build New:',
      { font: '12px monospace', color: '#FFB74D' },
    );
    this.container.add(availableTitle);

    available
      .filter((b) => !b.owned)
      .forEach((building, index) => {
        const y = availableStartY + 25 + index * 50;

        // Building name
        const nameText = this.scene.add.text(-panelWidth / 2 + 30, y, building.name, {
          font: '12px monospace',
          color: '#F5E6D3',
        });
        this.container!.add(nameText);

        // Cost and time
        const costStr = `${building.cost.currency}P`;
        const timeStr = `${building.constructionTime}min`;
        const detailText = this.scene.add.text(
          -panelWidth / 2 + 30,
          y + 16,
          `Cost: ${costStr} | Time: ${timeStr}`,
          { font: '10px monospace', color: '#BCAAA4' },
        );
        this.container!.add(detailText);

        // Build button
        const buildBtn = this.scene.add.text(panelWidth / 2 - 30, y + 8, '🔨 Build', {
          font: '11px monospace',
          color: '#4CAF50',
          backgroundColor: '#1b5e20',
          padding: { x: 8, y: 4 },
        });
        buildBtn.setOrigin(1, 0.5);
        buildBtn.setInteractive({ useHandCursor: true });
        buildBtn.on('pointerover', () => buildBtn.setColor('#81C784'));
        buildBtn.on('pointerout', () => buildBtn.setColor('#4CAF50'));
        buildBtn.on('pointerdown', () => this.handleBuild(building.id));
        this.container!.add(buildBtn);
      });

    // If no available buildings to build
    const availableCount = available.filter((b) => !b.owned).length;
    if (availableCount === 0) {
      const noBuildings = this.scene.add.text(
        0,
        availableStartY + 25,
        'All buildings constructed!',
        { font: '12px monospace', color: '#BCAAA4' },
      );
      noBuildings.setOrigin(0.5, 0.5);
      this.container.add(noBuildings);
    }
  }

  private async handleBuild(buildingId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/buildings/construct`, {
        buildingType: buildingId,
      });

      this.close();
      this.onRefresh();

      // Show success feedback
      const width = this.scene.cameras.main.width;
      const text = this.scene.add.text(width / 2, 100, '🏗️ Construction started!', {
        font: '16px monospace',
        color: '#4CAF50',
        backgroundColor: '#1b5e20',
        padding: { x: 12, y: 6 },
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(200);
      this.scene.tweens.add({
        targets: text,
        y: 80,
        alpha: 0,
        duration: 2000,
        onComplete: () => text.destroy(),
      });
    } catch (error) {
      console.error('Build failed:', error);
    }
  }

  private close(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.isOpen = false;
  }
}
