import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { InventoryService } from '../inventory/inventory.service';
import { RegisterInput, LoginInput } from '@molemisi/validation';
import { STARTING_PULA, STARTING_PLOTS } from '@molemisi/game-config';

export interface AuthResult {
  user: { id: string; email: string; displayName: string };
  token: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private inventory: InventoryService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const client = this.supabaseService.getClient();
    const adminClient = this.supabaseService.getAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new ConflictException('Email already registered');
      }
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Registration failed');
    }

    // If no session (email confirmation required), sign in immediately
    let session = authData.session;
    if (!session) {
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (signInError || !signInData.session) {
        throw new BadRequestException(
          'Registration succeeded but auto-login failed. Please confirm your email.',
        );
      }
      session = signInData.session;
    }

    // Create profile. `currency: STARTING_PULA` seeds the wallet mirror via the
    // on_profile_created trigger (P2) — keep it so the wallet starts funded.
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      display_name: input.displayName,
      farm_name: `${input.displayName}'s Farm`,
      currency: STARTING_PULA,
    });

    if (profileError) {
      throw new BadRequestException('Failed to create profile');
    }

    // Create farm with initial plots
    const { data: farm, error: farmError } = await adminClient
      .from('farms')
      .insert({
        user_id: authData.user.id,
        name: `${input.displayName}'s Farm`,
        plot_count: STARTING_PLOTS,
      })
      .select()
      .single();

    if (farmError || !farm) {
      throw new BadRequestException('Failed to create farm');
    }

    // Create initial plots
    const plots = Array.from({ length: STARTING_PLOTS }, (_, i) => ({
      farm_id: farm.id,
      slot_index: i,
      state: 'EMPTY' as const,
    }));

    const { error: plotsError } = await adminClient.from('farm_plots').insert(plots);
    if (plotsError) {
      throw new BadRequestException('Failed to create farm plots');
    }

    // Starter Jojo Tank (water_source), full and ACTIVE. The tank is the water mechanic
    // (03 §1.2); every farm has one from day one so growth isn't softlocked behind the
    // 800-Pula build cost. Maintenance (setena) is the ongoing cost (03 §3.5).
    const { error: tankError } = await adminClient.from('buildings').insert({
      farm_id: farm.id,
      building_type: 'water_source',
      level: 1,
      state: 'ACTIVE',
      capacity: 60,
      wear: 0,
      water_level: 60,
      last_maintained_at: new Date().toISOString(),
    });
    if (tankError) {
      throw new BadRequestException('Failed to create water tank');
    }

    // Starter kit into the canonical inventory store (player_inventory). Tools are
    // equipment (F15) — owned once, never occupy a storage slot. Seeds get the player
    // growing on day one.
    const playerId = authData.user.id;
    await this.inventory.addItem(playerId, farm.id, 'sorghum_seed', 10);
    await this.inventory.addItem(playerId, farm.id, 'maize_seed', 5);
    for (const tool of ['mogoma', 'selepe', 'watering_can', 'pickaxe']) {
      await this.inventory.addItem(playerId, farm.id, tool, 1);
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? '',
        displayName: input.displayName,
      },
      token: session!.access_token,
      refreshToken: session!.refresh_token,
    };
  }

  async logout(): Promise<void> {
    // JWTs are stateless - the client discards the token.
    // In production, consider token blocklist for immediate invalidation.
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new BadRequestException('Invalid email or password');
    }

    if (!data.user || !data.session) {
      throw new BadRequestException('Login failed');
    }

    // Get profile and check ban status
    const adminClient = this.supabaseService.getAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, is_banned, ban_reason')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_banned) {
      throw new ForbiddenException(
        profile.ban_reason
          ? `Account banned: ${profile.ban_reason}`
          : 'Account banned by administrator',
      );
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        displayName: profile?.display_name ?? 'Farmer',
      },
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  /**
   * Resolve the account tier for a user. Used by GET /auth/me so the client can
   * gate the /dev area and admin affordances. `is_admin` is honoured alongside
   * the canonical `role` column for back-compat.
   */
  async getRole(userId: string): Promise<{ role: string; isAdmin: boolean }> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .single();

    return {
      role: data?.role ?? 'player',
      isAdmin: data?.is_admin === true || data?.role === 'admin',
    };
  }
}
