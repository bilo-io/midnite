import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAccessToken,
  getHealth,
  refreshAccessToken,
  setAccessToken,
  setTokenRefresher,
} from './api';

type FakeResponse = {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

/** Serve a fixed sequence of responses (the last repeats once exhausted). */
function sequenceFetch(responses: FakeResponse[]) {
  let i = 0;
  const fetchMock = vi.fn(async () => responses[Math.min(i++, responses.length - 1)]);
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  setTokenRefresher(null);
});

describe('refreshAccessToken', () => {
  it('returns the current token when no refresher is registered', async () => {
    setAccessToken('current');
    await expect(refreshAccessToken()).resolves.toBe('current');
  });

  it('coalesces concurrent callers onto a single refresh', async () => {
    let calls = 0;
    setTokenRefresher(async () => {
      calls += 1;
      await Promise.resolve();
      return 'fresh';
    });
    const [a, b, c] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    expect([a, b, c]).toEqual(['fresh', 'fresh', 'fresh']);
    expect(calls).toBe(1);
    // A later call after the first settled starts a new refresh.
    await refreshAccessToken();
    expect(calls).toBe(2);
  });
});

describe('fetchJson 401 retry', () => {
  it('refreshes once and retries with the new token after a 401', async () => {
    setAccessToken('stale');
    setTokenRefresher(async () => {
      setAccessToken('fresh');
      return 'fresh';
    });
    const fetchMock = sequenceFetch([
      { ok: false, status: 401, text: async () => '' },
      { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' },
    ]);

    await expect(getHealth()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryInit = fetchMock.mock.calls[1]![1] as { headers: Record<string, string> };
    expect(retryInit.headers.authorization).toBe('Bearer fresh');
    expect(getAccessToken()).toBe('fresh');
  });

  it('does not retry a 401 when unauthenticated (no token to refresh)', async () => {
    const refresher = vi.fn(async () => 'fresh');
    setTokenRefresher(refresher);
    const fetchMock = sequenceFetch([{ ok: false, status: 401, text: async () => '' }]);

    await expect(getHealth()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresher).not.toHaveBeenCalled();
  });

  it('surfaces the 401 when the refresh fails to yield a token', async () => {
    setAccessToken('stale');
    setTokenRefresher(async () => null);
    const fetchMock = sequenceFetch([{ ok: false, status: 401, text: async () => '' }]);

    await expect(getHealth()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
