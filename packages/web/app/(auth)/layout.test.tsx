import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import AuthLayout from './layout';

// Control the desktop gate; stub the hero to a sentinel so the test asserts the
// *gating* decision, not the hero's internals.
let mockIsDesktop = true;
vi.mock('@/hooks/use-media-query', () => ({ useIsDesktop: () => mockIsDesktop }));
vi.mock('@/components/auth/auth-hero', () => ({
  AuthHero: () => <div data-testid="auth-hero" />,
}));

afterEach(cleanup);

describe('AuthLayout', () => {
  it('renders the form full-width and no hero below lg (canvas never ships)', () => {
    mockIsDesktop = false;
    render(
      <AuthLayout>
        <form aria-label="sign-in" />
      </AuthLayout>,
    );
    expect(screen.getByLabelText('sign-in')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-hero')).not.toBeInTheDocument();
  });

  it('mounts the split-screen hero on desktop, form still present', () => {
    mockIsDesktop = true;
    render(
      <AuthLayout>
        <form aria-label="sign-in" />
      </AuthLayout>,
    );
    expect(screen.getByLabelText('sign-in')).toBeInTheDocument();
    expect(screen.getByTestId('auth-hero')).toBeInTheDocument();
  });
});
