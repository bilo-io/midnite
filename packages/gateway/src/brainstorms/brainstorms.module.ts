import { Module } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { BrainstormRunnerService } from './brainstorm-runner.service';
import { BrainstormsController } from './brainstorms.controller';
import { BrainstormsRepository } from './brainstorms.repository';
import { BrainstormsService } from './brainstorms.service';

// Brainstorms: standing contributor panels, one-shot CLI runs in managed PTYs
// (TerminalModule) — contributors generate ideas, then a mode-based synthesis
// step distills the attributed ideas.
@Module({
  imports: [TerminalModule],
  controllers: [BrainstormsController],
  providers: [BrainstormsService, BrainstormsRepository, BrainstormRunnerService],
  exports: [BrainstormsService],
})
export class BrainstormsModule {}
