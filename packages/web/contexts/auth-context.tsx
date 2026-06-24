'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@midnite/shared';
import { setAccessToken } from '@/lib/api';

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  /** True while the initial session-restore is in flight. */
  isLoading: boolean;
  /** True when the gateway has JWT auth configured (refresh succeeded or 401 — not 503). */
  jwtEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [jwtEnabled, setJwtEnabled] = useState(false);

  function applyTokens(token: string, u: User) {
    setToken(token);
    setAccessToken(token);
    setUser(u);
  }

  function clearTokens() {
    setToken(null);
    setAccessToken(null);
    setUser(null);
  }

  // Restore session from the httpOnly cookie on mount.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string; user: User };
          applyTokens(data.accessToken, data.user);
          setJwtEnabled(true);
        } else if (res.status === 401) {
          // Cookie expired / no cookie — JWT is enabled, just not logged in.
          setJwtEnabled(true);
        }
        // 503 (gateway unavailable / JWT disabled) → jwtEnabled stays false.
      } catch {
        // Network error — treat as JWT disabled to avoid locking users out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      throw new Error(data.message ?? 'Login failed');
    }
    const data = (await res.json()) as { accessToken: string; user: User };
    applyTokens(data.accessToken, data.user);
    setJwtEnabled(true);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    }).catch(() => undefined);
    clearTokens();
  }, [accessToken]);

  const register = useCallback(
    async (email: string, name: string, password: string): Promise<User> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? 'Registration failed');
      }
      const data = (await res.json()) as { user: User };
      return data.user;
    },
    [],
  );

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, jwtEnabled, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
