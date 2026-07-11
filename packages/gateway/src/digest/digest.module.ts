import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { DigestBuilderService } from './digest-builder.service';
import { DigestRepository } from './digest.repository';

/**
 * Phase 62 C — Fable-Digest. Assembles + stores fleet digests. `LlmService` comes
 * from `AgentModule`; the retro lookup rides the `@Global` `RETRO_PORT` (so this
 * module needn't import `RetroModule`/`TasksModule` and avoids the workflows
 * cycle). The DB handle is `@Global`. Consumed by the `midnite.build-digest`
 * workflow node executor.
 */
@Module({
  imports: [AgentModule],
  providers: [DigestRepository, DigestBuilderService],
  exports: [DigestBuilderService],
})
export class DigestModule {}
