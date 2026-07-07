import { Module } from '@nestjs/common';

import { TasksModule } from '../tasks/tasks.module';
import { RetroBuilderService } from './retro-builder.service';
import { RetroController } from './retro.controller';
import { RetroRepository } from './retro.repository';
import { RetroSubscriberService } from './retro-subscriber.service';

/**
 * Phase 62 A — Fable-Digest retrospectives. On a task's terminal transition,
 * {@link RetroSubscriberService} (riding the existing `TaskEventBus` from
 * TasksModule) builds + stores a deterministic {@link RetroBuilderService}
 * skeleton; `GET /tasks/:id/retro` reads it back. DB comes from the `@Global`
 * DbModule; TasksModule provides `TaskEventBus` + `TasksService`.
 */
@Module({
  imports: [TasksModule],
  controllers: [RetroController],
  providers: [RetroRepository, RetroBuilderService, RetroSubscriberService],
  exports: [RetroBuilderService],
})
export class RetroModule {}
