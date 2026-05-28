import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AnthropicClassifier, TaskClassifier } from './classifier.service';

@Module({
  providers: [
    AnthropicService,
    {
      provide: TaskClassifier,
      useClass: AnthropicClassifier,
    },
  ],
  exports: [TaskClassifier],
})
export class AgentModule {}
