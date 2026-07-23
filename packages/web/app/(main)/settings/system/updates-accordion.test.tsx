import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '../../../../vitest.render-intl';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { UpdatesAccordion } from './updates-accordion';

function readStoredChannel(): string | undefined {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Partial<AppSettings>).updateChannel : undefined;
}

beforeEach(() => {
  window.localStorage.clear();
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
});
