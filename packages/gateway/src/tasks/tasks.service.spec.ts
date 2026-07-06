import { describe, expect, it, vi } from 'vitest';
import { MAX_BULK_LINES, parseConfig } from '@midnite/shared';

const stubConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });
import type { Status, Task, TaskAttachment, TaskBoardEvent, TaskEvent } from '@midnite/shared';
import type {
  TaskAttachmentInsert,
  TaskEventInsert,
  TaskInsert,
  TaskRow,
} from '../db/schema';
import { HeldTasksRegistry } from './held-tasks.registry';
import { TasksRepository } from './tasks.repository';
import { TaskFailuresRepository } from './task-failures.repository';
import { TasksService } from './tasks.service';
import { TaskEventBus } from './task-event-bus';
import { TaskClassifier, type ClassifierImage } from '../agent/classifier.service';
import type { PlannerService } from '../agent/planner.service';
import type { ReposService } from '../repos/repos.service';

class StubClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[]) {
    return { title: prompt.slice(0, 40), kind: 'feature' as const };
  }
}

// Always-ready planner that guesses no repo, so existing status assertions
// (→ todo) and unassigned-repo assertions hold.
const stubPlanner = {
  triage: async () => ({ ready: true }),
  guessRepo: async () => null,
} as unknown as PlannerService;

// A repo-registry stub: the given names resolve to a repo (by name and via
// `list()`); everything else is unknown. `stubRepos` (no names) is the default
// for tests that don't set a repo.
function reposWith(...names: string[]): ReposService {
  const repos = names.map((name) => ({
    id: name,
    name,
    path: `~/repos/${name}`,
    createdAt: '',
    updatedAt: '',
  }));
  return {
    list: () => repos,
    findByName: (name: string) => repos.find((r) => r.name === name),
  } as unknown as ReposService;
}
const stubRepos = reposWith();

// Phase 53 A — a no-op failures repo; these specs don't assert on failure records
// (that's covered in task-failures.spec.ts / the runner spec).
const stubFailures = {
  insert: () => {},
  listByTask: () => [],
} as unknown as TaskFailuresRepository;

class InMemoryRepo extends TasksRepository {
  readonly tasks: TaskRow[] = [];
  readonly events: TaskEventInsert[] = [];
  readonly attachments: TaskAttachmentInsert[] = [];

  constructor() {
    super({} as never);
  }

  override insertTask(row: TaskInsert): TaskRow {
    const full: TaskRow = {
      id: row.id,
      title: row.title,
      kind: row.kind ?? 'unknown',
      status: row.status ?? 'todo',
      priority: row.priority ?? 1,
      retryCount: row.retryCount ?? 0,
      fixAttempts: row.fixAttempts ?? 0,
      nextRetryAt: row.nextRetryAt ?? null,
      waitReason: row.waitReason ?? null,
      prompt: row.prompt ?? null,
      repo: row.repo ?? null,
      agentId: row.agentId ?? null,
      sessionId: row.sessionId ?? null,
      projectId: row.projectId ?? null,
      prUrl: row.prUrl ?? null,
      tags: row.tags ?? null,
      aiReview: row.aiReview ?? null,
      archivedAt: row.archivedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? null,
      teamId: row.teamId ?? null,
    };
    this.tasks.push(full);
    return full;
  }

  override setSession(id: string, sessionId: string | null, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.sessionId = sessionId;
    task.updatedAt = updatedAt;
    return task;
  }

