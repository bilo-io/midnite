import { afterEach, describe, expect, it, vi } from 'vitest';

import { deliverWebhook } from './safe-webhook-delivery';

const okResponse = { ok: true, status: 200 } as Response;
const errResponse = { ok: false, status: 500 } as Response;

afterEach(() => vi.restoreAllMocks());

describe('deliverWebhook', () => {
  it('rejects an SSRF-unsafe URL up front without fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await deliverWebhook('http://127.0.0.1/internal', '{}');
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(0);
    expect(result.error).toMatch(/SSRF/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns ok on a 2xx, recording the response code + attempt count', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse);
    const result = await deliverWebhook('https://hooks.example.com/x', '{"a":1}');
    expect(result).toEqual({ ok: true, responseCode: 200, attempts: 1, error: null });
  });

  it('retries to the attempt budget on repeated non-2xx, then fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(errResponse);
    const result = await deliverWebhook('https://hooks.example.com/x', '{}', { backoffMs: 0 });
    expect(result.ok).toBe(false);
    expect(result.responseCode).toBe(500);
    expect(result.attempts).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a retry after a transient network error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(okResponse);
    const result = await deliverWebhook('https://hooks.example.com/x', '{}', { backoffMs: 0 });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
  });
});
