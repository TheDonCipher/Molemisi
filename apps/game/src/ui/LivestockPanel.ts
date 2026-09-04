import * as Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface AnimalData {
  id: string;
  animalType: string;
  name: string | null;
  hunger: number;
  health: number;
  happiness: number;
  productReady: boolean;
  productTimerHours: number;
  isSick: boolean;
  lastFedAt: string;
  lastPetAt: string | null;
}

interface AvailableAnimal {
  id: string;
  name: string;
  description: string;
  purchaseCost: number;
  productType: string;
  productQuantity: number;
  productionCycleHours: number;
  buildingRequired: string;
  owned: boolean;
  count: number;
}

export class LivestockPanel {
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
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🐄 Livestock', {
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
      const [animals, available] = await Promise.all([
        this.apiClient.get<AnimalData[]>(`/farms/${this.farmId}/livestock`),
        this.apiClient.get<AvailableAnimal[]>(`/farms/${this.farmId}/livestock/available`),
      ]);

      loading.destroy();
      this.renderAnimals(animals, available, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load livestock');
    }
  }

  private renderAnimals(
    animals: AnimalData[],
    available: AvailableAnimal[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;
    const container = this.container;

    const animalEmojis: Record<string, string> = {
      chicken: '🐔',
      goat: '🐐',
      cow: '🐄',
      pig: '🐷',
    };

    const scrollY = -panelHeight / 2 + 50;
    let y = scrollY;

    // Owned animals
    if (animals.length > 0) {
      const ownedTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Your Animals:', {
        font: '12px monospace',
        color: '#81C784',
      });
      container.add(ownedTitle);
      y += 22;

      animals.forEach((animal) => {
        const emoji = animalEmojis[animal.animalType] || '🐾';
        const displayName = animal.name || animal.animalType;

        // Status emoji
        let statusEmoji = '😊';
        if (animal.isSick) statusEmoji = '🤒';
        else if (animal.hunger < 0.3) statusEmoji = '😋';
        else if (animal.productReady) statusEmoji = '✨';

        // Name and status
        const text = this.scene.add.text(
          -panelWidth / 2 + 30,
          y,
          `${emoji} ${displayName} ${statusEmoji}`,
          { font: '11px monospace', color: '#F5E6D3' },
        );
        container.add(text);

        // Hunger bar
        const barWidth = 40;
        const barHeight = 4;
        const barX = -panelWidth / 2 + 30;
        const barY = y + 16;

        const hungerBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x333333);
        hungerBg.setOrigin(0, 0.5);
        container.add(hungerBg);

        const hungerFill = this.scene.add.rectangle(
          barX,
          barY,
          barWidth * animal.hunger,
          barHeight,
          animal.hunger > 0.5 ? 0x4caf50 : animal.hunger > 0.2 ? 0xff9800 : 0xf44336,
        );
        hungerFill.setOrigin(0, 0.5);
        container.add(hungerFill);

        const hungerLabel = this.scene.add.text(barX + barWidth + 4, barY, 'Hunger', {
          font: '8px monospace',
          color: '#BCAAA4',
        });
        hungerLabel.setOrigin(0, 0.5);
        container.add(hungerLabel);

        // Action buttons
        let btnX = panelWidth / 2 - 30;

        // Collect button (if product ready)
        if (animal.productReady) {
          const collectBtn = this.scene.add.text(btnX, y + 8, '📦 Collect', {
            font: '10px monospace',
            color: '#4CAF50',
            backgroundColor: '#1b5e20',
            padding: { x: 6, y: 3 },
          });
          collectBtn.setOrigin(1, 0.5);
          collectBtn.setInteractive({ useHandCursor: true });
          collectBtn.on('pointerdown', () => this.handleCollect(animal.id));
          container.add(collectBtn);
          btnX -= 80;
        }

        // Feed button
        if (animal.hunger < 1.0 && !animal.isSick) {
          const feedBtn = this.scene.add.text(btnX, y + 8, '🍽️ Feed', {
            font: '10px monospace',
            color: '#FFB74D',
            backgroundColor: '#4a3000',
            padding: { x: 6, y: 3 },
          });
          feedBtn.setOrigin(1, 0.5);
          feedBtn.setInteractive({ useHandCursor: true });
          feedBtn.on('pointerdown', () => this.handleFeed(animal.id));
          container.add(feedBtn);
          btnX -= 70;
        }

        // Pet button
        if (!animal.isSick) {
          const petBtn = this.scene.add.text(btnX, y + 8, '❤️ Pet', {
            font: '10px monospace',
            color: '#E91E63',
            backgroundColor: '#4a0020',
            padding: { x: 6, y: 3 },
          });
          petBtn.setOrigin(1, 0.5);
          petBtn.setInteractive({ useHandCursor: true });
          petBtn.on('pointerdown', () => this.handlePet(animal.id));
          container.add(petBtn);
        }

        y += 40;
      });
    } else {
      const noAnimals = this.scene.add.text(0, y + 20, 'No animals yet. Buy some below!', {
        font: '12px monospace',
        color: '#BCAAA4',
      });
      noAnimals.setOrigin(0.5, 0.5);
      container.add(noAnimals);
      y += 50;
    }

    // Available animals to purchase
    y += 15;
    const availableTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Buy Animals:', {
      font: '12px monospace',
      color: '#FFB74D',
    });
    container.add(availableTitle);
    y += 22;

    available.forEach((animal) => {
      const emoji = animalEmojis[animal.id] || '🐾';

      const text = this.scene.add.text(-panelWidth / 2 + 30, y, `${emoji} ${animal.name}`, {
        font: '11px monospace',
        color: '#F5E6D3',
      });
      this.container!.add(text);

      // Details
      const detail = this.scene.add.text(
        -panelWidth / 2 + 30,
        y + 14,
        `${animal.purchaseCost}P | ${animal.productType} x${animal.productQuantity} / ${animal.productionCycleHours}h`,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      this.container!.add(detail);

      // Owned count
      if (animal.count > 0) {
        const countText = this.scene.add.text(
          -panelWidth / 2 + 30,
          y + 26,
          `Owned: ${animal.count}`,
          { font: '9px monospace', color: '#81C784' },
        );
        this.container!.add(countText);
      }

      // Buy button
      const buyBtn = this.scene.add.text(panelWidth / 2 - 30, y + 8, '🛒 Buy', {
        font: '10px monospace',
        color: '#4CAF50',
        backgroundColor: '#1b5e20',
        padding: { x: 6, y: 3 },
      });
      buyBtn.setOrigin(1, 0.5);
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => this.handlePurchase(animal.id));
      this.container!.add(buyBtn);

      y += 42;
    });
  }

  private async handleFeed(animalId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/livestock/${animalId}/feed`, {});
      this.close();
      this.onRefresh();
      this.showFeedback('🍽️ Animal fed! +3 XP', '#4CAF50');
    } catch (error) {
      console.error('Feed failed:', error);
      this.showFeedback('Feed failed!', '#F44336');
    }
  }

  private async handleCollect(animalId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/livestock/${animalId}/collect`, {});
      this.close();
      this.onRefresh();
      this.showFeedback('📦 Product collected! +8 XP', '#4CAF50');
    } catch (error) {
      console.error('Collect failed:', error);
      this.showFeedback('Collect failed!', '#F44336');
    }
  }

  private async handlePet(animalId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/livestock/${animalId}/pet`, {});
      this.close();
      this.onRefresh();
      this.showFeedback('❤️ Animal is happy! +1 XP', '#E91E63');
    } catch (error) {
      console.error('Pet failed:', error);
      this.showFeedback('Pet failed!', '#F44336');
    }
  }

  private async handlePurchase(animalType: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/livestock/purchase`, {
        animalType,
      });
      this.close();
      this.onRefresh();
      this.showFeedback('🎉 Animal purchased!', '#4CAF50');
    } catch (error) {
      console.error('Purchase failed:', error);
      this.showFeedback('Purchase failed!', '#F44336');
    }
  }

  private showFeedback(message: string, color: string): void {
    const width = this.scene.cameras.main.width;
    const text = this.scene.add.text(width / 2, 100, message, {
      font: '16px monospace',
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
