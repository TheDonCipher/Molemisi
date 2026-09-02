import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface ProfileData {
  id: string;
  displayName: string;
  farmName: string;
  farmLevel: number;
  farmXp: number;
  currency: number;
  energy: number;
  maxEnergy: number;
}

@Injectable()
export class ProfileService {
  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string): Promise<ProfileData> {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      id: profile.id as string,
      displayName: profile.display_name as string,
      farmName: profile.farm_name as string,
      farmLevel: profile.farm_level as number,
      farmXp: profile.farm_xp as number,
      currency: profile.currency as number,
      energy: profile.energy as number,
      maxEnergy: profile.max_energy as number,
    };
  }
}
