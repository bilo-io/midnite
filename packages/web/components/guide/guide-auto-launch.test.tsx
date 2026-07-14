import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { GuideAutoLaunch } from './guide-auto-launch';
import { useGuide } from '@/lib/guide/use-guide';
import { SETTINGS_STORAGE_KEY } from '@/lib/app-settings';

// Controllable mocks for the three environmental gates.
let mockPathname = '/tasks';
let mockIsDesktop = true;
let mockSetup: { ready: boolean } | null = { ready: true };

vi.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
vi.mock('@/hooks/use-media-query', () => ({ useIsDesktop: () => mockIsDesktop }));
vi.mock('@/lib/use-api-data', () => ({
  useApiData: () => ({ data: mockSetup, error: null, loading: false, refresh: () => {} }),
}));
vi.mock('@/lib/api', () => ({ getSetupStatus: () => Promise.resolve(mockSetup) }));

function setAutoShow(on: boolean) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ autoShowGuides: on }));
}

beforeEach(() => {
  mockPathname = '/tasks';
  mockIsDesktop = true;
  mockSetup = { ready: true };
  window.localStorage.clear();
  useGuide.getState().stop();
});
afterEach(() => {
  cleanup();
  useGuide.getState().stop();
  window.localStorage.clear();
});

describe('GuideAutoLaunch', () => {
  it('auto-launches the route’s unseen guide when all gates pass', () => {
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active?.id).toBe('board');
  });

  it('does not fire on a non-desktop viewport', () => {
    mockIsDesktop = false;
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });

  it('does not fire while the install is still in first-run setup', () => {
    mockSetup = { ready: false };
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });

  it('does not fire before setup status has loaded', () => {
    mockSetup = null;
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });

  it('does not fire when autoShowGuides is turned off', () => {
    setAutoShow(false);
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });

  it('does not fire for a guide already seen at its current version', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ autoShowGuides: true, seenGuides: { board: 1 } }),
    );
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });

  it('does not fire on a route with no guide', () => {
    mockPathname = '/dashboard';
    render(<GuideAutoLaunch />);
    expect(useGuide.getState().active).toBeNull();
  });
});
