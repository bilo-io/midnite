'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

/**
 * Sends an unauthenticated visitor to the login page. Renders nothing.
 *
 * Only acts once the initial session-restore has settled (`!isLoading`) and only
 * when the gateway actually requires auth (`jwtEnabled`) — a JWT-disabled / local
 * instance needs no login, so it's left alone. A logged-in user is untouched.
 */
export function AuthGuard() {
  const { user, isLoading, jwtEnabled } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // session restore in flight
    if (!jwtEnabled) return; // auth not required (local mode)
    if (user) return; // already signed in
    router.replace('/login');
  }, [user, isLoading, jwtEnabled, router]);

  return null;
}
