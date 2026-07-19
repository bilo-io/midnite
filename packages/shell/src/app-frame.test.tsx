import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppFrame, isActivePath, type NavConfig, type NavLinkComponent } from './app-frame';

const NAV: NavConfig = {
  brand: <span>midnite</span>,
  sections: [
    { title: 'Main', items: [{ href: '/', label: 'Board' }, { href: '/sessions', label: 'Sessions' }] },
    { items: [{ href: '/settings', label: 'Settings', badge: <span>3</span> }] },
  ],
  footer: <button type="button">Account</button>,
};

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
  it('renders every injected nav item as a link, plus brand/footer/section titles', () => {
    render(
      <AppFrame nav={NAV} activePath="/sessions">
        <p>content</p>
      </AppFrame>,
    );
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Sessions/ })).toHaveAttribute('href', '/sessions');
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings');
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
    expect(screen.getByRole('link', { name: /Sessions/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Board' })).not.toHaveAttribute('aria-current');
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
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('data-custom');
  });
});
