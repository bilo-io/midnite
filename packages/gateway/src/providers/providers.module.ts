import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

// HTTP surface for managing LLM provider credentials + the active provider.
// Imports AgentModule for the LlmService (rebuilt on change) and the credential
// repository. The CLI status/install endpoints stay in AgentsModule.
@Module({
  imports: [AgentModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
