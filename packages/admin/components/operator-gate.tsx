'use client';

import type { ReactNode } from 'react';
import { NeuroCloudBackground, buttonVariants } from '@midnite/ui';
import { useAuth } from '@/contexts/auth-context';
import { useIsOperator } from '@/lib/use-is-operator';
import { LoginScreen } from '@/components/login-screen';
import { cn } from '@/lib/utils';

/**
 * The operator gate (Phase 73 Theme E locked decision #1). Three outcomes:
 *  - not authenticated ⇒ the themed SSO `<LoginScreen>` (on the starfield);
 *  - authenticated but `isOperator === false` (a 403 from the operator-gated probe)
 *    ⇒ a clean "not an operator" screen with a sign-out;
 *  - operator ⇒ the app.
 * While the session restore or the operator probe is in flight, a starfield
 * spinner holds the surface (never a flash of login or app).
 */
export function OperatorGate({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { isOperator, loading: opLoading } = useIsOperator();

  if (authLoading) return <StarfieldStatus>Restoring your session…</StarfieldStatus>;

  if (!user) return <LoginScreen />;

  if (opLoading || isOperator === null) return <StarfieldStatus>Checking operator access…</StarfieldStatus>;

  if (isOperator === false) {
    return (
      <StarfieldShell>
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-semibold text-foreground">You&apos;re signed in, but this account isn&apos;t an operator</h1>
          <p className="text-sm text-muted-foreground">
            The operator console is limited to platform operators. Ask an administrator for access, or
            sign in with a different account.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}
          >
            Sign out
          </button>
        </div>
      </StarfieldShell>
    );
  }

  return <>{children}</>;
}

/** The starfield surface both gate-blocking states render on. */
function StarfieldShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-[120px]">
      <NeuroCloudBackground animate />
      <div className="relative z-10 flex flex-col items-center">{children}</div>
    </div>
  );
}

/** A centred spinner + status line on the starfield (loading beats). */
function StarfieldStatus({ children }: { children: ReactNode }) {
  return (
    <StarfieldShell>
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
        />
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </StarfieldShell>
  );
}
