import { forwardRef, Module } from '@nestjs/common';
import { PoolModule } from '../pool/pool.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PreflightService } from './preflight.service';

/**
 * Runtime health (Phase 54 A + B). Bundles the check registry (HealthService),
 * the boot preflight (PreflightService, invoked from bootstrap), and the
 * liveness/readiness endpoints. Imports PoolModule for the pool + scheduler
 * readiness checks; DbModule + ConfigModule are global. HealthService is
 * exported so the Phase 54 C watchdog can reuse the same checks.
 */
@Module({
  imports: [forwardRef(() => PoolModule)],
  controllers: [HealthController],
  providers: [HealthService, PreflightService],
  exports: [HealthService, PreflightService],
})
export class HealthModule {}
