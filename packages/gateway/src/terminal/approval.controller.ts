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
import { ApprovalService } from './approval.service';

/**
 * Callback target for the in-PTY Claude Code PreToolUse hook. Authenticated by the
 * per-session secret carried in a header (not the URL, so it never lands in access
 * logs) — never trust the body alone. The handler blocks until a viewer answers
 * over the terminal WS or the approval times out, then returns Claude's decision.
 */
@Controller('hooks/sessions')
export class ApprovalController {
  constructor(@Inject(ApprovalService) private readonly approvals: ApprovalService) {}

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
    // Release the held promise if the hook process / client goes away.
    const ac = new AbortController();
    req.raw.on('close', () => ac.abort());
    return this.approvals.requestDecision(sessionId, parsed.data, ac.signal);
  }
}
