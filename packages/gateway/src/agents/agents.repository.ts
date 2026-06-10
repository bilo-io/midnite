import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq } from 'drizzle-orm';
import {
  AGENT_CLI_DEFAULT,
  AgentCliSchema,
  type AgentCli,
  type HeartbeatRun,
  type HeartbeatRunStatus,
  type HeartbeatTriggerSource,
  type PrimaryAgent,
  type SubAgent,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import {
  heartbeatRuns,
  primaryAgent,
  subagents,
  type HeartbeatRunInsert,
  type HeartbeatRunRow,
  type PrimaryAgentInsert,
  type PrimaryAgentRow,
  type SubagentInsert,
  type SubagentRow,
} from '../db/schema';

/** The orchestrator is a singleton row under this fixed id. */
export const PRIMARY_ID = 'primary';

@Injectable()
export class AgentsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  getPrimary(): PrimaryAgentRow | undefined {
    return this.db.select().from(primaryAgent).where(eq(primaryAgent.id, PRIMARY_ID)).get();
  }

  // Idempotent on the fixed primary key — a concurrent second seed is a no-op.
  insertPrimary(row: PrimaryAgentInsert): void {
    this.db.insert(primaryAgent).values(row).onConflictDoNothing().run();
  }

  updatePrimary(patch: Partial<PrimaryAgentInsert>): PrimaryAgentRow | undefined {
    return this.db
      .update(primaryAgent)
      .set(patch)
      .where(eq(primaryAgent.id, PRIMARY_ID))
      .returning()
      .get();
  }

  // Advance the schedule clock + latest-run pointer (scheduled fires only).
  advanceHeartbeat(at: string, runId: string): void {
    this.db
      .update(primaryAgent)
      .set({ lastHeartbeatAt: at, lastHeartbeatRunId: runId })
      .where(eq(primaryAgent.id, PRIMARY_ID))
      .run();
  }

  /** The global CLI preference off the singleton row; coalesces to the default. */
  getAgentCli(): AgentCli {
    const row = this.getPrimary();
    return AgentCliSchema.catch(AGENT_CLI_DEFAULT).parse(row?.agentCli);
  }

  setAgentCli(cli: AgentCli, updatedAt: string): void {
    this.db
      .update(primaryAgent)
      .set({ agentCli: cli, updatedAt })
      .where(eq(primaryAgent.id, PRIMARY_ID))
      .run();
  }

  // Latest-run pointer only — used by manual runs, which don't reset the cadence.
  setLastHeartbeatRunId(runId: string): void {
    this.db
      .update(primaryAgent)
      .set({ lastHeartbeatRunId: runId })
      .where(eq(primaryAgent.id, PRIMARY_ID))
      .run();
  }

  listSubAgents(): SubagentRow[] {
    return this.db.select().from(subagents).orderBy(asc(subagents.createdAt)).all();
  }

  getSubAgent(id: string): SubagentRow | undefined {
    return this.db.select().from(subagents).where(eq(subagents.id, id)).get();
  }

  insertSubAgent(row: SubagentInsert): SubagentRow {
    return this.db.insert(subagents).values(row).returning().get();
  }

  updateSubAgent(id: string, patch: Partial<SubagentInsert>): SubagentRow | undefined {
    return this.db.update(subagents).set(patch).where(eq(subagents.id, id)).returning().get();
  }

  deleteSubAgent(id: string): void {
    this.db.delete(subagents).where(eq(subagents.id, id)).run();
  }

  insertHeartbeatRun(row: HeartbeatRunInsert): HeartbeatRunRow {
    return this.db.insert(heartbeatRuns).values(row).returning().get();
  }

  updateHeartbeatRun(id: string, patch: Partial<HeartbeatRunInsert>): HeartbeatRunRow | undefined {
    return this.db.update(heartbeatRuns).set(patch).where(eq(heartbeatRuns.id, id)).returning().get();
  }

  listHeartbeatRuns(limit: number): HeartbeatRunRow[] {
    return this.db
      .select()
      .from(heartbeatRuns)
      .orderBy(desc(heartbeatRuns.startedAt))
      .limit(limit)
      .all();
  }

  hydratePrimary(row: PrimaryAgentRow): PrimaryAgent {
    return {
      name: row.name,
      description: row.description,
      heartbeatEnabled: row.heartbeatEnabled !== 0,
      heartbeatPrompt: row.heartbeatPrompt,
      heartbeatIntervalH: row.heartbeatIntervalH,
      lastHeartbeatAt: row.lastHeartbeatAt ?? undefined,
      updatedAt: row.updatedAt,
    };
  }

  hydrateSubAgent(row: SubagentRow): SubAgent {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  hydrateRun(row: HeartbeatRunRow): HeartbeatRun {
    return {
      id: row.id,
      status: row.status as HeartbeatRunStatus,
      triggerSource: row.triggerSource as HeartbeatTriggerSource,
      model: row.model ?? undefined,
      systemPrompt: row.systemPrompt ?? undefined,
      prompt: row.prompt ?? undefined,
      output: row.output ?? undefined,
      error: row.error ?? undefined,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? undefined,
    };
  }
}
