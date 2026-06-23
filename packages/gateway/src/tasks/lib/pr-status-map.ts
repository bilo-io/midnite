import type { PrCheckState, PrReviewDecision, PrState } from '@midnite/shared';

/** The PR-status fields we resolve before stamping url/number/fetchedAt. */
export type PrStatusCore = {
  state: PrState;
  checks: PrCheckState;
  reviewDecision?: PrReviewDecision;
};

/** Map a `gh` review-decision string (or '' / undefined) to our enum, else undefined. */
function reviewDecisionOf(raw: unknown): PrReviewDecision | undefined {
  switch (String(raw ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'CHANGES_REQUESTED':
      return 'changes_requested';
    case 'REVIEW_REQUIRED':
      return 'review_required';
    default:
      return undefined;
  }
}

/** Per-entry verdict over a `gh` statusCheckRollup item (a check-run or a status context). */
function entryVerdict(entry: unknown): 'fail' | 'pending' | 'pass' {
  const node = entry as { status?: unknown; conclusion?: unknown; state?: unknown };
  // Check-runs carry `status` (+ `conclusion` once COMPLETED); status contexts carry `state`.
  if (node.status !== undefined) {
    if (String(node.status).toUpperCase() !== 'COMPLETED') return 'pending';
    switch (String(node.conclusion ?? '').toUpperCase()) {
      case 'SUCCESS':
      case 'NEUTRAL':
      case 'SKIPPED':
        return 'pass';
      case '':
        return 'pending';
      default:
        return 'fail'; // FAILURE / TIMED_OUT / CANCELLED / ACTION_REQUIRED / STARTUP_FAILURE
    }
  }
  switch (String(node.state ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'pass';
    case 'FAILURE':
    case 'ERROR':
      return 'fail';
    default:
      return 'pending'; // PENDING / EXPECTED / unknown
  }
}

/** Roll a `gh` statusCheckRollup array up to a single verdict: fail ≫ pending ≫ pass. */
function rollupChecks(rollup: unknown): PrCheckState {
  if (!Array.isArray(rollup) || rollup.length === 0) return 'none';
  let pending = false;
  for (const entry of rollup) {
    const v = entryVerdict(entry);
    if (v === 'fail') return 'failing';
    if (v === 'pending') pending = true;
  }
  return pending ? 'pending' : 'passing';
}

/**
 * Map `gh pr view --json state,isDraft,statusCheckRollup,reviewDecision` output
 * to our core status. Returns null if the payload isn't a recognisable PR object.
 */
export function mapGhPrJson(json: unknown): PrStatusCore | null {
  if (!json || typeof json !== 'object') return null;
  const d = json as {
    state?: unknown;
    isDraft?: unknown;
    statusCheckRollup?: unknown;
    reviewDecision?: unknown;
  };
  const s = String(d.state ?? '').toUpperCase();
  if (!s) return null;
  const state: PrState =
    s === 'MERGED' ? 'merged' : s === 'CLOSED' ? 'closed' : d.isDraft ? 'draft' : 'open';
  return {
    state,
    checks: rollupChecks(d.statusCheckRollup),
    reviewDecision: reviewDecisionOf(d.reviewDecision),
  };
}

/**
 * Map an anonymous `GET /repos/{repo}/pulls/{n}` REST payload (the public-repo
 * fallback when `gh` is absent) to our core status. The REST PR object carries
 * `state`/`draft`/`merged` but not a checks rollup or review decision without
 * extra calls, so checks degrade to `none` — the gh path is the full-fidelity one.
 */
export function mapRestPrJson(json: unknown): PrStatusCore | null {
  if (!json || typeof json !== 'object') return null;
  const d = json as { state?: unknown; draft?: unknown; merged?: unknown };
  if (typeof d.state !== 'string') return null;
  const state: PrState = d.merged
    ? 'merged'
    : d.state === 'closed'
      ? 'closed'
      : d.draft
        ? 'draft'
        : 'open';
  return { state, checks: 'none' };
}
