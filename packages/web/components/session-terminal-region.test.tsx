import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { SessionDetail, SessionTranscript } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

afterEach(cleanup);

// The live path mounts the WS terminal; the ended path fetches a transcript.
// Stub both so this unit tests only the fork + the badge.
vi.mock('@/components/session-terminal', () => ({
  SessionTerminal: () => <div data-testid="live-terminal">live terminal</div>,
}));

const getSessionTranscript = vi.fn();
vi.mock('@/lib/api', () => ({ getSessionTranscript: (...a: unknown[]) => getSessionTranscript(...a) }));

import { SessionTerminalRegion } from './session-terminal-region';

const base: SessionDetail = {
  id: 's1',
  projectSlug: 'task',
  projectDisplay: 'midnite',
  title: 'Fix login flow',
  subtitle: '',
  status: 'running',
  lastActivity: 0,
  linkedTaskId: 't1',
  createdAt: '2026-07-01T00:00:00Z',
  retryCount: 0,
  contextEstimate: true,
};

const transcript: SessionTranscript = {
  id: 's1',
  title: 'Fix login flow',
  status: 'completed',
  projectDisplay: 'midnite',
  messages: [{ uuid: 'm1', role: 'assistant', text: 'all done', timestamp: 0 }],
  taskEvents: [],
} as SessionTranscript;

describe('SessionTerminalRegion', () => {
  it('renders the interactive terminal + a live badge for a running session', () => {
    render(withQueryClient(<SessionTerminalRegion session={base} />));
    expect(screen.getByTestId('live-terminal')).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
    expect(getSessionTranscript).not.toHaveBeenCalled();
  });

  it('treats an idle session as live (still attachable)', () => {
    render(withQueryClient(<SessionTerminalRegion session={{ ...base, status: 'idle' }} />));
    expect(screen.getByTestId('live-terminal')).toBeInTheDocument();
  });

  it('renders the read-only transcript + an ended badge for a completed session', async () => {
    getSessionTranscript.mockResolvedValueOnce(transcript);
    render(withQueryClient(<SessionTerminalRegion session={{ ...base, status: 'completed' }} />));
    expect(screen.getByText(/ended · read-only/)).toBeInTheDocument();
    expect(await screen.findByText('all done')).toBeInTheDocument();
    expect(getSessionTranscript).toHaveBeenCalledWith('task', 's1');
    expect(screen.queryByTestId('live-terminal')).toBeNull();
  });

  it('treats an archived running session as ended', async () => {
    getSessionTranscript.mockResolvedValueOnce(transcript);
    render(withQueryClient(<SessionTerminalRegion session={{ ...base, archivedAt: '2026-07-01T01:00:00Z' }} />));
    expect(screen.getByText(/ended · read-only/)).toBeInTheDocument();
    expect(await screen.findByText('all done')).toBeInTheDocument();
  });
});
