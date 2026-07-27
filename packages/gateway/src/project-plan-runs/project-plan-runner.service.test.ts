import { describe, expect, it } from 'vitest';
import { parseConfig, type Project, type ProjectDoc } from '@midnite/shared';
import type { AgentsService } from '../agents/agents.service';
import type { ProjectDocsService } from '../project-docs/project-docs.service';
import type { ProjectsService } from '../projects/projects.service';
import type { TerminalService } from '../terminal/terminal.service';
import type { ProjectPlanRunInsert, ProjectPlanRunRow } from '../db/schema';
import { ProjectPlanRunDoesNotExistError, ProjectPlanRunnerService } from './project-plan-runner.service';

/** Fake TerminalService: records each spawn's hooks so tests drive output and
 *  exit by hand. Mirrors CouncilRunnerService's test fixture. */
class FakeTerminal {
  spawns = new Map<
    string,
    {
      command: string;
      args: string[];
      onData: (chunk: string) => void;
      onExit: (exitCode: number, signal: number | null) => void;
    }
  >();
  failNextSpawn = false;

  spawnManagedRun(
    attachId: string,
    spec: { command: string; args: string[]; cwd: string },
    hooks: {
      onData: (chunk: string) => void;
      onExit: (exitCode: number, signal: number | null) => void;
    },
  ): { ok: true; pid: number } | { ok: false; error: string } {
    if (this.failNextSpawn) {
      this.failNextSpawn = false;
      return { ok: false, error: 'spawn failed (test)' };
    }
    this.spawns.set(attachId, { command: spec.command, args: spec.args, ...hooks });
    return { ok: true, pid: 1234 };
  }

  killManagedRun(attachId: string): void {
    this.spawns.get(attachId)?.onExit(-1, 15);
  }
}

class InMemoryProjectPlanRunsRepo {
  rows = new Map<string, ProjectPlanRunRow>();

  create(row: ProjectPlanRunInsert): ProjectPlanRunRow {
    const stored = { ...row } as ProjectPlanRunRow;
    this.rows.set(row.id, stored);
    return stored;
  }

  get(id: string): ProjectPlanRunRow | undefined {
    return this.rows.get(id);
  }

  update(id: string, patch: Partial<ProjectPlanRunInsert>): ProjectPlanRunRow | undefined {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch } as ProjectPlanRunRow;
    this.rows.set(id, updated);
    return updated;
  }

  listByProject(projectId: string): ProjectPlanRunRow[] {
    return [...this.rows.values()].filter((r) => r.projectId === projectId);
  }

  listStaleRuns(): ProjectPlanRunRow[] {
    return [...this.rows.values()].filter((r) => r.status === 'running');
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Acme',
    tag: 'ACM',
    color: '#3366ff',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDoc(overrides: Partial<ProjectDoc> = {}): ProjectDoc {
  return {
    id: 'd1',
    projectId: 'p1',
    name: 'PRD',
    tag: 'PRD',
    color: '#6366f1',
    content: 'the PRD body',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRunner(opts?: {
  project?: Project;
  docs?: ProjectDoc[];
  cli?: string;
  runTimeoutMs?: number;
}): {
  runner: ProjectPlanRunnerService;
  repo: InMemoryProjectPlanRunsRepo;
  terminal: FakeTerminal;
} {
  const config = parseConfig({
    agent: {},
    terminal: {},
    knowledge: {},
    gateway: {},
    councils: { runTimeoutMs: opts?.runTimeoutMs ?? 600000 },
  });
  const repo = new InMemoryProjectPlanRunsRepo();
  const terminal = new FakeTerminal();
  const project = opts?.project ?? makeProject();
  const docs = opts?.docs ?? [makeDoc()];
  const projects = { getProject: () => project } as unknown as ProjectsService;
  const projectDocs = { listDocs: () => docs } as unknown as ProjectDocsService;
  const agents = { getAgentCli: () => opts?.cli ?? 'claude' } as unknown as AgentsService;
  const runner = new ProjectPlanRunnerService(
    config,
    repo as never,
    projects,
    projectDocs,
    agents,
    terminal as unknown as TerminalService,
  );
  return { runner, repo, terminal };
}

function waitUntil(pred: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (pred()) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(poll);
        reject(new Error('timeout waiting for condition'));
      }
    }, 5);
  });
}

