import * as Phaser from 'phaser';
import { hasAsset } from '../generated-assets';
import { FONT_DISPLAY, FONT_BODY } from '../fonts';

/**
 * BushveldScene — Wild exploration zone.
 *
 * Renders the Stitch-generated savanna background with interactive
 * resource nodes, cave entrance, river area, and discovery elements.
 */
export class BushveldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BushveldScene' });
  }

  create(): void {
    // --- Background ---
    if (this.textures.exists('bushveld_scene')) {
      const bg = this.add.image(400, 240, 'bushveld_scene');
      bg.setDisplaySize(800, 480);
    } else {
      this.cameras.main.setBackgroundColor('#8B7355');
    }

    // --- Title ---
    const title = this.add.text(400, 16, '🌿 BUSHVILD', {
      fontFamily: FONT_DISPLAY,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#9CD67A',
      stroke: '#2C1810',
      strokeThickness: 3,
    });
    title.setOrigin(0.5, 0);
    title.setDepth(100);

    // --- Resource Nodes (scattered) ---
    const resources: Array<[string, number, number, string]> = [
      ['resource_node', 150, 350, 'Iron Ore'],
      ['resource_node', 620, 280, 'Copper Ore'],
      ['wild_berry', 280, 200, 'Wild Berries'],
      ['wild_berry', 550, 380, 'Marula Fruit'],
    ];

    for (const [id, x, y, name] of resources) {
      if (!hasAsset(id)) continue;

      const container = this.add.container(x, y);
      container.setDepth(15);

      const sprite = this.add.image(0, 0, id);
      sprite.setDisplaySize(40, 40);
      container.add(sprite);

      // Glow effect
      const glow = this.add.circle(0, 0, 24, 0xffd700, 0.15);
      container.add(glow);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.1, to: 0.3 },
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
      });

      // Label
      const label = this.add.text(0, 24, name, {
        fontFamily: FONT_DISPLAY,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#F5E6D3',
        backgroundColor: '#2C1810',
        padding: { x: 3, y: 1 },
      });
      label.setOrigin(0.5, 0);
      container.add(label);

      // Interactive
      container.setSize(40, 48);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => this.gatherResource(name));
      container.on('pointerover', () => {
        this.tweens.add({ targets: container, y: y - 4, duration: 100 });
      });
      container.on('pointerout', () => {
        this.tweens.add({ targets: container, y, duration: 100 });
      });
    }

    // --- Cave Entrance ---
    if (hasAsset('cave_entrance')) {
      const cave = this.add.image(680, 160, 'cave_entrance');
      cave.setDepth(10);
      cave.setInteractive({ useHandCursor: true });
      cave.on('pointerdown', () => {
        this.showDialog(
          'Cave Entrance',
          'A dark cave mouth in the rocky hillside.\nRare minerals glint inside...\n\nRequires Level 5 to explore safely.',
        );
      });

      const caveLabel = this.add.text(680, 200, 'Cave', {
        fontFamily: FONT_DISPLAY,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#BCAAA4',
        backgroundColor: '#2C1810',
        padding: { x: 4, y: 2 },
      });
      caveLabel.setOrigin(0.5, 0);
      caveLabel.setDepth(11);
    }

    // --- River Rocks ---
    if (hasAsset('river_rock')) {
      const rock1 = this.add.image(200, 400, 'river_rock');
      rock1.setDepth(8);
      const rock2 = this.add.image(350, 420, 'river_rock');
      rock2.setDepth(8);
      rock2.setScale(0.8);

      // Water ripple effect
      const water = this.add.ellipse(280, 430, 200, 30, 0x87ceeb, 0.3);
      water.setDepth(7);
      this.tweens.add({
        targets: water,
        scaleX: { from: 0.9, to: 1.05 },
        alpha: { from: 0.2, to: 0.4 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
      });
    }

    // --- Animal Tracks ---
    if (hasAsset('animal_track')) {
      const tracks = this.add.image(500, 320, 'animal_track');
      tracks.setDepth(5);
      tracks.setAlpha(0.5);
    }

    // --- Bush Camp ---
    if (hasAsset('bush_camp')) {
      const camp = this.add.image(100, 250, 'bush_camp');
      camp.setDepth(10);
      camp.setInteractive({ useHandCursor: true });
      camp.on('pointerdown', () => {
        this.showDialog(
          'Bush Camp',
          'A small campfire with cooking sticks.\nRest here to recover energy.\n\n+10 Energy restored!',
        );
      });
    }

    // --- Explorer NPC ---
    if (hasAsset('bushveld_scout')) {
      const scout = this.add.container(400, 300);
      scout.setDepth(20);

      const sprite = this.add.image(0, 0, 'bushveld_scout');
      sprite.setDisplaySize(48, 64);
      scout.add(sprite);

      const label = this.add.text(0, 38, 'Scout', {
        fontFamily: FONT_DISPLAY,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#F5E6D3',
        backgroundColor: '#2C1810',
        padding: { x: 4, y: 2 },
      });
      label.setOrigin(0.5, 0);
      scout.add(label);

      scout.setSize(48, 70);
      scout.setInteractive({ useHandCursor: true });
      scout.on('pointerdown', () => {
        this.showDialog(
          'Bushveld Scout',
          '"I found traces of a rare plant near the river.\nWant to join me for an expedition?"',
        );
      });
    }

    // --- Zone indicator ---
    const zone = this.add.text(16, 460, 'Zone: Savanna — Easy', {
      fontFamily: FONT_DISPLAY,
      fontSize: '10px',
      color: '#9CD67A',
      backgroundColor: '#2C1810',
      padding: { x: 6, y: 3 },
    });
    zone.setDepth(100);

    // --- Back button ---
    const backBtn = this.add.text(400, 460, '← Back to Farm', {
      fontFamily: FONT_DISPLAY,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FF8F00',
      backgroundColor: '#2C1810',
      padding: { x: 12, y: 6 },
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setDepth(100);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.game.events.emit('scene-switch', 'farm'));
    backBtn.on('pointerover', () => backBtn.setColor('#FFD700'));
    backBtn.on('pointerout', () => backBtn.setColor('#FF8F00'));
  }

  private gatherResource(name: string): void {
    this.showDialog('Gathering', `Collecting ${name}...\n\n+5 XP earned!`);
  }

  private showDialog(title: string, message: string): void {
    this.children.getByName('dialog')?.destroy();

    const container = this.add.container(400, 240);
    container.setName('dialog');
    container.setDepth(200);

    const backdrop = this.add.rectangle(0, 0, 800, 480, 0x000000, 0.5);
    backdrop.setInteractive();
    container.add(backdrop);

    const panel = this.add.rectangle(0, 0, 340, 180, 0x3e2723, 0.95);
    panel.setStrokeStyle(2, 0x5d4037);
    container.add(panel);

    const titleBar = this.add.rectangle(0, -70, 340, 28, 0x2c1810);
    container.add(titleBar);

    const titleText = this.add.text(0, -70, title, {
      fontFamily: FONT_DISPLAY,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#9CD67A',
    });
    titleText.setOrigin(0.5);
    container.add(titleText);

    const msgText = this.add.text(0, 0, message, {
      fontFamily: FONT_BODY,
      fontSize: '12px',
      color: '#F5E6D3',
      wordWrap: { width: 300 },
      align: 'center',
    });
    msgText.setOrigin(0.5);
    container.add(msgText);

    const closeBtn = this.add.text(0, 60, '[ CLOSE ]', {
      fontFamily: FONT_DISPLAY,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#BCAAA4',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => container.destroy());
    closeBtn.on('pointerover', () => closeBtn.setColor('#9CD67A'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#BCAAA4'));
    container.add(closeBtn);

    backdrop.on('pointerdown', () => container.destroy());
  }
}
