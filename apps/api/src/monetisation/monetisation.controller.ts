import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StoreService } from './store.service';
import { MonetisationService } from './monetisation.service';

/**
 * P9 — monetisation endpoints (05 §P9).
 *
 *  GET  /store                  — the in-game Pula catalog (boosts + cosmetics)
 *  POST /store/purchase         — buy a Pula-priced good (debited from the wallet)
 *  POST /store/admin/flip-subscriptions — daily job (AdminGuard)
 *  POST /store/admin/grant-weekly       — weekly job (AdminGuard)
 *
 * The jobs are admin-only because they touch every subscriber; the player endpoints
 * are ordinary authenticated calls. Real-money purchases live under /payments.
 */
@Controller('store')
@UseGuards(AuthGuard)
export class MonetisationController {
  constructor(
    private readonly store: StoreService,
    private readonly monetisation: MonetisationService,
  ) {}

  @Get()
  async getCatalog(@CurrentUser('chapter') _chapter?: string) {
    const data = this.store.getCatalog(_chapter ?? null);
    return { success: true, data };
  }

  @Post('purchase')
  async purchase(
    @CurrentUser('id') userId: string,
    @Body() body: { sku: string },
  ) {
    const data = await this.store.purchase(userId, body.sku);
    return { success: true, data };
  }

  @Post('admin/flip-subscriptions')
  @UseGuards(AdminGuard)
  async flipSubscriptions() {
    const data = await this.monetisation.flipLapsedSubscriptions(new Date());
    return { success: true, data };
  }

  @Post('admin/grant-weekly')
  @UseGuards(AdminGuard)
  async grantWeekly() {
    const data = await this.monetisation.grantWeeklyPulaStones(new Date());
    return { success: true, data };
  }
}
