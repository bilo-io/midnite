import { BadRequestException, NotFoundException } from '@nestjs/common';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectRepo, Task, TaskStatusCounts } from '@midnite/shared';
import type { ProjectInsert, ProjectRow } from '../db/schema';
import type { BreakdownService } from '../agent/breakdown.service';
import type { LlmService } from '../agent/llm/llm.service';
import type { MemoriesService } from '../memories/memories.service';
import type { TasksService } from '../tasks/tasks.service';
import type { TerminalService } from '../terminal/terminal.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

const breakdownStub = {
  generate: async () => ({ breakdown: { tasks: [] }, isFallback: true }),
} as unknown as BreakdownService;

// Scoped memories are empty in these tests; plan generation reads them for sources.
const memoriesStub = { listScoped: () => [] } as unknown as MemoriesService;
// Phase 84 C — ProjectsService validates a repo id on attach. These specs never
// attach, so an empty registry (every `get` throws, like the real service) is
// enough and keeps the repo-edge paths honest if one ever does.
const reposStub = {
  get: (id: string) => {
    throw new Error(`repo ${id} not found`);
  },
} as unknown as import('../repos/repos.service').ReposService;

class InMemoryProjectsRepo extends ProjectsRepository {
  readonly projects = new Map<string, ProjectRow>();
  readonly taskCounts = new Map<string, number>();

  constructor() {
    super({} as never);
  }

  override insertProject(row: ProjectInsert): ProjectRow {
    const full: ProjectRow = {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      tag: row.tag,
      color: row.color,
      workDir: row.workDir ?? null,
      startCommand: row.startCommand ?? null,
      buildCommand: row.buildCommand ?? null,
      plan: row.plan ?? null,
      planUpdatedAt: row.planUpdatedAt ?? null,
      archivedAt: row.archivedAt ?? null,
      createdBy: row.createdBy ?? null,
      teamId: row.teamId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.projects.set(full.id, full);
    return full;
  }

  override getProject(id: string): ProjectRow | undefined {
    return this.projects.get(id);
  }

  // Phase 84 C — these specs cover no repo edges, so the fake models an install
  // where nothing is attached: no repos, and the effective directory is just the
  // stored workDir. The edge behaviour itself is covered against a real
  // `:memory:` SQLite in `project-repos.spec.ts`.
  override listReposForProject(): ProjectRepo[] {
    return [];
  }

  override reposForProjectIds(): Map<string, ProjectRepo[]> {
    return new Map();
  }

  override effectiveWorkDirFor(id: string): string | undefined {
    return this.projects.get(id)?.workDir ?? undefined;
  }

  override listProjectsWithoutRepos(): ProjectRow[] {
    return [...this.projects.values()];
  }

  override listAllRepos(): Array<{ id: string; path: string }> {
    return [];
  }

  override listProjects(): ProjectRow[] {
    return [...this.projects.values()];
  }

  override updateProject(id: string, patch: Partial<ProjectInsert>): ProjectRow | undefined {
    const cur = this.projects.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch } as ProjectRow;
    this.projects.set(id, next);
    return next;
  }

  override deleteProject(id: string): void {
    this.projects.delete(id);
  }

  override statusCountsForProject(projectId: string): TaskStatusCounts {
    const n = this.taskCounts.get(projectId) ?? 0;
    return n > 0 ? { todo: n } : {};
  }

  override statusCountsForProjects(projectIds: string[]): Map<string, TaskStatusCounts> {
    const map = new Map<string, TaskStatusCounts>();
    for (const id of projectIds) {
      const counts = this.statusCountsForProject(id);
      if (Object.keys(counts).length > 0) map.set(id, counts);
    }
    return map;
  }
}

const disabledLlm = { enabled: false } as unknown as LlmService;

function makeTerminalStub() {
  const createAdHocTerminal = vi.fn((initCommand: string) => `adhoc-${initCommand.length}`);
  const spawnManagedRun = vi.fn(() => ({ ok: true as const, pid: 123 }));
  return {
    service: { createAdHocTerminal, spawnManagedRun } as unknown as TerminalService,
    createAdHocTerminal,
    spawnManagedRun,
  };
}

function makeTasksStub() {
  const created: Array<{ projectId: string; title: string }> = [];
  const service = {
    createForProject(input: { projectId: string; title: string }): Task {
      created.push(input);
      return {
        id: `task-${created.length}`,
        title: input.title,
        status: 'todo',
        priority: 1,
        retryCount: 0,
        fixAttempts: 0,
        projectId: input.projectId,
        tags: [],
        dependsOn: [],
        events: [],
      } as unknown as Task;
    },
  } as unknown as TasksService;
  return { service, created };
}

