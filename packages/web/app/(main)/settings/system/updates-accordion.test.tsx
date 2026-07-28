import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '../../../../vitest.render-intl';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import type { UpdateContextValue } from '@/components/update/update-provider';
import { UpdatesAccordion } from './updates-accordion';

// The accordion reads update state for its status row. Stub the context rather than
// mounting the real provider (which would pull in the version poll, the service
// worker and the toast channel) so this spec stays about the accordion.
const updateState = vi.hoisted(() => ({ value: {} as Partial<UpdateContextValue> }));
vi.mock('@/components/update/update-provider', () => ({
  useUpdate: () => ({
    isDesktop: false,
    available: false,
    latest: null,
    error: null,
    ...updateState.value,
  }),
}));

function readStoredChannel(): string | undefined {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Partial<AppSettings>).updateChannel : undefined;
}

beforeEach(() => {
  window.localStorage.clear();
  updateState.value = {};
});

afterEach(cleanup);

describe('UpdatesAccordion', () => {
  it('defaults the release channel to stable', () => {
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    const select = screen.getByLabelText('Release channel') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_SETTINGS.updateChannel);
    expect(select.value).toBe('stable');
  });

  it('persists a channel change to settings', () => {
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    const select = screen.getByLabelText('Release channel');
    fireEvent.change(select, { target: { value: 'beta' } });
    expect(readStoredChannel()).toBe('beta');
  });

  it('offers both channels', () => {
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    expect(screen.getByRole('option', { name: 'Stable' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });

  // The desktop status row: a failed check is fail-soft in the banner (it hides when
  // no version is known), which is how a broken update feed stayed invisible across
  // releases — so the reason has to be readable here.
  it('shows nothing about updater status in a plain browser', () => {
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    expect(screen.queryByText('Update status')).not.toBeInTheDocument();
  });

  it('reports up to date on desktop when the feed is healthy and current', () => {
    updateState.value = { isDesktop: true };
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    expect(screen.getByText('This build is up to date.')).toBeInTheDocument();
  });

  it('names the available version on desktop', () => {
    updateState.value = { isDesktop: true, available: true, latest: '0.8.0' };
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    expect(screen.getByText('Version 0.8.0 is available.')).toBeInTheDocument();
  });

  it('surfaces a failed check the banner hides', () => {
    updateState.value = {
      isDesktop: true,
      error: 'Cannot find stable-mac.yml in the latest release artifacts',
    };
    render(<UpdatesAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /updates/i }));
    expect(screen.getByText(/stable-mac\.yml/)).toBeInTheDocument();
  });

  // Phase 82 C — renders under fr-FR (exercises the t.rich channel description too).
  it('renders in fr-FR', () => {
    render(<UpdatesAccordion />, { locale: 'fr-FR' });
    fireEvent.click(screen.getByRole('button', { name: /mises à jour/i }));
    expect(screen.getByLabelText('Canal de publication')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bêta' })).toBeInTheDocument();
  });
});
