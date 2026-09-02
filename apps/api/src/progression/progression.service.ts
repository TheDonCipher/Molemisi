import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface ProgressionData {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpProgress: number;
  unlockedCrops: string[];
  unlockedAnimals: string[];
  unlockedBuildings: string[];
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

@Injectable()
export class ProgressionService {
  constructor(private supabaseService: SupabaseService) {}

  // Pre-defined achievements
  private readonly ACHIEVEMENTS: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    check: (stats: PlayerStats) => boolean;
  }> = [
    {
      id: 'first_harvest',
      name: 'First Harvest',
      description: 'Harvest your first crop',
      icon: '🌾',
      check: (s) => s.cropsHarvested >= 1,
    },
    {
      id: 'ten_harvests',
      name: 'Green Thumb',
      description: 'Harvest 10 crops',
      icon: '🌿',
      check: (s) => s.cropsHarvested >= 10,
    },
    {
      id: 'first_sale',
      name: 'Market Trader',
      description: 'Sell your first item',
      icon: '💰',
      check: (s) => s.itemsSold >= 1,
    },
    {
      id: 'hundred_sales',
      name: 'Merchant',
      description: 'Sell 100 items total',
      icon: '🏪',
      check: (s) => s.itemsSold >= 100,
    },
    {
      id: 'first_building',
      name: 'Builder',
      description: 'Construct your first building',
      icon: '🏗️',
      check: (s) => s.buildingsBuilt >= 1,
    },
    {
      id: 'first_animal',
      name: 'Farmer',
      description: 'Purchase your first animal',
      icon: '🐄',
      check: (s) => s.animalsPurchased >= 1,
    },
    {
      id: 'rich',
      name: 'Wealthy',
      description: 'Accumulate 10,000 Pula',
      icon: '💎',
      check: (s) => s.maxCurrency >= 10000,
    },
    {
      id: 'level_5',
      name: 'Experienced',
      description: 'Reach farm level 5',
      icon: '⭐',
      check: (s) => s.level >= 5,
    },
    {
      id: 'level_10',
      name: 'Master Farmer',
      description: 'Reach farm level 10',
      icon: '🌟',
      check: (s) => s.level >= 10,
    },
    {
      id: 'contract_1',
      name: 'Contractor',
      description: 'Complete your first contract',
      icon: '📋',
      check: (s) => s.contractsCompleted >= 1,
    },
  ];

  async getProgression(userId: string): Promise<ProgressionData> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const level = (profile.level as number) || 1;
    const xp = (profile.xp as number) || 0;
    const xpToNextLevel = Math.ceil(100 * Math.pow(level + 1, 1.5));
    const xpProgress = xp / xpToNextLevel;

    // Get unlocked content based on level
    const { CROPS } = await import('@molemisi/game-config');
    const { ANIMALS } = await import('@molemisi/game-config');
    const { BUILDINGS } = await import('@molemisi/game-config');

    const unlockedCrops = Object.values(CROPS)
      .filter((c) => c.unlockLevel <= level)
      .map((c) => c.id);

    const unlockedAnimals = Object.values(ANIMALS)
      .filter((a) => a.unlockLevel <= level)
      .map((a) => a.id);

    const unlockedBuildings = Object.values(BUILDINGS)
      .filter((b) => b.unlockLevel <= level)
      .map((b) => b.id);

    // Get player stats for achievements
    const stats = await this.getPlayerStats(userId, level, (profile.currency as number) || 0);

    // Check achievements
    const achievements = this.ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocked: a.check(stats),
      unlockedAt: a.check(stats) ? new Date().toISOString() : null,
    }));

    return {
      level,
      xp,
      xpToNextLevel,
      xpProgress,
      unlockedCrops,
      unlockedAnimals,
      unlockedBuildings,
      achievements,
    };
  }

  private async getPlayerStats(
    userId: string,
    level: number,
    maxCurrency: number,
  ): Promise<PlayerStats> {
    const adminClient = this.supabaseService.getAdminClient();

    // Get ledger stats
    const { data: ledgerEntries } = await adminClient
      .from('game_ledger_entries')
      .select('entry_type')
      .eq('user_id', userId);

    const entries = ledgerEntries ?? [];
    const cropsHarvested = entries.filter((e) => e.entry_type === 'CROP_SALE').length;
    const itemsSold = entries.filter((e) => e.entry_type === 'CROP_SALE').length;
    const buildingsBuilt = entries.filter((e) => e.entry_type === 'BUILD').length;

    // Get animal count
    const { count: animalsPurchased } = await adminClient
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get completed contracts
    const { count: contractsCompleted } = await adminClient
      .from('active_contracts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true);

    return {
      cropsHarvested,
      itemsSold,
      buildingsBuilt,
      animalsPurchased: animalsPurchased || 0,
      contractsCompleted: contractsCompleted || 0,
      level,
      maxCurrency,
    };
  }
}

interface PlayerStats {
  cropsHarvested: number;
  itemsSold: number;
  buildingsBuilt: number;
  animalsPurchased: number;
  contractsCompleted: number;
  level: number;
  maxCurrency: number;
}
