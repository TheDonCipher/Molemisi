import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import type { ChatLanguage } from '@molemisi/game-config';

/**
 * D5 / B1 — global Kgotla chat endpoints.
 *
 *   GET  /chat             recent messages (one shared channel for everyone)
 *   POST /chat/messages    post a message (payload guard + anti-flood only)
 *
 * RULING (2026-10-04, third pass): **no chat moderation** — there are no mute,
 * block or report routes, and no content filter sits in front of a post.
 */
@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    const data = await this.chat.list(userId);
    return { success: true, data };
  }

  @Post('messages')
  async post(
    @CurrentUser('id') userId: string,
    @Body() body: { body: string; language?: ChatLanguage },
  ) {
    const data = await this.chat.post(userId, body?.body, body?.language ?? 'en');
    return { success: true, data };
  }
}

