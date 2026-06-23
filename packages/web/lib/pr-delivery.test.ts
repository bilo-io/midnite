import { describe, expect, it } from 'vitest';
import type { PrStatus, Task } from '@midnite/shared';
import { deliveryState, matchesDelivery } from './pr-delivery';

function pr(overrides: Partial<PrStatus> = {}): PrStatus {
  return {
    state: 'open',
    checks: 'pending',
    url: 'https://github.com/org/repo/pull/7',
    number: 7,
    fetchedAt: '2026-06-23T12:00:00Z',
    ...overrides,
  };
}

function task(prStatus?: PrStatus): Task {
  return { id: 't', title: 'T', status: 'wip', priority: 1, retryCount: 0, tags: [], events: [], prStatus };
}

describe('deliveryState', () => {
  it('returns null when there is no PR', () => {
    expect(deliveryState(undefined)).toBeNull();
  });

  it('treats an open, un-reviewed PR as awaiting-review regardless of checks', () => {
    expect(deliveryState(pr({ checks: 'pending' }))).toBe('awaiting-review');
    expect(deliveryState(pr({ checks: 'failing' }))).toBe('awaiting-review');
    expect(deliveryState(pr({ reviewDecision: 'review_required' }))).toBe('awaiting-review');
    expect(deliveryState(pr({ reviewDecision: 'changes_requested' }))).toBe('awaiting-review');
  });

  it('treats an approved + green PR as awaiting-merge', () => {
    expect(deliveryState(pr({ reviewDecision: 'approved', checks: 'passing' }))).toBe('awaiting-merge');
    expect(deliveryState(pr({ reviewDecision: 'approved', checks: 'none' }))).toBe('awaiting-merge');
  });

  it('does not surface an approved PR whose CI is red or still running', () => {
    // Blocked on CI, not a human — neither bucket.
    expect(deliveryState(pr({ reviewDecision: 'approved', checks: 'pending' }))).toBeNull();
    expect(deliveryState(pr({ reviewDecision: 'approved', checks: 'failing' }))).toBeNull();
  });

  it('ignores drafts and terminal PRs', () => {
    expect(deliveryState(pr({ state: 'draft' }))).toBeNull();
    expect(deliveryState(pr({ state: 'merged' }))).toBeNull();
    expect(deliveryState(pr({ state: 'closed' }))).toBeNull();
  });
});

describe('matchesDelivery', () => {
  it('matches everything when no states are selected', () => {
    expect(matchesDelivery(task(undefined), new Set())).toBe(true);
  });

  it('keeps only tasks whose PR is in a selected bucket', () => {
    const review = task(pr({ reviewDecision: 'review_required' }));
    const merge = task(pr({ reviewDecision: 'approved', checks: 'passing' }));
    const noPr = task(undefined);
    const sel = new Set(['awaiting-merge']);
    expect(matchesDelivery(review, sel)).toBe(false);
    expect(matchesDelivery(merge, sel)).toBe(true);
    expect(matchesDelivery(noPr, sel)).toBe(false);
  });
});
