import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AnthropicClassifier, TaskClassifier } from './classifier.service';
import { PlannerService } from './planner.service';

@Module({
  providers: [
    AnthropicService,
    PlannerService,
    {
      provide: TaskClassifier,
      useClass: AnthropicClassifier,
    },
  ],
  exports: [TaskClassifier, AnthropicService, PlannerService],
})
export class AgentModule {}
