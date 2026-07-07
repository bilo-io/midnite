import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

// Controllable router + search params.
const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

// The dynamic engines are heavy (Phaser / WebGL) — stub them so the test asserts
// which one mounts, not their internals.
vi.mock('@/components/office/office-view', () => ({
  OfficeView: () => <div data-testid="office-2d" />,
}));
vi.mock('@/components/office/office-3d-view', () => ({
  Office3DView: () => <div data-testid="office-3d" />,
}));

import { OfficeSurface } from './office-surface';

function setStoredView(view: '2d' | '3d') {
  const settings: AppSettings = { ...DEFAULT_SETTINGS, officeView: view };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
  searchParams = new URLSearchParams();
});
afterEach(cleanup);

describe('OfficeSurface', () => {
  it('defaults to the 2D engine with no param and no stored preference', () => {
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-2d')).toBeInTheDocument();
    expect(screen.queryByTestId('office-3d')).toBeNull();
    expect(screen.getByRole('tab', { name: '2D' })).toHaveAttribute('aria-selected', 'true');
  });

  it('honours the ?view=3d param over the default', () => {
    searchParams = new URLSearchParams('view=3d');
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-3d')).toBeInTheDocument();
    expect(screen.queryByTestId('office-2d')).toBeNull();
  });

  it('falls back to the stored preference when no param is present', () => {
    setStoredView('3d');
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-3d')).toBeInTheDocument();
  });

  it('the URL param wins over the stored preference', () => {
    setStoredView('3d');
    searchParams = new URLSearchParams('view=2d');
    render(<OfficeSurface />);
    expect(screen.getByTestId('office-2d')).toBeInTheDocument();
  });

  it('clicking a tab updates the URL (replace) and persists the preference', () => {
    render(<OfficeSurface />);
    fireEvent.click(screen.getByRole('tab', { name: '3D' }));
    expect(replace).toHaveBeenCalledWith('?view=3d');
    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
    expect(stored.officeView).toBe('3d');
  });

  it('mounts only one engine at a time (teardown on switch)', () => {
    searchParams = new URLSearchParams('view=3d');
    render(<OfficeSurface />);
    // Exactly the 3D engine — the 2D one is unmounted, not hidden.
    expect(screen.queryByTestId('office-2d')).toBeNull();
    expect(screen.getByTestId('office-3d')).toBeInTheDocument();
  });
});
