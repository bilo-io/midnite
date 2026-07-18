import type { FastifyReply } from 'fastify';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { parseConfig, type AuthResponse } from '@midnite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtService } from './jwt.service';
import { SsoController } from './sso.controller';
import { SsoNotConfiguredError, type SsoService, SsoStateInvalidError } from './sso.service';

const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });

type RedirectCall = { url: string; code: number };

function makeReply(): FastifyReply & { redirects: RedirectCall[] } {
  const redirects: RedirectCall[] = [];
  return {
    redirects,
    redirect: (url: string, code: number) => {
      redirects.push({ url, code });
    },
    request: { raw: { headers: { host: 'gw.test', 'x-forwarded-proto': 'https' } } },
  } as unknown as FastifyReply & { redirects: RedirectCall[] };
}

function makeController(overrides: {
  jwtEnabled?: boolean;
  service?: Partial<SsoService>;
}): SsoController {
  const jwt = { enabled: overrides.jwtEnabled ?? true } as unknown as JwtService;
  const service = {
    enabledProviders: vi.fn(() => ['google', 'github']),
    buildAuthorizationUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    handleCallback: vi.fn(async () => ({ exchangeCode: 'CODE', redirect: '/board' })),
    exchangeCode: vi.fn(() => ({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } } as unknown as AuthResponse)),
    ...overrides.service,
  } as unknown as SsoService;
  return new SsoController(config, service, jwt);
}

describe('SsoController', () => {
  let reply: ReturnType<typeof makeReply>;
  beforeEach(() => {
    reply = makeReply();
  });

  describe('providers', () => {
    it('lists providers when JWT is enabled', () => {
      expect(makeController({ jwtEnabled: true }).providers()).toEqual({ providers: ['google', 'github'] });
    });
    it('returns none when JWT is disabled', () => {
      expect(makeController({ jwtEnabled: false }).providers()).toEqual({ providers: [] });
    });
  });

  describe('start', () => {
    it('rejects an unknown provider with 400', () => {
      expect(() => makeController({}).start('facebook', {}, reply)).toThrow(BadRequestException);
    });
    it('503s when JWT is disabled', () => {
      expect(() => makeController({ jwtEnabled: false }).start('google', {}, reply)).toThrow(ServiceUnavailableException);
    });
    it('302s to the provider authorize URL', () => {
      makeController({}).start('google', {}, reply);
      expect(reply.redirects).toEqual([{ url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1', code: 302 }]);
    });
    it('redirects to login with an error when the provider is not configured', () => {
      const service = { buildAuthorizationUrl: vi.fn(() => { throw new SsoNotConfiguredError('google'); }) };
      makeController({ service }).start('google', {}, reply);
      expect(reply.redirects[0]?.url).toBe('https://gw.test/login?sso_error=provider_unavailable');
    });
  });

  describe('callback', () => {
    it('redirects to login on a provider error param', async () => {
      await makeController({}).callback('google', 'c', 's', 'access_denied', reply);
      expect(reply.redirects[0]?.url).toBe('https://gw.test/login?sso_error=access_denied');
    });
    it('redirects to login when code/state are missing', async () => {
      await makeController({}).callback('google', undefined, undefined, undefined, reply);
      expect(reply.redirects[0]?.url).toBe('https://gw.test/login?sso_error=invalid_callback');
    });
    it('503s when JWT is disabled', async () => {
      await expect(makeController({ jwtEnabled: false }).callback('google', 'c', 's', undefined, reply)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
    it('302s the one-time code to the web app on success', async () => {
      await makeController({}).callback('google', 'c', 's', undefined, reply);
      expect(reply.redirects[0]?.url).toBe('https://gw.test/auth/sso/callback?code=CODE&redirect=%2Fboard');
    });
    it('redirects to login with invalid_state on a bad state', async () => {
      const service = { handleCallback: vi.fn(async () => { throw new SsoStateInvalidError(); }) };
      await makeController({ service }).callback('google', 'c', 's', undefined, reply);
      expect(reply.redirects[0]?.url).toBe('https://gw.test/login?sso_error=invalid_state');
    });
  });

  describe('exchange', () => {
    it('503s when JWT is disabled', () => {
      expect(() => makeController({ jwtEnabled: false }).exchange({ code: 'x' })).toThrow(ServiceUnavailableException);
    });
    it('400s on an invalid body', () => {
      expect(() => makeController({}).exchange({})).toThrow(BadRequestException);
    });
    it('returns the AuthResponse for a valid code', () => {
      const res = makeController({}).exchange({ code: 'CODE' });
      expect(res).toMatchObject({ accessToken: 'a', refreshToken: 'r' });
    });
    it('400s on an invalid/expired code', () => {
      const service = { exchangeCode: vi.fn(() => { throw new SsoStateInvalidError(); }) };
      expect(() => makeController({ service }).exchange({ code: 'bad' })).toThrow(BadRequestException);
    });
  });
});
