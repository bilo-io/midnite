import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { SessionDetail } from '@midnite/shared';

import { SessionInfoPanel } from './session-info-panel';

afterEach(cleanup);

const HOUR = 3_600_000;

const base: SessionDetail = {
  id: 's1',
  projectSlug: 'task',
  projectDisplay: 'midnite',
  title: 'Fix login flow',
  subtitle: '',
  status: 'running',
  lastActivity: Date.now() - 2 * 60_000,
  linkedTaskId: 't1',
  createdAt: new Date(Date.now() - 3 * HOUR).toISOString(),
  retryCount: 0,
  agentCli: 'claude',
  provider: 'anthropic',
  cwd: '/Users/nova/Dev/midnite',
  contextTokens: 42_000,
  contextLimit: 200_000,
  contextEstimate: true,
};

describe('SessionInfoPanel', () => {
  it('renders the real fields for a live session', () => {
    render(<SessionInfoPanel session={base} />);
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument(); // provider label, not raw enum
    expect(screen.getByText('claude')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('/Users/nova/Dev/midnite')).toBeInTheDocument();
    expect(screen.getByText('Last activity')).toBeInTheDocument();
  });

  it('shows the context window as an estimate, never fabricated precision', () => {
    render(<SessionInfoPanel session={base} />);
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('est')).toBeInTheDocument();
    expect(screen.getByText(/42\.0k \/ 200\.0k \(est\.\)/)).toBeInTheDocument();
  });

  it('omits rows a session lacks (graceful degradation)', () => {
    const sparse: SessionDetail = {
      id: 's2',
      projectSlug: 'task',
      projectDisplay: 'midnite',
      title: 'Bare',
      subtitle: '',
      status: 'idle',
      lastActivity: Date.now(),
    };
    render(<SessionInfoPanel session={sparse} />);
    expect(screen.queryByText('Provider')).toBeNull();
    expect(screen.queryByText('Agent CLI')).toBeNull();
    expect(screen.queryByText('Working dir')).toBeNull();
    expect(screen.queryByText('Uptime')).toBeNull(); // no createdAt
    expect(screen.queryByText('Context')).toBeNull(); // no tokens/limit
    expect(screen.queryByText('Retries')).toBeNull();
    // but the always-present rows still render
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('Last activity')).toBeInTheDocument();
  });

  it('shows retries only when greater than zero', () => {
    const { rerender } = render(<SessionInfoPanel session={base} />);
    expect(screen.queryByText('Retries')).toBeNull(); // retryCount 0
    rerender(<SessionInfoPanel session={{ ...base, retryCount: 3 }} />);
    expect(screen.getByText('Retries')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('freezes uptime as a lifespan and shows an archived row for an ended session', () => {
    const created = new Date('2026-07-01T00:00:00Z');
    const archived = new Date('2026-07-01T04:30:00Z');
    render(
      <SessionInfoPanel
        session={{
          ...base,
          status: 'completed',
          createdAt: created.toISOString(),
          archivedAt: archived.toISOString(),
        }}
      />,
    );
    expect(screen.getByText('ended')).toBeInTheDocument();
    expect(screen.getByText('Ran for')).toBeInTheDocument();
    expect(screen.getByText('4h 30m')).toBeInTheDocument(); // frozen lifespan, not now
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
