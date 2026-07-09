import { Module } from '@nestjs/common';

import { SessionUsageRepository } from './session-usage.repository';
import { SessionUsageService } from './session-usage.service';

/**
 * Session token-usage harvesting (Phase 61 A). Kept in its own module — depends
 * only on the DB handle (global) — so both the pool's Stop-hook write path and
 * the sessions cockpit's read path can import it without a pool↔sessions cycle.
 * The agent-CLI label reads the singleton `primary_agent` row directly via the
 * repository (a plain DB read); importing AgentsModule here would create an
 * agents↔agent module load-order cycle (TDZ on boot).
 */
@Module({
  providers: [SessionUsageRepository, SessionUsageService],
  exports: [SessionUsageService],
})
export class SessionUsageModule {}
