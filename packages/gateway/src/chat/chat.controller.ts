import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import {
  ChatCommandRequestSchema,
  type ChatCommandResponse,
  type ChatPreviewResponse,
} from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { ChatCommandService } from './chat-command.service';

/**
 * Phase 59 B — chat-to-board endpoints. Thin: validate the body, delegate to
 * {@link ChatCommandService}. `/preview` is read-only (parse + describe);
 * `/command` executes and requires `member` (it mutates the board through the
 * task services, which enforce their own RBAC + team scope on top).
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatCommandService) {}

  @Post('preview')
  @RequiresRole('viewer')
  async preview(@Body() body: unknown): Promise<ChatPreviewResponse> {
    const parsed = ChatCommandRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.preview(parsed.data.text);
  }

  @Post('command')
  @RequiresRole('member')
  async command(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<ChatCommandResponse> {
    const parsed = ChatCommandRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.execute(parsed.data.text, scope);
  }
}
