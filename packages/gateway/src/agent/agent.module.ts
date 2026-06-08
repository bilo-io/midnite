import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AnthropicService } from './anthropic.service';
import { AnthropicClassifier, TaskClassifier } from './classifier.service';

@Module({
  controllers: [AgentController],
  providers: [
    AnthropicService,
    {
      provide: TaskClassifier,
      useClass: AnthropicClassifier,
    },
  ],
  exports: [TaskClassifier, AnthropicService],
})
export class AgentModule {}
