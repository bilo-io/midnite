import { describe, expect, it, vi } from 'vitest';
import type { Liveness, MidniteConfig, PreflightReport, Readiness } from '@midnite/shared';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';
import type { PreflightService } from './preflight.service';
import type { JwtService } from '../auth/jwt.service';
import type { ServiceTokensService } from '../service-tokens/service-tokens.service';

// A minimal config whose tokenEnv points at an env var we leave unset ⇒ no static
// token ⇒ an anonymous caller unless a fake JWT/service-token deps say otherwise.
const CONFIG = {
  gateway: { auth: { tokenEnv: 'HEALTH_TEST_TOKEN' } },
} as unknown as MidniteConfig;

function controller(
  health: Partial<HealthService>,
  preflight: Partial<PreflightService> = {},
  deps: { jwt?: Partial<JwtService>; serviceTokens?: Partial<ServiceTokensService> } = {},
) {
  return new HealthController(
    health as HealthService,
    preflight as PreflightService,
    CONFIG,
    deps.jwt as JwtService | undefined,
    deps.serviceTokens as ServiceTokensService | undefined,
  );
}

const anonReq = { headers: {} } as never;
const authedReq = { headers: { authorization: 'Bearer jwt-token' } } as never;
// A fake JWT service that accepts any token — stands in for a real operator login.
const acceptJwt = { enabled: true, verifyAccessToken: () => ({ sub: 'u1', email: 'a@b.c', teamId: null }) };

describe('HealthController', () => {
  it('legacy /health stays a plain liveness alias', () => {
    expect(controller({}).check()).toEqual({ ok: true });
  });

  it('/health/live delegates to the service liveness', () => {
    const liveness: Liveness = { ok: true, uptimeMs: 1234 };
    expect(controller({ liveness: () => liveness }).live()).toEqual(liveness);
  });

  it('/health/ready returns 200 when ready', async () => {
    const report: Readiness = { ready: true, worst: 'ok', checks: [], uptimeMs: 5 };
    const status = vi.fn();
    const res = await controller({ readiness: async () => report }).ready(anonReq, { status } as never);
    expect(res.ready).toBe(true);
    expect(status).not.toHaveBeenCalled();
  });

  it('/health/ready sets 503 when not ready', async () => {
    const report: Readiness = {
      ready: false,
      worst: 'fail',
      checks: [{ name: 'database', status: 'fail', detail: 'gone' }],
      uptimeMs: 5,
    };
    const status = vi.fn();
    await controller({ readiness: async () => report }).ready(anonReq, { status } as never);
    expect(status).toHaveBeenCalledWith(503);
  });

  it('/health/preflight sets 503 when the report fails', async () => {
    const report: PreflightReport = {
      ok: false,
      worst: 'fail',
      checks: [{ name: 'database', status: 'fail', detail: 'unwritable' }],
    };
    const status = vi.fn();
    await controller({}, { report: async () => report }).preflightReport(anonReq, { status } as never);
    expect(status).toHaveBeenCalledWith(503);
  });

  describe('detail redaction (Phase 72 C)', () => {
    const ssoReport: PreflightReport = {
      ok: false,
      worst: 'fail',
      checks: [
        {
          name: 'sso',
          status: 'fail',
          detail: 'google configured but MIDNITE_GOOGLE_CLIENT_SECRET is unset',
          remedy: 'export MIDNITE_GOOGLE_CLIENT_SECRET',
        },
      ],
    };

    it('strips detail + remedy for an anonymous caller (status roll-up survives)', async () => {
      const res = await controller({}, { report: async () => ssoReport }).preflightReport(
        anonReq,
        { status: vi.fn() } as never,
      );
      expect(res.ok).toBe(false);
      expect(res.worst).toBe('fail');
      expect(res.checks).toEqual([{ name: 'sso', status: 'fail' }]);
      // No provider name or env-var name leaks.
      expect(JSON.stringify(res)).not.toContain('MIDNITE_GOOGLE_CLIENT_SECRET');
      expect(JSON.stringify(res)).not.toContain('google configured');
    });

    it('keeps the full detail for an authenticated caller', async () => {
      const res = await controller({}, { report: async () => ssoReport }, { jwt: acceptJwt }).preflightReport(
        authedReq,
        { status: vi.fn() } as never,
      );
      expect(res.checks[0]).toEqual(ssoReport.checks[0]);
    });

    it('redacts /health/ready checks for anonymous callers too', async () => {
      const report: Readiness = {
        ready: true,
        worst: 'warn',
        checks: [{ name: 'database', status: 'warn', detail: '/var/lib/midnite.db slow' }],
        uptimeMs: 9,
      };
      const res = await controller({ readiness: async () => report }).ready(anonReq, { status: vi.fn() } as never);
      expect(res.checks).toEqual([{ name: 'database', status: 'warn' }]);
    });
  });
});
