import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PrDiff } from '@midnite/shared';

const getPrDiff = vi.fn();
vi.mock('@/lib/api', () => ({
  getPrDiff: (...a: unknown[]) => getPrDiff(...a),
  submitPrReview: vi.fn(),
  mergePr: vi.fn(),
  listPrDrafts: vi.fn(async () => []),
  createPrDraft: vi.fn(),
  updatePrDraft: vi.fn(),
  deletePrDraft: vi.fn(),
}));

import { PrReviewPanel } from './pr-review-panel';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';

// The panel now mounts the review viewer, whose action bar uses toast/confirm.
function panel(props: { taskId: string; prUrl: string }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <PrReviewPanel {...props} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

const diff: PrDiff = {
  prUrl: 'https://github.com/org/repo/pull/9',
  additions: 1,
  deletions: 0,
  truncated: false,
  hiddenFileCount: 0,
  hiddenFiles: [],
  fetchedAt: '2026-07-02T10:00:00Z',
    aiReview: null,
  files: [
    {
      path: 'a.ts',
      status: 'added',
      additions: 1,
      deletions: 0,
      binary: false,
      hunks: [
        {
          header: '@@ -0,0 +1 @@',
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 1,
          lines: [{ kind: 'add', content: 'export const x = 1;', newLine: 1 }],
        },
      ],
    },
  ],
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('PrReviewPanel', () => {
  it('shows a loading state then the diff viewer', async () => {
    getPrDiff.mockResolvedValueOnce(diff);
    render(panel({ taskId: "t1", prUrl: diff.prUrl }));
    expect(screen.getByText(/loading diff/i)).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("a.ts").length).toBeGreaterThan(0));
    expect(getPrDiff).toHaveBeenCalledWith('t1', expect.anything());
  });

  it('fails open with a retry + Open-on-GitHub escape hatch', async () => {
    getPrDiff.mockRejectedValueOnce(new Error('403 forbidden'));
    render(panel({ taskId: "t1", prUrl: diff.prUrl }));
    await waitFor(() => expect(screen.getByText(/couldn.t load the diff: 403 forbidden/i)).toBeTruthy());
    expect(screen.getByRole('link', { name: /open on github/i }).getAttribute('href')).toBe(diff.prUrl);

    // Retry re-fetches (this time succeeds).
    getPrDiff.mockResolvedValueOnce(diff);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getAllByText("a.ts").length).toBeGreaterThan(0));
  });
});
