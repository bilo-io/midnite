import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PrStatus } from '@midnite/shared';
import { PrStatusChip } from './pr-status-chip';

function make(overrides: Partial<PrStatus> = {}): PrStatus {
  return {
    state: 'open',
    checks: 'passing',
    url: 'https://github.com/org/repo/pull/42',
    number: 42,
    fetchedAt: '2026-06-23T12:00:00Z',
    ...overrides,
  };
}

describe('PrStatusChip', () => {
  it('shows the PR number', () => {
    render(<PrStatusChip status={make({ number: 99 })} />);
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('has aria-label with state and number', () => {
    render(<PrStatusChip status={make({ state: 'open', checks: 'passing', number: 42 })} />);
    const chip = screen.getByLabelText(/PR #42/);
    expect(chip).toBeTruthy();
  });

  it('renders for merged state', () => {
    render(<PrStatusChip status={make({ state: 'merged', checks: 'passing' })} />);
    expect(screen.getByLabelText(/Merged/)).toBeTruthy();
  });

  it('renders for failing checks', () => {
    render(<PrStatusChip status={make({ state: 'open', checks: 'failing' })} />);
    expect(screen.getByLabelText(/CI failing/)).toBeTruthy();
  });

  it('renders for draft state', () => {
    render(<PrStatusChip status={make({ state: 'draft', checks: 'none' })} />);
    expect(screen.getByLabelText(/Draft/)).toBeTruthy();
  });
});
