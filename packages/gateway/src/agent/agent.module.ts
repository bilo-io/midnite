import { Module } from '@nestjs/common';
import { UsageModule } from '../usage/usage.module';
import { LlmClassifier, TaskClassifier } from './classifier.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeWatcherService } from './knowledge-watcher.service';
import { LlmService } from './llm/llm.service';
import { PlannerService } from './planner.service';
import { ProviderCredentialsRepository } from './provider-credentials.repository';
import { UrlContextService } from './url-context.service';

// The gateway's own AI layer: the provider-agnostic LlmService (active provider
// chosen at runtime), the credential store, and the task classifier/planner that
// build on it. Distinct from AgentsModule (`agents/`), the orchestrator feature.
// Imports UsageModule so the LlmService records token/cost usage per call.
@Module({
  imports: [UsageModule],
  providers: [
    LlmService,
    ProviderCredentialsRepository,
    PlannerService,
    UrlContextService,
    KnowledgeWatcherService,
    KnowledgeService,
    {
      provide: TaskClassifier,
      useClass: LlmClassifier,
    },
  ],
  exports: [
    TaskClassifier,
    LlmService,
    PlannerService,
    ProviderCredentialsRepository,
    UrlContextService,
    KnowledgeService,
  ],
})
export class AgentModule {}
