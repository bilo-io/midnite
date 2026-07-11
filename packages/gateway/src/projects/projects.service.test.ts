import { describe, expect, it, vi } from 'vitest';
import type { Task, TaskStatusCounts } from '@midnite/shared';
import type { ProjectInsert, ProjectRow } from '../db/schema';
import type { BreakdownService } from '../agent/breakdown.service';
import type { LlmService } from '../agent/llm/llm.service';
import type { MemoriesService } from '../memories/memories.service';
import type { TasksService } from '../tasks/tasks.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

const breakdownStub = {
  generate: async () => ({ breakdown: { tasks: [] }, isFallback: true }),
} as unknown as BreakdownService;

// Scoped memories are empty in these tests; plan generation reads them for sources.
const memoriesStub = { listScoped: () => [] } as unknown as MemoriesService;

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
      plan: row.plan ?? null,
      planUpdatedAt: row.planUpdatedAt ?? null,
      archivedAt: row.archivedAt ?? null,
      createdBy: row.createdBy ?? null,
      teamId: row.teamId ?? null,
      phaseDocSync: row.phaseDocSync ?? null,
      phaseDocSyncRepoId: row.phaseDocSyncRepoId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    this.projects.set(full.id, full);
    return full;
  }

  override getProject(id: string): ProjectRow | undefined {
    return this.projects.get(id);
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

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
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

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
    const out = await service.enhanceDescription({ description: '  rough notes  ' });
    expect(out).toBe('rough notes');
  });

  it('draftPlan persists a checklist template when AI is disabled', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });

    const { plan } = await service.draftPlan(project.id);
    expect(plan).toContain('- [ ]');
    expect(service.getProject(project.id).plan).toBe(plan);
  });

  it('createTasksFromPlan creates one task per title, tagged to the project', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks, created } = makeTasksStub();

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
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
    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub, undefined, audit);

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
});
