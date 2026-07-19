import type { ReactNode } from 'react';
import { OperatorGate } from '@/components/operator-gate';
import { AppShellClient } from '@/components/app-shell-client';

/**
 * The authenticated operator surface (Phase 73 Theme E). The gate runs first — an
 * unauthenticated visitor sees the SSO login, a signed-in non-operator sees the
 * "not an operator" screen — and only an operator reaches the wired app frame.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <OperatorGate>
      <AppShellClient>{children}</AppShellClient>
    </OperatorGate>
  );
}
