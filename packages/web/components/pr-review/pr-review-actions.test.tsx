import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PrReviewComment, Task } from '@midnite/shared';

const submitPrReview = vi.fn();
const mergePr = vi.fn();
vi.mock('@/lib/api', () => ({
  submitPrReview: (...a: unknown[]) => submitPrReview(...a),
  mergePr: (...a: unknown[]) => mergePr(...a),
}));

import { PrReviewActions } from './pr-review-actions';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';

const task = { id: 't1', status: 'done' } as unknown as Task;

function wrap(comments: PrReviewComment[] = [], onDone = vi.fn(), onClear = vi.fn()) {
  render(
    <ToastProvider>
      <ConfirmProvider>
        <PrReviewActions taskId="t1" comments={comments} onClearComments={onClear} onDone={onDone} />
      </ConfirmProvider>
    </ToastProvider>,
  );
  return { onDone, onClear };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('PrReviewActions', () => {
  it('submit is disabled for a comment with no body and no inline comments', () => {
    wrap();
    // Default event is "comment"; empty body ⇒ submit disabled.
    expect(screen.getByRole('button', { name: /submit review/i }).hasAttribute('disabled')).toBe(true);
  });

  it('approve can submit bare and returns the task via onDone', async () => {
    submitPrReview.mockResolvedValueOnce(task);
    const { onDone } = wrap();
    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));
    await waitFor(() =>
      expect(submitPrReview).toHaveBeenCalledWith('t1', { event: 'approve', body: undefined }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(task));
  });

  it('submits a body + batched inline comments and clears drafts', async () => {
    submitPrReview.mockResolvedValueOnce(task);
    const comments: PrReviewComment[] = [{ path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit' }];
    const { onClear } = wrap(comments);
    fireEvent.change(screen.getByPlaceholderText(/leave a review comment/i), { target: { value: 'looks off' } });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));
    await waitFor(() =>
      // Comments are server-sourced from drafts now — submit sends only event + body.
      expect(submitPrReview).toHaveBeenCalledWith('t1', { event: 'comment', body: 'looks off' }),
    );
    await waitFor(() => expect(onClear).toHaveBeenCalled());
    expect(screen.getByText(/1 inline comment pending/i)).toBeTruthy();
  });

  it('merge confirms first, then merges with the selected method', async () => {
    mergePr.mockResolvedValueOnce(task);
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /^merge$/i }));
    // The confirm dialog appears (title "Merge this PR (squash)?"); its confirm
    // button is the second "Merge" — click the last-rendered one.
    await screen.findByText(/merge this pr/i);
    const mergeButtons = screen.getAllByRole('button', { name: /^merge$/i });
    fireEvent.click(mergeButtons[mergeButtons.length - 1]!);
    await waitFor(() => expect(mergePr).toHaveBeenCalledWith('t1', 'squash'));
  });
});
