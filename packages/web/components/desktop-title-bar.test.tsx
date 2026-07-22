import { fireEvent, render, screen } from '@testing-library/react';
import type { WindowChromeBridge } from '@midnite/shared';
import { LocaleProvider } from '@midnite/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const back = vi.fn();
const forward = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, forward }),
  usePathname: () => '/dashboard',
}));

// The relocated header-actions cluster drags in auth/notifications/theme
// providers — its own tests cover it; here a marker is enough.
vi.mock('@/components/header/header-actions', () => ({
  HeaderActions: ({ inline }: { inline?: boolean }) => (
    <div data-testid="header-actions" data-inline={inline} />
  ),
}));

import { DesktopTitleBar } from './desktop-title-bar';

function fakeBridge(overrides: Partial<WindowChromeBridge> = {}): WindowChromeBridge {
  return {
    platform: 'darwin',
    frameless: true,
    onFullscreenChange: () => () => {},
    onFocusChange: () => () => {},
    setBackgroundColor: vi.fn(),
    ...overrides,
  };
}

const renderBar = (bridge: WindowChromeBridge | null) =>
  render(
    <LocaleProvider
      catalogs={{ 'en-GB': { nav: { features: { dashboard: 'Dashboard' } } } }}
      initialLocale="en-GB"
    >
      <DesktopTitleBar windowChrome={bridge} />
    </LocaleProvider>,
  );

describe('DesktopTitleBar', () => {
  beforeEach(() => {
    back.mockReset();
    forward.mockReset();
  });

  it('renders nothing without a frameless window', () => {
    renderBar(null);
    expect(screen.queryByRole('banner')).toBeNull();
  });

  it('mounts history nav, the active surface label, the search pill, and the relocated header cluster', () => {
    renderBar(fakeBridge());
    expect(screen.getByRole('banner', { name: 'Window title bar' })).toBeTruthy();
    // `/dashboard` (mocked pathname) belongs to the dashboard feature.
    expect(screen.getByText('Dashboard')).toBeTruthy();

    // No Navigation API in jsdom → both arrows stay enabled; clicks hit the router.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(forward).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('header-actions').dataset['inline']).toBe('true');
  });

  it('opens the command palette from the search pill', () => {
    renderBar(fakeBridge());
    const onOpen = vi.fn();
    window.addEventListener('midnite:open-palette', onOpen);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    window.removeEventListener('midnite:open-palette', onOpen);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('pushes the body background to the native window backing on mount', () => {
    document.body.style.backgroundColor = 'rgb(9, 9, 11)';
    const bridge = fakeBridge();
    renderBar(bridge);
    expect(bridge.setBackgroundColor).toHaveBeenCalledWith('#09090b');
  });
});