  override incrementRetry(
    id: string,
    updatedAt: string,
    nextRetryAt: string | null,
  ): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.retryCount += 1;
    task.nextRetryAt = nextRetryAt;
    task.updatedAt = updatedAt;
    return task;
  }

  override setWaitReason(
    id: string,
    waitReason: TaskRow['waitReason'],
    updatedAt: string,
  ): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.waitReason = waitReason;
    task.updatedAt = updatedAt;
    return task;
  }

  override setPrompt(id: string, prompt: string, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.prompt = prompt;
    task.updatedAt = updatedAt;
    return task;
  }

  override clearNextRetry(id: string, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.nextRetryAt = null;
    task.updatedAt = updatedAt;
    return task;
  }

  override insertEvent(row: TaskEventInsert): void {
    this.events.push(row);
  }

  override insertAttachment(row: TaskAttachmentInsert): void {
    this.attachments.push(row);
  }

  override updateStatus(id: string, status: Status, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.status = status;
    task.updatedAt = updatedAt;
    return task;
  }

  override setPriority(id: string, priority: number, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.priority = priority;
    task.updatedAt = updatedAt;
    return task;
  }

  override setArchived(id: string, archivedAt: string | null, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.archivedAt = archivedAt;
    task.updatedAt = updatedAt;
    return task;
  }

  override setRepo(id: string, repo: string | null, updatedAt: string): TaskRow | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    task.repo = repo;
    task.updatedAt = updatedAt;
    return task;
  }

  override deleteTask(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx >= 0) this.tasks.splice(idx, 1);
  }

  // This fake models no dependency edges (those are exercised against a real DB
  // in tasks.dependencies.spec.ts); stub the lookup the terminal-transition
  // notify hook calls so it stays a no-op here.
  override dependentsOf(): string[] {
    return [];
  }

  override listTasks(status?: Status): TaskRow[] {
    return status ? this.tasks.filter((t) => t.status === status) : [...this.tasks];
  }

  override getTask(id: string): TaskRow | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  override listEvents(taskId: string): TaskEvent[] {
    return this.events
      .filter((e) => e.taskId === taskId)
      .map((e) => ({
        at: e.at,
        kind: e.kind,
        data: e.data ? (JSON.parse(e.data) as Record<string, unknown>) : undefined,
      }));
  }

  override listAttachments(taskId: string): TaskAttachment[] {
    return this.attachments
      .filter((a) => a.taskId === taskId)
      .map((a) => ({
        id: a.id,
        taskId: a.taskId,
        path: a.path,
        mime: a.mime,
        size: a.size,
        originalName: a.originalName ?? undefined,
        createdAt: a.createdAt,
      }));
  }

  override countsByStatus(): Record<Status, number> {
    const result: Record<Status, number> = {
      backlog: 0, todo: 0, wip: 0, waiting: 0, done: 0, abandoned: 0,
    };
    for (const t of this.tasks) result[t.status as Status]++;
    return result;
  }

  override hydrate(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      kind: row.kind as Task['kind'],
      status: row.status as Status,
      priority: row.priority,
      retryCount: row.retryCount,
      fixAttempts: row.fixAttempts ?? 0,
      prompt: row.prompt ?? undefined,
      repo: row.repo ?? undefined,
      agentId: row.agentId ?? undefined,
      sessionId: row.sessionId ?? undefined,
      projectId: row.projectId ?? undefined,
      prUrl: row.prUrl ?? undefined,
      waitReason: (row.waitReason as Task['waitReason']) ?? undefined,
      tags: [],
      dependsOn: [],
      archivedAt: row.archivedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: this.listEvents(row.id),
      attachments: this.listAttachments(row.id),
    };
  }

  // The batched path (Phase 57 B) is contractually `rows.map(hydrate)`; the fake
  // has no real db, so mirror that directly rather than hitting the SQL loaders.
  override hydrateMany(rows: TaskRow[]): Task[] {
    return rows.map((r) => this.hydrate(r));
  }
}

function seed(repo: InMemoryRepo, statuses: Status[]) {
  for (const [i, status] of statuses.entries()) {
    repo.insertTask({
      id: `t${i}`,
      title: `task ${i}`,
      kind: 'unknown',
      status,
      createdAt: new Date(2026, 0, i + 1).toISOString(),
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
    });
  }
}

