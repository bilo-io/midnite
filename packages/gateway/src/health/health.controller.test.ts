import { describe, expect, it, vi } from 'vitest';
import type { Liveness, PreflightReport, Readiness } from '@midnite/shared';
import { HealthController } from './health.controller';
import type { HealthService } from './health.service';
import type { PreflightService } from './preflight.service';

function controller(health: Partial<HealthService>, preflight: Partial<PreflightService> = {}) {
  return new HealthController(health as HealthService, preflight as PreflightService);
}

describe('HealthController', () => {
  it('legacy /health stays a plain liveness alias', () => {
    expect(controller({}).check()).toEqual({ ok: true });
  });

  it('/health/live delegates to the service liveness', () => {
    const liveness: Liveness = { ok: true, uptimeMs: 1234 };
    expect(controller({ liveness: () => liveness }).live()).toEqual(liveness);
  });

  it('/health/ready returns 200 with the report when ready', async () => {
    const report: Readiness = { ready: true, worst: 'ok', checks: [], uptimeMs: 5 };
    const status = vi.fn();
    const res = await controller({ readiness: async () => report }).ready({ status } as never);
    expect(res).toEqual(report);
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
    await controller({ readiness: async () => report }).ready({ status } as never);
    expect(status).toHaveBeenCalledWith(503);
  });

  it('/health/preflight returns 200 with the report when it passes', async () => {
    const report: PreflightReport = { ok: true, worst: 'warn', checks: [] };
    const status = vi.fn();
    const res = await controller({}, { report: async () => report }).preflightReport({ status } as never);
    expect(res).toEqual(report);
    expect(status).not.toHaveBeenCalled();
  });

  it('/health/preflight sets 503 when the report fails', async () => {
    const report: PreflightReport = {
      ok: false,
      worst: 'fail',
      checks: [{ name: 'database', status: 'fail', detail: 'unwritable' }],
    };
    const status = vi.fn();
    await controller({}, { report: async () => report }).preflightReport({ status } as never);
    expect(status).toHaveBeenCalledWith(503);
  });
});
