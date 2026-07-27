import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

afterEach(cleanup);

// The live path mounts the WS-backed xterm terminal — stub it so this unit test
// only covers the start()-on-mount + loading/error/success fork, same approach as
// session-terminal-region.test.tsx for the session terminal.
vi.mock('./live-terminal', () => ({
  LiveTerminal: ({ attachId, label }: { attachId: string; label: string }) => (
    <div data-testid="live-terminal">
      {label}: {attachId}
    </div>
  ),
}));

import { RunCommandModal } from './run-command-modal';

describe('RunCommandModal', () => {
  it('calls start() on mount and renders the terminal once a terminalId comes back', async () => {
    const start = vi.fn().mockResolvedValue({ terminalId: 'adhoc-1' });
    render(<RunCommandModal title="Preview" start={start} onClose={vi.fn()} />);

    expect(screen.getByText(/Starting preview/i)).toBeInTheDocument();
    expect(start).toHaveBeenCalledTimes(1);

    expect(await screen.findByTestId('live-terminal')).toHaveTextContent('adhoc-1');
    expect(screen.getByRole('dialog', { name: 'Preview' })).toBeInTheDocument();
  });

  it('shows an error if start() rejects', async () => {
    const start = vi.fn().mockRejectedValue(new Error('project has no start command configured'));
    render(<RunCommandModal title="Preview" start={start} onClose={vi.fn()} />);

    expect(await screen.findByText('project has no start command configured')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const start = vi.fn().mockResolvedValue({ terminalId: 'adhoc-1' });
    const onClose = vi.fn();
    render(<RunCommandModal title="Build" start={start} onClose={onClose} />);
    await screen.findByTestId('live-terminal');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const start = vi.fn().mockResolvedValue({ terminalId: 'adhoc-1' });
    const onClose = vi.fn();
    render(<RunCommandModal title="Build" start={start} onClose={onClose} />);
    await screen.findByTestId('live-terminal');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