describe('ProjectsService', () => {
  it('creates and hydrates a project', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
    );
    const project = await service.createProject({
      name: 'Atlas',
      tag: 'atlas',
      color: '#7c3aed',
    });

    expect(project.name).toBe('Atlas');
    expect(project.tag).toBe('atlas');
    expect(project.taskCount).toBe(0);
  });

  it('enhanceDescription returns trimmed input when AI is disabled', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
    );
    const out = await service.enhanceDescription({ description: '  rough notes  ' });
    expect(out).toBe('rough notes');
  });

  it('draftPlan persists a checklist template when AI is disabled', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
    );
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });

    const { plan } = await service.draftPlan(project.id);
    expect(plan).toContain('- [ ]');
    expect(service.getProject(project.id).plan).toBe(plan);
  });

  it('createTasksFromPlan creates one task per title, tagged to the project', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks, created } = makeTasksStub();

    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
    );
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });

    const result = service.createTasksFromPlan(project.id, ['Do A', 'Do B']);
    expect(result).toHaveLength(2);
    expect(created).toEqual([
      { projectId: project.id, title: 'Do A' },
      { projectId: project.id, title: 'Do B' },
    ]);
  });

  it('audits create / update / delete with the actor (Phase 50 D)', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();
    const audit = { record: vi.fn() } as unknown as import('../audit/audit.service').AuditService;
    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
      undefined,
      audit,
    );

    const project = await service.createProject({ name: 'Atlas', tag: 'atlas', color: '#7c3aed' }, 'user-1');
    service.updateProject(project.id, { name: 'Atlas 2' }, 'user-2');
    service.deleteProject(project.id, 'user-3');

    const calls = (audit.record as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(calls.map((c) => c.action)).toEqual(['project.created', 'project.updated', 'project.deleted']);
    expect(calls[0].userId).toBe('user-1');
    expect(calls[1].payload.before.name).toBe('Atlas');
    expect(calls[1].payload.after.name).toBe('Atlas 2');
    expect(calls[2].userId).toBe('user-3');
  });

  describe('previewProject / buildProject', () => {
    async function makeProjectWithCommands(overrides: {
      workDir?: string;
      startCommand?: string;
      buildCommand?: string;
    }) {
      const repo = new InMemoryProjectsRepo();
      const { service: tasks } = makeTasksStub();
      const { service: terminal, createAdHocTerminal, spawnManagedRun } = makeTerminalStub();
      const service = new ProjectsService(
        repo,
        disabledLlm,
        tasks,
        memoriesStub,
        breakdownStub,
        terminal,
        reposStub,
      );
      const project = await service.createProject({
        name: 'Atlas',
        tag: 'atlas',
        color: '#7c3aed',
        workDir: overrides.workDir,
        startCommand: overrides.startCommand,
        buildCommand: overrides.buildCommand,
      });
      return { service, project, createAdHocTerminal, spawnManagedRun };
    }

    it('previewProject creates an ad-hoc terminal that cds into workDir and runs startCommand', async () => {
      const { service, project, createAdHocTerminal } = await makeProjectWithCommands({
        workDir: '/Users/bilo/dev/atlas',
        startCommand: 'pnpm dev',
      });

      const result = service.previewProject(project.id);

      expect(result).toEqual({ terminalId: expect.stringMatching(/^adhoc-/) });
      expect(createAdHocTerminal).toHaveBeenCalledWith(
        `cd '/Users/bilo/dev/atlas' && clear && pnpm dev\r`,
      );
    });

    it('buildProject creates an ad-hoc terminal that cds into workDir and runs buildCommand', async () => {
      const { service, project, createAdHocTerminal } = await makeProjectWithCommands({
        workDir: '/Users/bilo/dev/atlas',
        buildCommand: 'pnpm build',
      });

      const result = service.buildProject(project.id);

      expect(result).toEqual({ terminalId: expect.stringMatching(/^adhoc-/) });
      expect(createAdHocTerminal).toHaveBeenCalledWith(
        `cd '/Users/bilo/dev/atlas' && clear && pnpm build\r`,
      );
    });

    it('previewProject with background runs an eager managed run instead of an ad-hoc terminal', async () => {
      const { service, project, createAdHocTerminal, spawnManagedRun } =
        await makeProjectWithCommands({
          workDir: '/Users/bilo/dev/atlas',
          startCommand: 'pnpm dev',
        });

      const result = service.previewProject(project.id, { background: true });

      expect(result).toEqual({ terminalId: expect.stringMatching(/^project-run-/) });
      expect(createAdHocTerminal).not.toHaveBeenCalled();
      expect(spawnManagedRun).toHaveBeenCalledWith(
        expect.stringMatching(/^project-run-/),
        expect.objectContaining({ args: ['-lc', 'pnpm dev'], cwd: '/Users/bilo/dev/atlas' }),
        expect.objectContaining({ onData: expect.any(Function), onExit: expect.any(Function) }),
      );
    });

    it('buildProject with background 400s when the managed run fails to spawn', async () => {
      const { service, project, spawnManagedRun } = await makeProjectWithCommands({
        workDir: '/Users/bilo/dev/atlas',
        buildCommand: 'pnpm build',
      });
      spawnManagedRun.mockReturnValueOnce({
        ok: false,
        error: 'terminal session limit reached (10)',
      } as never);

      expect(() => service.buildProject(project.id, { background: true })).toThrow(
        BadRequestException,
      );
    });

    it('previewProject 400s when the project has no work directory configured', async () => {
      const { service, project } = await makeProjectWithCommands({ startCommand: 'pnpm dev' });
      expect(() => service.previewProject(project.id)).toThrow(BadRequestException);
    });

    it('previewProject 400s when the project has no startCommand configured', async () => {
      const { service, project } = await makeProjectWithCommands({ workDir: '/Users/bilo/dev/atlas' });
      expect(() => service.previewProject(project.id)).toThrow(BadRequestException);
    });

    it('buildProject 400s when the project has no buildCommand configured', async () => {
      const { service, project } = await makeProjectWithCommands({ workDir: '/Users/bilo/dev/atlas' });
      expect(() => service.buildProject(project.id)).toThrow(BadRequestException);
    });

    it('previewProject 404s for an unknown project', async () => {
      const repo = new InMemoryProjectsRepo();
      const { service: tasks } = makeTasksStub();
      const service = new ProjectsService(
        repo,
        disabledLlm,
        tasks,
        memoriesStub,
        breakdownStub,
        makeTerminalStub().service,
        reposStub,
      );
      expect(() => service.previewProject('nope')).toThrow(NotFoundException);
    });
  });
});

