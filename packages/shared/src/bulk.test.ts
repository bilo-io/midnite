import { describe, expect, it } from 'vitest';
import {
  BulkCreateTaskRequestSchema,
  BulkCreateTaskResponseSchema,
  MAX_BULK_LINES,
  parseBulkLines,
} from './bulk.js';

describe('parseBulkLines', () => {
  it('splits on newlines and trims', () => {
    expect(parseBulkLines('fix login bug\n  write docs  ')).toEqual(['fix login bug', 'write docs']);
  });

  it('drops blank lines and #-comments', () => {
    expect(parseBulkLines('fix login bug\n# a comment\n\nwrite docs\n')).toEqual([
      'fix login bug',
      'write docs',
    ]);
  });

  it('strips leading markdown list markers', () => {
    expect(parseBulkLines('- add dark mode\n* fix nav\n1. ship it\n2) and again')).toEqual([
      'add dark mode',
      'fix nav',
      'ship it',
      'and again',
    ]);
  });

  it('strips checklist boxes, including after a list marker', () => {
    expect(parseBulkLines('- [ ] todo one\n[x] done two\n- [X] todo three')).toEqual([
      'todo one',
      'done two',
      'todo three',
    ]);
  });

  it('returns an empty list for blank/comment-only input', () => {
    expect(parseBulkLines('\n  \n# just a note\n')).toEqual([]);
  });
});

describe('BulkCreateTaskRequestSchema', () => {
  it('accepts raw text', () => {
    expect(BulkCreateTaskRequestSchema.safeParse({ raw: 'a\nb' }).success).toBe(true);
  });

  it('accepts a non-empty lines array with shared defaults', () => {
    const parsed = BulkCreateTaskRequestSchema.safeParse({
      lines: ['a', 'b'],
      repo: 'midnite',
      priority: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a request with neither raw nor lines', () => {
    expect(BulkCreateTaskRequestSchema.safeParse({ repo: 'midnite' }).success).toBe(false);
  });

  it('rejects empty raw and empty lines', () => {
    expect(BulkCreateTaskRequestSchema.safeParse({ raw: '', lines: [] }).success).toBe(false);
  });

  it('rejects an out-of-range priority', () => {
    expect(BulkCreateTaskRequestSchema.safeParse({ raw: 'a', priority: 9 }).success).toBe(false);
  });
});

describe('BulkCreateTaskResponseSchema', () => {
  it('round-trips a mixed success/failure response', () => {
    const response = {
      results: [
        { line: 'fix login', taskId: 't1', kind: 'bug' as const, status: 'todo' as const },
        { line: 'broken', error: 'classify failed' },
      ],
      counts: { created: 1, skipped: 0, failed: 1 },
    };
    expect(BulkCreateTaskResponseSchema.parse(response)).toEqual(response);
  });
});

describe('MAX_BULK_LINES', () => {
  it('is a sane positive cap', () => {
    expect(MAX_BULK_LINES).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_BULK_LINES)).toBe(true);
  });
});
