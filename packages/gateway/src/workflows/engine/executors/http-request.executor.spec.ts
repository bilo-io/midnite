import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';

import { HttpRequestExecutor } from './http-request.executor';
import type { NodeRunContext } from '../node-executor';

function makeConfig(overrides: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({
    agent: {},
    terminal: {},
    gateway: {},
    workflows: { webhookBaseUrl: 'http://localhost:7777', ...overrides },
  });
}

function makeCtx(url: string): NodeRunContext {
  return {
    params: { method: 'GET', url, headers: {}, timeoutMs: 1000 },
    input: {},
    signal: new AbortController().signal,
    log: vi.fn(),
  } as unknown as NodeRunContext;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpRequestExecutor SSRF guard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('allows a call to the gateway’s own loopback origin (self-origin exception)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const exec = new HttpRequestExecutor(makeConfig());
    const res = (await exec.execute(makeCtx('http://localhost:7777/playground/echo'))) as {
      status: number;
    };
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('blocks an arbitrary loopback origin when allowLoopbackHttp is off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const exec = new HttpRequestExecutor(makeConfig());
    await expect(exec.execute(makeCtx('http://localhost:9999/secret'))).rejects.toThrow(
      /unsafe or private URL/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows any loopback when allowLoopbackHttp is on', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const exec = new HttpRequestExecutor(makeConfig({ allowLoopbackHttp: true }));
    await exec.execute(makeCtx('http://localhost:9999/secret'));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
