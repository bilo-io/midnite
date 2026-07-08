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
} from '@nestjs/common';
import {
  NotificationHookRequestSchema,
  StopHookRequestSchema,
  type HookAck,
} from '@midnite/shared';
import { ApprovalService } from '../terminal/approval.service';
import { extractPrUrl } from '../terminal/lib/extract-pr-url';
import { TerminalService } from '../terminal/terminal.service';
import { TasksService } from '../tasks/tasks.service';
import { SessionUsageService } from '../sessions/session-usage.service';
import { AgentRunnerService } from './agent-runner.service';

/**
 * Callback target for the in-PTY Claude Code Stop and Notification hooks on
 * autonomous agent sessions. Authenticated by the same per-session secret as the
 * PreToolUse hook (header, not URL). Drives task status transitions; lives in the
 * pool module (not terminal) because it frees pool slots — keeping the
 * terminal→pool dependency one-way.
 */
@Controller('hooks/sessions')
export class LifecycleHookController {
  constructor(
    @Inject(ApprovalService) private readonly approvals: ApprovalService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(TerminalService) private readonly terminal: TerminalService,
    @Inject(AgentRunnerService) private readonly runner: AgentRunnerService,
    @Inject(SessionUsageService) private readonly usage: SessionUsageService,
  ) {}

  @Post(':sessionId/stop')
  @HttpCode(200)
  stop(
    @Param('sessionId') sessionId: string,
    @Headers('x-midnite-hook-secret') secret: string | undefined,
    @Body() body: unknown,
  ): HookAck {
    this.verify(sessionId, secret);
    const parsed = StopHookRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid Stop payload');
    }
    // Phase 61 A — harvest real token usage from the transcript the hook points at.
    // Fire-and-forget + fail-open: never let a bad transcript read block the hook.
    void this.usage
      .harvestFromTranscript(sessionId, parsed.data.transcript_path)
      .catch(() => undefined);
    // Idle signal first so the office clears any running/blocked state immediately.
    this.tasks.emitActivity(sessionId, 'idle');
    // Claude fires Stop at the end of *every* turn, so a Stop alone isn't "done".
    // Treat it as completion only when the agent left a PR URL in its output;
    // otherwise it has paused and is awaiting input → waiting.
    const prUrl = extractPrUrl(this.terminal.readOutput(sessionId));
    if (prUrl) {
      void this.runner.completeWithChecks(sessionId, prUrl);
    } else {
      this.tasks.markWaiting(sessionId);
    }
    return { ok: true };
  }

  @Post(':sessionId/notification')
  @HttpCode(200)
  notification(
    @Param('sessionId') sessionId: string,
    @Headers('x-midnite-hook-secret') secret: string | undefined,
    @Body() body: unknown,
  ): HookAck {
    this.verify(sessionId, secret);
    const parsed = NotificationHookRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid Notification payload');
    }
    this.tasks.markWaiting(sessionId);
    // Surface the notification message as an attention event so the office can
    // show an unmistakable "needs you" state.
    const summary = typeof parsed.data.message === 'string' ? parsed.data.message : undefined;
    this.tasks.emitAttention(sessionId, 'waiting', summary);
    return { ok: true };
  }

  private verify(sessionId: string, secret: string | undefined): void {
    if (!secret || !this.approvals.verifySecret(sessionId, secret)) {
      throw new NotFoundException('invalid hook secret');
    }
  }
}
