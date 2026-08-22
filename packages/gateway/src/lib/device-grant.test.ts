import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeviceGrantError, DeviceGrantFlow } from './device-grant';

// The device grant is the zero-config connect path, so its error-state machine *is* the
// feature: a mishandled `slow_down` gets an install rate-limited, and a `device_code`
// that leaks to the browser hands anyone who sees it the pending authorization.

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Stub the two device endpoints. `grants` is the sequence of token responses. */
function stubFetch(grants: unknown[], deviceCode: Record<string, unknown> = {}) {
  const calls = { deviceCode: 0, token: 0 };
  const impl = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.startsWith('https://github.com/login/device/code')) {
      calls.deviceCode += 1;
      return json({
        device_code: 'provider-secret-code',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 0, // 0 ⇒ throttle-free polling in tests
        ...deviceCode,
      });
    }
    if (url.startsWith('https://github.com/login/oauth/access_token')) {
      const next = grants[Math.min(calls.token, grants.length - 1)];
      calls.token += 1;
      return json(next);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  return { calls, impl: impl as unknown as typeof fetch };
}

describe('DeviceGrantFlow.start', () => {
  it('never hands the caller GitHub\'s own device_code', async () => {
    // The whole point of the opaque handle: whatever the browser holds must be useless
    // to anyone who intercepts it.
    const { impl } = stubFetch([]);
    const started = await new DeviceGrantFlow(impl).start({ clientId: 'c', scope: 'repo' });

    expect(started.userCode).toBe('ABCD-1234');
    expect(started.deviceAuthId).not.toBe('provider-secret-code');
    expect(JSON.stringify(started)).not.toContain('provider-secret-code');
  });

  it('sends the client id and scope the caller asked for', async () => {
    const { impl } = stubFetch([]);
    await new DeviceGrantFlow(impl).start({ clientId: 'my-app', scope: 'repo project read:org' });

    const body = String(vi.mocked(impl).mock.calls[0]?.[1]?.body);
    expect(body).toContain('client_id=my-app');
    expect(body).toContain('scope=repo+project+read%3Aorg');
  });

  it('surfaces device_flow_disabled instead of hanging forever', async () => {
    // GitHub reports "Enable Device Flow wasn't ticked" as an `error` field on a 200 —
    // the classic registration mistake, and invisible if you only check the status.
    const impl = vi.fn(async () => json({ error: 'device_flow_disabled' })) as unknown as typeof fetch;
    await expect(new DeviceGrantFlow(impl).start({ clientId: 'c', scope: 's' })).rejects.toThrow(
      'device_flow_disabled',
    );
  });

  it('rejects a malformed response rather than storing a broken entry', async () => {
    const impl = vi.fn(async () => json({ user_code: 'X' })) as unknown as typeof fetch;
    await expect(new DeviceGrantFlow(impl).start({ clientId: 'c', scope: 's' })).rejects.toBeInstanceOf(
      DeviceGrantError,
    );
  });

  it('defaults the interval and TTL when GitHub reports neither', async () => {
    const { impl } = stubFetch([], { expires_in: undefined, interval: undefined });
    const started = await new DeviceGrantFlow(impl).start({ clientId: 'c', scope: 's' });
    expect(started.intervalSeconds).toBe(5);
    expect(started.expiresInSeconds).toBe(900);
  });

  it('keeps an interval of 0 rather than treating it as absent', async () => {
    // `||` here instead of `??` would silently impose a 5s throttle and make every
    // caller's tests slow or flaky.
    const { impl } = stubFetch([]);
    const started = await new DeviceGrantFlow(impl).start({ clientId: 'c', scope: 's' });
    expect(started.intervalSeconds).toBe(0);
  });
});

describe('DeviceGrantFlow.poll', () => {
  it('goes pending → granted and hands back the token and granted scope', async () => {
    const { impl } = stubFetch([
      { error: 'authorization_pending' },
      { access_token: 'gho_token', scope: 'repo,project' },
    ]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });

    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'pending' });
    expect(await flow.poll(deviceAuthId)).toEqual({
      status: 'granted',
      accessToken: 'gho_token',
      scope: 'repo,project',
    });
  });

  it('is one-shot — a granted handle cannot be polled again', async () => {
    // The entry is dropped *before* the caller acts on the token, so a downstream
    // failure can't be re-polled into a different outcome.
    const { impl } = stubFetch([{ access_token: 'gho_token' }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });

    expect((await flow.poll(deviceAuthId)).status).toBe('granted');
    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'expired' });
  });

  it('throttles forwarded polls to the provider interval', async () => {
    const { calls, impl } = stubFetch([{ error: 'authorization_pending' }], { interval: 5 });
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });

    await flow.poll(deviceAuthId); // forwards
    await flow.poll(deviceAuthId); // throttled — no provider call
    expect(calls.token).toBe(1);
  });

  it('backs off on slow_down using the interval GitHub supplies', async () => {
    const { calls, impl } = stubFetch([{ error: 'slow_down', interval: 10 }, { access_token: 't' }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });

    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'pending' });
    // The bumped 10s interval now throttles the immediate retry.
    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'pending' });
    expect(calls.token).toBe(1);
  });

  it('backs off on slow_down even when GitHub sends no replacement interval', async () => {
    const { calls, impl } = stubFetch([{ error: 'slow_down' }, { access_token: 't' }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });

    await flow.poll(deviceAuthId);
    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'pending' });
    expect(calls.token).toBe(1);
  });

  it.each([
    ['expired_token', 'expired'],
    ['access_denied', 'denied'],
  ])('maps %s to the terminal state %s', async (error, status) => {
    // Terminal *outcomes*, not exceptions: a user declining consent is not a fault, and
    // the UI offers a retry for both.
    const { impl } = stubFetch([{ error }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });
    expect(await flow.poll(deviceAuthId)).toEqual({ status });
  });

  it('drops the handle after a terminal error so it cannot be retried', async () => {
    const { impl } = stubFetch([{ error: 'access_denied' }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });
    await flow.poll(deviceAuthId);
    expect(await flow.poll(deviceAuthId)).toEqual({ status: 'expired' });
  });

  it('treats an unknown handle as expired', async () => {
    const { impl } = stubFetch([]);
    expect(await new DeviceGrantFlow(impl).poll('never-existed')).toEqual({ status: 'expired' });
  });

  it('throws on an unrecognised provider error rather than looping', async () => {
    const { impl } = stubFetch([{ error: 'incorrect_client_credentials' }]);
    const flow = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });
    await expect(flow.poll(deviceAuthId)).rejects.toThrow('incorrect_client_credentials');
  });

  it('reads the global fetch when none is injected', async () => {
    // Both callers' existing specs stub the *global* — reading it lazily is what lets
    // `sso.service.test.ts` keep working without a single edit.
    const { impl } = stubFetch([{ access_token: 'from-global' }]);
    vi.stubGlobal('fetch', impl);
    const flow = new DeviceGrantFlow();
    const { deviceAuthId } = await flow.start({ clientId: 'c', scope: 's' });
    expect(await flow.poll(deviceAuthId)).toMatchObject({ accessToken: 'from-global' });
  });

  it('keeps two flows\' handles in separate namespaces', async () => {
    // A *connect* handle must never be pollable through the *login* flow.
    const { impl } = stubFetch([{ access_token: 't' }]);
    const login = new DeviceGrantFlow(impl);
    const connect = new DeviceGrantFlow(impl);
    const { deviceAuthId } = await login.start({ clientId: 'c', scope: 's' });
    expect(await connect.poll(deviceAuthId)).toEqual({ status: 'expired' });
  });
});
