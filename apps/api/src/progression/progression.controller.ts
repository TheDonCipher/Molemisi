import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProgressionService } from './progression.service';

@Controller('progression')
@UseGuards(AuthGuard)
export class ProgressionController {
  constructor(private progressionService: ProgressionService) {}

  @Get()
  async getProgression(@CurrentUser('userId') userId: string) {
    return this.progressionService.getProgression(userId);
  }
}
