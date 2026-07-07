import { describe, expect, it } from 'vitest';
import type { Task, TaskEventTrigger } from '@midnite/shared';

import {
  matchesTaskEventFilter,
  matchesTaskEventTeam,
  taskEventForStatus,
  taskEventInput,
} from './task-event-match';

function task(over: Partial<Task> = {}): Task {
  return { id: 't1', title: 'x', status: 'done', priority: 1, ...over } as unknown as Task;
}

const trigger = (over: Partial<TaskEventTrigger> = {}): TaskEventTrigger => ({
  type: 'task-event',
  events: ['task.done'],
  ...over,
});

describe('taskEventForStatus', () => {
  it('maps done → task.done', () => {
    expect(taskEventForStatus(task({ status: 'done' }))).toBe('task.done');
  });

  it('maps abandoned → task.abandoned', () => {
    expect(taskEventForStatus(task({ status: 'abandoned' }))).toBe('task.abandoned');
  });

  it('maps waiting + failure waitReason → task.needs-attention', () => {
    expect(taskEventForStatus(task({ status: 'waiting', waitReason: 'gate-failed' }))).toBe(
      'task.needs-attention',
    );
  });

  it('does not treat a needs-input waiting task as needs-attention', () => {
    expect(taskEventForStatus(task({ status: 'waiting', waitReason: 'needs-input' }))).toBeNull();
  });

  it('returns null for non-terminal statuses', () => {
    expect(taskEventForStatus(task({ status: 'wip' }))).toBeNull();
    expect(taskEventForStatus(task({ status: 'todo' }))).toBeNull();
    expect(taskEventForStatus(task({ status: 'waiting', waitReason: null }))).toBeNull();
  });
});

describe('matchesTaskEventFilter', () => {
  it('matches when no filter is set', () => {
    expect(matchesTaskEventFilter(task(), trigger())).toBe(true);
  });

  it('matches on repo/projectId/priority equality', () => {
    const t = task({ repo: 'acme/api', projectId: 'p1', priority: 2 });
    expect(matchesTaskEventFilter(t, trigger({ filter: { repo: 'acme/api' } }))).toBe(true);
    expect(matchesTaskEventFilter(t, trigger({ filter: { projectId: 'p1', priority: 2 } }))).toBe(
      true,
    );
  });

  it('rejects on any mismatched filter field', () => {
    const t = task({ repo: 'acme/api', projectId: 'p1', priority: 2 });
    expect(matchesTaskEventFilter(t, trigger({ filter: { repo: 'other/repo' } }))).toBe(false);
    expect(matchesTaskEventFilter(t, trigger({ filter: { priority: 3 } }))).toBe(false);
  });
});

describe('matchesTaskEventTeam', () => {
  it('a teamless workflow fires for any task', () => {
    expect(matchesTaskEventTeam('team-a', null)).toBe(true);
    expect(matchesTaskEventTeam(undefined, null)).toBe(true);
  });

  it('a team-scoped workflow fires only for same-team tasks', () => {
    expect(matchesTaskEventTeam('team-a', 'team-a')).toBe(true);
    expect(matchesTaskEventTeam('team-b', 'team-a')).toBe(false);
    expect(matchesTaskEventTeam(undefined, 'team-a')).toBe(false);
  });
});

describe('taskEventInput', () => {
  it('builds a compact task summary tagged with the event', () => {
    const t = task({
      id: 't9',
      title: 'Ship it',
      status: 'done',
      repo: 'acme/api',
      projectId: 'p1',
      teamId: 'team-a',
      priority: 3,
      prUrl: 'https://gh/pr/1',
    });
    expect(taskEventInput(t, 'task.done')).toEqual({
      event: 'task.done',
      task: {
        id: 't9',
        title: 'Ship it',
        status: 'done',
        repo: 'acme/api',
        projectId: 'p1',
        teamId: 'team-a',
        priority: 3,
        prUrl: 'https://gh/pr/1',
        waitReason: undefined,
      },
    });
  });
});
