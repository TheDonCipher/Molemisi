import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { FarmsService } from '../farms/farms.service';

@Controller('farms/:farmId/contracts')
@UseGuards(AuthGuard)
export class ContractsController {
  constructor(
    private contractsService: ContractsService,
    private farmsService: FarmsService,
  ) {}

  @Get('available')
  async getAvailableContracts(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    const [contracts, cooldowns] = await Promise.all([
      this.contractsService.getAvailableContracts(farmId),
      this.contractsService.getCooldowns(farmId),
    ]);
    // R3 / docs-31 P0-2 — the same cooldown message the accept endpoint would
    // send, computed BEFORE the player commits. Same `{record, hoursLeft}` shape
    // as `acceptContract`'s thrown payload, so the client renders the resting
    // contracts identically whether they came from this list or from a refusal.
    return contracts.map((c) => ({
      ...c,
      coolingDown: Boolean(cooldowns[c.id]),
      availableInHours: cooldowns[c.id] ?? null,
    }));
  }

  @Get('active')
  async getActiveContracts(@Param('farmId') farmId: string, @CurrentUser('id') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.contractsService.getActiveContracts(farmId, userId);
  }

  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  async acceptContract(
    @Param('farmId') farmId: string,
    @CurrentUser('id') userId: string,
    @Body('contractId') contractId: string,
  ) {
    return this.contractsService.acceptContract(farmId, userId, contractId);
  }

  @Post(':activeContractId/complete')
  async completeContract(
    @Param('farmId') farmId: string,
    @Param('activeContractId') activeContractId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contractsService.completeContract(farmId, userId, activeContractId);
  }
}