describe('ProjectPlanRunnerService', () => {
  it('spawns the configured CLI under a deterministic terminal id, prompt carries selected doc content', () => {
    const { runner, repo, terminal } = makeRunner({
      project: makeProject({ description: 'Ship the thing', plan: '## Scope\n- [ ] a' }),
      docs: [makeDoc({ id: 'd1', name: 'PRD', content: 'PRD BODY TEXT' })],
      cli: 'claude',
    });

    const { runId, terminalId } = runner.startOverviewRun('p1', ['d1']);
    expect(terminalId).toBe(`project-plan-${runId}`);
    expect(repo.get(runId)?.status).toBe('running');

    const spawn = terminal.spawns.get(terminalId)!;
    expect(spawn.command).toBe('claude');
    expect(spawn.args[0]).toBe('-p');
    const prompt = spawn.args[1]!;
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('Ship the thing');
    expect(prompt).toContain('Scope');
    expect(prompt).toContain('PRD BODY TEXT');
  });

  it('drafts from the project alone when docIds is empty (no doc content leaks in)', () => {
    const { terminal, runner } = makeRunner({
      docs: [makeDoc({ id: 'd1', content: 'SHOULD NOT APPEAR' })],
    });
    const { terminalId } = runner.startOverviewRun('p1', []);
    const prompt = terminal.spawns.get(terminalId)!.args[1]!;
    expect(prompt).not.toContain('SHOULD NOT APPEAR');
  });

  it('captures, cleans, and persists output on a successful exit', async () => {
    const { runner, repo, terminal } = makeRunner();
    const { runId, terminalId } = runner.startOverviewRun('p1', []);

    const spawn = terminal.spawns.get(terminalId)!;
    spawn.onData('\x1b[1m# Overview\x1b[0m\r\n');
    spawn.onData('Do the thing.\r\n');
    spawn.onExit(0, null);

    await waitUntil(() => repo.get(runId)!.status === 'done');
    const row = repo.get(runId)!;
    expect(row.output).toBe('# Overview\nDo the thing.');
    expect(row.error).toBeNull();
    expect(row.finishedAt).not.toBeNull();
  });

  it('marks the run errored when the process exits nonzero', async () => {
    const { runner, repo, terminal } = makeRunner();
    const { runId, terminalId } = runner.startOverviewRun('p1', []);
    terminal.spawns.get(terminalId)!.onExit(1, null);

    await waitUntil(() => repo.get(runId)!.status === 'error');
    expect(repo.get(runId)!.error).toContain('exited with code 1');
  });

  it('marks the run errored when it exits zero with no output', async () => {
    const { runner, repo, terminal } = makeRunner();
    const { runId, terminalId } = runner.startOverviewRun('p1', []);
    terminal.spawns.get(terminalId)!.onExit(0, null);

    await waitUntil(() => repo.get(runId)!.status === 'error');
    expect(repo.get(runId)!.error).toContain('without output');
  });

  it('marks the run errored immediately when the spawn fails', () => {
    const { runner, repo, terminal } = makeRunner();
    terminal.failNextSpawn = true;
    const { runId } = runner.startOverviewRun('p1', []);
    expect(repo.get(runId)!.status).toBe('error');
    expect(repo.get(runId)!.error).toContain('failed to start');
  });

  it('kills a run that exceeds the timeout and records the timeout error', async () => {
    const { runner, repo, terminal } = makeRunner({ runTimeoutMs: 20 });
    const { runId, terminalId } = runner.startOverviewRun('p1', []);
    terminal.spawns.get(terminalId)!.onData('partial');
    // Never exits on its own — the timeout kills it (FakeTerminal delivers onExit(-1)).
    await waitUntil(() => repo.get(runId)!.status === 'error');
    expect(repo.get(runId)!.error).toContain('timed out');
    expect(repo.get(runId)!.output).toBe('partial');
  });

  it('getOverviewRun returns the current status/output/error', () => {
    const { runner, terminal } = makeRunner();
    const { runId, terminalId } = runner.startOverviewRun('p1', []);
    terminal.spawns.get(terminalId)!.onData('hi\n');
    terminal.spawns.get(terminalId)!.onExit(0, null);
    const result = runner.getOverviewRun('p1', runId);
    expect(result.status).toBe('done');
    expect(result.output).toBe('hi');
  });

  it('getOverviewRun rejects an unknown run or one on the wrong project', () => {
    const { runner } = makeRunner();
    const { runId } = runner.startOverviewRun('p1', []);
    expect(() => runner.getOverviewRun('p1', 'nope')).toThrow(ProjectPlanRunDoesNotExistError);
    expect(() => runner.getOverviewRun('other-project', runId)).toThrow(
      ProjectPlanRunDoesNotExistError,
    );
  });

  it('marks stale running rows errored on module init (gateway restart)', () => {
    const { runner, repo } = makeRunner();
    repo.create({
      id: 'r1',
      projectId: 'p1',
      status: 'running',
      terminalId: 'project-plan-r1',
      output: null,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    runner.onModuleInit();
    expect(repo.get('r1')!.status).toBe('error');
    expect(repo.get('r1')!.error).toContain('restarted');
  });
});
