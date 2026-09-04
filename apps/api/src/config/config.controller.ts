import { Controller, Get, Put, Body, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ConfigService } from './config.service';

/**
 * Game Configuration Controller
 *
 * Allows admins to read and write game configuration values.
 * All changes are logged to config_audit_log.
 *
 * Route order matters: specific routes before parameterized routes.
 */
@Controller('config')
@UseGuards(AuthGuard)
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /api/v1/config/audit/log — Get config change audit log
   * (MUST be before /:key to avoid catching "audit" as a key)
   */
  @Get('audit/log')
  async getAuditLog(@Query('limit') limit?: string) {
    this.logger.log('Config: get audit log');
    return this.configService.getAuditLog(limit ? parseInt(limit) : 50);
  }

  /**
   * GET /api/v1/config — Get all config entries
   * GET /api/v1/config?category=farm — Get config by category
   */
  @Get()
  async getAll(@Query('category') category?: string) {
    this.logger.log(`Config: get all${category ? ` (category=${category})` : ''}`);
    return this.configService.getAll(category);
  }

  /**
   * GET /api/v1/config/:key — Get a single config entry
   */
  @Get(':key')
  async getByKey(@Param('key') key: string) {
    this.logger.log(`Config: get ${key}`);
    return this.configService.getByKey(key);
  }

  /**
   * PUT /api/v1/config/:key — Update a single config entry
   */
  @Put(':key')
  async update(@Param('key') key: string, @Body() body: { value: unknown; reason?: string }) {
    this.logger.log(`Config: update ${key} = ${JSON.stringify(body.value)}`);

    const success = await this.configService.update(
      key,
      body.value,
      undefined, // userId would come from JWT in production
      body.reason,
    );

    if (!success) {
      return { success: false, error: 'Update failed — check value bounds' };
    }

    return { success: true, key, value: body.value };
  }

  /**
   * PUT /api/v1/config — Batch update multiple config entries
   */
  @Put()
  async updateBatch(
    @Body() body: { updates: Array<{ key: string; value: unknown; reason?: string }> },
  ) {
    this.logger.log(`Config: batch update ${body.updates.length} entries`);

    const results = await this.configService.updateBatch(
      body.updates.map((u) => ({
        configKey: u.key,
        configValue: u.value,
        reason: u.reason,
      })),
    );

    return { success: true, ...results };
  }
}
