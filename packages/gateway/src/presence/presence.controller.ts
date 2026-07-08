import { Controller, Get, Inject } from '@nestjs/common';
import type { PresenceSummary } from '@midnite/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PresenceService } from './presence.service';

/**
 * Phase 64 Theme F — the REST surface for app-wide presence (nav pill + dashboard
 * widget). Thin: resolve the caller's team from the JWT (null in the no-auth local
 * default = the global scope) and return the in-memory roll-up. Team-scoped so
 * team A never sees team B, matching the WS fan-out.
 */
@Controller('presence')
export class PresenceController {
  constructor(@Inject(PresenceService) private readonly presence: PresenceService) {}

  // GET /presence/summary — who's currently in the office (this team).
  @Get('summary')
  summary(@CurrentUser() user: CurrentUserPayload | null): PresenceSummary {
    return this.presence.summary(user?.teamId ?? null);
  }
}
