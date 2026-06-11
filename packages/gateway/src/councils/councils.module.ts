import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { TerminalModule } from '../terminal/terminal.module';
import { CouncilRunnerService } from './council-runner.service';
import { CouncilsController } from './councils.controller';
import { CouncilsRepository } from './councils.repository';
import { CouncilsService } from './councils.service';

// Council debates: standing participant panels, one-shot CLI runs in managed
// PTYs (TerminalModule), and the anonymized synthesis step (AgentModule).
@Module({
  imports: [AgentModule, TerminalModule],
  controllers: [CouncilsController],
  providers: [CouncilsService, CouncilsRepository, CouncilRunnerService],
  exports: [CouncilsService],
})
export class CouncilsModule {}
