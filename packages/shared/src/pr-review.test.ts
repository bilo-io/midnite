import { describe, expect, it } from 'vitest';
import {
  PrMergeRequestSchema,
  PrReviewCommentSchema,
  PrReviewSubmissionSchema,
  toGithubReviewEvent,
} from './pr-review.js';

describe('PrReviewSubmissionSchema', () => {
  it('allows a bare approve (no body/comments)', () => {
    expect(PrReviewSubmissionSchema.safeParse({ event: 'approve' }).success).toBe(true);
  });

  it('requires a body or comments for request-changes / comment', () => {
    expect(PrReviewSubmissionSchema.safeParse({ event: 'comment' }).success).toBe(false);
    expect(PrReviewSubmissionSchema.safeParse({ event: 'request-changes', body: 'fix it' }).success).toBe(true);
    expect(
      PrReviewSubmissionSchema.safeParse({
        event: 'comment',
        comments: [{ path: 'a.ts', line: 3, body: 'nit' }],
      }).success,
    ).toBe(true);
  });

  it('defaults comments to [] and treats blank body as empty', () => {
    const parsed = PrReviewSubmissionSchema.parse({ event: 'approve' });
    expect(parsed.comments).toEqual([]);
    expect(PrReviewSubmissionSchema.safeParse({ event: 'comment', body: '   ' }).success).toBe(false);
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
