import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorldEventsService } from './world-events.service';
import { FarmsService } from '../farms/farms.service';

@Controller('api/v1/farms/:farmId/events')
@UseGuards(AuthGuard)
export class WorldEventsController {
  constructor(
    private worldEventsService: WorldEventsService,
    private farmsService: FarmsService,
  ) {}

  @Get('active')
  async getActiveEvents(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.worldEventsService.getActiveEvents();
  }

  @Get('available')
  async getAvailableEvents(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.worldEventsService.getAvailableEvents(farmId);
  }

  @Post('trigger/:eventId')
  @HttpCode(HttpStatus.CREATED)
  async triggerEvent(
    @Param('farmId') farmId: string,
    @Param('eventId') eventId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.worldEventsService.triggerEvent(farmId, eventId);
  }

  @Get('effects')
  async getEventEffects(
    @Param('farmId') farmId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.farmsService.verifyFarmOwnership(farmId, userId);
    return this.worldEventsService.getEventEffects(farmId);
  }
}
