import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { PoolModule } from '../pool/pool.module';
import { ProvidersModule } from '../providers/providers.module';
import { ReposModule } from '../repos/repos.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

// First-run readiness (Phase 19 Theme A). Composes the providers + agents
// feature services (imported below) with the global CryptoService + config.
//
// PoolModule is imported for the *write* side (`PUT /setup/agent-pool`): a pool
// update resizes the live slots and starts/stops the tick loop, so autonomy no
// longer needs a hand-edited config plus a restart. Plain import, no forwardRef
// — PoolModule doesn't depend on SetupModule, so there's no cycle to break.
@Module({
  imports: [ProvidersModule, AgentsModule, PoolModule, ReposModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
