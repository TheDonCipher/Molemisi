import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
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

  /**
   * 07 §7.5 — a read-only sale quote, so the confirm sheet can show price today,
   * gross, the Co-op's 5% and the net *before* the player commits. Writes nothing.
   * The numbers come from the same computation the sale uses, so the sheet and the
   * credit agree to the cent.
   */
  @Get('quote')
  async quoteSale(
    @Query('itemType') itemType: string,
    @Query('quantity') quantity: string,
  ) {
    const result = await this.marketService.quoteSale(itemType, Number(quantity));
    return { success: true, data: result };
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
