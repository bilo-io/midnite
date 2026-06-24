'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@midnite/shared';
import { useAuth } from '@/contexts/auth-context';

/**
 * Returns the authenticated user, or `null` when unauthenticated.
 * When JWT auth is enabled and the user is not logged in, redirects to `/login`.
 */
export function useCurrentUser(): User | null {
  const { user, isLoading, jwtEnabled } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && jwtEnabled && !user) {
      router.push('/login');
    }
  }, [isLoading, jwtEnabled, user, router]);

  return user;
}
