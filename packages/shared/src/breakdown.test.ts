import { describe, expect, it } from 'vitest';

import {
  BreakdownGoalRequestSchema,
  BreakdownPreviewResponseSchema,
  BreakdownSchema,
  BreakdownTaskSchema,
  CreateFromBreakdownRequestSchema,
} from './breakdown.js';

describe('BreakdownTaskSchema', () => {
  it('parses a minimal task (ref + title only)', () => {
    const result = BreakdownTaskSchema.parse({ ref: 'build-api', title: 'Build the API' });
    expect(result).toEqual({ ref: 'build-api', title: 'Build the API', dependsOn: [] });
  });

  it('parses a full task with all optional fields', () => {
    const result = BreakdownTaskSchema.parse({
      ref: 'build-client',
      title: 'Build the client',
      kind: 'feature',
      priority: 2,
      dependsOn: ['build-api'],
    });
    expect(result).toMatchObject({
      ref: 'build-client',
      kind: 'feature',
      priority: 2,
      dependsOn: ['build-api'],
    });
  });

  it('defaults dependsOn to an empty array', () => {
    expect(BreakdownTaskSchema.parse({ ref: 'x', title: 'x' }).dependsOn).toEqual([]);
  });

  it('rejects a missing ref', () => {
    expect(() => BreakdownTaskSchema.parse({ title: 'no ref' })).toThrow();
  });

  it('rejects an empty ref', () => {
    expect(() => BreakdownTaskSchema.parse({ ref: '', title: 'empty ref' })).toThrow();
  });

  it('rejects priority outside 0–3', () => {
    expect(() => BreakdownTaskSchema.parse({ ref: 'r', title: 't', priority: 4 })).toThrow();
    expect(() => BreakdownTaskSchema.parse({ ref: 'r', title: 't', priority: -1 })).toThrow();
  });
});

describe('BreakdownSchema', () => {
  it('parses a multi-task breakdown with dependency edges', () => {
    const result = BreakdownSchema.parse({
      tasks: [
        { ref: 'api', title: 'Build API' },
        { ref: 'client', title: 'Build client', dependsOn: ['api'] },
      ],
    });
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[1]!.dependsOn).toEqual(['api']);
  });

  it('parses an empty task list', () => {
    expect(BreakdownSchema.parse({ tasks: [] }).tasks).toEqual([]);
  });
});

describe('BreakdownGoalRequestSchema', () => {
  it('parses a bare goal string', () => {
    expect(BreakdownGoalRequestSchema.parse({ goal: 'Build an auth system' })).toMatchObject({
      goal: 'Build an auth system',
    });
  });

  it('accepts optional projectId and repo', () => {
    const result = BreakdownGoalRequestSchema.parse({
      goal: 'Add notifications',
      projectId: 'proj-1',
      repo: 'midnite',
    });
    expect(result).toMatchObject({ projectId: 'proj-1', repo: 'midnite' });
  });

  it('rejects an empty goal', () => {
    expect(() => BreakdownGoalRequestSchema.parse({ goal: '' })).toThrow();
  });
});

describe('BreakdownPreviewResponseSchema', () => {
  it('defaults isFallback to false', () => {
    const result = BreakdownPreviewResponseSchema.parse({
      breakdown: { tasks: [{ ref: 'r', title: 't' }] },
    });
    expect(result.isFallback).toBe(false);
  });

  it('accepts isFallback: true when LLM is unavailable', () => {
    const result = BreakdownPreviewResponseSchema.parse({
      breakdown: { tasks: [] },
      isFallback: true,
    });
    expect(result.isFallback).toBe(true);
  });
});

describe('CreateFromBreakdownRequestSchema', () => {
  it('accepts a breakdown with an optional repo default', () => {
    const parsed = CreateFromBreakdownRequestSchema.parse({
      breakdown: { tasks: [{ ref: 'a', title: 'A' }] },
      repo: 'midnite',
    });
    expect(parsed.repo).toBe('midnite');
    expect(parsed.breakdown.tasks[0]?.dependsOn).toEqual([]);
  });

  it('rejects a missing or malformed breakdown', () => {
    expect(CreateFromBreakdownRequestSchema.safeParse({}).success).toBe(false);
    expect(CreateFromBreakdownRequestSchema.safeParse({ breakdown: { tasks: 'x' } }).success).toBe(
      false,
    );
  });
});
