import { describe, expect, it, vi } from 'vitest';
import type { ChatCommandRow } from '../db/schema';
import type { AuditService } from '../audit/audit.service';
import type { TasksService } from '../tasks/tasks.service';
import { ChatUndoService } from './chat-undo.service';
import type { ChatCommandsRepository } from './chat-commands.repository';

function row(overrides: Partial<ChatCommandRow> = {}): ChatCommandRow {
  return {
    id: 'tok1',
    userId: 'u1',
    teamId: 'team1',
    text: 'add "x"',
    intentType: 'createTask',
    inferencePath: 'deterministic',
    affectedIds: JSON.stringify(['new1']),
    revertPlan: JSON.stringify([{ kind: 'delete', taskId: 'new1' }]),
    createdAt: '2026-07-06T00:00:00.000Z',
    undoneAt: null,
    ...overrides,
  };
}

function build(logRow: ChatCommandRow | undefined, taskOverrides: Partial<TasksService> = {}) {
  const log = {
    getById: vi.fn().mockReturnValue(logRow),
    markUndone: vi.fn(),
    insert: vi.fn(),
  } as unknown as ChatCommandsRepository;
  const tasks = {
    archive: vi.fn(),
    deleteTask: vi.fn(),
    setPriority: vi.fn(),
    updateStatus: vi.fn(),
    setRepo: vi.fn(),
    setProject: vi.fn(),
    removeDependency: vi.fn(),
    ...taskOverrides,
  } as unknown as TasksService;
  const audit = { record: vi.fn() } as unknown as AuditService;
  return { svc: new ChatUndoService(log, tasks, audit), log, tasks, audit };
}

describe('ChatUndoService', () => {
  it('replays a delete revert, marks the command undone, and audits it', () => {
    const { svc, log, tasks, audit } = build(row());
    const result = svc.undo('tok1', { userId: 'u1', teamId: 'team1' });
    expect(tasks.archive).toHaveBeenCalledWith('new1'); // archive-then-delete
    expect(tasks.deleteTask).toHaveBeenCalledWith('new1');
    expect(log.markUndone).toHaveBeenCalledWith('tok1', expect.any(String));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'chat.undo' }));
    expect(result.affectedIds).toEqual(['new1']);
    expect(result.summary).toMatch(/reverted 1 change/i);
    expect(result.undoToken).toBeUndefined();
  });

  it('restores a captured field value', () => {
    const { svc, tasks } = build(
      row({ intentType: 'setPriority', revertPlan: JSON.stringify([{ kind: 'restorePriority', taskId: 't2', priority: 0 }]), affectedIds: JSON.stringify(['t2']) }),
    );
    svc.undo('tok1');
    expect(tasks.setPriority).toHaveBeenCalledWith('t2', 0);
  });

  it('reverts a dependency edge', () => {
    const { svc, tasks } = build(
      row({ intentType: 'addDependency', revertPlan: JSON.stringify([{ kind: 'removeDependency', taskId: 't1', dependsOnId: 't2' }]), affectedIds: JSON.stringify(['t1']) }),
    );
    svc.undo('tok1');
    expect(tasks.removeDependency).toHaveBeenCalledWith('t1', 't2');
  });

  it('reports nothing to undo for an unknown token', () => {
    const { svc, tasks, log } = build(undefined);
    const result = svc.undo('missing');
    expect(tasks.deleteTask).not.toHaveBeenCalled();
    expect(log.markUndone).not.toHaveBeenCalled();
    expect(result.summary).toMatch(/nothing to undo/i);
  });

  it('refuses to undo twice', () => {
    const { svc, tasks } = build(row({ undoneAt: '2026-07-06T01:00:00.000Z' }));
    const result = svc.undo('tok1');
    expect(tasks.deleteTask).not.toHaveBeenCalled();
    expect(result.summary).toMatch(/already undone/i);
  });

  it('best-effort: a failing op is counted, not fatal', () => {
    const { svc, log } = build(
      row({
        revertPlan: JSON.stringify([
          { kind: 'delete', taskId: 'gone' },
          { kind: 'delete', taskId: 'new1' },
        ]),
      }),
      { deleteTask: vi.fn((id: string) => { if (id === 'gone') throw new Error('not found'); }) as never },
    );
    const result = svc.undo('tok1');
    expect(log.markUndone).toHaveBeenCalled();
    expect(result.summary).toMatch(/reverted 1 change.*1 could not/i);
  });
});
