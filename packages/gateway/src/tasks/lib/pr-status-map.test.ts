import { describe, expect, it } from 'vitest';
import { mapGhPrJson, mapRestPrJson } from './pr-status-map';

describe('mapGhPrJson', () => {
  it('maps an open PR with passing checks and an approval', () => {
    expect(
      mapGhPrJson({
        state: 'OPEN',
        isDraft: false,
        reviewDecision: 'APPROVED',
        statusCheckRollup: [
          { status: 'COMPLETED', conclusion: 'SUCCESS' },
          { state: 'SUCCESS' },
        ],
      }),
    ).toEqual({ state: 'open', checks: 'passing', reviewDecision: 'approved' });
  });

  it('treats a draft as draft and surfaces a requested change', () => {
    expect(
      mapGhPrJson({ state: 'OPEN', isDraft: true, reviewDecision: 'CHANGES_REQUESTED' }),
    ).toEqual({ state: 'draft', checks: 'none', reviewDecision: 'changes_requested' });
  });

  it('maps merged/closed states', () => {
    expect(mapGhPrJson({ state: 'MERGED' })?.state).toBe('merged');
    expect(mapGhPrJson({ state: 'CLOSED' })?.state).toBe('closed');
  });

  it('rolls checks up as fail ≫ pending ≫ pass', () => {
    // a single failure wins over everything
    expect(
      mapGhPrJson({
        state: 'OPEN',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }, { state: 'FAILURE' }],
      })?.checks,
    ).toBe('failing');
    // an in-progress run with no failures is pending
    expect(
      mapGhPrJson({
        state: 'OPEN',
        statusCheckRollup: [{ status: 'IN_PROGRESS' }, { status: 'COMPLETED', conclusion: 'SUCCESS' }],
      })?.checks,
    ).toBe('pending');
    // neutral/skipped count as a pass
    expect(
      mapGhPrJson({
        state: 'OPEN',
        statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'NEUTRAL' }],
      })?.checks,
    ).toBe('passing');
  });

  it('returns null without a recognisable state, and undefined review for an empty decision', () => {
    expect(mapGhPrJson({})).toBeNull();
    expect(mapGhPrJson('nope')).toBeNull();
    expect(mapGhPrJson({ state: 'OPEN', reviewDecision: '' })?.reviewDecision).toBeUndefined();
  });
});

describe('mapRestPrJson', () => {
  it('prefers merged, then closed, then draft, then open — checks always none', () => {
    expect(mapRestPrJson({ state: 'closed', merged: true })).toEqual({
      state: 'merged',
      checks: 'none',
    });
    expect(mapRestPrJson({ state: 'closed', merged: false })?.state).toBe('closed');
    expect(mapRestPrJson({ state: 'open', draft: true })?.state).toBe('draft');
    expect(mapRestPrJson({ state: 'open', draft: false })?.state).toBe('open');
  });

  it('returns null for a non-PR payload', () => {
    expect(mapRestPrJson({})).toBeNull();
    expect(mapRestPrJson(null)).toBeNull();
  });
});
