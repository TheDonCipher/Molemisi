import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EventsService } from './events.service';

/**
 * D6 / D8 / B3 — Events endpoints.
 *
 *   GET  /events             the Events open right now (+ the caller's claim state)
 *   POST /events/:id/claim   claim an Event (idempotent)
 */
@Controller('events')
@UseGuards(AuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    const data = await this.events.listActive(userId);
    return { success: true, data };
  }

  @Post(':id/claim')
  async claim(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const data = await this.events.claim(userId, id);
    return { success: true, data };
  }
}
