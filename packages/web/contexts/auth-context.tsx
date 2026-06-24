'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Team, User } from '@midnite/shared';
import { listTeams, setAccessToken } from '@/lib/api';

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  /** True while the initial session-restore is in flight. */
  isLoading: boolean;
  /** True when the gateway has JWT auth configured (refresh succeeded or 401 — not 503). */
  jwtEnabled: boolean;
  /** Teams the current user belongs to. Empty until loaded after login. */
  teams: Team[];
  /** The ID of the currently active team (context for new creates). */
  activeTeamId: string | null;
  /** Switch the active team. */
  setActiveTeam: (teamId: string | null) => void;
  /** Update the in-memory user after a profile edit. */
  setUser: (user: User) => void;
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  function applyTokens(token: string, u: User) {
    setToken(token);
    setAccessToken(token);
    setUser(u);
  }

  function clearTokens() {
    setToken(null);
    setAccessToken(null);
    setUser(null);
    setTeams([]);
    setActiveTeamId(null);
  }

  async function loadTeams() {
    try {
      const fetched = await listTeams();
      setTeams(fetched);
      if (fetched.length > 0 && fetched[0]) setActiveTeamId(fetched[0].id);
    } catch {
      // Non-fatal: teams unavailable (gateway may not have JWT configured)
    }
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
          await loadTeams();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveTeam = useCallback((teamId: string | null) => {
    setActiveTeamId(teamId);
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
    await loadTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, jwtEnabled, teams, activeTeamId, setActiveTeam, setUser, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