describe('ProjectsService.getRepoStatus / initRepo (local git status — no remote/clone)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'midnite-repo-status-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  async function makeService(workDir: string | null) {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();
    const service = new ProjectsService(
      repo,
      disabledLlm,
      tasks,
      memoriesStub,
      breakdownStub,
      makeTerminalStub().service,
      reposStub,
    );
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });
    if (workDir !== null) repo.updateProject(project.id, { workDir });
    return { service, project };
  }

  it('reports not-existing when the project has no workDir', async () => {
    const { service, project } = await makeService(null);
    expect(await service.getRepoStatus(project.id)).toEqual({ exists: false, isRepo: false });
  });

  it('reports not-existing when workDir points at a missing directory', async () => {
    const { service, project } = await makeService(join(root, 'does-not-exist'));
    expect(await service.getRepoStatus(project.id)).toEqual({ exists: false, isRepo: false });
  });

  it('reports exists-but-not-a-repo for a plain folder', async () => {
    const { service, project } = await makeService(root);
    expect(await service.getRepoStatus(project.id)).toEqual({ exists: true, isRepo: false });
  });

  it('reports the branch and a clean status for a committed repo', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
    writeFileSync(join(root, 'a.txt'), 'hi');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: root });

    const { service, project } = await makeService(root);
    expect(await service.getRepoStatus(project.id)).toEqual({
      exists: true,
      isRepo: true,
      branch: 'main',
      dirty: false,
    });
  });

  it('reports dirty when there are uncommitted changes', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
    writeFileSync(join(root, 'a.txt'), 'hi');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: root });
    writeFileSync(join(root, 'b.txt'), 'uncommitted');

    const { service, project } = await makeService(root);
    const status = await service.getRepoStatus(project.id);
    expect(status.isRepo).toBe(true);
    expect(status.dirty).toBe(true);
  });

  it('initRepo 400s when the project has no workDir', async () => {
    const { service, project } = await makeService(null);
    await expect(service.initRepo(project.id)).rejects.toThrow(BadRequestException);
  });

  it('initRepo 400s when workDir does not exist on disk', async () => {
    const { service, project } = await makeService(join(root, 'nope'));
    await expect(service.initRepo(project.id)).rejects.toThrow(BadRequestException);
  });

  it('initRepo creates a .git directory and returns the fresh status', async () => {
    const { service, project } = await makeService(root);
    const status = await service.initRepo(project.id);
    expect(status.isRepo).toBe(true);
    expect(status.exists).toBe(true);
  });

  it('initRepo is idempotent — an existing repo is returned unchanged', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
    writeFileSync(join(root, 'a.txt'), 'hi');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: root });

    const { service, project } = await makeService(root);
    const status = await service.initRepo(project.id);
    expect(status).toEqual({ exists: true, isRepo: true, branch: 'main', dirty: false });
  });
});
