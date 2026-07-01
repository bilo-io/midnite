import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PREFERENCES } from '@midnite/shared';

import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/app-settings';

// ── Mocks for the component's hook + api dependencies ───────────────────────────
const authState = { user: null as { id: string } | null, jwtEnabled: false };
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => authState }));

const themeState = { preference: 'system' as const, setPreference: vi.fn() };
vi.mock('@/app/theme/theme-context', () => ({ useTheme: () => themeState }));

let settings: AppSettings;
const setSettings = vi.fn((next: AppSettings | ((p: AppSettings) => AppSettings)) => {
  settings = typeof next === 'function' ? (next as (p: AppSettings) => AppSettings)(settings) : next;
});
vi.mock('@/lib/use-local-storage', () => ({
  useLocalStorage: () => [settings, setSettings, true] as const,
}));

const getPreferences = vi.fn();
const putPreferences = vi.fn();
vi.mock('@/lib/api', () => ({
  getPreferences: (...a: unknown[]) => getPreferences(...a),
  putPreferences: (...a: unknown[]) => putPreferences(...a),
}));

import { PreferenceSync } from './preference-sync';

beforeEach(() => {
  settings = { ...DEFAULT_SETTINGS };
  authState.user = null;
  authState.jwtEnabled = false;
  themeState.setPreference.mockClear();
  setSettings.mockClear();
  getPreferences.mockReset();
  putPreferences.mockReset();
});

describe('PreferenceSync', () => {
  it('is inert when accounts are disabled (single-user)', async () => {
    authState.jwtEnabled = false;
    authState.user = { id: 'u1' };
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(getPreferences).not.toHaveBeenCalled();
    expect(putPreferences).not.toHaveBeenCalled();
  });

  it('is inert when signed out', async () => {
    authState.jwtEnabled = true;
    authState.user = null;
    render(<PreferenceSync />);
    await Promise.resolve();
    expect(getPreferences).not.toHaveBeenCalled();
  });

  it('hydrates from the server on login (server wins, applied locally)', async () => {
    authState.jwtEnabled = true;
    authState.user = { id: 'u1' };
    getPreferences.mockResolvedValue({
      preferences: { ...DEFAULT_USER_PREFERENCES, accent: 'rose', theme: 'dark' },
      updatedAt: '2026-06-30T10:00:00.000Z',
    });

    render(<PreferenceSync />);

    await waitFor(() => expect(getPreferences).toHaveBeenCalledTimes(1));
    // Server values applied to both stores; no write-back of what we just loaded.
    expect(setSettings).toHaveBeenCalled();
    expect(themeState.setPreference).toHaveBeenCalledWith('dark');
    expect(settings.accent).toBe('rose');
    expect(putPreferences).not.toHaveBeenCalled();
  });

  it('seeds the server from local when the row is empty', async () => {
    authState.jwtEnabled = true;
    authState.user = { id: 'u1' };
    settings = { ...DEFAULT_SETTINGS, accent: 'emerald' };
    getPreferences.mockResolvedValue({ preferences: DEFAULT_USER_PREFERENCES, updatedAt: null });
    putPreferences.mockResolvedValue({ preferences: DEFAULT_USER_PREFERENCES, updatedAt: 'x' });

    render(<PreferenceSync />);

    await waitFor(() => expect(putPreferences).toHaveBeenCalledTimes(1));
    expect(putPreferences.mock.calls[0]![0]).toMatchObject({ accent: 'emerald' });
    // Seeding doesn't clobber local state.
    expect(themeState.setPreference).not.toHaveBeenCalled();
  });
});
