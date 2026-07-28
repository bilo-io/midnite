import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/vitest.render-intl';
import { ConfirmProvider, useConfirm, type ConfirmOptions } from './confirm-dialog';

/** Opens the dialog with `opts` and reports what the promise resolved to. */
function Harness({ opts, onResult }: { opts: ConfirmOptions; onResult?: (ok: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm(opts);
        onResult?.(ok);
      }}
    >
      open
    </button>
  );
}

function renderDialog(opts: ConfirmOptions, onResult?: (ok: boolean) => void) {
  return renderWithIntl(
    <ConfirmProvider>
      <Harness opts={opts} onResult={onResult} />
    </ConfirmProvider>,
  );
}

describe('ConfirmProvider', () => {
  it('resolves true on confirm and false on cancel', async () => {
    const onResult = vi.fn();
    renderDialog({ title: 'Delete this?' }, onResult);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));
  });

  it('styles the confirm button by tone — success is not destructive', async () => {
    renderDialog({ title: 'Mark this task as done?', confirmLabel: 'Mark as done', tone: 'success' });

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    const confirmButton = await screen.findByRole('button', { name: 'Mark as done' });
    expect(confirmButton).toHaveClass('bg-success');
    expect(confirmButton.className).not.toContain('bg-destructive');
  });

  it('defaults to the destructive tone', async () => {
    renderDialog({ title: 'Delete this?', confirmLabel: 'Delete' });

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByRole('button', { name: 'Delete' })).toHaveClass('bg-destructive');
  });

  it('runs an onConfirm action and closes once it resolves', async () => {
    const onResult = vi.fn();
    const action = vi.fn().mockResolvedValue(undefined);
    renderDialog({ title: 'Mark this task as done?', tone: 'success', onConfirm: action }, onResult);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and shows the error when onConfirm rejects', async () => {
    const onResult = vi.fn();
    const action = vi.fn().mockRejectedValue(new Error('gateway said no'));
    renderDialog({ title: 'Mark this task as done?', onConfirm: action }, onResult);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('gateway said no');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();
  });
});
