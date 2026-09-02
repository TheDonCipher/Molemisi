import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { RegisterInput, LoginInput } from '@molemisi/validation';
import { STARTING_CURRENCY, STARTING_PLOTS } from '@molemisi/game-config';

interface AuthResult {
  user: { id: string; email: string; displayName: string };
  token: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

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

    if (!authData.user || !authData.session) {
      throw new BadRequestException('Registration failed');
    }

    // Create profile
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      display_name: input.displayName,
      farm_name: `${input.displayName}'s Farm`,
      currency: STARTING_CURRENCY,
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

    // Create initial inventory with starter seeds
    const starterInventory = [
      { farm_id: farm.id, item_type: 'sorghum_seed', item_category: 'seed', quantity: 10, quality: 'normal' },
      { farm_id: farm.id, item_type: 'maize_seed', item_category: 'seed', quantity: 5, quality: 'normal' },
    ];

    const { error: inventoryError } = await adminClient.from('inventory').insert(starterInventory);

    if (inventoryError) {
      throw new BadRequestException('Failed to create starter inventory');
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? '',
        displayName: input.displayName,
      },
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    };
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

    // Get profile
    const adminClient = this.supabaseService.getAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', data.user.id)
      .single();

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
}
