import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../test';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { ReposRepository } from '../repos/repos.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';
import type { ProjectInsert, TaskInsert, RepoInsert, WorkflowInsert } from '../db/schema';

// ---- helpers ----------------------------------------------------------------

type Db = ReturnType<typeof createTestDb>['db'];

function makeTaskRepo(db: Db) {
  return new TasksRepository(db);
}

function makeRepoRepo(db: Db) {
  return new ReposRepository(db);
}

function makeWorkflowRepo(db: Db) {
  return new WorkflowsRepository(db);
}

const NOW = '2026-01-01T00:00:00.000Z';

function task(id: string, overrides: Partial<TaskInsert> = {}): TaskInsert {
  return { id, title: id, kind: 'unknown', status: 'todo', createdAt: NOW, updatedAt: NOW, ...overrides };
}

function repo(id: string, overrides: Partial<RepoInsert> = {}): RepoInsert {
  return { id, name: id, path: `/repo/${id}`, createdAt: NOW, updatedAt: NOW, ...overrides };
}

function workflow(id: string, overrides: Partial<WorkflowInsert> = {}): WorkflowInsert {
  return {
    id,
    name: id,
    description: '',
    enabled: 1,
    triggerType: 'manual',
    trigger: '{"type":"manual"}',
    graph: JSON.stringify({ nodes: [], edges: [] }),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// ---- tests ------------------------------------------------------------------

describe('TeamScope — tasks', () => {
  let taskRepo: TasksRepository;

  beforeEach(() => {
    taskRepo = makeTaskRepo(createTestDb().db);
    // user-a owns their own task, no team
    taskRepo.insertTask(task('own-a', { createdBy: 'user-a', teamId: null }));
    // user-b owns their own task in team-2
    taskRepo.insertTask(task('own-b', { createdBy: 'user-b', teamId: 'team-2' }));
    // team-1 task owned by user-a
    taskRepo.insertTask(task('team-1-task', { createdBy: 'user-a', teamId: 'team-1' }));
    // legacy task: no owner, no team
    taskRepo.insertTask(task('legacy', { createdBy: null, teamId: null }));
  });

  it('no scope → returns everything (backward compat)', () => {
    const ids = taskRepo.listTasks(undefined, undefined, undefined).map((t) => t.id);
    expect(ids).toContain('own-a');
    expect(ids).toContain('own-b');
    expect(ids).toContain('team-1-task');
    expect(ids).toContain('legacy');
  });

  it('scope with no team → own tasks + legacy only', () => {
    const ids = taskRepo.listTasks(undefined, undefined, { userId: 'user-a', teamId: null }).map((t) => t.id);
    expect(ids).toContain('own-a');
    expect(ids).toContain('team-1-task'); // owned by user-a
    expect(ids).toContain('legacy');      // null created_by = globally visible
    expect(ids).not.toContain('own-b');   // user-b's task, different user, no team overlap
  });

  it('scope with team → own + team tasks + legacy', () => {
    const ids = taskRepo.listTasks(undefined, undefined, { userId: 'user-a', teamId: 'team-1' }).map((t) => t.id);
    expect(ids).toContain('own-a');
    expect(ids).toContain('team-1-task');
    expect(ids).toContain('legacy');
    expect(ids).not.toContain('own-b'); // team-2 task, different user, different team
  });

  it('getTask with scope returns 404 for out-of-scope task', () => {
    const row = taskRepo.getTask('own-b', { userId: 'user-a', teamId: 'team-1' });
    expect(row).toBeUndefined();
  });

  it('getTask with scope finds own task', () => {
    const row = taskRepo.getTask('own-a', { userId: 'user-a', teamId: null });
    expect(row?.id).toBe('own-a');
  });

  it('getTask with scope finds legacy task', () => {
    const row = taskRepo.getTask('legacy', { userId: 'user-a', teamId: null });
    expect(row?.id).toBe('legacy');
  });
});

describe('TeamScope — repos', () => {
  let repoRepo: ReposRepository;

  beforeEach(() => {
    repoRepo = makeRepoRepo(createTestDb().db);
    repoRepo.insert(repo('r-own-a', { createdBy: 'user-a', teamId: null }));
    repoRepo.insert(repo('r-own-b', { createdBy: 'user-b', teamId: 'team-2' }));
    repoRepo.insert(repo('r-team-1', { createdBy: 'user-a', teamId: 'team-1' }));
    repoRepo.insert(repo('r-legacy', { createdBy: null, teamId: null }));
  });

  it('no scope → all repos', () => {
    const ids = repoRepo.list(undefined).map((r) => r.id);
    expect(ids.length).toBe(4);
  });

  it('scope with team → own + team + legacy repos', () => {
    const ids = repoRepo.list({ userId: 'user-a', teamId: 'team-1' }).map((r) => r.id);
    expect(ids).toContain('r-own-a');
    expect(ids).toContain('r-team-1');
    expect(ids).toContain('r-legacy');
    expect(ids).not.toContain('r-own-b');
  });

  it('getById with scope returns undefined for cross-user out-of-team repo', () => {
    expect(repoRepo.getById('r-own-b', { userId: 'user-a', teamId: 'team-1' })).toBeUndefined();
  });

  it('getById with matching team returns repo', () => {
    expect(repoRepo.getById('r-own-b', { userId: 'user-b', teamId: 'team-2' })?.id).toBe('r-own-b');
  });
});

describe('TeamScope — workflows', () => {
  let wfRepo: WorkflowsRepository;

  beforeEach(() => {
    wfRepo = makeWorkflowRepo(createTestDb().db);
    wfRepo.insertWorkflow(workflow('wf-a', { createdBy: 'user-a', teamId: null }));
    wfRepo.insertWorkflow(workflow('wf-b', { createdBy: 'user-b', teamId: 'team-2' }));
    wfRepo.insertWorkflow(workflow('wf-t1', { createdBy: 'user-a', teamId: 'team-1' }));
    wfRepo.insertWorkflow(workflow('wf-legacy', { createdBy: null, teamId: null }));
  });

  it('no scope → all workflows', () => {
    expect(wfRepo.listWorkflowRows(undefined).length).toBe(4);
  });

  it('scoped list excludes cross-team workflow', () => {
    const ids = wfRepo.listWorkflowRows({ userId: 'user-a', teamId: 'team-1' }).map((w) => w.id);
    expect(ids).toContain('wf-a');
    expect(ids).toContain('wf-t1');
    expect(ids).toContain('wf-legacy');
    expect(ids).not.toContain('wf-b');
  });

  it('getWorkflowRow with scope returns undefined when out of scope', () => {
    expect(wfRepo.getWorkflowRow('wf-b', { userId: 'user-a', teamId: 'team-1' })).toBeUndefined();
  });
});

describe('TeamScope — projects', () => {
  let projRepo: ProjectsRepository;

  function project(id: string, overrides: Partial<ProjectInsert> = {}): ProjectInsert {
    return {
      id,
      name: id,
      tag: 'code',
      color: '#fff',
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    };
  }

  beforeEach(() => {
    projRepo = new ProjectsRepository(createTestDb().db);
    projRepo.insertProject(project('p-own-a', { createdBy: 'user-a', teamId: null }));
    projRepo.insertProject(project('p-own-b', { createdBy: 'user-b', teamId: 'team-2' }));
    projRepo.insertProject(project('p-t1', { createdBy: 'user-a', teamId: 'team-1' }));
    projRepo.insertProject(project('p-legacy', { createdBy: null, teamId: null }));
  });

  it('no scope → all projects', () => {
    expect(projRepo.listProjects(undefined).length).toBe(4);
  });

  it('scoped list excludes cross-team project, includes legacy', () => {
    const ids = projRepo.listProjects({ userId: 'user-a', teamId: 'team-1' }).map((p) => p.id);
    expect(ids).toContain('p-own-a');
    expect(ids).toContain('p-t1');
    expect(ids).toContain('p-legacy');
    expect(ids).not.toContain('p-own-b');
  });

  it('getProject with scope returns undefined for out-of-scope project', () => {
    expect(projRepo.getProject('p-own-b', { userId: 'user-a', teamId: 'team-1' })).toBeUndefined();
  });

  it('getProject with scope returns legacy project', () => {
    expect(projRepo.getProject('p-legacy', { userId: 'user-a', teamId: 'team-1' })?.id).toBe('p-legacy');
  });
});
