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
// The full-viewport starfield mounts at the layout level now — stub it so these
// DOM-level tests don't touch a jsdom canvas.
vi.mock('@midnite/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@midnite/ui')>()),
  NeuroCloudBackground: () => <div data-testid="starfield" />,
}));
// The layout's theme toggle reads the theme context; stub it (no provider here).
vi.mock('@/app/theme/theme-context', () => ({
  useTheme: () => ({ resolved: 'light', setPreference: vi.fn() }),
}));

afterEach(cleanup);

describe('AuthLayout', () => {
  it('renders the form full-width, no hero and no starfield below lg (canvas never ships)', () => {
    mockIsDesktop = false;
    render(
      <AuthLayout>
        <form aria-label="sign-in" />
      </AuthLayout>,
    );
    expect(screen.getByLabelText('sign-in')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-hero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('starfield')).not.toBeInTheDocument();
  });

  it('mounts the full-viewport starfield + hero on desktop, form still present', () => {
    mockIsDesktop = true;
    render(
      <AuthLayout>
        <form aria-label="sign-in" />
      </AuthLayout>,
    );
    expect(screen.getByLabelText('sign-in')).toBeInTheDocument();
    expect(screen.getByTestId('auth-hero')).toBeInTheDocument();
    expect(screen.getByTestId('starfield')).toBeInTheDocument();
  });

  it('shows the logo/wordmark and a theme toggle in the form header', () => {
    mockIsDesktop = false;
    render(
      <AuthLayout>
        <form aria-label="sign-in" />
      </AuthLayout>,
    );
    expect(screen.getByText('midnite')).toBeInTheDocument();
    expect(screen.getByLabelText(/switch to (light|dark) theme/i)).toBeInTheDocument();
  });
});
