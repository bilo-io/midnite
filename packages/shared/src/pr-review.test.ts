import { describe, expect, it } from 'vitest';
import {
  CreatePrReviewDraftSchema,
  PrMergeRequestSchema,
  PrReviewCommentSchema,
  PrReviewDraftSchema,
  PrReviewSubmissionSchema,
  UpdatePrReviewDraftSchema,
  toGithubReviewEvent,
} from './pr-review.js';

describe('PrReviewSubmissionSchema', () => {
  it('accepts event + optional body (comments are server-sourced from drafts now)', () => {
    expect(PrReviewSubmissionSchema.safeParse({ event: 'approve' }).success).toBe(true);
    // A bare comment/request-changes is valid at the wire — the SERVER enforces the
    // empty-review guard against the persisted draft set (Phase 52 D).
    expect(PrReviewSubmissionSchema.safeParse({ event: 'comment' }).success).toBe(true);
    expect(PrReviewSubmissionSchema.parse({ event: 'approve' }).comments).toEqual([]);
  });
});

describe('draft schemas (Phase 52 D)', () => {
  it('CreatePrReviewDraft defaults side to RIGHT + requires body/line', () => {
    expect(CreatePrReviewDraftSchema.parse({ path: 'a.ts', line: 3, body: 'nit' }).side).toBe('RIGHT');
    expect(CreatePrReviewDraftSchema.safeParse({ path: 'a.ts', line: 0, body: 'x' }).success).toBe(false);
    expect(CreatePrReviewDraftSchema.safeParse({ path: 'a.ts', line: 3, body: '' }).success).toBe(false);
  });

  it('UpdatePrReviewDraft requires a non-empty body', () => {
    expect(UpdatePrReviewDraftSchema.safeParse({ body: '' }).success).toBe(false);
    expect(UpdatePrReviewDraftSchema.parse({ body: 'edited' }).body).toBe('edited');
  });

  it('PrReviewDraft round-trips a submitted comment', () => {
    const draft = {
      id: 'c1',
      taskId: 't1',
      path: 'a.ts',
      line: 3,
      side: 'RIGHT' as const,
      body: 'nit',
      author: 'u1',
      state: 'submitted' as const,
      createdAt: '2026-07-05T00:00:00Z',
    };
    expect(PrReviewDraftSchema.parse(draft)).toEqual(draft);
  });
});

describe('PrReviewCommentSchema', () => {
  it('defaults side to RIGHT and requires a positive line + body', () => {
    expect(PrReviewCommentSchema.parse({ path: 'a.ts', line: 5, body: 'x' }).side).toBe('RIGHT');
    expect(PrReviewCommentSchema.safeParse({ path: 'a.ts', line: 0, body: 'x' }).success).toBe(false);
    expect(PrReviewCommentSchema.safeParse({ path: 'a.ts', line: 5, body: '' }).success).toBe(false);
  });
});

describe('PrMergeRequestSchema', () => {
  it('defaults the method to squash', () => {
    expect(PrMergeRequestSchema.parse({}).method).toBe('squash');
    expect(PrMergeRequestSchema.safeParse({ method: 'octopus' }).success).toBe(false);
  });
});

describe('toGithubReviewEvent', () => {
  it('maps to GitHub review event enums', () => {
    expect(toGithubReviewEvent('approve')).toBe('APPROVE');
    expect(toGithubReviewEvent('request-changes')).toBe('REQUEST_CHANGES');
    expect(toGithubReviewEvent('comment')).toBe('COMMENT');
  });
});
