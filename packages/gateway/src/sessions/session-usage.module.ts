import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { SessionUsageRepository } from './session-usage.repository';
import { SessionUsageService } from './session-usage.service';

/**
 * Session token-usage harvesting (Phase 61 A). Kept in its own module — depends
 * only on the DB handle (global) + AgentsModule — so both the pool's Stop-hook
 * write path and the sessions cockpit's read path can import it without a
 * pool↔sessions cycle.
 */
@Module({
  imports: [AgentsModule],
  providers: [SessionUsageRepository, SessionUsageService],
  exports: [SessionUsageService],
})
export class SessionUsageModule {}
