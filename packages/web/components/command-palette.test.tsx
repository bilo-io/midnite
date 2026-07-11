import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SearchResponse, SearchResult } from '@midnite/shared';

// next/navigation's useRouter throws outside the App Router runtime, so stub it.
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

// The palette calls the real GET /search via this client — mock it so tests drive
// the result set without a gateway.
const searchAll = vi.fn();
const previewChatCommand = vi.fn();
const runChatCommand = vi.fn();
const undoChatCommand = vi.fn();
vi.mock('@/lib/api', () => ({
  searchAll: (...args: unknown[]) => searchAll(...args),
  previewChatCommand: (...args: unknown[]) => previewChatCommand(...args),
  runChatCommand: (...args: unknown[]) => runChatCommand(...args),
  undoChatCommand: (...args: unknown[]) => undoChatCommand(...args),
}));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

import { CommandPalette } from './command-palette';

/** Fire the global ⌘K shortcut the component listens for on window. */
const pressCmdK = () => fireEvent.keyDown(window, { key: 'k', metaKey: true });

const PLACEHOLDER = 'Jump to, search, or run a command…';

const result = (over: Partial<SearchResult>): SearchResult => ({
  type: 'task',
  id: 'id',
  title: 'A result',
  snippet: 'a <mark>match</mark> here',
  route: '/tasks?task=id',
  score: 1,
  ...over,
});

function countByType(results: SearchResult[]): SearchResponse['byType'] {
  const out: SearchResponse['byType'] = {};
  for (const r of results) out[r.type] = (out[r.type] ?? 0) + 1;
  return out;
}

const response = (
  results: SearchResult[],
  byType?: SearchResponse['byType'],
): SearchResponse => ({
  results,
  total: results.length,
  byType: byType ?? countByType(results),
});

describe('CommandPalette', () => {
  beforeEach(() => {
    localStorage.clear();
    searchAll.mockReset();
    searchAll.mockResolvedValue(response([]));
  });
  afterEach(() => push.mockReset());

  it('stays closed until ⌘K, then lists every enabled surface', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).toBeNull();

    pressCmdK();

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    // Each result row is a listbox `option` (Phase 60 I combobox pattern): 13
    // toggleable features + 3 always-on destinations (Agents, Profile,
    // Settings). The header `?` keyboard-shortcuts control stays a plain button.
    expect(screen.getAllByRole('option')).toHaveLength(16);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    // Empty query never hits the network.
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('⌘K toggles it shut again', () => {
    render(<CommandPalette />);
    pressCmdK();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    pressCmdK();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches to chat-to-board mode on a leading ">" and does not search', async () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '>' } });
    // The chat panel replaces the search list.
    expect(screen.getByTestId('chat-bar')).toBeInTheDocument();
    expect(screen.getByText(/type a natural-language command/i)).toBeInTheDocument();
    // Even with query length past the search threshold, chat mode never searches.
    fireEvent.change(screen.getByLabelText('Chat with the board'), { target: { value: '>add "x" p1' } });
    await waitFor(() => expect(searchAll).not.toHaveBeenCalled());
  });

  it('opens straight into chat mode on the midnite:open-chat event', () => {
    render(<CommandPalette />);
    fireEvent(window, new CustomEvent('midnite:open-chat'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('chat-bar')).toBeInTheDocument();
  });

  it('matches page jumps on the description, not just the label', async () => {
    render(<CommandPalette />);
    pressCmdK();
    // "kanban" appears only in the Tasks feature description.
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'kanban' } });
    // The single matching result is a listbox `option` (Phase 60 I).
    const results = screen.getAllByRole('option');
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveTextContent('Tasks');
    await waitFor(() => expect(searchAll).toHaveBeenCalled());
  });

  it('shows an empty state when neither pages nor content match', async () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'zzzznope' } });
    expect(await screen.findByText('No matches.')).toBeInTheDocument();
    // Only the keyboard-shortcuts (?) button remains — no list-item buttons.
    expect(screen.queryAllByRole('button')).toHaveLength(1);
  });

  it('navigates to the top page jump on Enter and closes', () => {
    render(<CommandPalette />);
    pressCmdK();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(input, { target: { value: 'workflows' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/workflows');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape without navigating', () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('does not search below the minimum query length', async () => {
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'a' } });
    expect(await screen.findByText(/Type at least 2 characters/)).toBeInTheDocument();
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('renders content results grouped by type beneath the page jumps', async () => {
    searchAll.mockResolvedValue(
      response([
        result({ type: 'task', id: 't1', title: 'Fix login', route: '/tasks?task=t1' }),
        result({ type: 'project', id: 'p1', title: 'Acme app', route: '/projects/p1' }),
      ]),
    );
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'login' } });

    expect(await screen.findByText('Fix login')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Acme app')).toBeInTheDocument();
  });

  it('routes to a content result on Enter when no page jump matches', async () => {
    searchAll.mockResolvedValue(
      response([result({ type: 'task', id: 't9', title: 'Squash bug', route: '/tasks?task=t9' })]),
    );
    render(<CommandPalette />);
    pressCmdK();
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    // A token that matches no feature label/description so the first row is the hit.
    fireEvent.change(input, { target: { value: 'qzxbug' } });

    await screen.findByText('Squash bug');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/tasks?task=t9');
  });

  it('caps a group and shows how many more matched', async () => {
    const hits = Array.from({ length: 6 }, (_, i) =>
      result({ type: 'task', id: `t${i}`, title: `Task ${i}`, route: `/tasks?task=t${i}` }),
    );
    searchAll.mockResolvedValue(response(hits, { task: 9 }));
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'qzxtask' } });

    const more = await screen.findByText(/\+4 more tasks/);
    expect(more).toBeInTheDocument();
    // 5 shown of the 6 returned (cap), the 6th rolls into the "+N more".
    expect(screen.getByText('Task 4')).toBeInTheDocument();
    expect(screen.queryByText('Task 5')).toBeNull();
    // "+N more" deep-links into the dedicated /search page (Theme D seam).
    fireEvent.click(more);
    expect(push).toHaveBeenCalledWith('/search?q=qzxtask&type=task');
  });

  it('highlights matched terms from the snippet without raw HTML', async () => {
    searchAll.mockResolvedValue(
      response([
        result({ type: 'note', id: 'n1', title: 'Note', snippet: 'an <mark>auth</mark> token' }),
      ]),
    );
    render(<CommandPalette />);
    pressCmdK();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'qzxauth' } });

    const mark = await screen.findByText('auth');
    expect(mark.tagName).toBe('MARK');
    // The surrounding text is rendered as plain text, not parsed as markup.
    const row = mark.closest('button')!;
    expect(row).toHaveTextContent('an auth token');
  });
});
