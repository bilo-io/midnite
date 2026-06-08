import { Controller, Inject, Post } from '@nestjs/common';
import type { AgentPingResponse } from '@midnite/shared';
import { AnthropicService } from './anthropic.service';

@Controller('agent')
export class AgentController {
  constructor(@Inject(AnthropicService) private readonly anthropic: AnthropicService) {}

  /** Ping/pong health check — the model reports itself + a system-status line. */
  @Post('ping')
  ping(): Promise<AgentPingResponse> {
    return this.anthropic.ping();
  }
}
