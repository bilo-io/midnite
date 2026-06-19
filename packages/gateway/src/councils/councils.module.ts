import { Module } from '@nestjs/common';
import { TerminalModule } from '../terminal/terminal.module';
import { CouncilRunnerService } from './council-runner.service';
import { CouncilsController } from './councils.controller';
import { CouncilsRepository } from './councils.repository';
import { CouncilsService } from './councils.service';

// Councils: standing member panels, one-shot CLI runs in managed PTYs
// (TerminalModule) — members respond, then a format-based synthesis step distils
// the responses (attributed or anonymized, per the run's format).
@Module({
  imports: [TerminalModule],
  controllers: [CouncilsController],
  providers: [CouncilsService, CouncilsRepository, CouncilRunnerService],
  exports: [CouncilsService],
})
export class CouncilsModule {}
