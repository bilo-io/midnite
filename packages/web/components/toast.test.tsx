import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { ToastProvider, useToast } from './toast';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Renders the provider with a button that pushes one toast of the given variant. */
function harness(push: (toast: ReturnType<typeof useToast>) => void) {
  function Pusher() {
    const toast = useToast();
    return (
      <button type="button" onClick={() => push(toast)}>
        push
      </button>
    );
  }
  render(
    <ToastProvider>
      <Pusher />
    </ToastProvider>,
  );
  act(() => screen.getByRole('button', { name: 'push' }).click());
}

it('styles a warning toast amber, not destructive', () => {
  harness((toast) => toast.warning('Agent needs your input'));
  const toast = screen.getByRole('status');
  expect(toast.className).toContain('border-amber-500/40');
  expect(toast.className).not.toContain('border-destructive');
});

it('renders the description under the message', () => {
  harness((toast) =>
    toast.warning('Agent needs your input', { description: 'Create background assets' }),
  );
  expect(screen.getByText('Agent needs your input')).toBeInTheDocument();
  expect(screen.getByText('Create background assets')).toBeInTheDocument();
});

it('lingers 2s longer than the previous defaults before auto-dismissing', () => {
  vi.useFakeTimers();
  harness((toast) => toast.success('Saved'));
  // The old success default was 4s — at 4.5s it must still be on screen.
  act(() => void vi.advanceTimersByTime(4500));
  expect(screen.getByRole('status')).toBeInTheDocument();
  act(() => void vi.advanceTimersByTime(2000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
