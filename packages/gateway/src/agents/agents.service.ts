import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  AGENT_CLI_COMMAND,
  AGENT_CLI_DEFAULT,
  HEARTBEAT_DEFAULT_H,
  type AgentCli,
  type AgentCliStatus,
  type AgentPingResponse,
  type AgentsConfig,
  type CreateSubAgentRequest,
  type HeartbeatRun,
  type PrimaryAgent,
  type SubAgent,
  type UpdatePrimaryAgentRequest,
  type UpdateSubAgentRequest,
} from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { AgentsRepository, PRIMARY_ID } from './agents.repository';
import { detectCli } from './cli-detect';
import { HeartbeatScheduler } from './heartbeat-scheduler.service';
import type { PrimaryAgentInsert, SubagentInsert } from '../db/schema';

const DEFAULT_RUN_LIMIT = 50;

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AgentsRepository) private readonly repo: AgentsRepository,
    @Inject(HeartbeatScheduler) private readonly scheduler: HeartbeatScheduler,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  /**
   * Health-check the active LLM provider — the one powering the gateway's AI
   * features (classification, planning, heartbeat). A real round-trip confirms
   * the credentials resolve. `cli` carries the current CLI preference for
   * display; CLI install/version is reported separately via getCliStatuses.
   */
  async ping(): Promise<AgentPingResponse> {
    const cli = this.getAgentCli();
    return { ...(await this.llm.ping()), cli };
  }

  /** Installed-state of every known agent CLI, for the settings page. */
  async getCliStatuses(): Promise<AgentCliStatus[]> {
    return Promise.all(
      (Object.keys(AGENT_CLI_COMMAND) as AgentCli[]).map((cli) => this.getCliStatus(cli)),
    );
  }

  getConfig(): AgentsConfig {
    const primary = this.ensurePrimary();
    const subAgents = this.repo.listSubAgents().map((r) => this.repo.hydrateSubAgent(r));
    return { cli: this.repo.getAgentCli(), primary, subAgents };
  }

  /** The global CLI preference (seeds the singleton first so it's never missing). */
  getAgentCli(): AgentCli {
    this.ensurePrimary();
    return this.repo.getAgentCli();
  }

  updateAgentCli(cli: AgentCli): AgentCli {
    this.ensurePrimary();
    this.repo.setAgentCli(cli, new Date().toISOString());
    return this.repo.getAgentCli();
  }

  /** Whether a CLI's binary is on PATH (and its version, best-effort). */
  async getCliStatus(cli: AgentCli): Promise<AgentCliStatus> {
    const result = await detectCli(AGENT_CLI_COMMAND[cli]);
    return { cli, ...result };
  }

  // Seed the singleton on first read. Seeds lastHeartbeatAt to createdAt so the
  // first scheduled fire waits a full interval rather than firing immediately.
  ensurePrimary(): PrimaryAgent {
    const existing = this.repo.getPrimary();
    if (existing) return this.repo.hydratePrimary(existing);
    const now = new Date().toISOString();
    this.repo.insertPrimary({
      id: PRIMARY_ID,
      name: 'Orchestrator',
      agentCli: AGENT_CLI_DEFAULT,
      description: '',
      heartbeatEnabled: 0,
      heartbeatPrompt: '',
      heartbeatIntervalH: HEARTBEAT_DEFAULT_H,
      lastHeartbeatAt: now,
      lastHeartbeatRunId: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydratePrimary(this.repo.getPrimary()!);
  }

  updatePrimary(req: UpdatePrimaryAgentRequest): PrimaryAgent {
    this.ensurePrimary();
    const patch: Partial<PrimaryAgentInsert> = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.description !== undefined) patch.description = req.description;
    if (req.heartbeatEnabled !== undefined) patch.heartbeatEnabled = req.heartbeatEnabled ? 1 : 0;
    if (req.heartbeatPrompt !== undefined) patch.heartbeatPrompt = req.heartbeatPrompt;
    if (req.heartbeatIntervalH !== undefined) patch.heartbeatIntervalH = req.heartbeatIntervalH;
    this.repo.updatePrimary(patch);
    return this.repo.hydratePrimary(this.repo.getPrimary()!);
  }

  listSubAgents(): SubAgent[] {
    return this.repo.listSubAgents().map((r) => this.repo.hydrateSubAgent(r));
  }

  createSubAgent(req: CreateSubAgentRequest): SubAgent {
    const now = new Date().toISOString();
    const row = this.repo.insertSubAgent({
      id: randomUUID(),
      name: req.name ?? '',
      role: req.role ?? '',
      description: req.description ?? '',
      createdAt: now,
      updatedAt: now,
    });
    return this.repo.hydrateSubAgent(row);
  }

  updateSubAgent(id: string, req: UpdateSubAgentRequest): SubAgent {
    this.assertSubAgentExists(id);
    const patch: Partial<SubagentInsert> = { updatedAt: new Date().toISOString() };
    if (req.name !== undefined) patch.name = req.name;
    if (req.role !== undefined) patch.role = req.role;
    if (req.description !== undefined) patch.description = req.description;
    this.repo.updateSubAgent(id, patch);
    return this.repo.hydrateSubAgent(this.repo.getSubAgent(id)!);
  }

  deleteSubAgent(id: string): void {
    this.assertSubAgentExists(id);
    this.repo.deleteSubAgent(id);
  }

  listHeartbeatRuns(limit: number = DEFAULT_RUN_LIMIT): HeartbeatRun[] {
    return this.repo.listHeartbeatRuns(limit).map((r) => this.repo.hydrateRun(r));
  }

  runHeartbeatNow(): Promise<HeartbeatRun> {
    this.ensurePrimary();
    return this.scheduler.executeHeartbeat('manual');
  }

  private assertSubAgentExists(id: string): void {
    if (!this.repo.getSubAgent(id)) {
      throw new NotFoundException(`subagent ${id} not found`);
    }
  }
}
