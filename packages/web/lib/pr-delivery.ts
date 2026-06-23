import type { PrStatus, Task } from '@midnite/shared';

/**
 * Delivery states a board filter can triage by — the two points where an open
 * PR is "blocked on a human" (Phase 22 Theme D). A PR that's a draft, merged or
 * closed sits in neither bucket (nothing for a human to do *here*).
 */
export const DELIVERY_STATES = ['awaiting-review', 'awaiting-merge'] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

/**
 * Classify a PR by what human action it's waiting on, or null when it needs none:
 * - `awaiting-review` — open and not yet approved (someone needs to review it).
 * - `awaiting-merge` — open, approved, and CI isn't red (someone needs to merge it).
 *
 * Pending CI counts as awaiting-merge only once approved+green, since a red/pending
 * build is blocked on CI, not a person. Drafts and terminal PRs return null.
 */
export function deliveryState(pr: PrStatus | undefined): DeliveryState | null {
  if (!pr || pr.state !== 'open') return null;
  if (pr.reviewDecision === 'approved') {
    return pr.checks === 'passing' || pr.checks === 'none' ? 'awaiting-merge' : null;
  }
  return 'awaiting-review';
}

/** True when the task's PR matches at least one of the selected delivery states. */
export function matchesDelivery(task: Task, selected: ReadonlySet<string>): boolean {
  if (selected.size === 0) return true;
  const state = deliveryState(task.prStatus);
  return state !== null && selected.has(state);
}
