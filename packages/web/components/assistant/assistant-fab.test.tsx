import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks/graph',
  useRouter: () => ({ push: routerPush }),
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
  afterEach(async () => {
    // The panel portals into document.body; without an explicit unmount its DOM
    // (and the guide list) accumulates across tests. Close any open panel, then
    // clean up so each test sees a single panel.
    const { useGuide } = await import('@/lib/guide/use-guide');
    useGuide.getState().stop();
    cleanup();
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
    for (const label of ['Docs', 'Chat', 'Agent']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    // "Guide" is a split control: a main "play this page" button + a trailing
    // "Browse all guides" arrow.
    expect(screen.getByRole('button', { name: /^Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse all guides' })).toBeInTheDocument();
  });

  it('disables only the not-yet-built Agent entry (Guide is live in Theme F)', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    expect(screen.getByRole('button', { name: /Agent/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Guide/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^Chat/i })).not.toBeDisabled();
  });

  it('Guides opens the index; replaying the current route’s guide starts it (Theme C)', async () => {
    const { useGuide } = await import('@/lib/guide/use-guide');
    useGuide.getState().stop();
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    // "Guides" now opens the All-guides index rather than starting inline.
    fireEvent.click(screen.getByRole('button', { name: /Guides/i }));
    expect(screen.getByRole('dialog', { name: 'Guides' })).toBeInTheDocument();
    // /tasks/graph → the board guide is the current one; replaying it starts
    // immediately (on-route) with no navigation.
    fireEvent.click(screen.getByRole('button', { name: /^Board tour/i }));
    expect(useGuide.getState().active?.id).toBe('board');
    expect(routerPush).not.toHaveBeenCalled();
    useGuide.getState().stop();
  });

  it('shows the unseen nudge dot when any guide is unseen (Theme C)', () => {
    // Fresh storage → every guide is unseen → the decorative FAB dot shows.
    const { container } = render(<AssistantFab />);
    expect(container.querySelector('span.bg-primary.ring-card')).not.toBeNull();
  });

  it('the All-guides index flags unseen guides with a dot (Theme C)', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /Guides/i }));
    // Fresh storage → the index marks unseen guides.
    expect(screen.getAllByTitle('Not seen yet').length).toBeGreaterThan(0);
  });

  it('replaying an off-route guide navigates + queues it (Theme C)', async () => {
    const { useGuide } = await import('@/lib/guide/use-guide');
    useGuide.getState().stop();
    routerPush.mockClear();
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /Guides/i }));
    // Memory guide is off-route (we're on /tasks/graph): navigate + set pending,
    // don't start yet.
    fireEvent.click(screen.getByRole('button', { name: /^Memory workspace tour/i }));
    expect(routerPush).toHaveBeenCalledWith('/memory');
    expect(useGuide.getState().pending?.id).toBe('memory');
    expect(useGuide.getState().active).toBeNull();
    useGuide.getState().clearPending();
  });

  it('opens the current route’s docs in a new tab (Theme C)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_DOCS_URL', 'https://example.test/docs');
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /Docs/i }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = (window.open as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    // /tasks/graph → /app/tasks docs page, hash-routed.
    expect(url).toMatch(/#\/app\/tasks$/);
    vi.unstubAllEnvs();
  });

  it('swaps to the chat view and back (Theme D)', () => {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Open assistant' }));
    fireEvent.click(screen.getByRole('button', { name: /^Chat/i }));

    expect(screen.getByTestId('chat-bar')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Chat' })).toBeInTheDocument();

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
