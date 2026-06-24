import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';
import type {
  ProjectInsert,
  ProjectRow,
  ProjectSourceInsert,
  ProjectSourceRow,
} from '../db/schema';
import type { BreakdownService } from '../agent/breakdown.service';
import type { LlmService } from '../agent/llm/llm.service';
import type { MemoriesService } from '../memories/memories.service';
import type { TasksService } from '../tasks/tasks.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

const breakdownStub = {
  generate: async () => ({ breakdown: { tasks: [] }, isFallback: true }),
} as unknown as BreakdownService;

// Scoped memories are empty in these tests; plan generation merges them in.
const memoriesStub = { listScoped: () => [] } as unknown as MemoriesService;

class InMemoryProjectsRepo extends ProjectsRepository {
  readonly projects = new Map<string, ProjectRow>();
  sources: ProjectSourceRow[] = [];
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
    this.sources = this.sources.filter((s) => s.projectId !== id);
  }

  override insertSource(row: ProjectSourceInsert): ProjectSourceRow {
    const full: ProjectSourceRow = {
      id: row.id,
      projectId: row.projectId,
      url: row.url,
      kind: row.kind,
      title: row.title ?? null,
      faviconUrl: row.faviconUrl ?? null,
      fetchedAt: row.fetchedAt ?? null,
      createdAt: row.createdAt,
      position: row.position ?? 0,
    };
    this.sources.push(full);
    return full;
  }

  override listSources(projectId: string): ProjectSourceRow[] {
    return this.sources
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  }

  override getSource(projectId: string, sourceId: string): ProjectSourceRow | undefined {
    return this.sources.find((s) => s.projectId === projectId && s.id === sourceId);
  }

  override deleteSource(projectId: string, sourceId: string): void {
    this.sources = this.sources.filter(
      (s) => !(s.projectId === projectId && s.id === sourceId),
    );
  }

  override countSources(projectId: string): number {
    return this.listSources(projectId).length;
  }

  override nextSourcePosition(projectId: string): number {
    return this.listSources(projectId).reduce((max, s) => Math.max(max, s.position), -1) + 1;
  }

  override reorderSources(projectId: string, orderedIds: string[]): void {
    orderedIds.forEach((id, position) => {
      const row = this.sources.find((s) => s.projectId === projectId && s.id === id);
      if (row) row.position = position;
    });
  }

  override countTasks(projectId: string): number {
    return this.taskCounts.get(projectId) ?? 0;
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
  it('creates and hydrates a project with no sources', async () => {
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
    expect(project.sources).toEqual([]);
    expect(project.taskCount).toBe(0);
  });

  it('enforces the source limit before any fetch', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });

    // Seed the repo at the limit directly so addSource rejects before fetching.
    for (let i = 0; i < 10; i++) {
      repo.insertSource({
        id: `s${i}`,
        projectId: project.id,
        url: `https://example.com/${i}`,
        kind: 'link',
        createdAt: new Date().toISOString(),
      });
    }

    await expect(service.addSource(project.id, 'https://example.com/extra')).rejects.toThrow(
      /at most 10 sources/,
    );
  });

  it('reorders sources and rejects an incomplete id set', async () => {
    const repo = new InMemoryProjectsRepo();
    const { service: tasks } = makeTasksStub();

    const service = new ProjectsService(repo, disabledLlm, tasks, memoriesStub, breakdownStub);
    const project = await service.createProject({ name: 'P', tag: 'p', color: '#000' });

    for (let i = 0; i < 3; i++) {
      repo.insertSource({
        id: `s${i}`,
        projectId: project.id,
        url: `https://example.com/${i}`,
        kind: 'link',
        createdAt: new Date().toISOString(),
        position: i,
      });
    }

    const reordered = service.reorderSources(project.id, ['s2', 's0', 's1']);
    expect(reordered.sources.map((s) => s.id)).toEqual(['s2', 's0', 's1']);

    expect(() => service.reorderSources(project.id, ['s0'])).toThrow(/exactly once/);
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
});
