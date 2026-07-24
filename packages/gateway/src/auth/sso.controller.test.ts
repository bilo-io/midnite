import type { FastifyReply } from 'fastify';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { parseConfig, type AuthResponse } from '@midnite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwtService } from './jwt.service';
import { EmailNotAllowlistedError } from '../users/users.service';
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
    deviceProviders: vi.fn(() => []),
    buildAuthorizationUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    handleCallback: vi.fn(async () => ({ exchangeCode: 'CODE', redirect: '/board' })),
    exchangeCode: vi.fn(() => ({ accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } } as unknown as AuthResponse)),
    startDeviceAuth: vi.fn(async () => ({
      deviceAuthId: 'da-1',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      expiresInSeconds: 900,
      intervalSeconds: 5,
    })),
    pollDeviceAuth: vi.fn(async () => ({ status: 'pending' as const })),
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
      expect(makeController({ jwtEnabled: true }).providers()).toEqual({
        providers: ['google', 'github'],
        deviceProviders: [],
      });
    });
    it('returns none when JWT is disabled', () => {
      expect(makeController({ jwtEnabled: false }).providers()).toEqual({
        providers: [],
        deviceProviders: [],
      });
    });
    it('reports the secretless device-flow providers alongside the redirect ones', () => {
      const controller = makeController({
        service: {
          enabledProviders: vi.fn(() => ['google']),
          deviceProviders: vi.fn(() => ['github']),
        } as unknown as Partial<SsoService>,
      });
      expect(controller.providers()).toEqual({ providers: ['google'], deviceProviders: ['github'] });
    });
  });

  describe('device flow', () => {
    it('starts a device auth and returns the code + verification URL', async () => {
      const result = await makeController({}).deviceStart('github');
      expect(result.userCode).toBe('ABCD-1234');
      expect(result.deviceAuthId).toBe('da-1');
    });

    it('503s the start when JWT is disabled', async () => {
      await expect(makeController({ jwtEnabled: false }).deviceStart('github')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('503s the start when the provider is not available via device flow', async () => {
      const controller = makeController({
        service: {
          startDeviceAuth: vi.fn(async () => {
            throw new SsoNotConfiguredError('github');
          }),
        } as unknown as Partial<SsoService>,
      });
      await expect(controller.deviceStart('github')).rejects.toThrow(ServiceUnavailableException);
    });

    it('rejects an unknown provider on start with 400', async () => {
      await expect(makeController({}).deviceStart('facebook')).rejects.toThrow(BadRequestException);
    });

    it('polls through to the service result', async () => {
      const controller = makeController({
        service: {
          pollDeviceAuth: vi.fn(async () => ({
            status: 'complete' as const,
            auth: { accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } } as unknown as AuthResponse,
          })),
        } as unknown as Partial<SsoService>,
      });
      const result = await controller.devicePoll({ deviceAuthId: 'da-1' });
      expect(result.status).toBe('complete');
    });

    it('maps a provisioning refusal onto the sso_error vocabulary', async () => {
      const controller = makeController({
        service: {
          pollDeviceAuth: vi.fn(async () => {
            throw new EmailNotAllowlistedError('intruder@example.com');
          }),
        } as unknown as Partial<SsoService>,
      });
      expect(await controller.devicePoll({ deviceAuthId: 'da-1' })).toEqual({
        status: 'error',
        code: 'not_allowed',
      });
    });

    it('400s a malformed poll body', async () => {
      await expect(makeController({}).devicePoll({})).rejects.toThrow(BadRequestException);
    });

    it('503s the poll when JWT is disabled', async () => {
      await expect(
        makeController({ jwtEnabled: false }).devicePoll({ deviceAuthId: 'da-1' }),
      ).rejects.toThrow(ServiceUnavailableException);
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
