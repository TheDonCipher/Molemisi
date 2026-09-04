import * as Phaser from 'phaser';
import { hasAsset } from '../generated-assets';
import { CROPS } from '@molemisi/game-config';

/**
 * MarketScene — Trading hub.
 *
 * Renders the Stitch-generated market background with interactive stalls,
 * NPC vendors, price boards, and buy/sell interactions.
 * All transactions route through the NestJS API.
 */
export class MarketScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MarketScene' });
  }

  create(): void {
    // --- Background ---
    if (this.textures.exists('market_scene')) {
      const bg = this.add.image(400, 240, 'market_scene');
      bg.setDisplaySize(800, 480);
    } else {
      this.cameras.main.setBackgroundColor('#8B7355');
    }

    // --- Title ---
    const title = this.add.text(400, 16, '🏪 MARKET', {
      fontFamily: 'Space Grotesk, monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2C1810',
      strokeThickness: 3,
    });
    title.setOrigin(0.5, 0);
    title.setDepth(100);

    // --- Market Stalls (top row) ---
    const stalls: Array<[string, number, number, string]> = [
      ['stall_canopy', 150, 100, 'Grain Stall'],
      ['stall_canopy', 350, 100, 'Livestock'],
      ['stall_canopy', 550, 100, 'Tools & Seeds'],
      ['stall_canopy', 720, 100, 'Specialty'],
    ];

    for (const [id, x, y, name] of stalls) {
      if (!hasAsset(id)) continue;
      const stall = this.add.image(x, y, id);
      stall.setDepth(10);

      const label = this.add.text(x, y + 30, name, {
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#F5E6D3',
        backgroundColor: '#2C1810',
        padding: { x: 4, y: 2 },
      });
      label.setOrigin(0.5, 0);
      label.setDepth(11);
    }

    // --- Price Board ---
    if (hasAsset('price_board')) {
      const board = this.add.image(680, 200, 'price_board');
      board.setDepth(10);
      board.setInteractive({ useHandCursor: true });
      board.on('pointerdown', () => this.showPrices());
    }

    // --- Market Cart ---
    if (hasAsset('market_cart')) {
      const cart = this.add.image(120, 350, 'market_cart');
      cart.setDepth(8);
    }

    // --- Food Stall ---
    if (hasAsset('food_stall')) {
      const food = this.add.image(400, 380, 'food_stall');
      food.setDepth(8);

      // Steam animation
      const steam = this.add.particles(400, 360, 'smoke_puff', {
        speed: { min: 5, max: 15 },
        angle: { min: 260, max: 280 },
        lifespan: 1500,
        quantity: 1,
        frequency: 800,
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.4, end: 0 },
      });
      steam.setDepth(9);
    }

    // --- Goods Display ---
    if (hasAsset('goods_display')) {
      const goods = this.add.image(600, 300, 'goods_display');
      goods.setDepth(8);
    }

    // --- Vendor NPCs ---
    const vendors: Array<[string, number, number, string]> = [
      ['mama_naledi', 200, 180, 'Mama Naledi'],
      ['market_vendor', 500, 180, 'Vendor Kabelo'],
    ];

    for (const [id, x, y, name] of vendors) {
      if (!hasAsset(id)) continue;

      const container = this.add.container(x, y);
      container.setDepth(20);

      const sprite = this.add.image(0, 0, id);
      sprite.setDisplaySize(48, 64);
      container.add(sprite);

      const label = this.add.text(0, 38, name, {
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#F5E6D3',
        backgroundColor: '#2C1810',
        padding: { x: 4, y: 2 },
      });
      label.setOrigin(0.5, 0);
      container.add(label);

      container.setSize(48, 70);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerover', () => {
        sprite.setTint(0xffd700);
        this.tweens.add({ targets: container, y: y - 4, duration: 100 });
      });
      container.on('pointerout', () => {
        sprite.clearTint();
        this.tweens.add({ targets: container, y, duration: 100 });
      });
      container.on('pointerdown', () => this.showVendorDialog(name));
    }

    // --- Buy/Sell Buttons ---
    const buyBtn = this.add.text(250, 440, '🛒 BUY SEEDS', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#4C2700',
      backgroundColor: '#FF8F00',
      padding: { x: 16, y: 8 },
    });
    buyBtn.setOrigin(0.5, 0.5);
    buyBtn.setDepth(100);
    buyBtn.setInteractive({ useHandCursor: true });
    buyBtn.on('pointerdown', () => this.showBuyPanel());
    buyBtn.on('pointerover', () => buyBtn.setBackgroundColor('#FFA040'));
    buyBtn.on('pointerout', () => buyBtn.setBackgroundColor('#FF8F00'));

    const sellBtn = this.add.text(550, 440, '💰 SELL CROPS', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#F5E6D3',
      backgroundColor: '#5D4037',
      padding: { x: 16, y: 8 },
    });
    sellBtn.setOrigin(0.5, 0.5);
    sellBtn.setDepth(100);
    sellBtn.setInteractive({ useHandCursor: true });
    sellBtn.on('pointerdown', () => this.showSellPanel());
    sellBtn.on('pointerover', () => sellBtn.setBackgroundColor('#6D5047'));
    sellBtn.on('pointerout', () => sellBtn.setBackgroundColor('#5D4037'));

    // --- Load farm data ---
    this.loadFarmData();

    // --- Back button ---
    const backBtn = this.add.text(400, 465, '← Back to Farm', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#BCAAA4',
      backgroundColor: '#2C1810',
      padding: { x: 10, y: 4 },
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setDepth(100);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.game.events.emit('scene-switch', 'farm'));
  }

  private showVendorDialog(name: string): void {
    const dialogs: Record<string, string> = {
      'Mama Naledi': '"Fresh herbs and spices from my garden!\nSaffron seeds — 50 Pula each."',
      'Vendor Kabelo':
        '"Best tools in the village.\nWatering can — 100 Pula.\nFertilizer — 75 Pula."',
    };
    this.showDialog(name, dialogs[name] || '"Welcome to my stall!"');
  }

  private showPrices(): void {
    const crops = Object.values(CROPS).slice(0, 6);
    const lines = crops.map((c) => `${c.name}: ${c.seedCost} P`).join('\n');
    this.showDialog('Market Prices', lines || 'No prices available');
  }

  private showBuyPanel(): void {
    const crops = Object.values(CROPS).slice(0, 6);
    const lines = crops.map((c) => `${c.name} Seed: ${c.seedCost} P`).join('\n');
    this.showDialog('Buy Seeds', lines || 'No seeds available');
  }

  private showSellPanel(): void {
    this.showDialog(
      'Sell Crops',
      'Open your inventory to sell harvested crops.\n\nTip: Check market prices for the best deals!',
    );
  }

  private async loadFarmData(): Promise<void> {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('molemisi_token');
      if (!token) return;
    } catch {
      // Silent — visual-only fallback
    }
  }

  private showDialog(title: string, message: string): void {
    this.children.getByName('dialog')?.destroy();

    const container = this.add.container(400, 240);
    container.setName('dialog');
    container.setDepth(200);

    const backdrop = this.add.rectangle(0, 0, 800, 480, 0x000000, 0.5);
    backdrop.setInteractive();
    container.add(backdrop);

    const panel = this.add.rectangle(0, 0, 340, 200, 0x3e2723, 0.95);
    panel.setStrokeStyle(2, 0x5d4037);
    container.add(panel);

    const titleBar = this.add.rectangle(0, -80, 340, 30, 0x2c1810);
    container.add(titleBar);

    const titleText = this.add.text(0, -80, title, {
      fontFamily: 'Space Grotesk, monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFD700',
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    const msgText = this.add.text(0, 0, message, {
      fontFamily: 'Rubik, sans-serif',
      fontSize: '13px',
      color: '#F5E6D3',
      wordWrap: { width: 300 },
      align: 'center',
    });
    msgText.setOrigin(0.5);
    container.add(msgText);

    const closeBtn = this.add.text(0, 70, '[ CLOSE ]', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#BCAAA4',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => container.destroy());
    closeBtn.on('pointerover', () => closeBtn.setColor('#FFD700'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#BCAAA4'));
    container.add(closeBtn);

    backdrop.on('pointerdown', () => container.destroy());
  }
}
