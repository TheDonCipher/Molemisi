import Phaser from 'phaser';
import { ApiClient } from '../services/ApiClient';

interface NPCData {
  id: string;
  name: string;
  role: string;
  personality: string;
  greeting: string;
  questType: string;
  reputation: number;
  tier: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  requiredContributions: number;
  currentContributions: number;
  reward: string;
  completed: boolean;
}

export class KgotlaPanel {
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
    const title = this.scene.add.text(0, -panelHeight / 2 + 20, '🏛️ Kgotla', {
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
      const [npcs, projects] = await Promise.all([
        this.apiClient.get<NPCData[]>(`/farms/${this.farmId}/kgotla/npcs`),
        this.apiClient.get<ProjectData[]>(`/farms/${this.farmId}/kgotla/projects`),
      ]);

      loading.destroy();
      this.renderKgotla(npcs, projects, panelWidth, panelHeight);
    } catch {
      loading.setText('Failed to load Kgotla');
    }
  }

  private renderKgotla(
    npcs: NPCData[],
    projects: ProjectData[],
    panelWidth: number,
    panelHeight: number,
  ): void {
    if (!this.container) return;

    let y = -panelHeight / 2 + 50;

    // NPCs section
    const npcTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Community Members:', {
      font: '12px monospace',
      color: '#81C784',
    });
    this.container.add(npcTitle);
    y += 22;

    npcs.forEach((npc) => {
      // NPC name and role
      const tierEmoji: Record<string, string> = {
        Stranger: '😐', Acquaintance: '🙂', Friend: '😊', Trusted: '🤝', Respected: '👑',
      };
      const emoji = tierEmoji[npc.tier] || '🙂';

      const text = this.scene.add.text(
        -panelWidth / 2 + 30, y,
        `${emoji} ${npc.name} - ${npc.role}`,
        { font: '11px monospace', color: '#F5E6D3' },
      );
      this.container.add(text);

      // Reputation bar
      const repBarWidth = 60;
      const repBg = this.scene.add.rectangle(
        -panelWidth / 2 + 30, y + 16,
        repBarWidth, 4, 0x333333,
      );
      repBg.setOrigin(0, 0.5);
      this.container.add(repBg);

      const repFill = this.scene.add.rectangle(
        -panelWidth / 2 + 30, y + 16,
        repBarWidth * (npc.reputation / 100), 4,
        npc.reputation >= 75 ? 0xFFD700 : npc.reputation >= 50 ? 0x4CAF50 : 0xFF9800,
      );
      repFill.setOrigin(0, 0.5);
      this.container.add(repFill);

      const repLabel = this.scene.add.text(
        -panelWidth / 2 + 30 + repBarWidth + 4, y + 16,
        `${npc.tier} (${npc.reputation})`,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      repLabel.setOrigin(0, 0.5);
      this.container.add(repLabel);

      // Talk button
      const talkBtn = this.scene.add.text(
        panelWidth / 2 - 30, y + 8,
        '💬 Talk', { font: '10px monospace', color: '#4CAF50' },
      );
      talkBtn.setOrigin(1, 0.5);
      talkBtn.setInteractive({ useHandCursor: true });
      talkBtn.on('pointerdown', () => this.handleTalk(npc.id));
      this.container.add(talkBtn);

      y += 38;
    });

    // Projects section
    y += 10;
    const projTitle = this.scene.add.text(-panelWidth / 2 + 20, y, 'Community Projects:', {
      font: '12px monospace',
      color: '#FFB74D',
    });
    this.container.add(projTitle);
    y += 22;

    projects.forEach((project) => {
      const statusEmoji = project.completed ? '✅' : '🏗️';

      const text = this.scene.add.text(
        -panelWidth / 2 + 30, y,
        `${statusEmoji} ${project.name}`,
        { font: '11px monospace', color: '#F5E6D3' },
      );
      this.container.add(text);

      // Progress bar
      const progress = Math.min(1, project.currentContributions / project.requiredContributions);
      const barWidth = 100;

      const barBg = this.scene.add.rectangle(
        -panelWidth / 2 + 30, y + 16,
        barWidth, 4, 0x333333,
      );
      barBg.setOrigin(0, 0.5);
      this.container.add(barBg);

      const barFill = this.scene.add.rectangle(
        -panelWidth / 2 + 30, y + 16,
        barWidth * progress, 4,
        project.completed ? 0x4CAF50 : 0xFFB74D,
      );
      barFill.setOrigin(0, 0.5);
      this.container.add(barFill);

      const progressLabel = this.scene.add.text(
        -panelWidth / 2 + 30 + barWidth + 4, y + 16,
        `${project.currentContributions}/${project.requiredContributions}`,
        { font: '9px monospace', color: '#BCAAA4' },
      );
      progressLabel.setOrigin(0, 0.5);
      this.container.add(progressLabel);

      // Donate button (if not completed)
      if (!project.completed) {
        const donateBtn = this.scene.add.text(
          panelWidth / 2 - 30, y + 8,
          '💰 Donate', { font: '10px monospace', color: '#FFB74D' },
        );
        donateBtn.setOrigin(1, 0.5);
        donateBtn.setInteractive({ useHandCursor: true });
        donateBtn.on('pointerdown', () => this.handleDonate(project.id));
        this.container.add(donateBtn);
      }

      y += 38;
    });
  }

  private async handleTalk(npcId: string): Promise<void> {
    try {
      const result = await this.apiClient.post<{
        npc: { name: string };
        message: string;
        questAvailable: boolean;
      }>(`/farms/${this.farmId}/kgotla/npcs/${npcId}/talk`, {});

      // Show dialog
      this.showDialog(result.npc.name, result.message, result.questAvailable, npcId);
    } catch (error) {
      console.error('Talk failed:', error);
    }
  }

  private showDialog(npcName: string, message: string, questAvailable: boolean, npcId: string): void {
    if (!this.container) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Dialog overlay
    const dialogOverlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.3);
    this.container.add(dialogOverlay);

    // Dialog box
    const dialogWidth = Math.min(350, width - 60);
    const dialogHeight = 180;
    const dialog = this.scene.add.rectangle(0, 50, dialogWidth, dialogHeight, 0x1a0f0a, 0.98);
    dialog.setStrokeStyle(2, 0x8b5e3c);
    this.container.add(dialog);

    // NPC name
    const nameLabel = this.scene.add.text(0, 50 - dialogHeight / 2 + 20, npcName, {
      font: '14px monospace',
      color: '#FF8F00',
    });
    nameLabel.setOrigin(0.5, 0.5);
    this.container.add(nameLabel);

    // Message
    const msgLabel = this.scene.add.text(0, 50, message, {
      font: '11px monospace',
      color: '#F5E6D3',
      wordWrap: { width: dialogWidth - 40 },
      align: 'center',
      lineSpacing: 4,
    });
    msgLabel.setOrigin(0.5, 0.5);
    this.container.add(msgLabel);

    // Quest button
    if (questAvailable) {
      const questBtn = this.scene.add.text(0, 50 + dialogHeight / 2 - 30, '📝 Complete Quest', {
        font: '12px monospace',
        color: '#4CAF50',
        backgroundColor: '#1b5e20',
        padding: { x: 12, y: 6 },
      });
      questBtn.setOrigin(0.5, 0.5);
      questBtn.setInteractive({ useHandCursor: true });
      questBtn.on('pointerdown', () => this.handleQuest(npcId));
      this.container.add(questBtn);
    }

    // Close dialog button
    const closeDialog = this.scene.add.text(dialogWidth / 2 - 10, 50 - dialogHeight / 2 + 10, '✕', {
      font: '12px monospace',
      color: '#BCAAA4',
    });
    closeDialog.setOrigin(0.5, 0.5);
    closeDialog.setInteractive({ useHandCursor: true });
    closeDialog.on('pointerdown', () => {
      dialogOverlay.destroy();
      dialog.destroy();
      nameLabel.destroy();
      msgLabel.destroy();
      closeDialog.destroy();
      if (questAvailable) {
        // Find and destroy quest button
        const children = this.container!.getAll();
        children.forEach((child) => {
          if (child.type === 'Text' && (child as Phaser.GameObjects.Text).text?.includes('Complete Quest')) {
            child.destroy();
          }
        });
      }
    });
    this.container.add(closeDialog);
  }

  private async handleQuest(npcId: string): Promise<void> {
    try {
      await this.apiClient.post(`/farms/${this.farmId}/kgotla/npcs/${npcId}/quest`, {
        questType: 'general',
      });

      this.close();
      this.onRefresh();
      this.showFeedback('📝 Quest completed! +Reputation +XP +Pula', '#4CAF50');
    } catch (error) {
      console.error('Quest failed:', error);
      this.showFeedback('Quest failed', '#F44336');
    }
  }

  private async handleDonate(projectId: string): Promise<void> {
    // For simplicity, donate 50 Pula
    try {
      await this.apiClient.post(`/farms/${this.farmId}/kgotla/projects/${projectId}/donate`, {
        amount: 50,
      });

      this.close();
      this.onRefresh();
      this.showFeedback('💰 Donated 50 Pula to project!', '#FFB74D');
    } catch (error) {
      console.error('Donate failed:', error);
      this.showFeedback('Donation failed', '#F44336');
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
