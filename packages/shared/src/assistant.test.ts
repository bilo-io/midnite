import { describe, expect, it } from 'vitest';

import {
  ASSISTANT_COMPONENT_NAMES,
  AssistantBlockSchema,
  AssistantQueryRequestSchema,
  AssistantQueryResponseSchema,
  coerceAssistantBlock,
} from './assistant.js';

describe('AssistantBlockSchema', () => {
  it('accepts a markdown block', () => {
    expect(AssistantBlockSchema.safeParse({ kind: 'markdown', text: 'hello' }).success).toBe(true);
  });

  it('rejects an empty markdown block', () => {
    expect(AssistantBlockSchema.safeParse({ kind: 'markdown', text: '' }).success).toBe(false);
  });

  it('accepts a task-card component with a taskId ref', () => {
    const parsed = AssistantBlockSchema.safeParse({
      kind: 'component',
      name: 'task-card',
      props: { taskId: 'abc' },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a task-card without a taskId', () => {
    expect(
      AssistantBlockSchema.safeParse({ kind: 'component', name: 'task-card', props: {} }).success,
    ).toBe(false);
  });

  it('defaults fleet-gauge / session-list props to {}', () => {
    const gauge = AssistantBlockSchema.parse({ kind: 'component', name: 'fleet-gauge' });
    expect(gauge).toEqual({ kind: 'component', name: 'fleet-gauge', props: {} });
    const sessions = AssistantBlockSchema.parse({ kind: 'component', name: 'session-list' });
    expect(sessions).toEqual({ kind: 'component', name: 'session-list', props: {} });
  });

  it('constrains sparkline to a known metric', () => {
    expect(
      AssistantBlockSchema.safeParse({ kind: 'component', name: 'sparkline', props: { metric: 'cycle-time' } })
        .success,
    ).toBe(true);
    expect(
      AssistantBlockSchema.safeParse({ kind: 'component', name: 'sparkline', props: { metric: 'nope' } }).success,
    ).toBe(false);
  });

  it('rejects an unknown component name', () => {
    expect(
      AssistantBlockSchema.safeParse({ kind: 'component', name: 'mystery', props: {} }).success,
    ).toBe(false);
  });

  it('exposes the four registered component names', () => {
    expect(ASSISTANT_COMPONENT_NAMES).toEqual(['task-card', 'fleet-gauge', 'session-list', 'sparkline']);
  });
});

describe('coerceAssistantBlock', () => {
  it('passes a valid block through untouched', () => {
    const block = { kind: 'component', name: 'task-card', props: { taskId: 'x' } };
    expect(coerceAssistantBlock(block)).toEqual(block);
  });

  it('downgrades an invalid component to markdown naming it', () => {
    const out = coerceAssistantBlock({ kind: 'component', name: 'ghost', props: {} });
    expect(out).toEqual({ kind: 'markdown', text: '_(could not render `ghost`)_' });
  });

  it('rescues a stray text field into a markdown block', () => {
    expect(coerceAssistantBlock({ kind: 'wat', text: '  hi  ' })).toEqual({ kind: 'markdown', text: 'hi' });
  });

  it('returns null when nothing is salvageable', () => {
    expect(coerceAssistantBlock({ kind: 'wat' })).toBeNull();
    expect(coerceAssistantBlock(null)).toBeNull();
  });
});

describe('Assistant request/response', () => {
  it('requires a non-empty question', () => {
    expect(AssistantQueryRequestSchema.safeParse({ question: '' }).success).toBe(false);
    expect(AssistantQueryRequestSchema.safeParse({ question: 'what is blocked?' }).success).toBe(true);
  });

  it('validates a response envelope', () => {
    const parsed = AssistantQueryResponseSchema.safeParse({
      blocks: [{ kind: 'markdown', text: 'ok' }],
      inferencePath: 'deterministic',
    });
    expect(parsed.success).toBe(true);
  });
});
