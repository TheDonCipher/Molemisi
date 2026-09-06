import * as Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface InventoryItem {
  id: string;
  itemType: string;
  quantity: number;
  quality: string;
}

export class InventoryPanel {
  private scene: Phaser.Scene;
  private apiClient: ApiClient;
  private farmId: string;
  private container: Phaser.GameObjects.Container | null = null;
  private isOpen = false;

  constructor(scene: Phaser.Scene, apiClient: ApiClient, farmId: string) {
    this.scene = scene;
    this.apiClient = apiClient;
    this.farmId = farmId;
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
    const panelWidth = Math.min(400, width - 40);
    const panelHeight = Math.min(400, height - 80);
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2d1b0e, 0.98);
    panel.setStrokeStyle(2, 0x8b5e3c);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '📦 Inventory', {
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
      const items = await this.apiClient.get<InventoryItem[]>(`/farms/${this.farmId}/inventory`);
      loading.destroy();
      this.renderItems(items, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load inventory');
    }
  }

  private renderItems(items: InventoryItem[], panelWidth: number, panelHeight: number): void {
    if (!this.container) return;
    const container = this.container;

    // Item emoji map
    const itemEmojis: Record<string, string> = {
      sorghum_seed: '🌱',
      sorghum: '🌾',
      maize_seed: '🌱',
      maize: '🌽',
      millet_seed: '🌱',
      millet: '🌾',
      cowpeas_seed: '🌱',
      cowpeas: '🫘',
      groundnuts_seed: '🌱',
      groundnuts: '🥜',
      sesame_seed: '🌱',
      sesame: '🌾',
      watermelon_seed: '🌱',
      watermelon: '🍉',
      tomatoes_seed: '🌱',
      tomatoes: '🍅',
      pepper_seed: '🌱',
      pepper: '🌶️',
      herbs_seed: '🌱',
      herbs: '🌿',
      saffron_seed: '🌱',
      saffron: '🌸',
      egg: '🥚',
      goat_milk: '🥛',
      cow_milk: '🥛',
      truffle: '🍄',
      flour: '🌾',
      butter: '🧈',
      cheese: '🧀',
      leather: '👟',
      bread: '🍞',
      wood: '🪵',
      stone: '🪨',
      iron: '⛓️',
      grain: '🌾',
      hay: '🌾',
      mixed_feed: '🌾',
    };

    if (items.length === 0) {
      const empty = this.scene.add.text(0, 0, 'Inventory is empty', {
        font: '14px Molemisi Pixel',
        color: '#BCAAA4',
      });
      empty.setOrigin(0.5, 0.5);
      container.add(empty);
      return;
    }

    // Group items by category
    const seeds = items.filter((i) => i.itemType.endsWith('_seed'));
    const crops = items.filter(
      (i) => !i.itemType.endsWith('_seed') && !['wood', 'stone', 'iron'].includes(i.itemType),
    );
    const materials = items.filter((i) => ['wood', 'stone', 'iron'].includes(i.itemType));

    let y = -panelHeight / 2 + 50;
    const itemHeight = 28;

    const renderCategory = (label: string, categoryItems: InventoryItem[]) => {
      if (categoryItems.length === 0) return;

      const catTitle = this.scene.add.text(-panelWidth / 2 + 20, y, label, {
        font: '11px Molemisi Pixel',
        color: '#81C784',
      });
      this.container!.add(catTitle);
      y += 20;

      categoryItems.forEach((item) => {
        const emoji = itemEmojis[item.itemType] || '📦';
        const name = item.itemType.replace(/_/g, ' ');
        const qualityStr = item.quality !== 'normal' ? ` (${item.quality})` : '';

        const text = this.scene.add.text(-panelWidth / 2 + 30, y, `${emoji} ${name}${qualityStr}`, {
          font: '12px Molemisi Pixel',
          color: '#F5E6D3',
        });
        this.container!.add(text);

        const qty = this.scene.add.text(panelWidth / 2 - 30, y, `x${item.quantity}`, {
          font: '12px Molemisi Pixel',
          color: '#FFB74D',
        });
        qty.setOrigin(1, 0.5);
        this.container!.add(qty);

        y += itemHeight;
      });

      y += 10;
    };

    renderCategory('🌱 Seeds', seeds);
    renderCategory('🌾 Crops & Products', crops);
    renderCategory('🪨 Materials', materials);
  }

  private close(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.isOpen = false;
  }
}
