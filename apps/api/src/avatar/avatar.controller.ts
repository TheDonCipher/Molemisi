import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AvatarService } from './avatar.service';

/**
 * D10 / B4 — avatar endpoints.
 *
 *   GET  /avatar          the current avatar (or an uncreated default)
 *   POST /avatar          choose the base — ONCE
 *   PUT  /avatar/outfit   swap the outfit layer (owned outfits only)
 */
@Controller('avatar')
@UseGuards(AuthGuard)
export class AvatarController {
  constructor(private readonly avatar: AvatarService) {}

  @Get()
  async get(@CurrentUser('id') userId: string) {
    const data = await this.avatar.getAvatar(userId);
    return { success: true, data };
  }

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() body: { baseKey: string }) {
    const data = await this.avatar.createAvatar(userId, body?.baseKey);
    return { success: true, data };
  }

  @Put('outfit')
  async equipOutfit(
    @CurrentUser('id') userId: string,
    @Body() body: { outfitKey: string | null },
  ) {
    const data = await this.avatar.equipOutfit(userId, body?.outfitKey ?? null);
    return { success: true, data };
  }
}
