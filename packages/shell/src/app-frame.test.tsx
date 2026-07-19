import { type ReactElement } from 'react';
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@midnite/ui/theme';
import { describe, expect, it, vi } from 'vitest';

import { AppFrame, isActivePath, type NavConfig, type NavLinkComponent } from './app-frame';

/** The mobile nav mounts `<ThemeToggle>`, which needs a `ThemeProvider` in scope. */
const render = (ui: ReactElement) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

const NAV: NavConfig = {
  brand: <span>midnite</span>,
  sections: [
    { title: 'Main', items: [{ href: '/', label: 'Board' }, { href: '/sessions', label: 'Sessions' }] },
    { items: [{ href: '/settings', label: 'Settings', badge: <span>3</span> }] },
  ],
  footer: <button type="button">Account</button>,
};

/** The desktop rail's inner nav landmark — links appear here AND in the mobile nav. */
const rail = () => within(screen.getByRole('navigation', { name: 'Primary' }));
const mobile = () => within(screen.getByRole('navigation', { name: 'Mobile navigation' }));

describe('isActivePath', () => {
  it('matches the exact path and descendants (but not the root for everything)', () => {
    expect(isActivePath('/sessions', '/sessions')).toBe(true);
    expect(isActivePath('/sessions/abc', '/sessions')).toBe(true);
    expect(isActivePath('/sessionsx', '/sessions')).toBe(false);
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/sessions', '/')).toBe(false);
  });
});

