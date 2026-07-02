import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type PreflightCheck } from '@midnite/shared';
import type { HealthService } from './health.service';
import { PreflightService } from './preflight.service';

function config(strictBoot = false): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, gateway: { strictBoot } });
}

function health(checks: PreflightCheck[]): HealthService {
  return { bootChecks: async () => checks } as unknown as HealthService;
}

const ok: PreflightCheck = { name: 'a', status: 'ok', detail: '' };
const warn: PreflightCheck = { name: 'b', status: 'warn', detail: '' };
const fail: PreflightCheck = { name: 'c', status: 'fail', detail: '' };

describe('PreflightService.report', () => {
  it('passes when all checks are ok', async () => {
    const r = await new PreflightService(config(), health([ok])).report();
    expect(r).toMatchObject({ ok: true, worst: 'ok' });
  });

  it('passes with warnings by default (non-strict)', async () => {
    const r = await new PreflightService(config(false), health([ok, warn])).report();
    expect(r).toMatchObject({ ok: true, worst: 'warn' });
  });

  it('fails on any hard failure', async () => {
    const r = await new PreflightService(config(false), health([ok, warn, fail])).report();
    expect(r).toMatchObject({ ok: false, worst: 'fail' });
  });

  it('strictBoot escalates a warning to a failure', async () => {
    const r = await new PreflightService(config(true), health([ok, warn])).report();
    expect(r).toMatchObject({ ok: false, worst: 'warn' });
  });
});

describe('PreflightService.run', () => {
  it('does not exit when the report passes', async () => {
    const exit = vi.fn();
    await new PreflightService(config(), health([ok, warn])).run(exit);
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits non-zero when the report fails', async () => {
    const exit = vi.fn();
    await new PreflightService(config(), health([fail])).run(exit);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits under strictBoot when only warnings are present', async () => {
    const exit = vi.fn();
    await new PreflightService(config(true), health([warn])).run(exit);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
