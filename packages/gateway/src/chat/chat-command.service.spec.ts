import { describe, expect, it, vi } from 'vitest';
import type { ChatInferencePath, ChatIntent, ChatIntentSource } from '@midnite/shared';
import { ChatCommandService, describeIntent, isMutating } from './chat-command.service';
import type { ChatCommandsRepository } from './chat-commands.repository';
import type { ChatIntentService } from './chat-intent.service';
import type { TasksService } from '../tasks/tasks.service';
import type { BreakdownService } from '../agent/breakdown.service';
import type { ProjectsService } from '../projects/projects.service';
import type { AuditService } from '../audit/audit.service';

const TASKS = [
  { id: 't1', title: 'Fix login bug' },
  { id: 't2', title: 'Add logout' },
  { id: 't3', title: 'Fix login flow' },
];
const PROJECTS = [{ id: 'p1', name: 'Core' }];

function build(overrides: {
  parse?: { intent: ChatIntent; source?: ChatIntentSource; inferencePath?: ChatInferencePath };
  tasks?: Partial<TasksService>;
  breakdown?: Partial<BreakdownService>;
}) {
  const src: ChatIntentSource = overrides.parse?.source ?? 'grammar';
  // The router (ChatIntentService, tested in its own spec) resolves inferencePath;
  // the executor just consumes it. Default to the natural pairing for the source.
  const parseResult = overrides.parse
    ? {
        intent: overrides.parse.intent,
        source: src,
        confidence: src === 'grammar' ? 1 : 0.75,
        inferencePath: overrides.parse.inferencePath ?? (src === 'llm' ? 'provider' : 'deterministic'),
      }
    : undefined;
  const intents = { parse: vi.fn().mockResolvedValue(parseResult) } as unknown as ChatIntentService;
  const tasks = {
    listTasks: vi.fn().mockReturnValue(TASKS),
    // Prior-state read for revert capture (setPriority/setStatus/assign).
    getTask: vi.fn((id: string) => ({ id, title: 'Fix login bug', priority: 1, status: 'todo', repo: undefined, projectId: undefined })),
    createFromPrompt: vi.fn().mockResolvedValue({ id: 'new1', title: 'X' }),
    createBulk: vi.fn(),
    createTasksFromBreakdown: vi.fn(),
    setPriority: vi.fn((id: string) => ({ id, title: 'Fix login bug' })),
    updateStatus: vi.fn((id: string) => ({ id, title: 'Fix login bug' })),
    setRepo: vi.fn((id: string) => ({ id, title: 'Fix login bug' })),
    setProject: vi.fn((id: string) => ({ id, title: 'Fix login bug' })),
    addDependency: vi.fn((id: string) => ({ id, title: 'Fix login bug' })),
    ...overrides.tasks,
  } as unknown as TasksService;
  const breakdown = {
    generate: vi.fn(),
    ...overrides.breakdown,
  } as unknown as BreakdownService;
  const projects = { listProjects: vi.fn().mockReturnValue(PROJECTS) } as unknown as ProjectsService;
  const log = { insert: vi.fn(), getById: vi.fn(), markUndone: vi.fn() } as unknown as ChatCommandsRepository;
  const audit = { record: vi.fn() } as unknown as AuditService;
  return {
    svc: new ChatCommandService(intents, tasks, breakdown, projects, log, audit),
    tasks,
    breakdown,
    log,
    audit,
  };
}

// Mutating commands are gated: they only write with confirm=true (Theme F).
const CONFIRM = true;

