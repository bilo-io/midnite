import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

const invalidateData = vi.fn();
vi.mock('@/lib/data-refresh', () => ({ invalidateData: () => invalidateData() }));

import { ReloadButton } from './reload-button';

afterEach(cleanup);
beforeEach(() => {
  invalidateData.mockReset();
});

describe('ReloadButton', () => {
  it('soft-refreshes (re-fetches active queries) on a left click', () => {
    render(<ReloadButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(invalidateData).toHaveBeenCalledTimes(1);
  });

  it('right click opens a menu offering Refresh and Hard Reload instead of navigating', () => {
    render(<ReloadButton />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reload' }));
    expect(screen.getByRole('menuitem', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hard Reload' })).toBeInTheDocument();
  });

  it('the menu\'s Refresh item does the same soft refresh as the left click', () => {
    render(<ReloadButton />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reload' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Refresh' }));
    expect(invalidateData).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'Refresh' })).toBeNull();
  });

  it('Hard Reload does a full window reload, bypassing in-app state', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, reload }, writable: true });

    render(<ReloadButton />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reload' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hard Reload' }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(invalidateData).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('closes the context menu on Escape', () => {
    render(<ReloadButton />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reload' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
