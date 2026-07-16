import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { SessionPromptRequestSchema, type SessionPromptResponse } from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TasksService } from '../tasks/tasks.service';
import { TerminalService } from './terminal.service';

/**
 * Phase 69 C — reply transport. `POST /sessions/:sessionId/prompt` writes a line
 * of text to a live agent session's PTY stdin (Decision §2: the terminal module
 * owns the write; `sessions/` stays a reader). The status flip back to `wip` is
 * *earned* by the `UserPromptSubmit` hook round-trip (Theme B), not by this call —
 * the endpoint is a dumb pipe (Decision: no status gate).
 *
 * For an autonomous agent session, `sessionId === taskId`, so RBAC reuses the
 * scoped task lookup (`getTask` throws 404 for an unknown / out-of-scope id,
 * mirroring `SessionsService.getDetail`'s team scoping) — TerminalModule can't
 * import SessionsModule (that edge is a cycle), so the check goes through tasks.
 */
@Controller('sessions')
export class SessionPromptController {
  constructor(
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  @Post(':sessionId/prompt')
  @HttpCode(200)
  sendPrompt(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): SessionPromptResponse {
    const parsed = SessionPromptRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid reply payload');
    }

    // RBAC + existence: 404 if the caller can't see this task (or it's unknown).
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    this.tasks.getTask(sessionId, scope);

    // Liveness: reply only reaches a live agent PTY. An ad-hoc shell or a dead /
    // ended session has no stdin to answer — 409 so the CLI/UI can steer the user
    // to `resolve` instead of a reply that goes nowhere.
    if (!this.terminal.has(sessionId) || this.terminal.hasAdHoc(sessionId)) {
      throw new ConflictException(
        `session ${sessionId} has no live agent session — resolve the task instead of replying`,
      );
    }

    this.terminal.sendPrompt(sessionId, parsed.data.text);
    return { ok: true };
  }
}
