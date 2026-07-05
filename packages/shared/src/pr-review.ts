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
 * A batched review submission. Inline comments are sourced from the task's
 * persisted drafts (Phase 52 D), so the client sends only `event` + an optional
 * `body`; `comments` stays optional for back-compat. The **server** enforces the
 * "empty review" guard (a `comment`/`request-changes` with no body AND no drafts),
 * since only it knows the draft set.
 */
export const PrReviewSubmissionSchema = z.object({
  event: PrReviewEventSchema,
  body: z.string().optional(),
  comments: z.array(PrReviewCommentSchema).default([]),
});
export type PrReviewSubmission = z.infer<typeof PrReviewSubmissionSchema>;

// --- Persisted review drafts (Phase 52 D) ---

export const PR_REVIEW_DRAFT_STATES = ['draft', 'submitted'] as const;
export const PrReviewDraftStateSchema = z.enum(PR_REVIEW_DRAFT_STATES);
export type PrReviewDraftState = (typeof PR_REVIEW_DRAFT_STATES)[number];

/** A persisted inline comment. `draft` survives a reload + is editable; on review
 *  submit it batches into the GitHub review and flips to `submitted`. Per-author. */
export const PrReviewDraftSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  path: z.string(),
  line: z.number().int().positive(),
  side: z.enum(PR_REVIEW_SIDES),
  body: z.string(),
  author: z.string(),
  state: PrReviewDraftStateSchema,
  createdAt: z.string(),
});
export type PrReviewDraft = z.infer<typeof PrReviewDraftSchema>;

export const CreatePrReviewDraftSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  side: z.enum(PR_REVIEW_SIDES).default('RIGHT'),
  body: z.string().min(1),
});
export type CreatePrReviewDraft = z.infer<typeof CreatePrReviewDraftSchema>;

export const UpdatePrReviewDraftSchema = z.object({ body: z.string().min(1) });
export type UpdatePrReviewDraft = z.infer<typeof UpdatePrReviewDraftSchema>;

export const PrReviewDraftsResponseSchema = z.object({ drafts: z.array(PrReviewDraftSchema) });
export type PrReviewDraftsResponse = z.infer<typeof PrReviewDraftsResponseSchema>;

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
