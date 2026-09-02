import * as Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface BushveldZone {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  energyCost: number;
  resources: Array<{ type: string; chance: number; minQuantity: number; maxQuantity: number }>;
  rareDiscoveries: Array<{ type: string; chance: number; value: number }>;
  unlockLevel: number;
  explored: number;
}

interface GatherResult {
  resources: Array<{ type: string; quantity: number }>;
  rareDiscovery: { type: string; value: number } | null;
  energyUsed: number;
  xpGained: number;
}

export class BushveldPanel {
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
    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(480, height - 80);
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a2e1a, 0.98);
    panel.setStrokeStyle(2, 0x4caf50);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🌿 Bushveld', {
      font: '18px monospace',
      color: '#81C784',
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
      const zones = await this.apiClient.get<BushveldZone[]>(`/farms/${this.farmId}/bushveld/zones`);
      loading.destroy();
      this.renderZones(zones, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load Bushveld');
    }
  }

  private renderZones(
    zones: BushveldZone[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;

    let y = -panelHeight / 2 + 50;

    const difficultyEmoji: Record<string, string> = {
      easy: '🟢', medium: '🟡', hard: '🔴', very_hard: '💀',
    };

    zones.forEach((zone) => {
      const emoji = difficultyEmoji[zone.difficulty] || '🟢';

      // Zone name
      const text = this.scene.add.text(
        -panelWidth / 2 + 30, y,
        `${emoji} ${zone.name}`,
        { font: '12px monospace', color: '#F5E6D3' },
      );
      this.container.add(text);

      // Description
      const desc = this.scene.add.text(
        -panelWidth / 2 + 30, y + 16,
        zone.description,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      this.container.add(desc);

      // Energy cost and explored count
      const info = this.scene.add.text(
        panelWidth / 2 - 30, y + 7,
        `⚡${zone.energyCost} | Explored: ${zone.explored}`,
        { font: '10px monospace', color: '#81C784' },
      );
      info.setOrigin(1, 0.5);
      this.container.add(info);

      // Resources preview
      const resourceText = zone.resources
        .map((r) => `${r.type} ${Math.round(r.chance * 100)}%`)
        .join(', ');
      const resources = this.scene.add.text(
        -panelWidth / 2 + 30, y + 30,
        `Resources: ${resourceText}`,
        { font: '9px monospace', color: '#66BB6A' },
      );
      this.container.add(resources);

      // Gather button
      const gatherBtn = this.scene.add.text(
        panelWidth / 2 - 30, y + 22,
        '🔍 Gather', { font: '11px monospace', color: '#4CAF50', backgroundColor: '#1b5e20', padding: { x: 8, y: 4 } },
      );
      gatherBtn.setOrigin(1, 0.5);
      gatherBtn.setInteractive({ useHandCursor: true });
      gatherBtn.on('pointerdown', () => this.handleGather(zone.id));
      this.container.add(gatherBtn);

      y += 55;
    });
  }

  private async handleGather(zoneId: string): Promise<void> {
    try {
      const result = await this.apiClient.post<GatherResult>(`/farms/${this.farmId}/bushveld/gather`, {
        zoneId,
      });

      this.close();
      this.onRefresh();

      // Show result feedback
      const resourceList = result.resources
        .map((r) => `${r.type} x${r.quantity}`)
        .join(', ');
      let message = `🌿 Gathered: ${resourceList || 'nothing'}`;
      if (result.rareDiscovery) {
        message += `\n✨ Rare: ${result.rareDiscovery.type}!`;
      }
      message += ` (+${result.xpGained} XP)`;

      this.showFeedback(message, '#4CAF50');
    } catch (error) {
      console.error('Gather failed:', error);
      this.showFeedback('Gathering failed!', '#F44336');
    }
  }

  private showFeedback(message: string, color: string): void {
    const width = this.scene.cameras.main.width;
    const text = this.scene.add.text(width / 2, 100, message, {
      font: '14px monospace',
      color,
      backgroundColor: '#3e2723',
      padding: { x: 12, y: 6 },
      wordWrap: { width: 300 },
      align: 'center',
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(200);
    this.scene.tweens.add({
      targets: text,
      y: 70,
      alpha: 0,
      duration: 3000,
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
