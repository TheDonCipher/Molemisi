import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';

@Controller('market')
@UseGuards(AuthGuard)
export class MarketController {
  constructor(private marketService: MarketService) {}

  @Get('prices')
  async getPrices() {
    return this.marketService.getPrices();
  }

  @Get('events')
  async getEvents() {
    return this.marketService.getActiveEvents();
  }

  @Post('sell')
  async sellItem(
    @Body() body: { farmId: string; itemType: string; quantity: number; quality?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.marketService.sellItem(
      body.farmId,
      user.id,
      body.itemType,
      body.quantity,
      body.quality,
    );
    return { success: true, data: result };
  }

  @Post('buy')
  async buyItem(
    @Body() body: { farmId: string; itemType: string; quantity: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.marketService.buyItem(
      body.farmId,
      user.id,
      body.itemType,
      body.quantity,
    );
    return { success: true, data: result };
  }
}
