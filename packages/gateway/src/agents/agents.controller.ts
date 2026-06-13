import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  AgentCliSchema,
  CreateSubAgentRequestSchema,
  UpdateAgentCliRequestSchema,
  UpdatePrimaryAgentRequestSchema,
  UpdateSubAgentRequestSchema,
  type AgentCliResponse,
  type AgentCliStatusResponse,
  type AgentPingResponse,
  type AgentsConfigResponse,
  type HeartbeatRunResponse,
  type HeartbeatRunsResponse,
  type PrimaryAgentResponse,
  type SubAgentResponse,
} from '@midnite/shared';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(@Inject(AgentsService) private readonly service: AgentsService) {}

  @Get()
  getConfig(): AgentsConfigResponse {
    return { config: this.service.getConfig() };
  }

  @Put('cli')
  updateAgentCli(@Body() body: unknown): AgentCliResponse {
    const parsed = UpdateAgentCliRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { cli: this.service.updateAgentCli(parsed.data.cli) };
  }

  @Get('cli/:cli/status')
  async getCliStatus(@Param('cli') cli: string): Promise<AgentCliStatusResponse> {
    const parsed = AgentCliSchema.safeParse(cli);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { status: await this.service.getCliStatus(parsed.data) };
  }

  /** Health-check the selected CLI (Claude → API round-trip; others → version probe). */
  @Post('ping')
  ping(): Promise<AgentPingResponse> {
    return this.service.ping();
  }

  @Put('primary')
  updatePrimary(@Body() body: unknown): PrimaryAgentResponse {
    const parsed = UpdatePrimaryAgentRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { primary: this.service.updatePrimary(parsed.data) };
  }

  @Post('subagents')
  createSubAgent(@Body() body: unknown): SubAgentResponse {
    const parsed = CreateSubAgentRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { subAgent: this.service.createSubAgent(parsed.data) };
  }

  @Patch('subagents/:id')
  updateSubAgent(@Param('id') id: string, @Body() body: unknown): SubAgentResponse {
    const parsed = UpdateSubAgentRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { subAgent: this.service.updateSubAgent(id, parsed.data) };
  }

  @Delete('subagents/:id')
  removeSubAgent(@Param('id') id: string): { ok: true } {
    this.service.deleteSubAgent(id);
    return { ok: true };
  }

  @Get('heartbeat/runs')
  listHeartbeatRuns(): HeartbeatRunsResponse {
    return { runs: this.service.listHeartbeatRuns() };
  }

  @Post('heartbeat/run')
  async runHeartbeat(): Promise<HeartbeatRunResponse> {
    return { run: await this.service.runHeartbeatNow() };
  }
}
