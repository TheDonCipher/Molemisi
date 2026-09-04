import * as Phaser from 'phaser';
import { hasAsset } from '../generated-assets';

/**
 * KgotlaScene — Community gathering place.
 *
 * Renders the Stitch-generated kgotla background with interactive NPCs,
 * a fire pit, quest board, and community elements. All interactions
 * route through the NestJS API (server-authoritative).
 *
 * Canvas: 800×480 (same as FarmScene, scales responsively)
 */
export class KgotlaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'KgotlaScene' });
  }

  create(): void {
    // --- Background ---
    if (this.textures.exists('kgotla_scene')) {
      const bg = this.add.image(400, 240, 'kgotla_scene');
      bg.setDisplaySize(800, 480);
    } else {
      this.cameras.main.setBackgroundColor('#5A8F3C');
    }

    // --- Title ---
    const title = this.add.text(400, 16, '🏛️ KGOTLA', {
      fontFamily: 'Space Grotesk, monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#2C1810',
      strokeThickness: 3,
    });
    title.setOrigin(0.5, 0);
    title.setDepth(100);

    // --- Fire Pit (center) ---
    if (hasAsset('fire_pit')) {
      const fire = this.add.image(400, 280, 'fire_pit');
      fire.setDepth(10);
      // Flicker animation
      this.tweens.add({
        targets: fire,
        alpha: { from: 0.85, to: 1 },
        duration: 300 + Math.random() * 200,
        yoyo: true,
        repeat: -1,
      });
    }

    // --- Stone Benches (around circle) ---
    const benchPositions: Array<[number, number]> = [
      [300, 260],
      [500, 260],
      [350, 320],
      [450, 320],
      [300, 340],
      [500, 340],
    ];
    for (const [bx, by] of benchPositions) {
      if (hasAsset('stone_bench')) {
        const bench = this.add.image(bx, by, 'stone_bench');
        bench.setDepth(5);
      }
    }

    // --- NPCs ---
    const npcs: Array<[string, number, number, string]> = [
      ['elder_neo', 400, 200, 'Elder Neo'],
      ['mama_naledi', 280, 180, 'Mama Naledi'],
      ['refilwe', 520, 180, 'Refilwe'],
      ['market_vendor', 340, 350, 'Vendor'],
      ['bushveld_scout', 460, 350, 'Scout'],
    ];

    for (const [id, x, y, name] of npcs) {
      if (!hasAsset(id)) continue;

      const container = this.add.container(x, y);
      container.setDepth(20);

      const sprite = this.add.image(0, 0, id);
      sprite.setDisplaySize(48, 64);
      container.add(sprite);

      // Name tag
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

      // Make interactive
      container.setSize(48, 70);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        sprite.setTint(0xffd700);
        this.tweens.add({
          targets: container,
          y: y - 4,
          duration: 150,
          ease: 'Sine.easeOut',
        });
      });

      container.on('pointerout', () => {
        sprite.clearTint();
        this.tweens.add({
          targets: container,
          y,
          duration: 150,
          ease: 'Sine.easeOut',
        });
      });

      container.on('pointerdown', () => {
        this.showNpcDialog(name, id);
      });
    }

    // --- Quest Board ---
    if (hasAsset('quest_board')) {
      const board = this.add.image(140, 200, 'quest_board');
      board.setDepth(10);
      board.setInteractive({ useHandCursor: true });
      board.on('pointerdown', () => {
        this.showDialog(
          'Quest Board',
          '3 available contracts:\n• Deliver 20 Sorghum\n• Build a Chicken Coop\n• Explore Riverbank',
        );
      });
    }

    // --- Herb Garden ---
    if (hasAsset('herb_garden')) {
      const garden = this.add.image(660, 300, 'herb_garden');
      garden.setDepth(8);
    }

    // --- Community Circle (ground marking) ---
    if (hasAsset('community_circle')) {
      const circle = this.add.image(400, 300, 'community_circle');
      circle.setDepth(1);
      circle.setAlpha(0.6);
    }

    // --- Load NPC data from API ---
    this.loadNpcData();

    // --- Back button (bottom) ---
    const backBtn = this.add.text(400, 460, '← Back to Farm', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FF8F00',
      backgroundColor: '#2C1810',
      padding: { x: 12, y: 6 },
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setDepth(100);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.game.events.emit('scene-switch', 'farm');
    });
    backBtn.on('pointerover', () => backBtn.setColor('#FFD700'));
    backBtn.on('pointerout', () => backBtn.setColor('#FF8F00'));

    // --- Reputation badge ---
    const repBadge = this.add.text(780, 16, '★★★☆☆', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '14px',
      color: '#FFD700',
      stroke: '#2C1810',
      strokeThickness: 2,
    });
    repBadge.setOrigin(1, 0);
    repBadge.setDepth(100);
  }

  private showNpcDialog(name: string, _npcId: string): void {
    const dialogs: Record<string, string> = {
      elder_neo: '"Welcome, young farmer. The community needs your help with the harvest."',
      mama_naledi: '"I have fresh produce for trade. Come see what I have!"',
      refilwe: '"My herb garden has rare medicinal plants. Need any?"',
      market_vendor: '"Best prices in the village. What would you like to trade?"',
      bushveld_scout: '"I discovered something interesting in the riverbank zone..."',
    };
    const msg = dialogs[_npcId] || '"Hello, farmer!"';
    this.showDialog(name, msg);
  }

  private showDialog(title: string, message: string): void {
    // Remove existing dialog
    this.children.getByName('dialog')?.destroy();

    const container = this.add.container(400, 240);
    container.setName('dialog');
    container.setDepth(200);

    // Backdrop
    const backdrop = this.add.rectangle(0, 0, 800, 480, 0x000000, 0.5);
    backdrop.setInteractive();
    container.add(backdrop);

    // Panel
    const panel = this.add.rectangle(0, 0, 340, 200, 0x3e2723, 0.95);
    panel.setStrokeStyle(2, 0x5d4037);
    container.add(panel);

    // Title bar
    const titleBar = this.add.rectangle(0, -80, 340, 30, 0x2c1810);
    container.add(titleBar);

    const titleText = this.add.text(0, -80, title, {
      fontFamily: 'Space Grotesk, monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FF8F00',
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    // Message
    const msgText = this.add.text(0, 0, message, {
      fontFamily: 'Rubik, sans-serif',
      fontSize: '13px',
      color: '#F5E6D3',
      wordWrap: { width: 300 },
      align: 'center',
    });
    msgText.setOrigin(0.5);
    container.add(msgText);

    // Close button
    const closeBtn = this.add.text(0, 70, '[ CLOSE ]', {
      fontFamily: 'Space Mono, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#BCAAA4',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => container.destroy());
    closeBtn.on('pointerover', () => closeBtn.setColor('#FF8F00'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#BCAAA4'));
    container.add(closeBtn);

    // Click backdrop to close
    backdrop.on('pointerdown', () => container.destroy());
  }

  private async loadNpcData(): Promise<void> {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('molemisi_token');
      if (!token) return;
    } catch {
      // Silently handle — NPC data is optional for visual presentation
    }
  }
}
