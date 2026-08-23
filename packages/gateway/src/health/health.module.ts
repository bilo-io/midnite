import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GithubTokenModule } from '../github/github-token.module';
import { ReposModule } from '../repos/repos.module';
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
  // AuthModule provides JwtService so the controller can detect an authenticated
  // caller (Phase 72 C) and include the granular detail only for them.
  // GithubTokenModule (not GithubModule) for the token-rung preflight check: it's
  // the narrow ladder-only module, so health doesn't pull in the whole GitHub feature
  // — and it imports only the credential vault, so no cycle (Phase 84 Theme G).
  imports: [forwardRef(() => PoolModule), AuthModule, ReposModule, GithubTokenModule],
  controllers: [HealthController],
  providers: [HealthService, PreflightService],
  exports: [HealthService, PreflightService],
})
export class HealthModule {}
