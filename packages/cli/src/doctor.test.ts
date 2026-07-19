import { describe, expect, it } from 'vitest';
import type { PreflightReport, Readiness } from '@midnite/shared';
import { doctorExitCode, doctorRows, isSsoRow, nonSsoRows, ssoReadinessRows } from './doctor.js';

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

describe('SSO readiness section (Phase 72 F)', () => {
  // A preflight report with the per-provider SSO rows in each go-live state.
  const ssoPreflight: PreflightReport = {
    ok: false,
    worst: 'fail',
    checks: [
      { name: 'config', status: 'ok', detail: 'parsed' },
      { name: 'sso:google', status: 'ok', detail: 'google SSO ready' },
      { name: 'sso:github', status: 'fail', detail: 'github SSO client secret env unset: MIDNITE_GITHUB_CLIENT_SECRET', remedy: 'set MIDNITE_GITHUB_CLIENT_SECRET to the github OAuth client secret' },
    ],
  };

  it('identifies both the aggregate `sso` row and per-provider `sso:<provider>` rows', () => {
    expect(isSsoRow({ section: 'preflight', name: 'sso', status: 'ok' })).toBe(true);
    expect(isSsoRow({ section: 'preflight', name: 'sso:google', status: 'ok' })).toBe(true);
    expect(isSsoRow({ section: 'preflight', name: 'ssoish', status: 'ok' })).toBe(false);
    expect(isSsoRow({ section: 'preflight', name: 'database', status: 'ok' })).toBe(false);
  });

  it('splits SSO rows out of the main table into their own section', () => {
    expect(ssoReadinessRows(ssoPreflight, okReadiness).map((r) => r.name)).toEqual(['sso:google', 'sso:github']);
    expect(nonSsoRows(ssoPreflight, okReadiness).some((r) => isSsoRow(r))).toBe(false);
    // Every row is accounted for across the two partitions (no drops, no dups).
    expect(
      nonSsoRows(ssoPreflight, okReadiness).length + ssoReadinessRows(ssoPreflight, okReadiness).length,
    ).toBe(doctorRows(ssoPreflight, okReadiness).length);
  });

  it('renders each provider readiness state (ready / secret-unset / jwt-off) from a fixture', () => {
    const jwtOff: PreflightReport = {
      ok: false,
      worst: 'warn',
      checks: [
        { name: 'sso:google', status: 'warn', detail: 'google SSO configured but JWT is disabled — SSO issues our JWTs, so sign-in will 503', remedy: 'set MIDNITE_JWT_SECRET to enable JWT auth (SSO requires it)' },
      ],
    };
    const rows = ssoReadinessRows(ssoPreflight, okReadiness);
    expect(rows.find((r) => r.name === 'sso:google')?.status).toBe('ok');
    expect(rows.find((r) => r.name === 'sso:github')?.status).toBe('fail');
    expect(ssoReadinessRows(jwtOff, okReadiness)[0]?.status).toBe('warn');
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
