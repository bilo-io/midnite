import { LOGIN_PROVIDERS, type LoginProvider } from '@midnite/shared';

/**
 * Remembers which login method the user last signed in with, so the login page
 * can spotlight that button on the next visit. Stored in `localStorage` (client
 * only — callers are 'use client' components); reads are validated so a stale or
 * hand-edited value degrades to "no highlight" rather than garbage.
 */

export type LoginMethod = LoginProvider | 'email';

export const LAST_LOGIN_METHOD_KEY = 'midnite.lastLoginMethod';

const METHODS: readonly LoginMethod[] = [...LOGIN_PROVIDERS, 'email'];

export function readLastLoginMethod(): LoginMethod | null {
  try {
    const raw = window.localStorage.getItem(LAST_LOGIN_METHOD_KEY);
    return METHODS.includes(raw as LoginMethod) ? (raw as LoginMethod) : null;
  } catch {
    // Storage unavailable (SSR, privacy mode) — behave as "never logged in".
    return null;
  }
}

export function writeLastLoginMethod(method: LoginMethod): void {
  try {
    window.localStorage.setItem(LAST_LOGIN_METHOD_KEY, method);
  } catch {
    // Best-effort — losing the highlight is fine.
  }
}
