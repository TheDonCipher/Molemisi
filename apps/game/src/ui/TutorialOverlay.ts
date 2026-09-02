import Phaser from 'phaser';

interface TutorialStep {
  title: string;
  message: string;
  highlight?: { x: number; y: number; width: number; height: number };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Molemisi! 🌾',
    message:
      'This is your farm. You\'ll grow crops, raise animals, and build a thriving homestead.\n\nTap any empty plot to get started!',
  },
  {
    title: 'Planting Crops 🌱',
    message:
      'Select an empty plot and choose a crop to plant.\n\nEach crop has different growth times, water needs, and sell prices.\n\nKeep your crops watered to help them grow!',
  },
  {
    title: 'Watering 💧',
    message:
      'Crops need water to grow. The blue bar shows hydration.\n\nIf it runs out, your crop will wither!\n\nRain provides free water, but don\'t rely on it.',
  },
  {
    title: 'Harvesting & Selling 🌾',
    message:
      'When crops are ready, tap them and select Harvest.\n\nThen open the Market to sell your harvest for Pula (💰).\n\nUse your earnings to buy more seeds and upgrade your farm!',
  },
  {
    title: 'Building & Upgrading 🏗️',
    message:
      'Tap the Build button to construct buildings.\n\nBuildings provide storage, house animals, and unlock new features.\n\nUpgrade buildings to increase their capacity!',
  },
];

export class TutorialOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private currentStep = 0;
  private onComplete: () => void;

  constructor(scene: Phaser.Scene, onComplete: () => void) {
    this.scene = scene;
    this.onComplete = onComplete;
  }

  start(): void {
    this.currentStep = 0;
    this.showStep();
  }

  private showStep(): void {
    this.hide();

    if (this.currentStep >= TUTORIAL_STEPS.length) {
      this.onComplete();
      return;
    }

    const step = TUTORIAL_STEPS[this.currentStep];
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(200);

    // Dark overlay
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.container.add(overlay);

    // Tutorial card
    const cardWidth = Math.min(360, width - 40);
    const cardHeight = 200;
    const cardX = width / 2;
    const cardY = height / 2;

    const card = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0x2d1b0e, 0.98);
    card.setStrokeStyle(2, 0xFF8F00);
    this.container.add(card);

    // Step indicator
    const stepText = this.scene.add.text(
      cardX,
      cardY - cardHeight / 2 + 16,
      `${this.currentStep + 1} / ${TUTORIAL_STEPS.length}`,
      { font: '10px monospace', color: '#BCAAA4' },
    );
    stepText.setOrigin(0.5, 0.5);
    this.container.add(stepText);

    // Title
    const title = this.scene.add.text(cardX, cardY - cardHeight / 2 + 40, step.title, {
      font: '16px monospace',
      color: '#FF8F00',
      wordWrap: { width: cardWidth - 40 },
      align: 'center',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Message
    const message = this.scene.add.text(cardX, cardY + 10, step.message, {
      font: '12px monospace',
      color: '#F5E6D3',
      wordWrap: { width: cardWidth - 40 },
      align: 'center',
      lineSpacing: 6,
    });
    message.setOrigin(0.5, 0.5);
    this.container.add(message);

    // Next / Finish button
    const isLast = this.currentStep === TUTORIAL_STEPS.length - 1;
    const btnLabel = isLast ? 'Let\'s Go! 🚀' : 'Next →';
    const btn = this.scene.add.text(cardX, cardY + cardHeight / 2 - 30, btnLabel, {
      font: '14px monospace',
      color: '#4CAF50',
      backgroundColor: '#1b5e20',
      padding: { x: 16, y: 8 },
    });
    btn.setOrigin(0.5, 0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#81C784'));
    btn.on('pointerout', () => btn.setColor('#4CAF50'));
    btn.on('pointerdown', () => {
      this.currentStep++;
      if (this.currentStep >= TUTORIAL_STEPS.length) {
        this.hide();
        this.onComplete();
        // Mark tutorial as complete
        localStorage.setItem('molemisi_tutorial_complete', 'true');
      } else {
        this.showStep();
      }
    });
    this.container.add(btn);

    // Skip button
    const skip = this.scene.add.text(cardX + cardWidth / 2 - 10, cardY - cardHeight / 2 + 16, 'Skip', {
      font: '10px monospace',
      color: '#BCAAA4',
    });
    skip.setOrigin(1, 0.5);
    skip.setInteractive({ useHandCursor: true });
    skip.on('pointerdown', () => {
      this.hide();
      this.onComplete();
      localStorage.setItem('molemisi_tutorial_complete', 'true');
    });
    this.container.add(skip);
  }

  private hide(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  static shouldShow(): boolean {
    return localStorage.getItem('molemisi_tutorial_complete') !== 'true';
  }
}
