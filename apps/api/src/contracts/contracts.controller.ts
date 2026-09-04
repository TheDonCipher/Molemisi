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
  async getAvailableContracts(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.contractsService.getAvailableContracts(farmId);
  }

  @Get('active')
  async getActiveContracts(@Param('farmId') farmId: string, @CurrentUser('userId') userId: string) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.contractsService.getActiveContracts(farmId);
  }

  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  async acceptContract(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
    @Body('contractId') contractId: string,
  ) {
    return this.contractsService.acceptContract(farmId, userId, contractId);
  }

  @Post(':activeContractId/complete')
  async completeContract(
    @Param('farmId') farmId: string,
    @Param('activeContractId') activeContractId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.contractsService.completeContract(farmId, userId, activeContractId);
  }
}
