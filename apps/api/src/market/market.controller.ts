import { Controller, Get, Post, Query, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';
import { SellItemRequestSchema, BuyItemRequestSchema } from '@molemisi/validation';

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
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // M5 — the Zod DTOs existed in @molemisi/validation but were never wired
    // in, so any JSON body reached the service unvalidated (fractional,
    // negative, or absurd quantities). safeParse keeps validation failures as
    // clean 400s, never 500s.
    const parsed = SellItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid sale request');
    }
    const result = await this.marketService.sellItem(
      parsed.data.farmId,
      user.id,
      parsed.data.itemType,
      parsed.data.quantity,
      parsed.data.quality,
    );
    return { success: true, data: result };
  }

  @Post('buy')
  async buyItem(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const parsed = BuyItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid buy request');
    }
    const result = await this.marketService.buyItem(
      parsed.data.farmId,
      user.id,
      parsed.data.itemType,
      parsed.data.quantity,
    );
    return { success: true, data: result };
  }
}
