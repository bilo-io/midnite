import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks/graph',
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub for next/image
  default: (props: any) => <img {...props} />,
}));

import { AssistantFab } from './assistant-fab';

describe('AssistantFab', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the logo FAB and opens a labelled dialog with all four entries', () => {
    render(<AssistantFab />);
    const fab = screen.getByRole('button', { name: 'Open assistant' });
    expect(fab).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(fab);

    const dialog = screen.getByRole('dialog', { name: 'Assistant' });
    expect(dialog).toBeInTheDocument();
    expect(fab).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['Docs', 'Guide', 'Chat to board', 'Agent']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('disables the not-yet-built Guide and Agent entries', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    expect(screen.getByRole('button', { name: /Guide/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Agent/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Chat to board/i })).not.toBeDisabled();
  });

  it('opens the current route’s docs in a new tab (Theme C)', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /Docs/i }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = (window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    // /tasks/graph → /app/tasks docs page, hash-routed.
    expect(url).toMatch(/#\/app\/tasks$/);
  });

  it('swaps to the chat view and back (Theme D)', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /Chat to board/i }));

    expect(screen.getByTestId('chat-bar')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Chat to board' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to assistant menu' }));
    expect(screen.queryByTestId('chat-bar')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Assistant' })).toBeInTheDocument();
  });

  it('opens straight into chat on the midnite:open-chat event (re-pointed FAB)', () => {
    render(<AssistantFab />);
    fireEvent(window, new CustomEvent('midnite:open-chat'));
    expect(screen.getByTestId('chat-bar')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
