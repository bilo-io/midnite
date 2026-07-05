import { describe, expect, it } from 'vitest';
import type { PreflightReport, Readiness } from '@midnite/shared';
import { doctorExitCode, doctorRows } from './doctor.js';

const okPreflight: PreflightReport = {
  ok: true,
  worst: 'warn',
  checks: [
    { name: 'config', status: 'ok', detail: 'parsed' },
    { name: 'gh-cli', status: 'warn', detail: 'not on PATH', remedy: 'install gh' },
  ],
};
const okReadiness: Readiness = {
  ready: true,
  worst: 'ok',
  checks: [{ name: 'database', status: 'ok', detail: 'writable + migrated' }],
  uptimeMs: 60_000,
};

describe('doctorRows', () => {
  it('flattens both reports, tagging each row with its section', () => {
    const rows = doctorRows(okPreflight, okReadiness);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.section === 'preflight')).toHaveLength(2);
    expect(rows.filter((r) => r.section === 'readiness')).toHaveLength(1);
    expect(rows.find((r) => r.name === 'gh-cli')?.remedy).toBe('install gh');
  });
});

describe('doctorExitCode', () => {
  it('is 0 when preflight passes, readiness is ready, and no check failed', () => {
    expect(doctorExitCode(okPreflight, okReadiness)).toBe(0);
  });

  it('is 1 when any check is a hard fail', () => {
    const failReady: Readiness = {
      ready: false,
      worst: 'fail',
      checks: [{ name: 'database', status: 'fail', detail: 'gone' }],
      uptimeMs: 1,
    };
    expect(doctorExitCode(okPreflight, failReady)).toBe(1);
  });

  it('is 1 when preflight did not pass (e.g. strictBoot escalation) even with only warns', () => {
    const strictFail: PreflightReport = { ...okPreflight, ok: false, worst: 'warn' };
    expect(doctorExitCode(strictFail, okReadiness)).toBe(1);
  });

  it('is 1 when not ready even if no individual check is fail', () => {
    const notReady: Readiness = { ...okReadiness, ready: false };
    expect(doctorExitCode(okPreflight, notReady)).toBe(1);
  });
});
