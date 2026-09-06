import * as Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface ProgressionData {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpProgress: number;
  unlockedCrops: string[];
  unlockedAnimals: string[];
  unlockedBuildings: string[];
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export class ProgressPanel {
  private scene: Phaser.Scene;
  private apiClient: ApiClient;
  private container: Phaser.GameObjects.Container | null = null;
  private isOpen = false;

  constructor(scene: Phaser.Scene, apiClient: ApiClient) {
    this.scene = scene;
    this.apiClient = apiClient;
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
    const panelWidth = Math.min(450, width - 40);
    const panelHeight = Math.min(500, height - 80);
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2d1b0e, 0.98);
    panel.setStrokeStyle(2, 0x8b5e3c);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '⭐ Progress', {
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
      const data = await this.apiClient.get<ProgressionData>('/progression');
      loading.destroy();
      this.renderProgression(data, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load progression');
    }
  }

  private renderProgression(data: ProgressionData, panelWidth: number, panelHeight: number): void {
    if (!this.container) return;

    let y = -panelHeight / 2 + 50;

    // Level and XP bar
    const levelText = this.scene.add.text(-panelWidth / 2 + 20, y, `Farm Level: ${data.level}`, {
      font: '14px Molemisi Pixel',
      color: '#FFB74D',
    });
    this.container.add(levelText);

    // XP bar
    y += 25;
    const barWidth = panelWidth - 40;
    const barHeight = 12;

    const barBg = this.scene.add.rectangle(-panelWidth / 2 + 20, y, barWidth, barHeight, 0x333333);
    barBg.setOrigin(0, 0);
    this.container.add(barBg);

    const barFill = this.scene.add.rectangle(
      -panelWidth / 2 + 20,
      y,
      barWidth * data.xpProgress,
      barHeight,
      0xffb74d,
    );
    barFill.setOrigin(0, 0);
    this.container.add(barFill);

    const xpLabel = this.scene.add.text(
      panelWidth / 2 - 20,
      y + barHeight / 2,
      `${data.xp} / ${data.xpToNextLevel} XP`,
      { font: '12px Molemisi Pixel', color: '#F5E6D3' },
    );
    xpLabel.setOrigin(1, 0.5);
    this.container.add(xpLabel);

    // Unlocks section
    y += 35;
    const unlocksTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Unlocks:', {
      font: '12px Molemisi Pixel',
      color: '#81C784',
    });
    this.container.add(unlocksTitle);
    y += 20;

    // Crops
    const cropText = this.scene.add.text(
      -panelWidth / 2 + 30,
      y,
      `🌱 Crops: ${data.unlockedCrops.length} unlocked`,
      { font: '12px Molemisi Pixel', color: '#BCAAA4' },
    );
    this.container.add(cropText);
    y += 16;

    // Animals
    const animalText = this.scene.add.text(
      -panelWidth / 2 + 30,
      y,
      `🐄 Animals: ${data.unlockedAnimals.length} unlocked`,
      { font: '12px Molemisi Pixel', color: '#BCAAA4' },
    );
    this.container.add(animalText);
    y += 16;

    // Buildings
    const buildingText = this.scene.add.text(
      -panelWidth / 2 + 30,
      y,
      `🏗️ Buildings: ${data.unlockedBuildings.length} unlocked`,
      { font: '12px Molemisi Pixel', color: '#BCAAA4' },
    );
    this.container.add(buildingText);
    y += 25;

    // Achievements section
    const achTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Achievements:', {
      font: '12px Molemisi Pixel',
      color: '#FFB74D',
    });
    this.container.add(achTitle);
    y += 20;

    const unlockedCount = data.achievements.filter((a) => a.unlocked).length;
    const totalCount = data.achievements.length;

    const achCount = this.scene.add.text(
      panelWidth / 2 - 20,
      y - 4,
      `${unlockedCount}/${totalCount}`,
      { font: '12px Molemisi Pixel', color: '#BCAAA4' },
    );
    achCount.setOrigin(1, 0.5);
    this.container.add(achCount);

    y += 5;

    data.achievements.forEach((ach) => {
      const icon = ach.unlocked ? ach.icon : '🔒';
      const color = ach.unlocked ? '#FFB74D' : '#666666';

      const achText = this.scene.add.text(-panelWidth / 2 + 30, y, `${icon} ${ach.name}`, {
        font: '12px Molemisi Pixel',
        color,
      });
      this.container!.add(achText);

      const descText = this.scene.add.text(-panelWidth / 2 + 50, y + 12, ach.description, {
        font: '12px Molemisi Pixel',
        color: '#BCAAA4',
      });
      this.container!.add(descText);

      y += 28;
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
