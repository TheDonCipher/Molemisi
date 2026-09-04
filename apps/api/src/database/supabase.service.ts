import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseAnonKey) {
      this.client = createClient(supabaseUrl, supabaseAnonKey);
    }

    if (supabaseUrl && supabaseServiceKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      throw new Error('Supabase admin client not initialized');
    }
    return this.adminClient;
  }

  /**
   * Verify a JWT token and return the user
   */
  async verifyToken(token: string): Promise<{ id: string; email: string } | null> {
    const client = this.getClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? '',
    };
  }

  /**
   * Query using the admin client (bypasses RLS)
   */
  async adminQuery(table: string) {
    return this.getAdminClient().from(table);
  }

  /**
   * Query using the user client (respects RLS)
   */
  async userQuery(table: string, _token: string) {
    const client = this.getClient();
    return client.from(table).select('*');
  }
}
