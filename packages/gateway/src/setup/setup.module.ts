import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ProvidersModule } from '../providers/providers.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

// First-run readiness (Phase 19 Theme A). Composes the providers + agents
// feature services (imported below) with the global CryptoService + config.
@Module({
  imports: [ProvidersModule, AgentsModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
