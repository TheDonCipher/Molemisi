import Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface Contract {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number }>;
  rewards: { currency: number; xp: number };
  difficulty: string;
  timeLimitHours: number;
}

interface ActiveContract {
  id: string;
  contractId: string;
  name: string;
  description: string;
  category: string;
  requirements: Array<{ itemType: string; quantity: number; current: number }>;
  rewards: { currency: number; xp: number };
  acceptedAt: string;
  expiresAt: string;
  completed: boolean;
}

export class ContractsPanel {
  private scene: Phaser.Scene;
  private apiClient: ApiClient;
  private farmId: string;
  private container: Phaser.GameObjects.Container | null = null;
  private isOpen = false;
  private onRefresh: () => void;

  constructor(
    scene: Phaser.Scene,
    apiClient: ApiClient,
    farmId: string,
    onRefresh: () => void,
  ) {
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
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '📋 Contracts', {
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
      const [available, active] = await Promise.all([
        this.apiClient.get<Contract[]>(`/farms/${this.farmId}/contracts/available`),
        this.apiClient.get<ActiveContract[]>(`/farms/${this.farmId}/contracts/active`),
      ]);

      loading.destroy();
      this.renderContracts(available, active, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load contracts');
    }
  }

  private renderContracts(
    available: Contract[],
    active: ActiveContract[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;

    const scrollY = -panelHeight / 2 + 50;
    let y = scrollY;

    // Active contracts first
    if (active.length > 0) {
      const activeTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Active Contracts:', {
        font: '12px monospace',
        color: '#81C784',
      });
      this.container.add(activeTitle);
      y += 22;

      active.forEach((contract) => {
        const categoryEmoji: Record<string, string> = {
          local: '🏘️', community: '👥', commercial: '💼', seasonal: '🌿', special: '⭐',
        };
        const emoji = categoryEmoji[contract.category] || '📋';

        // Contract name
        const text = this.scene.add.text(
          -panelWidth / 2 + 30, y,
          `${emoji} ${contract.name}`,
          { font: '11px monospace', color: '#F5E6D3' },
        );
        this.container.add(text);

        // Requirements progress
        const reqText = contract.requirements
          .map((r) => `${r.itemType}: ${Math.min(r.current, r.quantity)}/${r.quantity}`)
          .join(' | ');
        const reqLabel = this.scene.add.text(
          -panelWidth / 2 + 30, y + 14,
          reqText,
          { font: '9px monospace', color: '#BCAAA4' },
        );
        this.container.add(reqLabel);

        // Time remaining
        const timeLeft = Math.max(0, new Date(contract.expiresAt).getTime() - Date.now());
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const timeColor = hoursLeft < 6 ? '#F44336' : hoursLeft < 24 ? '#FF9800' : '#4CAF50';

        const timeText = this.scene.add.text(
          panelWidth / 2 - 30, y + 7,
          `${hoursLeft}h left`,
          { font: '10px monospace', color: timeColor },
        );
        timeText.setOrigin(1, 0.5);
        this.container.add(timeText);

        // Complete button (if requirements met)
        const allMet = contract.requirements.every((r) => r.current >= r.quantity);
        if (allMet) {
          const completeBtn = this.scene.add.text(
            panelWidth / 2 - 30, y + 22,
            '✅ Complete', { font: '10px monospace', color: '#4CAF50' },
          );
          completeBtn.setOrigin(1, 0.5);
          completeBtn.setInteractive({ useHandCursor: true });
          completeBtn.on('pointerdown', () => this.handleComplete(contract.id));
          this.container.add(completeBtn);
        }

        y += 45;
      });
    }

    // Available contracts
    y += 10;
    const availTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Available Contracts:', {
      font: '12px monospace',
      color: '#FFB74D',
    });
    this.container.add(availTitle);
    y += 22;

    // Filter out already active
    const activeIds = new Set(active.map((a) => a.contractId));
    const availableContracts = available.filter((c) => !activeIds.has(c.id));

    if (availableContracts.length === 0) {
      const none = this.scene.add.text(0, y + 20, 'No new contracts available', {
        font: '12px monospace',
        color: '#BCAAA4',
      });
      none.setOrigin(0.5, 0.5);
      this.container.add(none);
      return;
    }

    availableContracts.forEach((contract) => {
      const categoryEmoji: Record<string, string> = {
        local: '🏘️', community: '👥', commercial: '💼', seasonal: '🌿', special: '⭐',
      };
      const emoji = categoryEmoji[contract.category] || '📋';

      // Name
      const text = this.scene.add.text(
        -panelWidth / 2 + 30, y,
        `${emoji} ${contract.name} (${contract.difficulty})`,
        { font: '11px monospace', color: '#F5E6D3' },
      );
      this.container.add(text);

      // Requirements
      const reqText = contract.requirements
        .map((r) => `${r.itemType} x${r.quantity}`)
        .join(', ');
      const reqLabel = this.scene.add.text(
        -panelWidth / 2 + 30, y + 14,
        `Needs: ${reqText}`,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      this.container.add(reqLabel);

      // Rewards
      const rewardText = this.scene.add.text(
        panelWidth / 2 - 30, y + 7,
        `💰${contract.rewards.currency} ⭐${contract.rewards.xp}XP`,
        { font: '10px monospace', color: '#FFB74D' },
      );
      rewardText.setOrigin(1, 0.5);
      this.container.add(rewardText);

      // Accept button
      const acceptBtn = this.scene.add.text(
        panelWidth / 2 - 30, y + 22,
        '📝 Accept', { font: '10px monospace', color: '#4CAF50' },
      );
      acceptBtn.setOrigin(1, 0.5);
      acceptBtn.setInteractive({ useHandCursor: true });
      acceptBtn.on('pointerdown', () => this.handleAccept(contract.id));
      this.container.add(acceptBtn);

      y += 42;
    });
  }

  private async handleAccept(contractId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/contracts/accept`, { contractId });
      this.close();
      this.onRefresh();
      this.showFeedback('📝 Contract accepted!', '#4CAF50');
    } catch (error) {
      console.error('Accept failed:', error);
      this.showFeedback('Failed to accept contract', '#F44336');
    }
  }

  private async handleComplete(activeContractId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/contracts/${activeContractId}/complete`, {});
      this.close();
      this.onRefresh();
      this.showFeedback('🎉 Contract completed! +XP +Pula', '#FFB74D');
    } catch (error) {
      console.error('Complete failed:', error);
      this.showFeedback('Failed to complete contract', '#F44336');
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
