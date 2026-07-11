import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DigestSummary } from '@midnite/shared';

import { DigestsView } from './digests-view';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

const summary = (over: Partial<DigestSummary> = {}): DigestSummary => ({
  id: 'd1',
  createdAt: '2026-07-11T08:00:00.000Z',
  from: '2026-07-10T00:00:00.000Z',
  to: '2026-07-11T00:00:00.000Z',
  counts: { shipped: 4, failed: 2, needsAttention: 1 },
  headline: 'Four shipped, two failed',
  ...over,
});

describe('DigestsView', () => {
  it('shows the empty state when there are no digests', () => {
    render(<DigestsView digests={[]} loading={false} />);
    expect(screen.getByText('No digests yet')).toBeInTheDocument();
  });

  it('renders a collapsed row per digest with its headline + tallies', () => {
    render(<DigestsView digests={[summary()]} loading={false} />);
    expect(screen.getByText('Four shipped, two failed')).toBeInTheDocument();
    // Tallies render their counts; row starts collapsed (no detail fetch).
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { expanded: false });
    expect(toggle).toBeInTheDocument();
  });

  it('hides the attention tally when zero', () => {
    render(<DigestsView digests={[summary({ counts: { shipped: 1, failed: 0, needsAttention: 0 } })]} loading={false} />);
    expect(screen.queryByText('attention')).not.toBeInTheDocument();
  });
});
