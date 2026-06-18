import { describe, expect, it } from 'vitest';
import type { AgentCli, HeartbeatRun } from '@midnite/shared';
import type {
  PrimaryAgentInsert,
  PrimaryAgentRow,
  SubagentInsert,
  SubagentRow,
} from '../db/schema';
import type { LlmService } from '../agent/llm/llm.service';
import { AgentsRepository, PRIMARY_ID } from './agents.repository';
import { AgentsService } from './agents.service';
import type { HeartbeatScheduler } from './heartbeat-scheduler.service';

// In-memory repo: overrides the db-touching methods but inherits the pure
// hydratePrimary/hydrateSubAgent/hydrateRun mappers from the base.
class InMemoryAgentsRepo extends AgentsRepository {
  private primary: PrimaryAgentRow | undefined;
  private subs: SubagentRow[] = [];

  constructor() {
    super({} as never);
  }

  override getPrimary(): PrimaryAgentRow | undefined {
    return this.primary;
  }

  override insertPrimary(row: PrimaryAgentInsert): void {
    if (this.primary) return; // onConflictDoNothing on the fixed id
    this.primary = toPrimaryRow(row);
  }

  override updatePrimary(patch: Partial<PrimaryAgentInsert>): PrimaryAgentRow | undefined {
    if (!this.primary) return undefined;
    this.primary = { ...this.primary, ...patch } as PrimaryAgentRow;
    return this.primary;
  }

  override setAgentCli(cli: AgentCli, updatedAt: string): void {
    if (!this.primary) return;
    this.primary = { ...this.primary, agentCli: cli, updatedAt };
  }

  override listSubAgents(): SubagentRow[] {
    return this.subs;
  }

  override getSubAgent(id: string): SubagentRow | undefined {
    return this.subs.find((s) => s.id === id);
  }

  override insertSubAgent(row: SubagentInsert): SubagentRow {
    const full: SubagentRow = {
      id: row.id,
      name: row.name ?? '',
      role: row.role ?? '',
      description: row.description ?? '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.subs.push(full);
    return full;
  }

  override updateSubAgent(id: string, patch: Partial<SubagentInsert>): SubagentRow | undefined {
    const cur = this.subs.find((s) => s.id === id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override deleteSubAgent(id: string): void {
    this.subs = this.subs.filter((s) => s.id !== id);
  }
}

function toPrimaryRow(row: PrimaryAgentInsert): PrimaryAgentRow {
  return {
    id: row.id,
    name: row.name,
    agentCli: row.agentCli ?? 'claude',
    description: row.description ?? '',
    heartbeatEnabled: row.heartbeatEnabled ?? 0,
    heartbeatPrompt: row.heartbeatPrompt ?? '',
    heartbeatIntervalH: row.heartbeatIntervalH ?? 4,
    defaultWorkDir: row.defaultWorkDir ?? null,
    lastHeartbeatAt: row.lastHeartbeatAt ?? null,
    lastHeartbeatRunId: row.lastHeartbeatRunId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function makeService(opts?: {
  scheduler?: Partial<HeartbeatScheduler>;
  llm?: Partial<LlmService>;
}) {
  const repo = new InMemoryAgentsRepo();
  const sched = (opts?.scheduler ?? {}) as HeartbeatScheduler;
  const llm = (opts?.llm ?? {}) as LlmService;
  return { repo, service: new AgentsService(repo, sched, llm) };
}

describe('AgentsService', () => {
  it('seeds a default primary on first read', () => {
    const { service } = makeService();
    const config = service.getConfig();
    expect(config.primary.name).toBe('Orchestrator');
    expect(config.primary.heartbeatEnabled).toBe(false);
    expect(config.primary.heartbeatIntervalH).toBe(4);
    expect(config.subAgents).toEqual([]);
  });

  it('ensurePrimary is idempotent (seeds once)', () => {
    const { service } = makeService();
    const first = service.ensurePrimary();
    service.updatePrimary({ name: 'Renamed' });
    const second = service.ensurePrimary();
    expect(first.name).toBe('Orchestrator');
    expect(second.name).toBe('Renamed'); // not re-seeded back to the default
  });

  it('applies a partial primary patch and bumps updatedAt', () => {
    const { service } = makeService();
    const before = service.ensurePrimary();
    const updated = service.updatePrimary({ heartbeatEnabled: true, heartbeatPrompt: 'sweep' });
    expect(updated.heartbeatEnabled).toBe(true);
    expect(updated.heartbeatPrompt).toBe('sweep');
    expect(updated.name).toBe('Orchestrator'); // untouched field preserved
    expect(updated.updatedAt >= before.updatedAt).toBe(true);
  });

  it('creates a subagent with a generated id and timestamps', () => {
    const { service } = makeService();
    const sub = service.createSubAgent({ name: 'Summariser', role: 'briefs' });
    expect(sub.id).toBeTruthy();
    expect(sub.name).toBe('Summariser');
    expect(sub.role).toBe('briefs');
    expect(sub.description).toBe('');
    expect(service.listSubAgents()).toHaveLength(1);
  });

  it('updates and deletes subagents, throwing on a missing id', () => {
    const { service } = makeService();
    const sub = service.createSubAgent({ name: 'A' });
    const updated = service.updateSubAgent(sub.id, { role: 'new role' });
    expect(updated.role).toBe('new role');

    service.deleteSubAgent(sub.id);
    expect(service.listSubAgents()).toHaveLength(0);

    expect(() => service.updateSubAgent('missing', { name: 'x' })).toThrow(/not found/);
    expect(() => service.deleteSubAgent('missing')).toThrow(/not found/);
  });

  it('runHeartbeatNow seeds the primary and delegates to the scheduler (manual)', async () => {
    const fakeRun: HeartbeatRun = {
      id: 'run-1',
      status: 'succeeded',
      triggerSource: 'manual',
      startedAt: '2026-06-08T00:00:00.000Z',
    };
    const calls: string[] = [];
    const { repo, service } = makeService({
      scheduler: {
        executeHeartbeat: async (source) => {
          calls.push(source);
          return fakeRun;
        },
      },
    });

    const run = await service.runHeartbeatNow();
    expect(run).toEqual(fakeRun);
    expect(calls).toEqual(['manual']);
    expect(repo.getPrimary()?.id).toBe(PRIMARY_ID); // seeded as a side effect
  });

  it('ping: delegates to the active LLM provider and tags the current CLI', async () => {
    const { service } = makeService({
      llm: {
        ping: async () => ({ ok: true, model: 'claude-haiku-4-5', reply: 'system status: ok' }),
      },
    });
    service.updateAgentCli('gemini');

    const res = await service.ping();
    expect(res).toEqual({
      ok: true,
      cli: 'gemini', // informational: the CLI preference, not the provider
      model: 'claude-haiku-4-5',
      reply: 'system status: ok',
    });
  });

  it('ping: surfaces a disabled provider as not ok', async () => {
    const { service } = makeService({
      llm: { ping: async () => ({ ok: false, model: '', reply: 'AI is disabled' }) },
    });
    const res = await service.ping();
    expect(res.ok).toBe(false);
    expect(res.reply).toMatch(/disabled/);
  });

  it('getCliStatuses returns one status per known CLI', async () => {
    const { service } = makeService();
    // Avoid spawning real shells: stub the per-CLI probe.
    service.getCliStatus = async (cli) => ({ cli, installed: true, version: '1.0.0' });
    const statuses = await service.getCliStatuses();
    expect(statuses.map((s) => s.cli).sort()).toEqual(
      ['aider', 'claude', 'codex', 'gemini', 'opencode'].sort(),
    );
  });
});
