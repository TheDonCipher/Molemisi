import Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface WorldEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  season: string | null;
  effects: Record<string, number>;
  duration: number;
}

interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  effects: Record<string, number>;
  startedAt: string;
  endsAt: string;
}

export class WorldEventsPanel {
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
    panel.setStrokeStyle(2, 0xFFB74D);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🌍 World Events', {
      font: '18px monospace',
      color: '#FFB74D',
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
      const [active, available] = await Promise.all([
        this.apiClient.get<ActiveEvent[]>(`/farms/${this.farmId}/events/active`),
        this.apiClient.get<WorldEvent[]>(`/farms/${this.farmId}/events/available`),
      ]);

      loading.destroy();
      this.renderEvents(active, available, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load events');
    }
  }

  private renderEvents(
    active: ActiveEvent[],
    available: WorldEvent[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;

    let y = -panelHeight / 2 + 50;

    // Active events
    if (active.length > 0) {
      const activeTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Active Events:', {
        font: '12px monospace',
        color: '#81C784',
      });
      this.container.add(activeTitle);
      y += 22;

      active.forEach((event) => {
        const typeEmoji: Record<string, string> = {
          festival: '🎉', seasonal: '🌿', market: '🛒', weather: '🌦️',
        };
        const emoji = typeEmoji[event.type] || '🌍';

        // Event name
        const text = this.scene.add.text(
          -panelWidth / 2 + 30, y,
          `${emoji} ${event.name}`,
          { font: '11px monospace', color: '#F5E6D3' },
        );
        this.container.add(text);

        // Description
        const desc = this.scene.add.text(
          -panelWidth / 2 + 30, y + 14,
          event.description,
          { font: '9px monospace', color: '#BCAAA4' },
        );
        this.container.add(desc);

        // Time remaining
        const timeLeft = Math.max(0, new Date(event.endsAt).getTime() - Date.now());
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const timeColor = hoursLeft < 2 ? '#F44336' : hoursLeft < 6 ? '#FF9800' : '#4CAF50';

        const timeText = this.scene.add.text(
          panelWidth / 2 - 30, y + 7,
          `${hoursLeft}h left`,
          { font: '10px monospace', color: timeColor },
        );
        timeText.setOrigin(1, 0.5);
        this.container.add(timeText);

        // Effects
        const effectsText = Object.entries(event.effects)
          .map(([key, value]) => {
            const mod = value > 1 ? `+${Math.round((value - 1) * 100)}%` : `-${Math.round((1 - value) * 100)}%`;
            return `${key.replace('Modifier', '')}: ${mod}`;
          })
          .join(' | ');

        const effectsLabel = this.scene.add.text(
          panelWidth / 2 - 30, y + 22,
          effectsText,
          { font: '9px monospace', color: '#FFB74D' },
        );
        effectsLabel.setOrigin(1, 0.5);
        this.container.add(effectsLabel);

        y += 50;
      });
    } else {
      const noActive = this.scene.add.text(0, y + 20, 'No active events', {
        font: '12px monospace',
        color: '#BCAAA4',
      });
      noActive.setOrigin(0.5, 0.5);
      this.container.add(noActive);
      y += 50;
    }

    // Available events to trigger
    y += 10;
    const availTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Available Events:', {
      font: '12px monospace',
      color: '#FFB74D',
    });
    this.container.add(availTitle);
    y += 22;

    if (available.length === 0) {
      const none = this.scene.add.text(0, y + 20, 'No events available for current season', {
        font: '12px monospace',
        color: '#BCAAA4',
      });
      none.setOrigin(0.5, 0.5);
      this.container.add(none);
      return;
    }

    available.forEach((event) => {
      const typeEmoji: Record<string, string> = {
        festival: '🎉', seasonal: '🌿', market: '🛒', weather: '🌦️',
      };
      const emoji = typeEmoji[event.type] || '🌍';

      // Name
      const text = this.scene.add.text(
        -panelWidth / 2 + 30, y,
        `${emoji} ${event.name} (${event.duration}h)`,
        { font: '11px monospace', color: '#F5E6D3' },
      );
      this.container.add(text);

      // Effects preview
      const effectsText = Object.entries(event.effects)
        .map(([key, value]) => {
          const mod = value > 1 ? `+${Math.round((value - 1) * 100)}%` : `-${Math.round((1 - value) * 100)}%`;
          return `${key.replace('Modifier', '')}: ${mod}`;
        })
        .join(', ');

      const effectsLabel = this.scene.add.text(
        -panelWidth / 2 + 30, y + 14,
        effectsText,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      this.container.add(effectsLabel);

      // Trigger button
      const triggerBtn = this.scene.add.text(
        panelWidth / 2 - 30, y + 7,
        '🎪 Trigger', { font: '10px monospace', color: '#4CAF50', backgroundColor: '#1b5e20', padding: { x: 6, y: 3 } },
      );
      triggerBtn.setOrigin(1, 0.5);
      triggerBtn.setInteractive({ useHandCursor: true });
      triggerBtn.on('pointerdown', () => this.handleTrigger(event.id));
      this.container.add(triggerBtn);

      y += 38;
    });
  }

  private async handleTrigger(eventId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/events/trigger/${eventId}`, {});
      this.close();
      this.onRefresh();
      this.showFeedback('🎉 Event triggered!', '#FFB74D');
    } catch (error) {
      console.error('Trigger failed:', error);
      this.showFeedback('Failed to trigger event', '#F44336');
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
