import * as Phaser from 'phaser';

interface StoreItem {
  sku: string;
  name: string;
  description: string;
  category: 'cosmetic' | 'convenience' | 'premium';
  price: number;
  currency: string;
  consumable: boolean;
}

/**
 * Store Panel
 *
 * Displays purchasable virtual goods organized by category.
 * Players can buy items that grant currency, cosmetics, or convenience boosts.
 *
 * Payment flow (server-authoritative):
 * 1. Player selects item → clicks Buy
 * 2. Client calls POST /payments/create with SKU
 * 3. Server creates pending payment, calls payment provider
 * 4. For stub provider: payment completes immediately
 * 5. For real providers: player is redirected to payment form
 * 6. Server awards entitlement on completion
 * 7. Client refreshes game state
 */
export class StorePanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private background!: Phaser.GameObjects.Rectangle;
  private isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000);

    // Backdrop
    const backdrop = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    backdrop.setInteractive();
    this.container.add(backdrop);

    // Panel
    const panelW = Math.min(width - 40, 500);
    const panelH = Math.min(height - 80, 600);
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    this.background = this.scene.add.rectangle(
      panelX + panelW / 2,
      panelY + panelH / 2,
      panelW,
      panelH,
      0x2c1810,
    );
    this.background.setStrokeStyle(3, 0x8b6914);
    this.container.add(this.background);

    // Title
    const title = this.scene.add.text(width / 2, panelY + 25, '🛒 Store', {
      fontSize: '20px',
      fontFamily: "'Molemisi Pixel', sans-serif",
      color: '#ffd700',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(panelX + panelW - 25, panelY + 10, '✕', {
      fontSize: '20px',
      fontFamily: "'Molemisi Pixel', sans-serif",
      color: '#ff6666',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Category tabs
    const categories = [
      { key: 'cosmetic', label: '🎨 Decor' },
      { key: 'convenience', label: '⚡ Boost' },
      { key: 'premium', label: '💎 Premium' },
    ];

    const tabY = panelY + 55;
    let activeCategory = 'cosmetic';

    const categoryButtons: Phaser.GameObjects.Text[] = [];

    categories.forEach((cat, i) => {
      const tabX = panelX + 30 + i * 140;
      const tab = this.scene.add.text(tabX, tabY, cat.label, {
        fontSize: '14px',
        fontFamily: "'Molemisi Pixel', sans-serif",
        color: i === 0 ? '#ffd700' : '#aaa',
        backgroundColor: i === 0 ? '#4a3520' : 'transparent',
        padding: { x: 8, y: 4 },
      });
      tab.setInteractive({ useHandCursor: true });
      categoryButtons.push(tab);

      tab.on('pointerdown', () => {
        activeCategory = cat.key;
        categoryButtons.forEach((b, j) => {
          b.setColor(j === i ? '#ffd700' : '#aaa');
          b.setBackgroundColor(j === i ? '#4a3520' : 'transparent');
        });
        this.refreshItems(activeCategory, panelX, panelY + 85, panelW);
      });

      this.container.add(tab);
    });

    // Backdrop click to close
    backdrop.on('pointerdown', () => this.hide());

    // Load initial items
    this.loadAndShowItems(activeCategory, panelX, panelY + 85, panelW);
  }

  private async loadAndShowItems(category: string, x: number, y: number, w: number): Promise<void> {
    // Fetch items from API
    let items: StoreItem[] = [];

    try {
      const token = localStorage.getItem('molemisi_token');
      const response = await fetch('/api/v1/payments/store', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        items = data.items || [];
      }
    } catch {
      // Use fallback items from game-config
    }

    if (items.length === 0) {
      // Fallback: use hardcoded items
      items = [
        {
          sku: 'conv_500_pula',
          name: '500 Pula',
          description: 'A little extra to help your farm grow.',
          category: 'convenience',
          price: 25,
          currency: 'BWP',
          consumable: true,
        },
        {
          sku: 'conv_1500_pula',
          name: '1,500 Pula',
          description: 'A generous boost for your farm.',
          category: 'convenience',
          price: 60,
          currency: 'BWP',
          consumable: true,
        },
        {
          sku: 'conv_speed_boost_1h',
          name: 'Growth Elixir (1h)',
          description: 'Doubles crop growth speed for 1 hour.',
          category: 'convenience',
          price: 80,
          currency: 'BWP',
          consumable: true,
        },
        {
          sku: 'cosm_sunflower_deco',
          name: 'Sunflower Decoration',
          description: 'A cheerful sunflower patch for your farm.',
          category: 'cosmetic',
          price: 50,
          currency: 'BWP',
          consumable: false,
        },
        {
          sku: 'cosm_wooden_fence',
          name: 'Wooden Fence Set',
          description: 'Rustic wooden fencing around your plots.',
          category: 'cosmetic',
          price: 75,
          currency: 'BWP',
          consumable: false,
        },
        {
          sku: 'prem_saffron_seed',
          name: 'Saffron Seed Pack',
          description: 'Rare saffron seeds — extremely valuable.',
          category: 'premium',
          price: 300,
          currency: 'BWP',
          consumable: true,
        },
        {
          sku: 'prem_greenhouse',
          name: 'Greenhouse Blueprint',
          description: 'Protect crops from weather.',
          category: 'premium',
          price: 500,
          currency: 'BWP',
          consumable: false,
        },
      ];
    }

    const filtered = items.filter((item) => item.category === category);
    this.renderItems(filtered, x, y, w);
  }

  private renderItems(items: StoreItem[], x: number, y: number, w: number): void {
    // Remove old item containers
    this.container.list
      .filter((child) => (child as unknown as Record<string, unknown>).__storeItem)
      .forEach((child) => child.destroy());

    const itemH = 70;
    const padding = 8;
    let currentY = y + 5;

    items.forEach((item) => {
      const bg = this.scene.add.rectangle(
        x + w / 2,
        currentY + itemH / 2,
        w - 20,
        itemH - padding,
        0x3d2b1f,
      );
      (bg as unknown as Record<string, unknown>).__storeItem = true;
      this.container.add(bg);

      const name = this.scene.add.text(x + 15, currentY + 8, item.name, {
        fontSize: '14px',
        fontFamily: "'Molemisi Pixel', sans-serif",
        color: '#ffffff',
        fontStyle: 'bold',
      });
      (name as unknown as Record<string, unknown>).__storeItem = true;
      this.container.add(name);

      const desc = this.scene.add.text(x + 15, currentY + 28, item.description, {
        fontSize: '11px',
        fontFamily: "'Molemisi Pixel', sans-serif",
        color: '#aaa',
        wordWrap: { width: w - 140 },
      });
      (desc as unknown as Record<string, unknown>).__storeItem = true;
      this.container.add(desc);

      // Price tag
      const priceLabel = `${item.price} ${item.currency}`;
      const buyBtn = this.scene.add.text(x + w - 100, currentY + 20, `💰 ${priceLabel}`, {
        fontSize: '12px',
        fontFamily: "'Molemisi Pixel', sans-serif",
        color: '#ffd700',
        backgroundColor: '#5a4020',
        padding: { x: 8, y: 4 },
      });
      buyBtn.setInteractive({ useHandCursor: true });
      (buyBtn as unknown as Record<string, unknown>).__storeItem = true;
      this.container.add(buyBtn);

      buyBtn.on('pointerdown', async () => {
        buyBtn.setText('⏳ Buying...');
        buyBtn.disableInteractive();

        try {
          const token = localStorage.getItem('molemisi_token');
          const response = await fetch('/api/v1/payments/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ sku: item.sku }),
          });

          if (response.ok) {
            await response.json();
            buyBtn.setText('✅ Done!');

            // Refresh game state
            this.scene.events.emit('store-purchased');
            this.scene.events.emit('refresh-game-state');

            // Show floating text
            const sceneWithFeedback = this.scene as Phaser.Scene & {
              floatingText?: (msg: string) => void;
            };
            sceneWithFeedback.floatingText?.(`Purchased ${item.name}!`);
          } else {
            const err = (await response.json()) as { message?: string };
            buyBtn.setText(`❌ ${err.message || 'Failed'}`);
          }
        } catch {
          buyBtn.setText('❌ Network error');
        }

        // Restore button after delay
        this.scene.time.delayedCall(2000, () => {
          buyBtn.setText(`💰 ${priceLabel}`);
          buyBtn.setInteractive({ useHandCursor: true });
        });
      });

      // Buy button hover
      buyBtn.on('pointerover', () => buyBtn.setBackgroundColor('#7a5a30'));
      buyBtn.on('pointerout', () => buyBtn.setBackgroundColor('#5a4020'));

      currentY += itemH;
    });
  }

  private refreshItems(category: string, x: number, y: number, w: number): void {
    // Remove old items
    this.container.list
      .filter((child) => (child as unknown as Record<string, unknown>).__storeItem)
      .forEach((child) => child.destroy());

    this.loadAndShowItems(category, x, y, w);
  }

  hide(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.destroy();
  }

  toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }
}
