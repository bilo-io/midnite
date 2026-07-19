'use client';

import type { ReactNode } from 'react';
import { ShellProviders } from '@midnite/shell';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/auth-context';
import { AppearanceEffects } from '@/components/appearance-effects';

/**
 * The admin app's client provider stack (Phase 73 Theme E). `<ShellProviders>` (the
 * app-agnostic frame-level stack: theme + react-query) wraps admin's own
 * gateway-coupled `<AuthProvider>`; the appearance runtime is mounted here as a
 * sibling so later preference changes stay applied (the first paint is handled by
 * `appearanceInitScript` in the document head).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ShellProviders queryClient={queryClient}>
      <AuthProvider>
        <AppearanceEffects />
        {children}
      </AuthProvider>
    </ShellProviders>
  );
}
