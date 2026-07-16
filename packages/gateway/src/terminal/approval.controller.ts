import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PreToolUseHookRequestSchema, type PreToolUseHookDecision } from '@midnite/shared';
import { TasksService } from '../tasks/tasks.service';
import { ApprovalService } from './approval.service';
import { summarizeToolCall } from './lib/summarize-tool-call';

/**
 * Callback target for the in-PTY Claude Code PreToolUse hook. Authenticated by the
 * per-session secret carried in a header (not the URL, so it never lands in access
 * logs) — never trust the body alone. The handler blocks until a viewer answers
 * over the terminal WS or the approval times out, then returns Claude's decision.
 */
@Controller('hooks/sessions')
export class ApprovalController {
  constructor(
    @Inject(ApprovalService) private readonly approvals: ApprovalService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  @Post(':sessionId/pre-tool-use')
  @HttpCode(200)
  async preToolUse(
    @Param('sessionId') sessionId: string,
    @Headers('x-midnite-hook-secret') secret: string | undefined,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ): Promise<PreToolUseHookDecision> {
    if (!secret || !this.approvals.verifySecret(sessionId, secret)) {
      throw new NotFoundException('invalid hook secret');
    }
    const parsed = PreToolUseHookRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid PreToolUse payload');
    }

    const toolName = parsed.data.tool_name;
    const label = summarizeToolCall(toolName, parsed.data.tool_input);

    // Phase 69 B — approval-resume fallback. A permission-wait resumes mid-turn
    // with *no* new prompt, so UserPromptSubmit never fires; the tool-use signal
    // is the only resume trigger. Idempotent (no-op unless a live `needs-input`
    // wait), so double-wiring with the UserPromptSubmit path is safe.
    this.tasks.resumeFromWaiting(sessionId);

    if (this.approvals.willAutoApprove(sessionId, toolName)) {
      // Fast path — no human needed, just signal the current activity.
      this.tasks.emitActivity(sessionId, 'running', toolName, label);
    } else {
      // Will block on a human — emit activity first (so the office sees what's
      // pending), then attention so it shows the "needs you" state.
      this.tasks.emitActivity(sessionId, 'running', toolName, label);
      this.tasks.emitAttention(sessionId, 'approval', label);
    }

    // Release the held promise if the hook process / client goes away.
    const ac = new AbortController();
    req.raw.on('close', () => ac.abort());
    return this.approvals.requestDecision(sessionId, parsed.data, ac.signal);
  }
}