describe('ChatCommandService.execute', () => {
  it('createTask → createFromPrompt, deterministic path for a grammar parse', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'createTask', title: 'ship it', repo: 'api', priority: 2 } } });
    const { result, parse } = await svc.execute('add "ship it" p2 repo:api', undefined, CONFIRM);
    expect(tasks.createFromPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'ship it', repo: 'api', priority: 2 }),
    );
    expect(result.affectedIds).toEqual(['new1']);
    expect(result.inferencePath).toBe('deterministic');
    expect(result.confirmation).toBe('none');
    expect(parse.source).toBe('grammar');
  });

  it('bulkCreate → createBulk, ids from results', async () => {
    const { svc, tasks } = build({
      parse: { intent: { type: 'bulkCreate', titles: ['a', 'b'] } },
      tasks: {
        createBulk: vi.fn().mockResolvedValue({
          results: [{ line: 'a', taskId: 'x1' }, { line: 'b', taskId: 'x2' }],
          counts: { created: 2, skipped: 0, failed: 0 },
        }),
      },
    });
    const { result } = await svc.execute('add a, b', undefined, CONFIRM);
    expect(tasks.createBulk).toHaveBeenCalledWith(expect.objectContaining({ lines: ['a', 'b'] }));
    expect(result.affectedIds).toEqual(['x1', 'x2']);
    expect(result.summary).toContain('2 tasks');
  });

  it('breakdown → generate + createTasksFromBreakdown', async () => {
    const { svc, tasks, breakdown } = build({
      parse: { intent: { type: 'breakdown', goal: 'build billing' } },
      breakdown: {
        generate: vi.fn().mockResolvedValue({ breakdown: { tasks: [{ ref: 'a', title: 'A', dependsOn: [] }] }, isFallback: false }),
      },
      tasks: { createTasksFromBreakdown: vi.fn().mockReturnValue([{ id: 'b1', title: 'A' }]) },
    });
    const { result } = await svc.execute('breakdown build billing', undefined, CONFIRM);
    expect(breakdown.generate).toHaveBeenCalledWith(expect.objectContaining({ goal: 'build billing' }));
    expect(tasks.createTasksFromBreakdown).toHaveBeenCalled();
    expect(result.affectedIds).toEqual(['b1']);
  });

  it('setPriority resolves a unique title ref', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'setPriority', task: 'add logout', priority: 3 } } });
    const { result } = await svc.execute('set "add logout" p3', undefined, CONFIRM);
    expect(tasks.setPriority).toHaveBeenCalledWith('t2', 3);
    expect(result.affectedIds).toEqual(['t2']);
  });

  it('setStatus resolves by exact task id', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'setStatus', task: 't1', status: 'wip' } } });
    await svc.execute('move t1 to wip', undefined, CONFIRM);
    expect(tasks.updateStatus).toHaveBeenCalledWith('t1', 'wip');
  });

  it('fails (no service call) when a ref matches nothing', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'setStatus', task: 'nonexistent', status: 'wip' } } });
    const { result } = await svc.execute('move nonexistent to wip', undefined, CONFIRM);
    expect(tasks.updateStatus).not.toHaveBeenCalled();
    expect(result.affectedIds).toEqual([]);
    expect(result.summary).toMatch(/no task matches/i);
  });

  it('fails when a title ref is ambiguous', async () => {
    // "fix login" matches both t1 and t3.
    const { svc, tasks } = build({ parse: { intent: { type: 'setPriority', task: 'fix login', priority: 1 } } });
    const { result } = await svc.execute('set "fix login" p1', undefined, CONFIRM);
    expect(tasks.setPriority).not.toHaveBeenCalled();
    expect(result.summary).toMatch(/matches 2 tasks/i);
  });

  it('assign repo uses setRepo; project resolves name → id', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'assign', task: 't1', repo: 'api', project: 'Core' } } });
    const { result } = await svc.execute('assign t1 repo:api project:Core', undefined, CONFIRM);
    expect(tasks.setRepo).toHaveBeenCalledWith('t1', 'api');
    expect(tasks.setProject).toHaveBeenCalledWith('t1', 'p1');
    expect(result.affectedIds).toEqual(['t1']);
  });

  it('assign milestone-only reports not-available (no write)', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'assign', task: 't1', milestone: 'm1' } } });
    const { result } = await svc.execute('assign t1 @m1', undefined, CONFIRM);
    expect(tasks.setRepo).not.toHaveBeenCalled();
    expect(tasks.setProject).not.toHaveBeenCalled();
    expect(result.summary).toMatch(/milestone/i);
  });

  it('addDependency resolves both refs and inherits the cycle-check error', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'addDependency', task: 't1', dependsOn: 't2' } } });
    await svc.execute('depend t1 on t2', undefined, CONFIRM);
    expect(tasks.addDependency).toHaveBeenCalledWith('t1', 't2');

    // A thrown domain error becomes a spoken failure, not a 500.
    const cyclic = build({
      parse: { intent: { type: 'addDependency', task: 't1', dependsOn: 't2' } },
      tasks: {
        addDependency: vi.fn(() => {
          throw new Error('adding this dependency would create a cycle');
        }),
      },
    });
    const { result } = await cyclic.svc.execute('depend t1 on t2', undefined, CONFIRM);
    expect(result.affectedIds).toEqual([]);
    expect(result.summary).toMatch(/cycle/i);
  });

  it('query intents are deferred to Theme C', async () => {
    const { svc } = build({ parse: { intent: { type: 'query', text: 'show blocked', read: { metric: 'list', blocked: true } } } });
    const { result } = await svc.execute('show blocked');
    expect(result.affectedIds).toEqual([]);
    expect(result.summary).toMatch(/aren.t answered yet|follow-up/i);
  });

  it('unknown intents surface the reason', async () => {
    const { svc } = build({ parse: { intent: { type: 'unknown', text: 'huh', reason: 'unclear' } } });
    const { result } = await svc.execute('huh');
    expect(result.summary).toBe('unclear');
  });

  it('propagates the router-resolved inference path onto the result', async () => {
    const local = build({
      parse: { intent: { type: 'createTask', title: 'x' }, source: 'llm', inferencePath: 'local' },
    });
    expect((await local.svc.execute('make a task', undefined, CONFIRM)).result.inferencePath).toBe('local');

    const paid = build({
      parse: { intent: { type: 'createTask', title: 'x' }, source: 'llm', inferencePath: 'provider' },
    });
    expect((await paid.svc.execute('make a task', undefined, CONFIRM)).result.inferencePath).toBe('provider');
  });
});

