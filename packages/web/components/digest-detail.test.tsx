import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Digest } from '@midnite/shared';

// ExportMenu pulls in clipboard/toast plumbing; stub it. next/link → plain anchor.
vi.mock('@/components/export-menu', () => ({ ExportMenu: () => <div>export-menu</div> }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { DigestDetail } from './digest-detail';

function digest(partial: Partial<Digest> = {}): Digest {
  return {
    id: 'd1',
    createdAt: '2026-07-10T08:00:00.000Z',
    from: '2026-07-09T00:00:00.000Z',
    to: '2026-07-10T00:00:00.000Z',
    counts: { shipped: 3, failed: 1, needsAttention: 2 },
    sections: [{ name: 'acme/api', shipped: 2, failed: 1 }],
    highlights: [{ taskId: 't9', title: 'Fix the flake', outcome: 'abandoned', note: 'still flaky' }],
    spend: { totalUsd: 4.2, measuredUsd: 3.9, sessions: 5 },
    cycle: { tasks: 4, p50Ms: 120_000, p90Ms: 480_000 },
    headline: 'Three shipped, one abandoned',
    markdown: '# Fleet digest',
    ...partial,
  };
}

describe('DigestDetail', () => {
  it('renders the headline, outcome counts, spend and cycle', () => {
    render(<DigestDetail digest={digest()} />);
    expect(screen.getByRole('heading', { name: 'Three shipped, one abandoned' })).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    expect(screen.getByText('$4.20')).toBeInTheDocument();
    expect(screen.getByText('Cycle time')).toBeInTheDocument();
    expect(screen.getByText('export-menu')).toBeInTheDocument();
  });

  it('deep-links each highlight to its task via ?task=', () => {
    render(<DigestDetail digest={digest()} />);
    const link = screen.getByRole('link', { name: /Fix the flake/ });
    expect(link).toHaveAttribute('href', '/tasks?task=t9');
    expect(screen.getByText('still flaky')).toBeInTheDocument();
  });

  it('lists per-repo/project sections', () => {
    render(<DigestDetail digest={digest()} />);
    expect(screen.getByText('acme/api')).toBeInTheDocument();
    expect(screen.getByText(/2 shipped/)).toBeInTheDocument();
  });

  it('hides best-effort spend/cycle when null', () => {
    render(<DigestDetail digest={digest({ spend: null, cycle: null })} />);
    expect(screen.queryByText('Spend')).not.toBeInTheDocument();
    expect(screen.queryByText('Cycle time')).not.toBeInTheDocument();
  });
});
