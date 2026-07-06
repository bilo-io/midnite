import { describe, expect, it } from 'vitest';
import {
  ChatCommandResultSchema,
  ChatIntentParseSchema,
  ChatIntentSchema,
  ChatQueryAnswerSchema,
  ChatQueryRequestSchema,
  CHAT_INFERENCE_PATH_LABEL,
  CHAT_INTENT_TYPES,
  CHAT_QUERY_TASK_CAP,
} from './chat.js';

describe('ChatIntentSchema', () => {
  it('accepts each intent variant', () => {
    const variants = [
      { type: 'createTask', title: 'fix login', priority: 1, repo: 'api' },
      { type: 'bulkCreate', titles: ['a', 'b'], priority: 2 },
      { type: 'breakdown', goal: 'refactor auth', project: 'core' },
      { type: 'setPriority', task: 'fix login', priority: 3 },
      { type: 'setStatus', task: 'abc', status: 'wip' },
      { type: 'assign', task: 'abc', repo: 'api' },
      { type: 'addDependency', task: 'abc', dependsOn: 'def' },
      { type: 'query', text: 'show blocked', read: { metric: 'list', blocked: true } },
      { type: 'query', text: 'what should I focus on?' },
      { type: 'unknown', text: 'gibberish', reason: 'no verb matched' },
    ];
    for (const v of variants) {
      expect(ChatIntentSchema.safeParse(v).success).toBe(true);
    }
    // Every declared type has coverage above.
    expect(new Set(variants.map((v) => v.type))).toEqual(new Set(CHAT_INTENT_TYPES));
  });

  it('rejects an out-of-band priority', () => {
    expect(ChatIntentSchema.safeParse({ type: 'setPriority', task: 'x', priority: 4 }).success).toBe(false);
    expect(ChatIntentSchema.safeParse({ type: 'createTask', title: 't', priority: -1 }).success).toBe(false);
  });

  it('rejects an unknown status on setStatus', () => {
    expect(ChatIntentSchema.safeParse({ type: 'setStatus', task: 'x', status: 'nope' }).success).toBe(false);
  });

  it('requires at least one target on assign', () => {
    expect(ChatIntentSchema.safeParse({ type: 'assign', task: 'x' }).success).toBe(false);
    expect(ChatIntentSchema.safeParse({ type: 'assign', task: 'x', milestone: 'm1' }).success).toBe(true);
  });

  it('requires a non-empty bulk list', () => {
    expect(ChatIntentSchema.safeParse({ type: 'bulkCreate', titles: [] }).success).toBe(false);
  });

  it('rejects an unknown intent type', () => {
    expect(ChatIntentSchema.safeParse({ type: 'delete', task: 'x' }).success).toBe(false);
  });
});

describe('ChatIntentParseSchema', () => {
  it('round-trips a grammar parse at full confidence', () => {
    const parse = {
      intent: { type: 'createTask', title: 'fix login' },
      source: 'grammar',
      confidence: 1,
    };
    expect(ChatIntentParseSchema.parse(parse)).toEqual(parse);
  });

  it('rejects a confidence outside 0–1', () => {
    const parse = { intent: { type: 'unknown', text: 'x' }, source: 'llm', confidence: 1.2 };
    expect(ChatIntentParseSchema.safeParse(parse).success).toBe(false);
  });
});

describe('ChatCommandResultSchema', () => {
  it('round-trips a mutating result with an undo token', () => {
    const result = {
      summary: 'Created 2 tasks',
      affectedIds: ['t1', 't2'],
      undoToken: 'undo-abc',
      inferencePath: 'deterministic',
    };
    expect(ChatCommandResultSchema.parse(result)).toEqual(result);
  });

  it('allows a read-only result without an undo token', () => {
    const result = { summary: '3 blocked tasks', affectedIds: [], inferencePath: 'local' };
    expect(ChatCommandResultSchema.parse(result).undoToken).toBeUndefined();
  });

  it('labels every inference path', () => {
    expect(CHAT_INFERENCE_PATH_LABEL.deterministic).toMatch(/no AI/i);
    expect(CHAT_INFERENCE_PATH_LABEL.local).toMatch(/local/i);
    expect(CHAT_INFERENCE_PATH_LABEL.provider).toMatch(/provider/i);
  });
});

describe('ChatQueryAnswerSchema (Theme C)', () => {
  it('round-trips a query answer with task refs', () => {
    const answer = {
      text: '2 blocked tasks',
      tasks: [
        { id: 't1', title: 'Fix auth', status: 'todo', priority: 2 },
        { id: 't2', title: 'Ship API', status: 'wip', priority: 1 },
      ],
      count: 2,
      truncated: false,
      inferencePath: 'deterministic',
    };
    expect(ChatQueryAnswerSchema.parse(answer)).toEqual(answer);
  });

  it('allows an empty task list (count-only) and a truncated flag', () => {
    const answer = { text: '73 todo tasks', tasks: [], count: 73, truncated: true, inferencePath: 'provider' };
    expect(ChatQueryAnswerSchema.parse(answer).truncated).toBe(true);
  });

  it('rejects a task ref with an out-of-range priority', () => {
    const bad = {
      text: 'x',
      tasks: [{ id: 't1', title: 'x', status: 'todo', priority: 9 }],
      count: 1,
      truncated: false,
      inferencePath: 'local',
    };
    expect(ChatQueryAnswerSchema.safeParse(bad).success).toBe(false);
  });

  it('caps the task list at CHAT_QUERY_TASK_CAP (the answerer trims to this)', () => {
    expect(CHAT_QUERY_TASK_CAP).toBe(50);
  });
});

describe('ChatQueryRequestSchema (Theme C)', () => {
  it('trims and requires non-empty text', () => {
    expect(ChatQueryRequestSchema.parse({ text: '  what is blocked?  ' }).text).toBe('what is blocked?');
    expect(ChatQueryRequestSchema.safeParse({ text: '   ' }).success).toBe(false);
  });
});
