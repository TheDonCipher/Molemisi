import * as Phaser from 'phaser';
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

  constructor(scene: Phaser.Scene, apiClient: ApiClient, farmId: string, onRefresh: () => void) {
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
    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(480, height - 80);
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2d1b0e, 0.98);
    panel.setStrokeStyle(2, 0x8b5e3c);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🏗️ Buildings', {
      font: '18px Molemisi Pixel',
      color: '#FF8F00',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(panelWidth / 2 - 20, -panelHeight / 2 + 20, '✕', {
      font: '16px Molemisi Pixel',
      color: '#F44336',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Loading text
    const loading = this.scene.add.text(0, 0, 'Loading...', {
      font: '14px Molemisi Pixel',
      color: '#BCAAA4',
    });
    loading.setOrigin(0.5, 0.5);
    this.container.add(loading);

    try {
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
    const container = this.container;

    const scrollY = -panelHeight / 2 + 50;
    let y = scrollY;

    // Render owned buildings
    if (owned.length > 0) {
      const ownedTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Your Buildings:', {
        font: '12px Molemisi Pixel',
        color: '#81C784',
      });
      container.add(ownedTitle);
      y += 22;

      owned.forEach((building) => {
        const config = available.find((a) => a.id === building.buildingType);
        const name = config?.name || building.buildingType;

        // State emoji
        const stateEmoji =
          building.state === 'ACTIVE'
            ? '✅'
            : building.state === 'CONSTRUCTION'
              ? '🔨'
              : building.state === 'MAINTENANCE_NEEDED'
                ? '⚠️'
                : '❌';

        // Building name and level
        const text = this.scene.add.text(
          -panelWidth / 2 + 30,
          y,
          `${stateEmoji} ${name} Lv.${building.level}`,
          { font: '12px Molemisi Pixel', color: '#F5E6D3' },
        );
        container.add(text);

        // State label
        const stateLabel = this.scene.add.text(
          -panelWidth / 2 + 30,
          y + 14,
          building.state === 'CONSTRUCTION'
            ? `Building... (${building.constructionEndsAt ? new Date(building.constructionEndsAt).toLocaleTimeString() : '...'})`
            : building.state,
          { font: '12px Molemisi Pixel', color: '#BCAAA4' },
        );
        container.add(stateLabel);

        // Action buttons on the right
        let btnX = panelWidth / 2 - 30;

        // Upgrade button (only for ACTIVE buildings below max level)
        if (building.state === 'ACTIVE' && building.level < 3) {
          const upgradeBtn = this.scene.add.text(btnX, y + 7, '⬆️ Upgrade', {
            font: '12px Molemisi Pixel',
            color: '#FFB74D',
            backgroundColor: '#4a3000',
            padding: { x: 6, y: 3 },
          });
          upgradeBtn.setOrigin(1, 0.5);
          upgradeBtn.setInteractive({ useHandCursor: true });
          upgradeBtn.on('pointerdown', () => this.handleUpgrade(building.id));
          container.add(upgradeBtn);
          btnX -= 90;
        }

        // Maintain button (for MAINTENANCE_NEEDED or DISABLED)
        if (building.state === 'MAINTENANCE_NEEDED' || building.state === 'DISABLED') {
          const maintainBtn = this.scene.add.text(btnX, y + 7, '🔧 Repair', {
            font: '12px Molemisi Pixel',
            color: '#4CAF50',
            backgroundColor: '#1b5e20',
            padding: { x: 6, y: 3 },
          });
          maintainBtn.setOrigin(1, 0.5);
          maintainBtn.setInteractive({ useHandCursor: true });
          maintainBtn.on('pointerdown', () => this.handleMaintain(building.id));
          container.add(maintainBtn);
          btnX -= 80;
        }

        // Wear bar for active buildings
        if (building.state === 'ACTIVE' && building.wear > 0) {
          const wearPercent = Math.round(building.wear * 100);
          const wearColor = wearPercent > 80 ? '#F44336' : wearPercent > 50 ? '#FF9800' : '#4CAF50';
          const wearLabel = this.scene.add.text(btnX, y + 7, `Wear: ${wearPercent}%`, {
            font: '12px Molemisi Pixel',
            color: wearColor,
          });
          wearLabel.setOrigin(1, 0.5);
          container.add(wearLabel);
        }

        y += 40;
      });
    }

    // Render available buildings to construct
    const availableToBuild = available.filter((b) => !b.owned);
    if (availableToBuild.length > 0) {
      y += 10;
      const availableTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Build New:', {
        font: '12px Molemisi Pixel',
        color: '#FFB74D',
      });
      container.add(availableTitle);
      y += 22;

      availableToBuild.forEach((building) => {
        // Building name
        const nameText = this.scene.add.text(-panelWidth / 2 + 30, y, building.name, {
          font: '12px Molemisi Pixel',
          color: '#F5E6D3',
        });
        this.container!.add(nameText);

        // Cost and time
        const costStr = `${building.cost.currency}P`;
        const timeStr = `${building.constructionTime}min`;
        const detailText = this.scene.add.text(
          -panelWidth / 2 + 30,
          y + 14,
          `Cost: ${costStr} | Time: ${timeStr} | Cap: ${building.capacity}`,
          { font: '12px Molemisi Pixel', color: '#BCAAA4' },
        );
        this.container!.add(detailText);

        // Build button
        const buildBtn = this.scene.add.text(panelWidth / 2 - 30, y + 7, '🔨 Build', {
          font: '12px Molemisi Pixel',
          color: '#4CAF50',
          backgroundColor: '#1b5e20',
          padding: { x: 6, y: 3 },
        });
        buildBtn.setOrigin(1, 0.5);
        buildBtn.setInteractive({ useHandCursor: true });
        buildBtn.on('pointerover', () => buildBtn.setColor('#81C784'));
        buildBtn.on('pointerout', () => buildBtn.setColor('#4CAF50'));
        buildBtn.on('pointerdown', () => this.handleBuild(building.id));
        this.container!.add(buildBtn);

        y += 38;
      });
    }

    // If nothing to show
    if (owned.length === 0 && availableToBuild.length === 0) {
      const empty = this.scene.add.text(0, 0, 'No buildings available', {
        font: '14px Molemisi Pixel',
        color: '#BCAAA4',
      });
      empty.setOrigin(0.5, 0.5);
      container.add(empty);
    }
  }

  private async handleBuild(buildingId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/buildings/construct`, {
        buildingType: buildingId,
      });

      this.close();
      this.onRefresh();
      this.showFeedback('🏗️ Construction started!', '#4CAF50');
    } catch (error) {
      console.error('Build failed:', error);
      this.showFeedback('Build failed!', '#F44336');
    }
  }

  private async handleUpgrade(buildingId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/buildings/${buildingId}/upgrade`, {});

      this.close();
      this.onRefresh();
      this.showFeedback('⬆️ Upgrade started!', '#FFB74D');
    } catch (error) {
      console.error('Upgrade failed:', error);
      this.showFeedback('Upgrade failed!', '#F44336');
    }
  }

  private async handleMaintain(buildingId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/buildings/${buildingId}/maintain`, {});

      this.close();
      this.onRefresh();
      this.showFeedback('🔧 Building repaired!', '#4CAF50');
    } catch (error) {
      console.error('Maintenance failed:', error);
      this.showFeedback('Repair failed!', '#F44336');
    }
  }

  private showFeedback(message: string, color: string): void {
    const width = this.scene.cameras.main.width;
    const text = this.scene.add.text(width / 2, 100, message, {
      font: '16px Molemisi Pixel',
      color,
      backgroundColor: '#3e2723',
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
  }

  private close(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.isOpen = false;
  }
}
