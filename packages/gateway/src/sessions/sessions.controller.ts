import { Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type {
  SessionSummary,
  SessionTranscript,
  TerminalTokenResponse,
} from '@midnite/shared';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    @Inject(SessionsService) private readonly service: SessionsService,
  ) {}

  @Get()
  list(): Promise<SessionSummary[]> {
    return this.service.list();
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

  // Archive is a session-level affordance (delete comes later, archived-only).
  @Post(':id/archive')
  archive(@Param('id') id: string): SessionSummary {
    return this.service.archive(id);
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string): SessionSummary {
    return this.service.unarchive(id);
  }
}
