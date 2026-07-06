import { describe, expect, it } from 'vitest';
import { ChatIntentSchema } from '@midnite/shared';
import { parseIntentGrammar } from './intent-grammar';

/** Parse and assert the result is a valid ChatIntent per the shared contract. */
function parse(input: string) {
  const intent = parseIntentGrammar(input);
  if (intent) expect(ChatIntentSchema.safeParse(intent).success).toBe(true);
  return intent;
}

describe('parseIntentGrammar — createTask', () => {
  it('parses a quoted title with flags in any order', () => {
    expect(parse('add "fix login bug" p1 repo:api')).toEqual({
      type: 'createTask',
      title: 'fix login bug',
      priority: 1,
      repo: 'api',
    });
    expect(parse('create repo:web p3 "ship dark mode"')).toEqual({
      type: 'createTask',
      title: 'ship dark mode',
      priority: 3,
      repo: 'web',
    });
  });

  it('uses trailing unquoted words as the title and strips filler', () => {
    expect(parse('add a task to refactor the auth module p2')).toEqual({
      type: 'createTask',
      title: 'refactor the auth module',
      priority: 2,
    });
  });

  it('carries project, kind and milestone flags', () => {
    expect(parse('new "write docs" project:core kind:chore @m1')).toEqual({
      type: 'createTask',
      title: 'write docs',
      project: 'core',
      kind: 'chore',
    });
  });

  it('ignores an invalid kind flag (falls through to no kind)', () => {
    // kind:bogus is not a valid TaskKind — dropped, title keeps the rest.
    const r = parse('add "x" kind:bogus');
    expect(r).toEqual({ type: 'createTask', title: 'x' });
  });
});

describe('parseIntentGrammar — bulkCreate', () => {
  it('splits multiple quoted/comma titles', () => {
    expect(parse('add "one"; "two"; "three" p2')).toEqual({
      type: 'bulkCreate',
      titles: ['one', 'two', 'three'],
      priority: 2,
    });
    expect(parse('create fix a, fix b repo:api')).toEqual({
      type: 'bulkCreate',
      titles: ['fix a', 'fix b'],
      repo: 'api',
    });
  });
});

describe('parseIntentGrammar — setStatus / move', () => {
  it('parses "move <task> to <status>"', () => {
    expect(parse('move "fix login" to wip')).toEqual({
      type: 'setStatus',
      task: 'fix login',
      status: 'wip',
    });
  });

  it('maps "in-progress" and "done"', () => {
    expect(parse('move task-1 to in-progress')).toEqual({
      type: 'setStatus',
      task: 'task-1',
      status: 'wip',
    });
    expect(parse('move task-1 to done')).toEqual({
      type: 'setStatus',
      task: 'task-1',
      status: 'done',
    });
  });

  it('accepts a status: flag form', () => {
    expect(parse('move "big task" status:waiting')).toEqual({
      type: 'setStatus',
      task: 'big task',
      status: 'waiting',
    });
  });

  it('returns null when no status is present', () => {
    expect(parse('move "fix login"')).toBeNull();
  });
});

describe('parseIntentGrammar — setPriority', () => {
  it('parses "set <task> p2" and prioritize', () => {
    expect(parse('set "fix login" p2')).toEqual({
      type: 'setPriority',
      task: 'fix login',
      priority: 2,
    });
    expect(parse('prioritize task-9 p3')).toEqual({
      type: 'setPriority',
      task: 'task-9',
      priority: 3,
    });
  });

  it('falls through (null) when priority is a bare word, not p0-3', () => {
    expect(parse('prioritize "fix login" high')).toBeNull();
  });
});

describe('parseIntentGrammar — assign', () => {
  it('assigns repo/project/milestone', () => {
    expect(parse('assign "fix login" to repo:api')).toEqual({
      type: 'assign',
      task: 'fix login',
      repo: 'api',
    });
    expect(parse('assign task-2 project:core @sprint-1')).toEqual({
      type: 'assign',
      task: 'task-2',
      project: 'core',
      milestone: 'sprint-1',
    });
  });

  it('returns null with no target', () => {
    expect(parse('assign "fix login"')).toBeNull();
  });
});

describe('parseIntentGrammar — addDependency', () => {
  it('parses "depend <task> on <other>" and block', () => {
    expect(parse('depend "ship api" on "write schema"')).toEqual({
      type: 'addDependency',
      task: 'ship api',
      dependsOn: 'write schema',
    });
    expect(parse('block task-a on task-b')).toEqual({
      type: 'addDependency',
      task: 'task-a',
      dependsOn: 'task-b',
    });
  });
});

describe('parseIntentGrammar — breakdown', () => {
  it('captures the goal + flags', () => {
    expect(parse('breakdown build a billing system project:core')).toEqual({
      type: 'breakdown',
      goal: 'build a billing system',
      project: 'core',
    });
    expect(parse('plan migrate to postgres')).toEqual({
      type: 'breakdown',
      goal: 'migrate to postgres',
    });
  });
});

describe('parseIntentGrammar — query', () => {
  it('parses blocked / ready filters', () => {
    expect(parse('show blocked')).toEqual({
      type: 'query',
      text: 'show blocked',
      read: { metric: 'list', blocked: true },
    });
    expect(parse('list ready')).toEqual({
      type: 'query',
      text: 'list ready',
      read: { metric: 'list', ready: true },
    });
  });

  it('parses status list + count', () => {
    expect(parse('show wip')).toEqual({
      type: 'query',
      text: 'show wip',
      read: { metric: 'list', status: 'wip' },
    });
    expect(parse('count todo')).toEqual({
      type: 'query',
      text: 'count todo',
      read: { metric: 'count', status: 'todo' },
    });
  });

  it('parses "<status> count" shorthand', () => {
    expect(parse('todo count')).toEqual({
      type: 'query',
      text: 'todo count',
      read: { metric: 'count', status: 'todo' },
    });
  });

  it('lists everything with no qualifier', () => {
    expect(parse('list tasks')).toEqual({
      type: 'query',
      text: 'list tasks',
      read: { metric: 'list' },
    });
  });
});

describe('parseIntentGrammar — misses', () => {
  it('returns null for prose the LLM should handle', () => {
    expect(parseIntentGrammar('what should I focus on next?')).toBeNull();
    expect(parseIntentGrammar('spin up a couple of tasks to clean up auth')).toBeNull();
    expect(parseIntentGrammar('')).toBeNull();
    expect(parseIntentGrammar('   ')).toBeNull();
  });
});
