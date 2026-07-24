'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

/**
 * Gates the authenticated app behind a resolved session, and sends an
 * unauthenticated visitor to the login page.
 *
 * Unlike a sibling redirect, this *withholds its children* until the session state
 * is known: while the initial session-restore is in flight (`isLoading`), and while
 * an unauthenticated visitor of a JWT-enabled gateway is being bounced to `/login`,
 * it renders nothing. The dashboard therefore never paints before auth resolves —
 * no "flash the board, then redirect". Only the app backdrop (the starfield, a
 * sibling mounted outside this gate) shows underneath while we wait.
 *
 * A JWT-disabled / local instance requires no login (`!jwtEnabled`), so once the
 * restore settles its children render immediately (a brief starfield, then the app).
 * A signed-in user is untouched.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading, jwtEnabled } = useAuth();
  const router = useRouter();

  // The gateway requires a login only when it has JWT auth configured.
  const authRequired = jwtEnabled;
  // Hold rendering until the outcome is known: during the restore, or while an
  // unauthenticated visitor of an auth-required gateway is being sent to /login.
  const blocked = isLoading || (authRequired && !user);

  useEffect(() => {
    if (isLoading) return; // session restore in flight
    if (!authRequired) return; // auth not required (local mode)
    if (user) return; // already signed in
    router.replace('/login');
  }, [user, isLoading, authRequired, router]);

  if (blocked) return null;
  return <>{children}</>;
}
