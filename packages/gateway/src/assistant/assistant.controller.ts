import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { AssistantQueryRequestSchema, type AssistantQueryResponse } from '@midnite/shared';

import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';

/**
 * Phase 66 E — the read-only fleet assistant endpoint. Thin: validates the
 * question, derives the team scope from the caller, and delegates to
 * {@link AssistantService}. It **never mutates** — there is only a query verb.
 */
@Controller('assistant')
export class AssistantController {
  constructor(@Inject(AssistantService) private readonly assistant: AssistantService) {}

  @Post('query')
  async ask(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): Promise<AssistantQueryResponse> {
    const parsed = AssistantQueryRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'invalid question');
    }
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.assistant.answer(parsed.data.question, scope);
  }
}
