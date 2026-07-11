import { Module } from '@nestjs/common';
import { PlaygroundController } from './playground.controller';

/** The demo/playground API (see `playground.controller.ts`). Controller-only — no service or DB. */
@Module({
  controllers: [PlaygroundController],
})
export class PlaygroundModule {}
