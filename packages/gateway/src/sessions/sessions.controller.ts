import { Controller, Get, Inject, Param } from '@nestjs/common';
import type { SessionSummary, SessionTranscript } from '@midnite/shared';
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
}
