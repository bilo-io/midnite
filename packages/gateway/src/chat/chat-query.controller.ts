import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { ChatQueryRequestSchema, type ChatQueryResponse, type QueryIntent } from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ChatIntentService } from './chat-intent.service';
import { ChatQueryService } from './chat-query.service';

/**
 * Phase 59 C — the read-only query endpoint. Parses the question into an intent
 * (deterministic-first, via {@link ChatIntentService}) and answers it via
 * {@link ChatQueryService}. A dedicated controller (separate from Theme B's
 * `chat.controller`) so the two themes don't collide; it **never mutates** — a
 * non-query parse is treated as a free-form question, not executed.
 */
@Controller('chat')
export class ChatQueryController {
  constructor(
    @Inject(ChatIntentService) private readonly intent: ChatIntentService,
    @Inject(ChatQueryService) private readonly query: ChatQueryService,
  ) {}

  @Post('query')
  async ask(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<ChatQueryResponse> {
    const parsed = ChatQueryRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid query');
    }
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    const { intent } = await this.intent.parse(parsed.data.text);
    const queryIntent: QueryIntent =
      intent.type === 'query' ? intent : { type: 'query', text: parsed.data.text };
    const answer = await this.query.answer(queryIntent, scope);
    return { answer };
  }
}
