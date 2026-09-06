import * as Phaser from 'phaser';
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
  basePrice: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  supply: number;
  demand: number;
}

interface MarketEvent {
  id: string;
  name: string;
  description: string;
  effect: string;
  multiplier: number;
  endsAt: string;
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
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());
    this.container.add(overlay);

    // Panel background
    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(450, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    const panel = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x2c1810);
    panel.setStrokeStyle(2, 0x5d4037);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(panelX, panelY - panelHeight / 2 + 20, '🏪 Market', {
      font: '18px Molemisi Pixel',
      color: '#FF8F00',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(
      panelX + panelWidth / 2 - 20,
      panelY - panelHeight / 2 + 10,
      '✕',
      { font: '16px Molemisi Pixel', color: '#F44336' },
    );
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.container.add(closeBtn);

    // Tab buttons
    const buyTab = this.scene.add.text(
      panelX - 80,
      panelY - panelHeight / 2 + 50,
      '[ Buy Seeds ]',
      {
        font: '12px Molemisi Pixel',
        color: '#4CAF50',
      },
    );
    buyTab.setOrigin(0.5, 0.5);
    buyTab.setInteractive({ useHandCursor: true });
    buyTab.on('pointerdown', () => this.showBuyTab());
    this.container.add(buyTab);

    const sellTab = this.scene.add.text(
      panelX + 80,
      panelY - panelHeight / 2 + 50,
      '[ Sell Crops ]',
      {
        font: '12px Molemisi Pixel',
        color: '#FF8F00',
      },
    );
    sellTab.setOrigin(0.5, 0.5);
    sellTab.setInteractive({ useHandCursor: true });
    sellTab.on('pointerdown', () => this.showSellTab());
    this.container.add(sellTab);

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
    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(450, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    // Fetch prices and events
    let prices: MarketPrice[] = [];
    let events: MarketEvent[] = [];
    try {
      const [priceData, eventData] = await Promise.all([
        this.apiClient.get<MarketPrice[]>('/market/prices'),
        this.apiClient.get<MarketEvent[]>('/market/events'),
      ]);
      prices = priceData;
      events = eventData;
    } catch {
      prices = Object.values(CROPS).map((c) => ({
        itemType: `${c.id}_seed`,
        basePrice: c.seedCost,
        currentPrice: c.seedCost,
        trend: 'stable' as const,
        supply: 0,
        demand: 0,
      }));
    }

    // Show active events banner
    let yOffset = panelY - panelHeight / 2 + 70;

    if (events.length > 0) {
      const eventBanner = this.scene.add.rectangle(
        panelX,
        yOffset + 10,
        panelWidth - 40,
        30,
        0x4a3000,
        0.8,
      );
      eventBanner.setStrokeStyle(1, 0xffb74d);
      this.container.add(eventBanner);

      const eventText = events.map((e) => `${e.name}: ${e.description}`).join(' | ');
      const eventLabel = this.scene.add.text(panelX, yOffset + 10, `📢 ${eventText}`, {
        font: '12px Molemisi Pixel',
        color: '#FFB74D',
        wordWrap: { width: panelWidth - 60 },
      });
      eventLabel.setOrigin(0.5, 0.5);
      this.container.add(eventLabel);
      yOffset += 35;
    }

    // Filter to seeds only
    const seedPrices = prices.filter((p) => p.itemType.endsWith('_seed'));
    const itemHeight = 30;

    seedPrices.forEach((seed, index) => {
      const y = yOffset + index * itemHeight;
      const cropId = seed.itemType.replace('_seed', '');
      const crop = CROPS[cropId];

      // Name
      const name = this.scene.add.text(
        panelX - panelWidth / 2 + 20,
        y,
        crop?.name ?? seed.itemType,
        { font: '12px Molemisi Pixel', color: '#F5E6D3' },
      );
      this.container!.add(name);

      // Price with trend indicator
      const trendEmoji = seed.trend === 'up' ? '📈' : seed.trend === 'down' ? '📉' : '➡️';
      const priceColor =
        seed.currentPrice > seed.basePrice
          ? '#FF5252'
          : seed.currentPrice < seed.basePrice
            ? '#69F0AE'
            : '#FFB74D';

      const price = this.scene.add.text(
        panelX + panelWidth / 2 - 110,
        y,
        `${trendEmoji} ${seed.currentPrice}P`,
        { font: '12px Molemisi Pixel', color: priceColor },
      );
      this.container!.add(price);

      // Buy button
      const buyBtn = this.scene.add.text(panelX + panelWidth / 2 - 40, y, '[Buy]', {
        font: '12px Molemisi Pixel',
        color: '#4CAF50',
      });
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => this.buyItem(seed.itemType, 1));
      buyBtn.on('pointerover', () => buyBtn.setColor('#81C784'));
      buyBtn.on('pointerout', () => buyBtn.setColor('#4CAF50'));
      this.container!.add(buyBtn);
    });
  }

  private async showSellTab(): Promise<void> {
    this.clearContent();
    if (!this.container) return;
    const container = this.container;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const panelWidth = Math.min(520, width - 40);
    const panelHeight = Math.min(450, height - 80);
    const panelX = width / 2;
    const panelY = height / 2;

    // Fetch inventory and prices
    let inventory: InventoryItem[] = [];
    let prices: MarketPrice[] = [];
    try {
      const [invData, priceData] = await Promise.all([
        this.apiClient.get<InventoryItem[]>(`/farms/${this.farmId}/inventory`),
        this.apiClient.get<MarketPrice[]>('/market/prices'),
      ]);
      inventory = invData;
      prices = priceData;
    } catch {
      // Empty state
    }

    // Filter to sellable items
    const sellable = inventory.filter(
      (item) =>
        item.itemCategory === 'product' ||
        item.itemCategory === 'processed' ||
        item.itemCategory === 'material',
    );

    const startY = panelY - panelHeight / 2 + 70;
    const itemHeight = 30;

    if (sellable.length === 0) {
      const empty = this.scene.add.text(panelX, panelY, 'No items to sell.\nHarvest crops first!', {
        font: '14px Molemisi Pixel',
        color: '#BCAAA4',
        align: 'center',
      });
      empty.setOrigin(0.5, 0.5);
      container.add(empty);
      return;
    }

    sellable.forEach((item, index) => {
      const y = startY + index * itemHeight;
      const priceData = prices.find((p) => p.itemType === item.itemType);
      const unitPrice = priceData?.currentPrice ?? 0;
      const trend = priceData?.trend ?? 'stable';

      // Name
      const name = this.scene.add.text(
        panelX - panelWidth / 2 + 20,
        y,
        `${item.itemType} x${item.quantity}`,
        { font: '12px Molemisi Pixel', color: '#F5E6D3' },
      );
      this.container!.add(name);

      // Price with trend
      const trendEmoji = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
      const priceColor = trend === 'up' ? '#FF5252' : trend === 'down' ? '#69F0AE' : '#FFB74D';

      const price = this.scene.add.text(
        panelX + panelWidth / 2 - 110,
        y,
        `${trendEmoji} ${unitPrice}P`,
        { font: '12px Molemisi Pixel', color: priceColor },
      );
      this.container!.add(price);

      // Sell button
      const sellBtn = this.scene.add.text(panelX + panelWidth / 2 - 40, y, '[Sell]', {
        font: '12px Molemisi Pixel',
        color: '#FF8F00',
      });
      sellBtn.setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', () => this.sellItem(item.itemType, 1, item.quality));
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