describe('AppFrame', () => {
  it('renders every injected nav item as a rail link, plus brand/footer/section titles', () => {
    render(
      <AppFrame nav={NAV} activePath="/sessions">
        <p>content</p>
      </AppFrame>,
    );
    expect(rail().getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/');
    expect(rail().getByRole('link', { name: /Sessions/ })).toHaveAttribute('href', '/sessions');
    expect(rail().getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings');
    // Brand + footer + the collapsible section header live only in the rail.
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('midnite')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('marks only the active route with aria-current=page', () => {
    render(
      <AppFrame nav={NAV} activePath="/sessions">
        <p>content</p>
      </AppFrame>,
    );
    expect(rail().getByRole('link', { name: /Sessions/ })).toHaveAttribute('aria-current', 'page');
    expect(rail().getByRole('link', { name: 'Board' })).not.toHaveAttribute('aria-current');
  });

  it('renders header actions and a banner in their slots', () => {
    render(
      <AppFrame
        nav={NAV}
        activePath="/"
        headerActions={<button type="button">Notify</button>}
        banner={<div>Update available</div>}
      >
        <p>content</p>
      </AppFrame>,
    );
    expect(screen.getByRole('button', { name: 'Notify' })).toBeInTheDocument();
    expect(screen.getByText('Update available')).toBeInTheDocument();
  });

  it('routes links through an injected link component', () => {
    const Link: NavLinkComponent = ({ href, children, ...rest }) => (
      <a data-custom href={href} {...rest}>
        {children}
      </a>
    );
    render(
      <AppFrame nav={NAV} activePath="/" linkComponent={Link}>
        <p>content</p>
      </AppFrame>,
    );
    expect(rail().getByRole('link', { name: 'Board' })).toHaveAttribute('data-custom');
  });

  it('accepts render-prop brand/footer slots and hands them { expanded }', () => {
    render(
      <AppFrame
        nav={{
          sections: [],
          brand: ({ expanded }) => <span>brand:{expanded ? 'open' : 'rail'}</span>,
          footer: ({ expanded }) => <span>footer:{expanded ? 'open' : 'rail'}</span>,
        }}
        activePath="/"
        navMode="expanded"
      >
        <p>content</p>
      </AppFrame>,
    );
    expect(screen.getByText('brand:open')).toBeInTheDocument();
    expect(screen.getByText('footer:open')).toBeInTheDocument();
  });

  describe('collapsible sections', () => {
    const KEYED: NavConfig = {
      sections: [
        { key: 'app', title: 'App', items: [{ href: '/board', label: 'Board' }] },
        { key: 'agents', title: 'Agents', items: [{ href: '/agents', label: 'Agents' }] },
      ],
    };

    it('toggles a section via onToggleSection with its key (expanded view)', () => {
      const onToggleSection = vi.fn();
      render(
        <AppFrame nav={KEYED} activePath="/" navMode="expanded" onToggleSection={onToggleSection}>
          <p>content</p>
        </AppFrame>,
      );
      fireEvent.click(screen.getByRole('button', { name: /App/ }));
      expect(onToggleSection).toHaveBeenCalledWith('app');
    });

    it('falls back to the section index when a section has no key', () => {
      const onToggleSection = vi.fn();
      render(
        <AppFrame nav={NAV} activePath="/" navMode="expanded" onToggleSection={onToggleSection}>
          <p>content</p>
        </AppFrame>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Main/ }));
      expect(onToggleSection).toHaveBeenCalledWith('0');
    });

    it('renders section headers as icon buttons with tooltips when collapsed (navMode)', () => {
      render(
        <AppFrame nav={KEYED} activePath="/" navMode="collapsed">
          <p>content</p>
        </AppFrame>,
      );
      // Collapsed rail: the header is an icon button with an aria-label, and every
      // rail control carries a hover tooltip instead of an inline label.
      expect(rail().getByRole('button', { name: 'App section' })).toBeInTheDocument();
      expect(rail().getAllByRole('tooltip').length).toBeGreaterThan(0);
    });

    it('renders section headers as text with the title when expanded (navMode)', () => {
      render(
        <AppFrame nav={KEYED} activePath="/" navMode="expanded">
          <p>content</p>
        </AppFrame>,
      );
      const header = screen.getByRole('button', { name: /App/ });
      expect(within(header).getByText('App')).toBeInTheDocument();
      expect(rail().queryAllByRole('tooltip')).toHaveLength(0);
    });
  });

  describe('mobile nav', () => {
    const SIX: NavConfig = {
      pinned: [{ href: '/', label: 'Home' }],
      sections: [
        { title: 'A', items: [{ href: '/a', label: 'Alpha' }, { href: '/b', label: 'Bravo' }] },
        { title: 'B', items: [{ href: '/c', label: 'Charlie' }, { href: '/d', label: 'Delta' }, { href: '/e', label: 'Echo' }] },
      ],
    };

    it('renders the first N flattened items as tabs and spills the rest into the More sheet', () => {
      render(
        <AppFrame nav={SIX} activePath="/" mobileMaxTabs={4}>
          <p>content</p>
        </AppFrame>,
      );
      // Flatten order = pinned + section items → [Home, Alpha, Bravo, Charlie, Delta, Echo].
      // First 4 are tabs; the More button + the last 2 spill into the sheet.
      expect(mobile().getByRole('link', { name: 'Home' })).toBeInTheDocument();
      expect(mobile().getByRole('link', { name: 'Charlie' })).toBeInTheDocument();
      expect(mobile().getByRole('button', { name: 'Menu' })).toBeInTheDocument();
      // Overflow items are not tabs; they live in the dialog sheet.
      expect(mobile().queryByRole('link', { name: 'Delta' })).not.toBeInTheDocument();
      // Open the sheet so its contents enter the accessibility tree (closed = aria-hidden).
      fireEvent.click(mobile().getByRole('button', { name: 'Menu' }));
      const sheet = within(screen.getByRole('dialog', { name: 'Menu' }));
      expect(sheet.getByRole('link', { name: 'Delta' })).toBeInTheDocument();
      expect(sheet.getByRole('link', { name: 'Echo' })).toBeInTheDocument();
    });

    it('renders a Settings tile and Lock button in the More sheet', () => {
      const onLock = vi.fn();
      render(
        <AppFrame
          nav={SIX}
          activePath="/"
          settings={{ href: '/settings', label: 'Settings' }}
          onLock={onLock}
        >
          <p>content</p>
        </AppFrame>,
      );
      fireEvent.click(mobile().getByRole('button', { name: 'Menu' }));
      const sheet = within(screen.getByRole('dialog', { name: 'Menu' }));
      expect(sheet.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
      expect(sheet.getByRole('button', { name: /Lock/ })).toBeInTheDocument();
    });

    it('shows an unread dot on the More button when mobileUnread > 0', () => {
      const { rerender } = render(
        <AppFrame nav={SIX} activePath="/" mobileUnread={0}>
          <p>content</p>
        </AppFrame>,
      );
      const dotSelector = 'button[aria-label="Menu"] span.bg-destructive';
      expect(document.querySelector(dotSelector)).toBeNull();
      rerender(
        <ThemeProvider>
          <AppFrame nav={SIX} activePath="/" mobileUnread={3}>
            <p>content</p>
          </AppFrame>
        </ThemeProvider>,
      );
      expect(document.querySelector(dotSelector)).not.toBeNull();
    });
  });
});