describe('TasksService', () => {
  it('maps 6 raw statuses into 4 dashboard buckets, excluding abandoned', () => {
    const repo = new InMemoryRepo();
    seed(repo, [
      'backlog', 'backlog',
      'todo', 'todo', 'todo',
      'wip',
      'waiting',
      'done', 'done',
      'abandoned',
    ]);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    const counts = service.getCounts();
    // backlog and todo are now distinct buckets; wip + waiting fold into
    // inProgress; abandoned is excluded from the dashboard entirely.
    expect(counts).toEqual({ backlog: 2, todo: 3, inProgress: 2, done: 2 });
  });

  it('createFromPrompt persists task, classifies, and emits task.created event', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({
      prompt: 'add a CSV export to the reports page',
      images: [],
    });

    expect(task.status).toBe('todo');
    expect(task.kind).toBe('feature');
    expect(task.title).toBe('add a CSV export to the reports page');
    expect(task.events.map((e) => e.kind)).toContain('task.created');
    expect(repo.tasks).toHaveLength(1);
  });

  it('attaches the scheduler-held reason to a todo task on read (Phase 50 B), only while todo', async () => {
    const repo = new InMemoryRepo();
    const held = new HeldTasksRegistry();
    const service = new TasksService(
      repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig,
      undefined, undefined, held,
    );
    const task = await service.createFromPrompt({ prompt: 'held work', images: [] });

    // Not held yet.
    expect(service.getTask(task.id).heldReason).toBeUndefined();

    // Scheduler marks it held → surfaced on read + in the list.
    held.replace(new Map([[task.id, 'over-budget']]));
    expect(service.getTask(task.id).heldReason).toBe('over-budget');
    expect(service.listTasks().find((t) => t.id === task.id)?.heldReason).toBe('over-budget');

    // Once it leaves todo (spawned), the derived reason is not attached even if a
    // stale registry entry lingers until the next reconcile.
    service.updateStatus(task.id, 'wip');
    expect(service.getTask(task.id).heldReason).toBeUndefined();
  });

  it('createFromPrompt honours an explicit status (e.g. backlog)', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({
      prompt: 'park this idea for later',
      status: 'backlog',
      images: [],
    });

    expect(task.status).toBe('backlog');
  });

  it('createFromPrompt persists a known repo by name (Phase 13 B2)', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('web'), stubConfig);

    const task = await service.createFromPrompt({ prompt: 'tweak the nav', repo: 'web', images: [] });

    expect(task.repo).toBe('web');
  });

  it('createFromPrompt rejects an unknown repo and persists nothing (Phase 13 B2)', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('web'), stubConfig);

    await expect(
      service.createFromPrompt({ prompt: 'tweak the nav', repo: 'ghost', images: [] }),
    ).rejects.toThrow(/unknown repo "ghost"/);
    expect(repo.tasks).toHaveLength(0);
  });

  it('createFromPrompt treats a blank repo as unassigned (null)', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('web'), stubConfig);

    const task = await service.createFromPrompt({ prompt: 'no repo', repo: '   ', images: [] });

    expect(task.repo).toBeUndefined();
    expect(repo.tasks[0]!.repo).toBeNull();
  });

  it('infers the repo from the registry when the caller names none (Phase 4 / outstanding #5)', async () => {
    const repo = new InMemoryRepo();
    const guessRepo = vi.fn(
      async (_prompt: string, _repos: Array<{ name: string; path: string }>) => 'web',
    );
    const planner = { triage: async () => ({ ready: true }), guessRepo } as unknown as PlannerService;
    const service = new TasksService(repo, stubFailures, new StubClassifier(), planner, new TaskEventBus(), reposWith('web', 'api'), stubConfig);

    const task = await service.createFromPrompt({ prompt: 'fix the kanban drag', images: [] });

    expect(task.repo).toBe('web');
    // the guess was offered the full registry manifest (name + path)
    expect(guessRepo.mock.calls[0]![1]).toEqual([
      { name: 'web', path: '~/repos/web' },
      { name: 'api', path: '~/repos/api' },
    ]);
    // the inference is recorded on the task.created event for auditability
    const created = repo.events.find((e) => e.kind === 'task.created');
    expect(JSON.parse(created!.data!)).toMatchObject({ repo: 'web', repoInferred: true });
  });

  it('an explicit repo wins over inference and the planner is not consulted', async () => {
    const repo = new InMemoryRepo();
    const guessRepo = vi.fn(
      async (_prompt: string, _repos: Array<{ name: string; path: string }>) => 'web',
    );
    const planner = { triage: async () => ({ ready: true }), guessRepo } as unknown as PlannerService;
    const service = new TasksService(repo, stubFailures, new StubClassifier(), planner, new TaskEventBus(), reposWith('web', 'api'), stubConfig);

    const task = await service.createFromPrompt({ prompt: 'tweak the API', repo: 'api', images: [] });

    expect(task.repo).toBe('api');
    expect(guessRepo).not.toHaveBeenCalled();
    const created = repo.events.find((e) => e.kind === 'task.created');
    expect(JSON.parse(created!.data!).repoInferred).toBeUndefined();
  });

  it('does not infer a repo when the registry is empty', async () => {
    const repo = new InMemoryRepo();
    const guessRepo = vi.fn(
      async (_prompt: string, _repos: Array<{ name: string; path: string }>) => 'web',
    );
    const planner = { triage: async () => ({ ready: true }), guessRepo } as unknown as PlannerService;
    const service = new TasksService(repo, stubFailures, new StubClassifier(), planner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({ prompt: 'no repos registered', images: [] });

    expect(task.repo).toBeUndefined();
    expect(guessRepo).not.toHaveBeenCalled();
  });

  it('createFromPrompt records attachments against the new task', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({
      prompt: 'fix layout',
      images: [
        { path: 'abc/one.png', mime: 'image/png', size: 1234, originalName: 'one.png' },
      ],
    });

    expect(repo.attachments).toHaveLength(1);
    expect(repo.attachments[0]!.taskId).toBe(task.id);
    expect(task.attachments?.[0]?.path).toBe('abc/one.png');
  });

  it('updateStatus changes status and emits status.changed event', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['todo']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    const updated = service.updateStatus('t0', 'wip');
    expect(updated.status).toBe('wip');
    expect(repo.events.some((e) => e.kind === 'status.changed')).toBe(true);
    expect(updated.archivedAt).toBeUndefined();
  });

  it('setPriority changes the band and emits task.priority.changed', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['todo']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    const updated = service.setPriority('t0', 3);
    expect(updated.priority).toBe(3);
    expect(repo.events.some((e) => e.kind === 'task.priority.changed')).toBe(true);
  });

  it('setPriority throws for an unknown task', () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    expect(() => service.setPriority('nope', 2)).toThrow();
  });

  it('setRepo assigns a known repo and emits task.repo.changed (Phase 59 B)', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['todo']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('api'), stubConfig);
    const updated = service.setRepo('t0', 'api');
    expect(updated.repo).toBe('api');
    expect(repo.events.some((e) => e.kind === 'task.repo.changed')).toBe(true);
  });

  it('setRepo rejects an unknown repo and clears on blank', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['todo']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('api'), stubConfig);
    expect(() => service.setRepo('t0', 'ghost')).toThrow();
    const cleared = service.setRepo('t0', null);
    expect(cleared.repo).toBeFalsy();
  });

  it('abandoning a task auto-archives it and emits task.archived', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['wip']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    const updated = service.updateStatus('t0', 'abandoned');
    expect(updated.status).toBe('abandoned');
    expect(updated.archivedAt).toBeDefined();
    expect(repo.events.some((e) => e.kind === 'task.archived')).toBe(true);
  });

  it('archive/unarchive toggles archivedAt and emits events', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['done']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const archived = service.archive('t0');
    expect(archived.archivedAt).toBeDefined();
    expect(repo.events.some((e) => e.kind === 'task.archived')).toBe(true);

    const unarchived = service.unarchive('t0');
    expect(unarchived.archivedAt).toBeUndefined();
    expect(repo.events.some((e) => e.kind === 'task.unarchived')).toBe(true);
  });

  it('deleteTask refuses to delete a task that is not archived', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['done']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    expect(() => service.deleteTask('t0')).toThrow(/archived/);
    expect(repo.tasks).toHaveLength(1);
  });

  it('deleteTask removes a task once it has been archived', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['done']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    service.archive('t0');
    service.deleteTask('t0');
    expect(repo.tasks).toHaveLength(0);
  });

  it('deleteTask 404s for an unknown task', () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    expect(() => service.deleteTask('nope')).toThrow();
  });

  it('moving out of abandoned does not auto-unarchive', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['wip']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
    service.updateStatus('t0', 'abandoned');
    const back = service.updateStatus('t0', 'todo');
    expect(back.status).toBe('todo');
    expect(back.archivedAt).toBeDefined();
  });

  it('createFromPrompt stores the given priority (clamped), defaulting to Normal', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const urgent = await service.createFromPrompt({ prompt: 'ship it', priority: 3, images: [] });
    expect(urgent.priority).toBe(3);

    const normal = await service.createFromPrompt({ prompt: 'someday', images: [] });
    expect(normal.priority).toBe(1);

    const clamped = await service.createFromPrompt({ prompt: 'oops', priority: 99, images: [] });
    expect(clamped.priority).toBe(3);
  });

  it('answers a question-kind task inline → resolves to done with an answer event', async () => {
    const repo = new InMemoryRepo();
    const classifier = {
      classify: async (p: string) => ({ title: p.slice(0, 40), kind: 'question' as const }),
    } as unknown as TaskClassifier;
    const planner = {
      triage: async () => ({ ready: true }),
      answer: async () => 'Use a memoization helper.',
    } as unknown as PlannerService;
    const service = new TasksService(repo, stubFailures, classifier, planner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({ prompt: 'how do I memoize a fn?', images: [] });
    expect(task.kind).toBe('question');
    expect(task.status).toBe('done'); // answered inline, not queued for an agent
    const answerEvent = repo.events.find((e) => e.kind === 'answer');
    expect(answerEvent).toBeDefined();
    expect(JSON.parse(answerEvent!.data as string)).toEqual({ text: 'Use a memoization helper.' });
  });

  it('leaves a question queued when no answer is produced (fail-soft)', async () => {
    const repo = new InMemoryRepo();
    const classifier = {
      classify: async (p: string) => ({ title: p.slice(0, 40), kind: 'question' as const }),
    } as unknown as TaskClassifier;
    const planner = {
      triage: async () => ({ ready: true }),
      answer: async () => null,
    } as unknown as PlannerService;
    const service = new TasksService(repo, stubFailures, classifier, planner, new TaskEventBus(), stubRepos, stubConfig);

    const task = await service.createFromPrompt({ prompt: 'unanswerable?', images: [] });
    expect(task.status).toBe('todo'); // falls back to the planner's triage column
    expect(repo.events.some((e) => e.kind === 'answer')).toBe(false);
  });

  it('does not attempt to answer non-question tasks', async () => {
    const repo = new InMemoryRepo();
    const answer = vi.fn();
    const planner = { triage: async () => ({ ready: true }), answer } as unknown as PlannerService;
    // StubClassifier returns kind 'feature'.
    const service = new TasksService(repo, stubFailures, new StubClassifier(), planner, new TaskEventBus(), stubRepos, stubConfig);

    await service.createFromPrompt({ prompt: 'add a setting', images: [] });
    expect(answer).not.toHaveBeenCalled();
  });

  it('retry bumps retryCount, returns the task to todo, and emits agent.retried', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['wip']);
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const first = service.retry('t0');
    expect(first.status).toBe('todo');
    expect(first.retryCount).toBe(1);
    expect(repo.events.some((e) => e.kind === 'agent.retried')).toBe(true);

    const second = service.retry('t0');
    expect(second.retryCount).toBe(2);
  });

  it('recordFailure writes a failure + agent.failed event without changing status (Phase 53 A)', () => {
    const repo = new InMemoryRepo();
    seed(repo, ['wip']);
    const inserts: unknown[] = [];
    const failures = {
      insert: (row: unknown) => inserts.push(row),
      listByTask: () => [],
    } as unknown as TaskFailuresRepository;
    const service = new TasksService(repo, failures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    service.recordFailure('t0', { class: 'crash', detail: 'exit 1', exitCode: 1, lastOutput: 'boom' });

    // Additive: the task stays exactly where it was — no retry/abandon here.
    expect(service.getTask('t0').status).toBe('wip');
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ taskId: 't0', class: 'crash', exitCode: 1, retryIndex: 0 });
    // A companion event keeps the task thread readable.
    const failed = repo.events.find((e) => e.kind === 'agent.failed');
    expect(failed).toBeDefined();
    expect(JSON.parse(failed!.data as string)).toMatchObject({ class: 'crash' });
  });
});

