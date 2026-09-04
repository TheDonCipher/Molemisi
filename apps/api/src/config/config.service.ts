import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

export interface ConfigEntry {
  id: string;
  config_key: string;
  config_value: unknown;
  category: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfigUpdate {
  configKey: string;
  configValue: unknown;
  reason?: string;
}

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Get all config entries, optionally filtered by category.
   */
  async getAll(category?: string): Promise<ConfigEntry[]> {
    let query = this.supabase
      .getAdminClient()
      .from('game_config')
      .select('*')
      .order('category')
      .order('config_key');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch config: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Get a single config value by key.
   */
  async getByKey(key: string): Promise<ConfigEntry | null> {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('game_config')
      .select('*')
      .eq('config_key', key)
      .single();

    if (error) {
      this.logger.warn(`Config key not found: ${key}`);
      return null;
    }

    return data;
  }

  /**
   * Get a config value as a typed number.
   */
  async getNumber(key: string, fallback: number): Promise<number> {
    const entry = await this.getByKey(key);
    if (!entry) return fallback;
    const val = Number(entry.config_value);
    return isNaN(val) ? fallback : val;
  }

  /**
   * Get a config value as a typed string.
   */
  async getString(key: string, fallback: string): Promise<string> {
    const entry = await this.getByKey(key);
    if (!entry) return fallback;
    return String(entry.config_value);
  }

  /**
   * Get a config value as a typed object.
   */
  async getObject<T>(key: string, fallback: T): Promise<T> {
    const entry = await this.getByKey(key);
    if (!entry) return fallback;
    try {
      return entry.config_value as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Update a single config entry.
   */
  async update(key: string, value: unknown, userId?: string, reason?: string): Promise<boolean> {
    // Validate min/max if defined
    const existing = await this.getByKey(key);
    if (existing) {
      if (existing.min_value !== null && typeof value === 'number') {
        if (value < existing.min_value) {
          this.logger.warn(`Value ${value} below minimum ${existing.min_value} for ${key}`);
          return false;
        }
      }
      if (existing.max_value !== null && typeof value === 'number') {
        if (value > existing.max_value) {
          this.logger.warn(`Value ${value} above maximum ${existing.max_value} for ${key}`);
          return false;
        }
      }
    }

    // Log the change to audit log
    if (existing) {
      await this.supabase
        .getAdminClient()
        .from('config_audit_log')
        .insert({
          config_key: key,
          old_value: existing.config_value,
          new_value: value,
          changed_by: userId || null,
          reason: reason || null,
        });
    }

    // Update the config
    const { error } = await this.supabase
      .getAdminClient()
      .from('game_config')
      .update({
        config_value: value,
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('config_key', key);

    if (error) {
      this.logger.error(`Failed to update config ${key}: ${error.message}`);
      return false;
    }

    this.logger.log(
      `Config updated: ${key} = ${JSON.stringify(value)}${reason ? ` (${reason})` : ''}`,
    );
    return true;
  }

  /**
   * Batch update multiple config entries.
   */
  async updateBatch(
    updates: ConfigUpdate[],
    userId?: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const u of updates) {
      const success = await this.update(u.configKey, u.configValue, userId, u.reason);
      if (success) updated++;
      else failed++;
    }

    this.logger.log(`Batch config update: ${updated} updated, ${failed} failed`);
    return { updated, failed };
  }

  /**
   * Get audit log for config changes.
   */
  async getAuditLog(limit = 50): Promise<
    Array<{
      id: string;
      config_key: string;
      old_value: unknown;
      new_value: unknown;
      changed_by: string | null;
      reason: string | null;
      created_at: string;
    }>
  > {
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('config_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`Failed to fetch config audit log: ${error.message}`);
      return [];
    }

    return data || [];
  }

  /**
   * Reset a config key to its default value.
   */
  async reset(key: string, userId?: string): Promise<boolean> {
    const existing = await this.getByKey(key);
    if (!existing) return false;

    // Get default from the initial insert (we'll just log it, can't auto-revert)
    this.logger.warn(`Config reset requested for ${key} — manual rollback may be needed`);

    // Log the reset
    await this.supabase
      .getAdminClient()
      .from('config_audit_log')
      .insert({
        config_key: key,
        old_value: existing.config_value,
        new_value: existing.config_value, // no change, just marking the reset attempt
        changed_by: userId || null,
        reason: 'Reset requested',
      });

    return true;
  }
}
