import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { GatewayAuthGuard } from './gateway-auth.guard';

const ENV = 'TEST_MIDNITE_AUTH_TOKEN';

function config(gateway: Record<string, unknown> = {}): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, gateway: { auth: { tokenEnv: ENV }, ...gateway } });
}

function httpCtx(req: { url?: string; headers?: Record<string, unknown> }): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, ...req }) }),
  } as unknown as ExecutionContext;
}

const wsCtx = { getType: () => 'ws' } as unknown as ExecutionContext;

afterEach(() => {
  delete process.env[ENV];
});

describe('GatewayAuthGuard', () => {
  it('allows everything when no token is configured (auth off)', () => {
    delete process.env[ENV];
    const guard = new GatewayAuthGuard(config());
    expect(guard.canActivate(httpCtx({ url: '/tasks' }))).toBe(true);
  });

  it('rejects a protected route without a valid bearer token', () => {
    process.env[ENV] = 's3cret';
    const guard = new GatewayAuthGuard(config());
    expect(() => guard.canActivate(httpCtx({ url: '/tasks' }))).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(httpCtx({ url: '/tasks', headers: { authorization: 'Bearer wrong' } })),
    ).toThrow(UnauthorizedException);
  });

  it('accepts a protected route with the correct bearer token', () => {
    process.env[ENV] = 's3cret';
    const guard = new GatewayAuthGuard(config());
    expect(
      guard.canActivate(httpCtx({ url: '/tasks', headers: { authorization: 'Bearer s3cret' } })),
    ).toBe(true);
  });

  it('exempts /health and /hooks/* even with auth on and no token presented', () => {
    process.env[ENV] = 's3cret';
    const guard = new GatewayAuthGuard(config());
    expect(guard.canActivate(httpCtx({ url: '/health' }))).toBe(true);
    expect(guard.canActivate(httpCtx({ url: '/hooks/sessions/abc/stop' }))).toBe(true);
  });

  it('does not guard non-HTTP (WS) contexts', () => {
    process.env[ENV] = 's3cret';
    const guard = new GatewayAuthGuard(config());
    expect(guard.canActivate(wsCtx)).toBe(true);
  });
});