// Throws on any prompt containing BOOM, so a single line can fail classification
// while its neighbours succeed (partial-failure test).
class FlakyClassifier extends TaskClassifier {
  async classify(prompt: string, _images: ClassifierImage[]) {
    if (prompt.includes('BOOM')) throw new Error('classify failed');
    return { title: prompt.slice(0, 40), kind: 'bug' as const };
  }
}

describe('TasksService.createBulk', () => {
  it('creates one task per parsed line, stripping a markdown marker', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const res = await service.createBulk({ raw: 'fix login bug\n- add dark mode\nwrite docs' });

    expect(res.counts.created).toBe(3);
    expect(repo.tasks).toHaveLength(3);
    expect(repo.tasks.map((t) => t.title)).toEqual(['fix login bug', 'add dark mode', 'write docs']);
    expect(res.results.every((r) => r.kind === 'feature' && r.status === 'todo')).toBe(true);
  });

  it('skips blank and comment lines, counting them as skipped', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const res = await service.createBulk({ raw: 'fix login bug\n# a comment\n\nwrite docs\n' });

    expect(res.counts).toEqual({ created: 2, skipped: 2, failed: 0 });
    expect(repo.tasks).toHaveLength(2);
  });

  it('returns a per-line error for a failing line while the rest succeed', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new FlakyClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const res = await service.createBulk({ lines: ['good one', 'BOOM bad', 'good two'] });

    expect(res.counts).toEqual({ created: 2, skipped: 0, failed: 1 });
    expect(repo.tasks).toHaveLength(2);
    const bad = res.results.find((r) => r.line === 'BOOM bad');
    expect(bad?.taskId).toBeUndefined();
    expect(bad?.error).toMatch(/classify failed/);
  });

  it('emits exactly one coalesced board event for the whole batch', async () => {
    const repo = new InMemoryRepo();
    const bus = new TaskEventBus();
    const events: TaskBoardEvent[] = [];
    bus.subscribe((e) => events.push(e));
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, bus, stubRepos, stubConfig);

    await service.createBulk({ raw: 'a\nb\nc' });

    expect(events).toHaveLength(1);
    const evt = events[0]!;
    expect(evt.type).toBe('tasks.bulkCreated');
    if (evt.type === 'tasks.bulkCreated') {
      expect(evt.taskIds).toHaveLength(3);
    }
  });

  it('applies batch-wide repo, priority, and project to every created task', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('midnite'), stubConfig);

    await service.createBulk({ lines: ['one', 'two'], repo: 'midnite', priority: 3, projectId: 'proj-1' });

    expect(repo.tasks).toHaveLength(2);
    expect(
      repo.tasks.every((t) => t.repo === 'midnite' && t.priority === 3 && t.projectId === 'proj-1'),
    ).toBe(true);
  });

  it('rejects a batch with an unknown repo before creating anything (Phase 13 B2)', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), reposWith('midnite'), stubConfig);

    await expect(service.createBulk({ lines: ['one', 'two'], repo: 'ghost' })).rejects.toThrow(
      /unknown repo "ghost"/,
    );
    expect(repo.tasks).toHaveLength(0);
  });

  it('rejects a batch over the line cap before creating anything', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    const lines = Array.from({ length: MAX_BULK_LINES + 1 }, (_, i) => `task ${i}`);
    await expect(service.createBulk({ lines })).rejects.toThrow(/cap/);
    expect(repo.tasks).toHaveLength(0);
  });

  it('rejects a request with no usable task lines', async () => {
    const repo = new InMemoryRepo();
    const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);

    await expect(service.createBulk({ raw: '# only a comment\n\n' })).rejects.toThrow(/no task lines/);
  });

  // --- Phase 53 D: escalate-to-human + resolution ---
  describe('needs-attention escalation & resolution', () => {
    const build = () => {
      const repo = new InMemoryRepo();
      const service = new TasksService(repo, stubFailures, new StubClassifier(), stubPlanner, new TaskEventBus(), stubRepos, stubConfig);
      return { repo, service };
    };
    const make = async (service: TasksService) =>
      service.createFromPrompt({ prompt: 'do the thing', images: [] });

    it('escalate parks the task in waiting with a typed reason (not abandoned)', async () => {
      const { service } = build();
      const t = await make(service);
      const out = service.escalate(t.id, 'retries-exhausted');
      expect(out.status).toBe('waiting');
      expect(out.waitReason).toBe('retries-exhausted');
    });

    it('markWaiting defaults to needs-input; a needs-input wait is not needs-attention', async () => {
      const { service } = build();
      const t = await make(service);
      const out = service.markWaiting(t.id);
      expect(out.status).toBe('waiting');
      expect(out.waitReason).toBe('needs-input');
    });

    it('resolve→requeue returns the task to todo and clears the wait reason', async () => {
      const { service } = build();
      const t = await make(service);
      service.escalate(t.id, 'agent-failed');
      const out = service.resolveNeedsAttention(t.id, 'requeue');
      expect(out.status).toBe('todo');
      expect(out.waitReason ?? null).toBeNull();
    });

    it('resolve→replan overwrites the prompt and requeues', async () => {
      const { service } = build();
      const t = await make(service);
      service.escalate(t.id, 'gate-failed');
      const out = service.resolveNeedsAttention(t.id, 'replan', 'try a different approach');
      expect(out.status).toBe('todo');
      expect(out.prompt).toBe('try a different approach');
      expect(out.waitReason ?? null).toBeNull();
    });

    it('resolve→replan without a prompt is rejected', async () => {
      const { service } = build();
      const t = await make(service);
      service.escalate(t.id, 'gate-failed');
      expect(() => service.resolveNeedsAttention(t.id, 'replan')).toThrow(/replan requires a prompt/);
    });

    it('resolve→abandon is the explicit terminal (archived)', async () => {
      const { repo, service } = build();
      const t = await make(service);
      service.escalate(t.id, 'timed-out');
      const out = service.resolveNeedsAttention(t.id, 'abandon');
      expect(out.status).toBe('abandoned');
      expect(repo.getTask(t.id)!.archivedAt).toBeTruthy();
      expect(out.waitReason ?? null).toBeNull();
    });

    it('starting a task clears any stale wait reason', async () => {
      const { service } = build();
      const t = await make(service);
      service.escalate(t.id, 'agent-failed');
      const out = service.startTask(t.id);
      expect(out.status).toBe('wip');
      expect(out.waitReason ?? null).toBeNull();
    });
  });
});
