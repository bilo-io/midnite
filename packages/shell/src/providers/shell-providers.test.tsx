import { render, screen } from '@testing-library/react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@midnite/ui/theme';
import { describe, expect, it } from 'vitest';

import { ShellProviders } from './shell-providers';

// A probe that only renders if BOTH the theme + query contexts are present.
function Probe() {
  const { resolved } = useTheme();
  const client = useQueryClient();
  return <div data-testid="probe">{resolved && client ? 'ready' : 'missing'}</div>;
}

describe('ShellProviders', () => {
  it('provides the theme + query contexts to children', () => {
    render(
      <ShellProviders queryClient={new QueryClient()}>
        <Probe />
      </ShellProviders>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('ready');
  });

  it('uses the host-supplied QueryClient (never creates its own)', () => {
    const client = new QueryClient();
    let seen: unknown;
    function Grab() {
      seen = useQueryClient();
      return null;
    }
    render(
      <ShellProviders queryClient={client}>
        <Grab />
      </ShellProviders>,
    );
    expect(seen).toBe(client);
  });
});
