import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  HEARTBEAT_DEFAULT_H,
  type AgentsConfig,
  type CreateSubAgentRequest,
  type HeartbeatRun,
  type PrimaryAgent,
  type SubAgent,
  type UpdatePrimaryAgentRequest,
  type UpdateSubAgentRequest,
} from '@midnite/shared';
import { AgentsRepository, PRIMARY_ID } from './agents.repository';
import { HeartbeatScheduler } from './heartbeat-scheduler.service';
import type { PrimaryAgentInsert, SubagentInsert } from '../db/schema';

const DEFAULT_RUN_LIMIT = 50;

@Injectable()
export class AgentsService {
  constructor(
    @Inject(AgentsRepository) private readonly repo: AgentsRepository,
    @Inject(HeartbeatScheduler) private readonly scheduler: HeartbeatScheduler,
  ) {}

  getConfig(): AgentsConfig {
    const primary = this.ensurePrimary();
    const subAgents = this.repo.listSubAgents().map((r) => this.repo.hydrateSubAgent(r));
    return { primary, subAgents };
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
