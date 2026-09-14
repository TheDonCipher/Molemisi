import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../common/guards/auth.guard';

describe('WalletController', () => {
  let controller: WalletController;
  let getWallet: jest.Mock;

  beforeEach(async () => {
    getWallet = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: { getWallet } }],
    })
      // AuthGuard is real elsewhere; here we only care that the controller
      // passes the authenticated player's id through, not about Supabase.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('reads the wallet for the authenticated player only', async () => {
    getWallet.mockResolvedValue({
      pula_balance: 250,
      botho_points: 40,
      subscription_status: 'free',
      subscription_expires_at: null,
    });

    const result = await controller.get({ id: 'player-1' } as never);

    expect(getWallet).toHaveBeenCalledWith('player-1');
    expect(result).toEqual({
      success: true,
      data: {
        pula: 250,
        botho: 40,
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
      },
    });
  });

  it('never exposes the raw snake_case row — the client maps on camelCase', async () => {
    getWallet.mockResolvedValue({
      pula_balance: 10,
      botho_points: 0,
      subscription_status: 'guild',
      subscription_expires_at: '2026-12-01T00:00:00Z',
    });

    const result = await controller.get({ id: 'player-1' } as never);

    expect(result.data).not.toHaveProperty('pula_balance');
    expect(result.data).not.toHaveProperty('botho_points');
    expect(result.data.subscriptionStatus).toBe('guild');
    expect(result.data.subscriptionExpiresAt).toBe('2026-12-01T00:00:00Z');
  });

  it('exposes no way to move money — the read endpoint takes no amount', async () => {
    getWallet.mockResolvedValue({
      pula_balance: 0,
      botho_points: 0,
      subscription_status: 'free',
      subscription_expires_at: null,
    });

    // A controller that could be handed a number by a client is a minting bug
    // waiting to happen; every movement goes through the owning service.
    expect(controller.get).toHaveLength(1); // (user) only
    expect(Object.getOwnPropertyNames(WalletController.prototype)).not.toContain('credit');
    expect(Object.getOwnPropertyNames(WalletController.prototype)).not.toContain('debit');
  });
});
