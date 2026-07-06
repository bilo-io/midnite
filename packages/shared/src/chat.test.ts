import { describe, expect, it } from 'vitest';
import {
  ChatCommandRequestSchema,
  ChatCommandResponseSchema,
  ChatCommandResultSchema,
  ChatIntentParseSchema,
  ChatIntentSchema,
  ChatPreviewResponseSchema,
  ChatUndoRequestSchema,
  ChatUndoResponseSchema,
  CHAT_INFERENCE_PATH_LABEL,
  CHAT_INTENT_TYPES,
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
      inferencePath: 'deterministic',
    };
    expect(ChatIntentParseSchema.parse(parse)).toEqual(parse);
  });

  it('rejects a confidence outside 0–1', () => {
    const parse = {
      intent: { type: 'unknown', text: 'x' },
      source: 'llm',
      confidence: 1.2,
      inferencePath: 'provider',
    };
    expect(ChatIntentParseSchema.safeParse(parse).success).toBe(false);
  });

  it('requires the resolved inference path (Theme D cost line)', () => {
    const parse = { intent: { type: 'unknown', text: 'x' }, source: 'llm', confidence: 0.3 };
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
      confirmation: 'none',
    };
    expect(ChatCommandResultSchema.parse(result)).toEqual(result);
  });

  it('allows a read-only result without an undo token', () => {
    const result = { summary: '3 blocked tasks', affectedIds: [], inferencePath: 'local', confirmation: 'none' };
    expect(ChatCommandResultSchema.parse(result).undoToken).toBeUndefined();
  });

  it('requires the confirmation level (Theme F seatbelt)', () => {
    const result = { summary: 'x', affectedIds: [], inferencePath: 'local' };
    expect(ChatCommandResultSchema.safeParse(result).success).toBe(false);
    expect(ChatCommandResultSchema.safeParse({ ...result, confirmation: 'bogus' }).success).toBe(false);
    expect(ChatCommandResultSchema.safeParse({ ...result, confirmation: 'confirm' }).success).toBe(true);
  });

  it('labels every inference path', () => {
    expect(CHAT_INFERENCE_PATH_LABEL.deterministic).toMatch(/no AI/i);
    expect(CHAT_INFERENCE_PATH_LABEL.local).toMatch(/local/i);
    expect(CHAT_INFERENCE_PATH_LABEL.provider).toMatch(/provider/i);
  });
});

describe('Chat command request/response (Phase 59 B + F)', () => {
  it('requires non-empty command text within the cap; confirm is optional', () => {
    expect(ChatCommandRequestSchema.safeParse({ text: 'add "x"' }).success).toBe(true);
    expect(ChatCommandRequestSchema.safeParse({ text: 'add "x"', confirm: true }).success).toBe(true);
    expect(ChatCommandRequestSchema.safeParse({ text: '' }).success).toBe(false);
    expect(ChatCommandRequestSchema.safeParse({ text: 'a'.repeat(2001) }).success).toBe(false);
  });

  it('round-trips a command response (parse + result)', () => {
    const res = {
      parse: {
        intent: { type: 'createTask', title: 'x' },
        source: 'grammar',
        confidence: 1,
        inferencePath: 'deterministic',
      },
      result: { summary: 'Created task “x”.', affectedIds: ['t1'], inferencePath: 'deterministic', confirmation: 'none' },
    };
    expect(ChatCommandResponseSchema.parse(res)).toEqual(res);
  });

  it('round-trips a preview response with the confirm level', () => {
    const res = {
      parse: {
        intent: { type: 'query', text: 'show blocked' },
        source: 'grammar',
        confidence: 1,
        inferencePath: 'deterministic',
      },
      description: 'Answer: show blocked',
      willMutate: false,
      confirmation: 'none',
    };
    expect(ChatPreviewResponseSchema.parse(res)).toEqual(res);
  });

  it('round-trips an undo request + response', () => {
    expect(ChatUndoRequestSchema.safeParse({ undoToken: 'tok1' }).success).toBe(true);
    expect(ChatUndoRequestSchema.safeParse({ undoToken: '' }).success).toBe(false);
    const res = {
      result: { summary: 'Reverted 1 change.', affectedIds: ['t1'], inferencePath: 'deterministic', confirmation: 'none' },
    };
    expect(ChatUndoResponseSchema.parse(res)).toEqual(res);
  });
});
