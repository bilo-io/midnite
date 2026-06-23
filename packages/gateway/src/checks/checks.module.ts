import { Module } from '@nestjs/common';

import { ChecksService } from './checks.service';

/**
 * The quality-gate checks module (Phase 30). Theme A ships the runner only;
 * Theme B injects `ChecksService` into the pool to gate the `done` transition,
 * and Theme D adds the on-demand controller.
 */
@Module({
  providers: [ChecksService],
  exports: [ChecksService],
})
export class ChecksModule {}
