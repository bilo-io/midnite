import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LocaleProvider } from '@midnite/shell';
import type { DigestListItem } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getDigests = vi.fn();
vi.mock('@/lib/api', () => ({ getDigests: (...args: unknown[]) => getDigests(...args) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { DigestWidget } from './digest-widget';

// DigestWidget formats the digest date via the locale-aware seam (Phase 79 F), which
// needs next-intl's provider — mounted globally in the app, so supply it in tests too.
const renderWidget = () =>
  render(
    withQueryClient(
      <LocaleProvider catalogs={{}} initialLocale="en-GB">
        <DigestWidget />
      </LocaleProvider>,
    ),
  );

const item: DigestListItem = {
  id: 'd1',
  createdAt: '2026-07-10T08:00:00.000Z',
  from: '2026-07-09T00:00:00.000Z',
  to: '2026-07-10T00:00:00.000Z',
  headline: 'A productive day',
  counts: { shipped: 5, failed: 2, needsAttention: 1 },
};

describe('DigestWidget', () => {
  beforeEach(() => getDigests.mockReset());

  it('shows the latest digest headline + counts, linking to the feed', async () => {
    getDigests.mockResolvedValue([item]);
    renderWidget();
    await waitFor(() => expect(screen.getByText('A productive day')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ops?tab=digest&id=d1');
  });

  it('shows an honest empty state when no digests exist', async () => {
    getDigests.mockResolvedValue([]);
    renderWidget();
    await waitFor(() => expect(screen.getByText(/No digests yet/)).toBeInTheDocument());
  });
});
