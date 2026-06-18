import { Module } from '@nestjs/common';
import { LlmClassifier, TaskClassifier } from './classifier.service';
import { LlmService } from './llm/llm.service';
import { PlannerService } from './planner.service';
import { ProviderCredentialsRepository } from './provider-credentials.repository';

// The gateway's own AI layer: the provider-agnostic LlmService (active provider
// chosen at runtime), the credential store, and the task classifier/planner that
// build on it. Distinct from AgentsModule (`agents/`), the orchestrator feature.
@Module({
  providers: [
    LlmService,
    ProviderCredentialsRepository,
    PlannerService,
    {
      provide: TaskClassifier,
      useClass: LlmClassifier,
    },
  ],
  exports: [TaskClassifier, LlmService, PlannerService, ProviderCredentialsRepository],
})
export class AgentModule {}
