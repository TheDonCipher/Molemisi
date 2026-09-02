import Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';
import { CROPS } from '@molemisi/game-config';

interface InventoryItem {
  id: string;
  itemType: string;
  itemCategory: string;
  quantity: number;
  quality: string;
}

interface MarketPrice {
  itemType: string;
  currentPrice: number;
}

export class MarketPanel {
  private scene: Phaser.Scene;
  private apiClient: ApiClient;
  private container: Phaser.GameObjects.Container | null = null;
  private isOpen = false;
  private farmId: string;
  private onTransaction: () => void;

  constructor(
    scene: Phaser.Scene,
    apiClient: ApiClient,
    farmId: string,
    onTransaction: () => void,
  ) {
    this.scene = scene;
    this.apiClient = apiClient;
    this.farmId = farmId;
    this.onTransaction = onTransaction;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  async open(): Promise<void> {
    this.close();
    this.isOpen = true;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(100);

    // Dark overlay
    const overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.6,
    );
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());
    this.container.add(overlay);

    // Panel background
    const panelWidth = Math.min(500, width - 40);
    const panelHeight = Math.min(400, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    const panel = this.scene.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x2c1810,
    );
    panel.setStrokeStyle(2, 0x5d4037);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(panelX, panelY - panelHeight / 2 + 20, '🏪 Market', {
      font: '18px monospace',
      color: '#FF8F00',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Tab buttons
    const buyTab = this.scene.add.text(
      panelX - 80,
      panelY - panelHeight / 2 + 50,
      '[ Buy Seeds ]',
      { font: '12px monospace', color: '#4CAF50' },
    );
    buyTab.setOrigin(0.5, 0.5);
    buyTab.setInteractive({ useHandCursor: true });
    buyTab.on('pointerdown', () => this.showBuyTab());
    this.container.add(buyTab);

    const sellTab = this.scene.add.text(
      panelX + 80,
      panelY - panelHeight / 2 + 50,
      '[ Sell Crops ]',
      { font: '12px monospace', color: '#FF8F00' },
    );
    sellTab.setOrigin(0.5, 0.5);
    sellTab.setInteractive({ useHandCursor: true });
    sellTab.on('pointerdown', () => this.showSellTab());
    this.container.add(sellTab);

    // Close button
    const closeBtn = this.scene.add.text(
      panelX + panelWidth / 2 - 20,
      panelY - panelHeight / 2 + 10,
      '✕',
      { font: '16px monospace', color: '#F44336' },
    );
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Show buy tab by default
    await this.showBuyTab();
  }

  close(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.isOpen = false;
  }

  private clearContent(): void {
    if (!this.container) return;
    // Remove everything except the first 5 elements (overlay, panel, title, tabs, close)
    const children = this.container.getAll();
    while (children.length > 5) {
      const child = children.pop();
      child?.destroy();
    }
  }

  private async showBuyTab(): Promise<void> {
    this.clearContent();
    if (!this.container) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const panelWidth = Math.min(500, width - 40);
    const panelHeight = Math.min(400, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    // Fetch prices
    let prices: MarketPrice[] = [];
    try {
      const data = await this.apiClient.get<{ prices: MarketPrice[] }>('/market/prices');
      prices = data.prices;
    } catch {
      // Use defaults from game-config
      prices = Object.values(CROPS).map((c) => ({
        itemType: `${c.id}_seed`,
        currentPrice: c.seedCost,
      }));
    }

    // Filter to seeds only
    const seedPrices = prices.filter((p) => p.itemType.endsWith('_seed'));

    const startY = panelY - panelHeight / 2 + 70;
    const itemHeight = 32;

    seedPrices.forEach((seed, index) => {
      const y = startY + index * itemHeight;
      const cropId = seed.itemType.replace('_seed', '');
      const crop = CROPS[cropId];

      const name = this.scene.add.text(
        panelX - panelWidth / 2 + 20,
        y,
        crop?.name ?? seed.itemType,
        { font: '12px monospace', color: '#F5E6D3' },
      );
      this.container!.add(name);

      const price = this.scene.add.text(
        panelX + panelWidth / 2 - 100,
        y,
        `${seed.currentPrice} P`,
        { font: '12px monospace', color: '#FF8F00' },
      );
      this.container!.add(price);

      const buyBtn = this.scene.add.text(
        panelX + panelWidth / 2 - 40,
        y,
        '[Buy]',
        { font: '12px monospace', color: '#4CAF50' },
      );
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', async () => {
        await this.buyItem(seed.itemType, 1);
      });
      buyBtn.on('pointerover', () => buyBtn.setColor('#81C784'));
      buyBtn.on('pointerout', () => buyBtn.setColor('#4CAF50'));
      this.container!.add(buyBtn);
    });
  }

