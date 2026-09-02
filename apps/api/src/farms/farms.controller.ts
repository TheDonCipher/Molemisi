import { Controller, Get, UseGuards } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/guards/auth.guard';

@Controller('farms')
@UseGuards(AuthGuard)
export class FarmsController {
  constructor(private farmsService: FarmsService) {}

  @Get('current')
  async getCurrentFarm(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.farmsService.getFarmForUser(user.id);
    return { success: true, data: result };
  }
}
