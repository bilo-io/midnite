'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@midnite/shared';
import { ApiError, getCurrentUser, gatewayUrl } from '@/lib/api';

/**
 * Admin's OWN minimal auth context (Phase 73 Theme E). Unlike web — which restores
 * the session via a Next BFF route (`/api/auth/refresh`) — admin is a static export
 * with no server, so it restores the session by reading `GET /auth/me` directly
 * against the gateway (the SSO refresh cookie rides along via `credentials:
 * 'include'`, see `lib/api`). It exposes only what the frame + gate need.
 */
export interface AuthContextValue {
  /** The signed-in user, or `null` when signed out / while restoring. */
  user: User | null;
  /** True while the initial session-restore is in flight. */
  isLoading: boolean;
  /** True when the gateway has JWT auth configured (200 or 401 on `/auth/me` — not 503). */
  jwtEnabled: boolean;
  /** Re-read `/auth/me` (e.g. after returning from the SSO callback). */
  refresh: () => Promise<void>;
  /** Clear the session (best-effort gateway logout, then drop the local user). */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [jwtEnabled, setJwtEnabled] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      setJwtEnabled(true);
    } catch (err) {
      setUser(null);
      // 401 → JWT enabled, just not logged in; 503 → JWT disabled/unavailable.
      if (err instanceof ApiError && err.status === 401) setJwtEnabled(true);
      else if (err instanceof ApiError && err.status === 503) setJwtEnabled(false);
      // Other statuses / network: leave jwtEnabled as-is (the login screen still shows).
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore the session from the gateway cookie on mount.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async (): Promise<void> => {
    await fetch(`${gatewayUrl()}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(
      () => undefined,
    );
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, jwtEnabled, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
