import type { PreflightReport, PreflightStatus, Readiness } from '@midnite/shared';

/** A flattened health check for the `doctor` table — its source section + fields. */
export interface DoctorRow {
  section: 'preflight' | 'readiness';
  name: string;
  status: PreflightStatus;
  // Optional since Phase 72 C — anonymous /health responses redact it; `doctor`
  // authenticates so it normally has the detail, but the type must allow absence.
  detail?: string;
  remedy?: string;
}

/**
 * Flatten a preflight report + readiness report into table rows (Phase 54 F).
 * Both are shown: preflight is the full boot check set, readiness the live
 * serving subset (they overlap on DB/spawner, labelled by section).
 */
export function doctorRows(preflight: PreflightReport, readiness: Readiness): DoctorRow[] {
  return [
    ...preflight.checks.map((c) => ({ section: 'preflight' as const, ...c })),
    ...readiness.checks.map((c) => ({ section: 'readiness' as const, ...c })),
  ];
}

/**
 * True for the per-provider SSO readiness rows (`sso` or `sso:<provider>`, Phase 72 F).
 * `midnite doctor` pulls these into a dedicated **SSO readiness** section so an operator
 * sees each provider's go-live state (ready / secret-unset / jwt-off) at a glance.
 */
export function isSsoRow(row: DoctorRow): boolean {
  return row.name === 'sso' || row.name.startsWith('sso:');
}

/** The SSO readiness rows only — the dedicated `midnite doctor` SSO section (Phase 72 F). */
export function ssoReadinessRows(preflight: PreflightReport, readiness: Readiness): DoctorRow[] {
  return doctorRows(preflight, readiness).filter(isSsoRow);
}

/** The non-SSO rows — the main `midnite doctor` health table (SSO gets its own section). */
export function nonSsoRows(preflight: PreflightReport, readiness: Readiness): DoctorRow[] {
  return doctorRows(preflight, readiness).filter((r) => !isSsoRow(r));
}

/**
 * Exit code for `midnite doctor`: `1` when anything is wrong — a `fail` check,
 * a preflight that didn't pass (incl. `strictBoot` escalation), or a not-ready
 * gateway — else `0`. Lets scripts gate on `midnite doctor`.
 */
export function doctorExitCode(preflight: PreflightReport, readiness: Readiness): number {
  const anyFail = [...preflight.checks, ...readiness.checks].some((c) => c.status === 'fail');
  return anyFail || !preflight.ok || !readiness.ready ? 1 : 0;
}
