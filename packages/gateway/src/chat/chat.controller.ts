import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ChatCommandRequestSchema,
  ChatUndoRequestSchema,
  type ChatCommandResponse,
  type ChatPreviewResponse,
  type ChatUndoResponse,
} from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { ChatCommandService } from './chat-command.service';
import { ChatUndoService } from './chat-undo.service';

/**
 * Phase 59 B + F — chat-to-board endpoints. Thin: validate the body, delegate to
 * the services. `/preview` is read-only (parse + describe + confirm level);
 * `/command` executes and requires `member` — a mutating command only writes with
 * `confirm: true` (Theme F seatbelt), and returns an `undoToken`; `/undo` reverts
 * it. The task services enforce their own RBAC + team scope on top.
 */
@Controller('chat')
export class ChatController {
  constructor(
    @Inject(ChatCommandService) private readonly service: ChatCommandService,
    @Inject(ChatUndoService) private readonly undoService: ChatUndoService,
  ) {}

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
    return this.service.execute(parsed.data.text, scope, parsed.data.confirm ?? false);
  }

  @Post('undo')
  @RequiresRole('member')
  async undo(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<ChatUndoResponse> {
    const parsed = ChatUndoRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return { result: this.undoService.undo(parsed.data.undoToken, scope) };
  }
}
