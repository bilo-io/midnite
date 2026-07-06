import { afterEach, beforeEach, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ConnectionStatus, ConnectionToaster } from './connection-status';
import { ToastProvider } from './toast';
import { useConnectionStore } from '@/lib/connection-store';

afterEach(cleanup);
beforeEach(() => useConnectionStore.setState({ statuses: {} }));

it('renders the live label when all channels are healthy', () => {
  render(<ConnectionStatus />);
  expect(screen.getByRole('status')).toHaveAccessibleName('Connection: Live');
  expect(screen.getByText('Live')).toBeInTheDocument();
});

it('reflects the worst-of status (reconnecting)', () => {
  useConnectionStore.setState({ statuses: { tasks: 'reconnecting', ideas: 'live' } });
  render(<ConnectionStatus />);
  expect(screen.getByRole('status')).toHaveAccessibleName('Connection: Reconnecting…');
});

it('compact variant is a labelled dot with no visible text', () => {
  useConnectionStore.setState({ statuses: { tasks: 'stale' } });
  render(<ConnectionStatus variant="compact" />);
  expect(screen.getByRole('status')).toHaveAccessibleName(/data may be behind/);
  expect(screen.queryByText('Reconnecting…')).toBeNull();
});

it('toasts once when the app recovers from a drop', async () => {
  useConnectionStore.setState({ statuses: { tasks: 'reconnecting' } });
  render(
    <ToastProvider>
      <ConnectionToaster />
    </ToastProvider>,
  );
  expect(screen.queryByText('Reconnected')).toBeNull();
  act(() => useConnectionStore.setState({ statuses: { tasks: 'live' } }));
  expect(await screen.findByText('Reconnected')).toBeInTheDocument();
});
