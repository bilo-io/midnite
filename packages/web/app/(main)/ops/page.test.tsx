import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  params = new URLSearchParams();
});

let params = new URLSearchParams();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => params,
  usePathname: () => '/ops',
}));

// The tab panels are their own units — stub them so this stays a deterministic
// shell test (tab strip, ?tab= routing, header action).
vi.mock('@/components/ops-grid', () => ({
  OpsGrid: () => <div data-testid="ops-grid" />,
}));
vi.mock('@/components/ops-view', () => ({
  DecisionsSection: () => <div data-testid="decisions-section" />,
}));
vi.mock('@/components/digests-feed', () => ({
  DigestsFeed: () => <div data-testid="digests-feed" />,
}));
vi.mock('@/components/ops-add-widget', () => ({
  OpsAddWidget: () => <div data-testid="ops-add-widget" />,
}));

// Data plumbing is exercised by the section/widget tests — inert here.
vi.mock('@/lib/use-polling', () => ({
  usePolling: () => ({ data: null, error: null, loading: false, refresh: vi.fn() }),
}));
vi.mock('@/hooks/use-metrics-events', () => ({ useLiveGauges: () => null }));
vi.mock('@/lib/use-gateway-error-toast', () => ({ useGatewayErrorToast: () => undefined }));

import OpsPage from './page';

describe('OpsPage tabs (?tab=)', () => {
  it('defaults to the Metrics tab: grid + add-widget action, others hidden', async () => {
    render(<OpsPage />);
    expect(await screen.findByRole('tab', { name: 'Metrics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Decisions' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Digest' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('ops-grid')).toBeInTheDocument();
    expect(screen.getByTestId('ops-add-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('decisions-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digests-feed')).not.toBeInTheDocument();
  });

  it('honours ?tab=decisions on load (reload restores the tab)', async () => {
    params = new URLSearchParams('tab=decisions');
    render(<OpsPage />);
    expect(await screen.findByRole('tab', { name: 'Decisions' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('decisions-section')).toBeInTheDocument();
    expect(screen.queryByTestId('ops-grid')).not.toBeInTheDocument();
    // The add-widget action belongs to the grid tab only.
    expect(screen.queryByTestId('ops-add-widget')).not.toBeInTheDocument();
  });

  it('honours ?tab=digest on load', async () => {
    params = new URLSearchParams('tab=digest');
    render(<OpsPage />);
    expect(await screen.findByRole('tab', { name: 'Digest' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('digests-feed')).toBeInTheDocument();
    expect(screen.queryByTestId('ops-grid')).not.toBeInTheDocument();
  });

  it('falls back to Metrics for an unknown ?tab= value', async () => {
    params = new URLSearchParams('tab=nonsense');
    render(<OpsPage />);
    expect(await screen.findByRole('tab', { name: 'Metrics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ops-grid')).toBeInTheDocument();
  });

  it('writes ?tab= on tab change', async () => {
    render(<OpsPage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Digest' }));
    expect(replace).toHaveBeenCalledWith('/ops?tab=digest', { scroll: false });
  });

  it('clears tab (and the digest ?id=) when returning to Metrics', async () => {
    params = new URLSearchParams('tab=digest&id=d1');
    render(<OpsPage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Metrics' }));
    expect(replace).toHaveBeenCalledWith('/ops', { scroll: false });
  });
});