describe('ChatCommandService.execute — Theme F safety', () => {
  it('a mutating command WITHOUT confirm does not write and asks to confirm', async () => {
    const { svc, tasks, log } = build({ parse: { intent: { type: 'createTask', title: 'ship it' } } });
    const { result } = await svc.execute('add "ship it"'); // no confirm
    expect(tasks.createFromPrompt).not.toHaveBeenCalled();
    expect(result.confirmation).toBe('confirm');
    expect(result.affectedIds).toEqual([]);
    expect(result.undoToken).toBeUndefined();
    expect(result.summary).toMatch(/confirm/i);
    expect(log.insert).not.toHaveBeenCalled();
  });

  it('a read-only query runs immediately without confirm', async () => {
    const { svc } = build({ parse: { intent: { type: 'query', text: 'show blocked', read: { metric: 'list' } } } });
    const { result } = await svc.execute('show blocked'); // no confirm, still runs
    expect(result.confirmation).toBe('none');
  });

  it('a confirmed write logs a revert plan (undo token) and audits the command', async () => {
    const { svc, log, audit } = build({ parse: { intent: { type: 'createTask', title: 'ship it' } } });
    const { result } = await svc.execute('add "ship it"', { userId: 'u1', teamId: 'team1' }, CONFIRM);
    expect(result.undoToken).toBeTruthy();
    // Undo row captures a delete op for the created task.
    expect(log.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        teamId: 'team1',
        intentType: 'createTask',
        revertPlan: JSON.stringify([{ kind: 'delete', taskId: 'new1' }]),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat.command', userId: 'u1', payload: expect.objectContaining({ intentType: 'createTask' }) }),
    );
  });

  it('captures the prior value in the revert plan for a field change', async () => {
    const { svc, log } = build({
      parse: { intent: { type: 'setPriority', task: 't2', priority: 3 } },
      tasks: { getTask: vi.fn(() => ({ id: 't2', title: 'Add logout', priority: 0, status: 'todo' })) as never },
    });
    await svc.execute('set t2 p3', undefined, CONFIRM);
    expect(log.insert).toHaveBeenCalledWith(
      expect.objectContaining({ revertPlan: JSON.stringify([{ kind: 'restorePriority', taskId: 't2', priority: 0 }]) }),
    );
  });

  it('does not log an undo token when nothing changed (all bulk lines failed)', async () => {
    const { svc, log } = build({
      parse: { intent: { type: 'bulkCreate', titles: ['a'] } },
      tasks: {
        createBulk: vi.fn().mockResolvedValue({ results: [{ line: 'a', taskId: null }], counts: { created: 0, skipped: 0, failed: 1 } }),
      },
    });
    const { result } = await svc.execute('add a', undefined, CONFIRM);
    expect(result.undoToken).toBeUndefined();
    expect(log.insert).not.toHaveBeenCalled();
  });
});

describe('ChatCommandService.preview', () => {
  it('describes without executing, flags mutation + confirm level', async () => {
    const { svc, tasks } = build({ parse: { intent: { type: 'createTask', title: 'ship it', repo: 'api' } } });
    const preview = await svc.preview('add "ship it" repo:api');
    expect(preview.willMutate).toBe(true);
    expect(preview.confirmation).toBe('confirm');
    expect(preview.description).toMatch(/create task/i);
    expect(tasks.createFromPrompt).not.toHaveBeenCalled();
  });

  it('flags a query as non-mutating (confirm none)', async () => {
    const { svc } = build({ parse: { intent: { type: 'query', text: 'todo count', read: { metric: 'count', status: 'todo' } } } });
    const preview = await svc.preview('todo count');
    expect(preview.willMutate).toBe(false);
    expect(preview.confirmation).toBe('none');
  });
});

describe('helpers', () => {
  it('isMutating is false only for query/unknown', () => {
    expect(isMutating({ type: 'createTask', title: 'x' })).toBe(true);
    expect(isMutating({ type: 'query', text: 'x' })).toBe(false);
    expect(isMutating({ type: 'unknown', text: 'x' })).toBe(false);
  });

  it('describeIntent covers each variant', () => {
    expect(describeIntent({ type: 'setStatus', task: 'a', status: 'done' })).toMatch(/move/i);
    expect(describeIntent({ type: 'addDependency', task: 'a', dependsOn: 'b' })).toMatch(/depend/i);
  });
});
