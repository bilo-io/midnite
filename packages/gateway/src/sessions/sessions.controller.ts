import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  SessionDetail,
  SessionSummary,
  SessionTranscript,
  TerminalTokenResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    @Inject(SessionsService) private readonly service: SessionsService,
  ) {}

  @Get()
  list(@CurrentUser() user?: CurrentUserPayload | null): Promise<SessionSummary[]> {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.list(scope);
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): SessionDetail {
    const scope = user ? { userId: user.userId, teamId: user.teamId } : undefined;
    return this.service.getDetail(id, scope);
  }

  @Get(':projectSlug/:id/transcript')
  transcript(
    @Param('projectSlug') projectSlug: string,
    @Param('id') id: string,
  ): Promise<SessionTranscript> {
    return this.service.transcript(projectSlug, id);
  }

  @Post(':id/terminal-token')
  terminalToken(@Param('id') id: string): TerminalTokenResponse {
    return this.service.mintTerminalToken(id);
  }

  // Archive is a session-level affordance; delete (below) is archived-only.
  @Post(':id/archive')
  archive(@Param('id') id: string): SessionSummary {
    return this.service.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string): SessionSummary {
    return this.service.unarchive(id);
  }

  // Permanent delete — only valid once the session is archived (enforced downstream).
  @Delete(':id')
  remove(@Param('id') id: string): { ok: true } {
    this.service.delete(id);
    return { ok: true };
  }
}
