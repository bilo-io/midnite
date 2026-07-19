import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@midnite/ui/theme';
import { AppShellClient } from './app-shell-client';

// The shell frame is router-agnostic but the admin wiring uses next/navigation +
// next/link — stub both so the frame mounts under jsdom without a Next router.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('AppShellClient', () => {
  it('renders the app frame with every operator nav route and its content', () => {
    render(
      <ThemeProvider>
        <AppShellClient>
          <div>console body</div>
        </AppShellClient>
      </ThemeProvider>,
    );

    // Content region renders.
    expect(screen.getByText('console body')).toBeInTheDocument();

    // All seven fixed nav routes are present (desktop rail + mobile nav both mount,
    // so each label appears at least once).
    for (const label of ['Overview', 'Usage', 'Users & teams', 'Projects', 'Versions', 'Audit', 'Links']) {
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
  });
});
