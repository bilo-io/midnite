import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WindowChromeBridge } from '@midnite/shared';
import { ThemeProvider } from '@midnite/ui/theme';
import { renderWithIntl } from '@/vitest.render-intl';

// The pathname is the thing under test — each case sets it before rendering.
let pathname = '/tasks/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Force a frameless (Electron) window so the title-bar slot is populated at all.
let frameless = true;
vi.mock('@/lib/desktop-bridge', () => ({
  getWindowChromeBridge: (): WindowChromeBridge | null =>
    frameless
      ? {
          platform: 'darwin',
          frameless: true,
          onFullscreenChange: () => () => {},
          onFocusChange: () => () => {},
          setBackgroundColor: vi.fn(),
        }
      : null,
}));

// The real title bar drags in the whole header-actions/auth stack (its own spec
// covers it) — a marker is all this spec needs to see whether it mounted.
vi.mock('@/components/desktop-title-bar', () => ({
  DesktopTitleBar: () => <div data-testid="desktop-title-bar" />,
}));

// Frame-level furniture that's irrelevant here but pulls in WS/query/canvas deps.
vi.mock('@/components/office/presence-nav-pill', () => ({ PresenceNavPill: () => null }));
vi.mock('@/components/screensaver', () => ({ Screensaver: () => null }));
vi.mock('@/components/connection-status', () => ({ ConnectionToaster: () => null }));
vi.mock('@/components/notification-center', () => ({ NotificationCenter: () => null }));
vi.mock('@/components/header/header-actions', () => ({ HeaderActions: () => null }));
vi.mock('@/components/update/release-notes-popover', () => ({ ReleaseNotesPopover: () => null }));
vi.mock('@/components/language-switcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/components/notifications-provider', () => ({ useNotifications: () => ({ unread: 0 }) }));

import { AppShellClient } from './app-shell-client';

// AppFrame's mobile nav mounts @midnite/ui's ThemeToggle, which needs the real
// theme runtime (localStorage + the matchMedia polyfill from vitest.setup).
const render = (ui: ReactNode) => renderWithIntl(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
  frameless = true;
  window.localStorage.clear();
  document.documentElement.style.removeProperty('--titlebar-h');
});

describe('AppShellClient title bar', () => {
  it('mounts the desktop title bar on an ordinary route', async () => {
    pathname = '/tasks/';
    render(<AppShellClient>content</AppShellClient>);
    expect(await screen.findByTestId('desktop-title-bar')).toBeInTheDocument();
  });

  // The regression this pins: `trailingSlash: true` means usePathname() yields
  // `/slides/present/`, so an exact `=== '/slides/present'` compare silently
  // never fires and the presenter kept its full title bar.
  it.each(['/slides/present/', '/slides/present'])(
    'hides the desktop title bar while presenting a deck (%s)',
    async (route) => {
      pathname = route;
      render(<AppShellClient>content</AppShellClient>);
      // The frame still mounts (children render) — only the bar is swapped out.
      expect(await screen.findByText('content')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-title-bar')).toBeNull();
    },
  );

  it('keeps --titlebar-h published while presenting so the deck controls clear the drag strip', async () => {
    pathname = '/slides/present/';
    render(<AppShellClient>content</AppShellClient>);
    await screen.findByText('content');
    expect(document.documentElement.style.getPropertyValue('--titlebar-h')).toBe('3rem');
  });

  it('mounts no title-bar chrome at all in a browser (framed) window', async () => {
    frameless = false;
    pathname = '/slides/present/';
    render(<AppShellClient>content</AppShellClient>);
    await screen.findByText('content');
    expect(screen.queryByTestId('desktop-title-bar')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--titlebar-h')).toBe('');
  });
});
