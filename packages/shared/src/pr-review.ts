import { z } from 'zod';

// Phase 52 Theme C — review write-back. The task's PR is reviewed/merged from
// inside midnite via the gateway, which shells the authenticated `gh` CLI (a
// workflow-credential REST token is the fallback). Every wire shape is a zod
// schema here; the endpoints return the re-hydrated `Task` (with a refreshed
// `prStatus`) so the board reflects the new review decision / merged state.

/** One inline review comment, anchored to a diff line. `side` follows GitHub's
 *  diff sides — RIGHT = the new file (an addition/context), LEFT = the old file. */
export const PR_REVIEW_SIDES = ['LEFT', 'RIGHT'] as const;
export const PrReviewCommentSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  side: z.enum(PR_REVIEW_SIDES).default('RIGHT'),
  body: z.string().min(1),
});
export type PrReviewComment = z.infer<typeof PrReviewCommentSchema>;

export const PR_REVIEW_EVENTS = ['approve', 'request-changes', 'comment'] as const;
export const PrReviewEventSchema = z.enum(PR_REVIEW_EVENTS);
export type PrReviewEvent = z.infer<typeof PrReviewEventSchema>;

/**
 * A batched review submission. GitHub requires a body (or inline comments) for
 * `request-changes` and `comment`; `approve` may be bare. Enforced here so a
 * useless request never reaches the API.
 */
export const PrReviewSubmissionSchema = z
  .object({
    event: PrReviewEventSchema,
    body: z.string().optional(),
    comments: z.array(PrReviewCommentSchema).default([]),
  })
  .refine(
    (v) => v.event === 'approve' || (v.body?.trim().length ?? 0) > 0 || v.comments.length > 0,
    { message: 'request-changes and comment reviews need a body or at least one inline comment' },
  );
export type PrReviewSubmission = z.infer<typeof PrReviewSubmissionSchema>;

/** GitHub merge methods; `squash` is midnite's default (repo convention). */
export const PR_MERGE_METHODS = ['merge', 'squash', 'rebase'] as const;
export const PrMergeMethodSchema = z.enum(PR_MERGE_METHODS);
export type PrMergeMethod = z.infer<typeof PrMergeMethodSchema>;

export const PrMergeRequestSchema = z.object({
  method: PrMergeMethodSchema.default('squash'),
});
export type PrMergeRequest = z.infer<typeof PrMergeRequestSchema>;

/** Map a submission event to GitHub's review `event` enum. */
export function toGithubReviewEvent(event: PrReviewEvent): 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' {
  return event === 'approve' ? 'APPROVE' : event === 'request-changes' ? 'REQUEST_CHANGES' : 'COMMENT';
}
