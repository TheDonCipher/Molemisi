import { Controller, Get, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';

/**
 * The player's own balances — read only.
 *
 * `player_wallets` is the source of truth for Pula and Botho since P2
 * (`WalletService` is its sole writer). Nothing here accepts an amount: every
 * movement goes through the service that owns the transaction, never through a
 * controller that could be handed a number by a client.
 *
 * Note what is *not* here: Madi. Hard currency lives in the payments module and
 * is deliberately not folded into this snapshot — a screen that shows Pula must
 * not be able to imply the house will quote a Pula↔Madi rate (02 §6).
 */
@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private wallet: WalletService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    const snapshot = await this.wallet.getWallet(user.id);
    return {
      success: true,
      data: {
        pula: snapshot.pula_balance,
        botho: snapshot.botho_points,
        subscriptionStatus: snapshot.subscription_status,
        subscriptionExpiresAt: snapshot.subscription_expires_at,
      },
    };
  }

  /**
   * The player's own transaction history — every currency movement written to
   * `ledger_entries`, newest first. Read-only; surfaces WalletService.recentEntries,
   * which already existed but was not exposed to the client until now.
   */
  @Get('ledger')
  async getLedger(@CurrentUser() user: AuthenticatedUser) {
    const rows = await this.wallet.recentEntries(user.id);
    return { success: true, data: rows };
  }
}