  private async showSellTab(): Promise<void> {
    this.clearContent();
    if (!this.container) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const panelWidth = Math.min(500, width - 40);
    const panelHeight = Math.min(400, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    // Fetch inventory and prices
    let inventory: InventoryItem[] = [];
    let prices: MarketPrice[] = [];
    try {
      const [invData, priceData] = await Promise.all([
        this.apiClient.get<InventoryItem[]>(`/farms/${this.farmId}/inventory`),
        this.apiClient.get<{ prices: MarketPrice[] }>('/market/prices'),
      ]);
      inventory = invData;
      prices = priceData.prices;
    } catch {
      // Empty state
    }

    // Filter to sellable items (not seeds, not tools)
    const sellable = inventory.filter(
      (item) =>
        item.itemCategory === 'product' ||
        item.itemCategory === 'processed' ||
        item.itemCategory === 'material',
    );

    if (sellable.length === 0) {
      const empty = this.scene.add.text(panelX, panelY, 'No items to sell', {
        font: '14px monospace',
        color: '#BCAAA4',
      });
      empty.setOrigin(0.5, 0.5);
      this.container.add(empty);
      return;
    }

    const startY = panelY - panelHeight / 2 + 70;
    const itemHeight = 32;

    sellable.forEach((item, index) => {
      const y = startY + index * itemHeight;
      const priceData = prices.find((p) => p.itemType === item.itemType);
      const unitPrice = priceData?.currentPrice ?? 0;

      const name = this.scene.add.text(
        panelX - panelWidth / 2 + 20,
        y,
        `${item.itemType} x${item.quantity}`,
        { font: '12px monospace', color: '#F5E6D3' },
      );
      this.container!.add(name);

      const price = this.scene.add.text(
        panelX + panelWidth / 2 - 100,
        y,
        `${unitPrice} P ea`,
        { font: '12px monospace', color: '#FF8F00' },
      );
      this.container!.add(price);

      const sellBtn = this.scene.add.text(
        panelX + panelWidth / 2 - 40,
        y,
        '[Sell]',
        { font: '12px monospace', color: '#FF8F00' },
      );
      sellBtn.setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', async () => {
        await this.sellItem(item.itemType, 1, item.quality);
      });
      sellBtn.on('pointerover', () => sellBtn.setColor('#FFB74D'));
      sellBtn.on('pointerout', () => sellBtn.setColor('#FF8F00'));
      this.container!.add(sellBtn);
    });
  }

  private async buyItem(itemType: string, quantity: number): Promise<void> {
    try {
      await this.apiClient.post('/market/buy', {
        farmId: this.farmId,
        itemType,
        quantity,
      });
      this.onTransaction();
      await this.showBuyTab();
    } catch (error) {
      console.error('Buy failed:', error);
    }
  }

  private async sellItem(itemType: string, quantity: number, quality: string): Promise<void> {
    try {
      await this.apiClient.post('/market/sell', {
        farmId: this.farmId,
        itemType,
        quantity,
        quality,
      });
      this.onTransaction();
      await this.showSellTab();
    } catch (error) {
      console.error('Sell failed:', error);
    }
  }
}
