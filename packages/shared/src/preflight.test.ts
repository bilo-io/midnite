import { describe, expect, it } from 'vitest';
import {
  PreflightCheckSchema,
  PreflightReportSchema,
  ReadinessSchema,
  worstStatus,
} from './preflight.js';

describe('preflight schemas', () => {
  it('accepts a well-formed check', () => {
    const parsed = PreflightCheckSchema.parse({
      name: 'database',
      status: 'ok',
      detail: 'writable + migrated',
    });
    expect(parsed.remedy).toBeUndefined();
  });

  it('rejects an unknown status', () => {
    expect(() => PreflightCheckSchema.parse({ name: 'x', status: 'meh', detail: '' })).toThrow();
  });

  it('parses a report + readiness envelope', () => {
    const checks = [{ name: 'a', status: 'ok' as const, detail: 'fine' }];
    expect(PreflightReportSchema.parse({ ok: true, worst: 'ok', checks }).checks).toHaveLength(1);
    expect(ReadinessSchema.parse({ ready: true, worst: 'ok', checks, uptimeMs: 3 }).ready).toBe(true);
  });
});

describe('worstStatus', () => {
  it('is ok for an empty set', () => {
    expect(worstStatus([])).toBe('ok');
  });

  it('escalates ok < warn < fail', () => {
    const mk = (status: 'ok' | 'warn' | 'fail') => ({ name: 'n', status, detail: '' });
    expect(worstStatus([mk('ok'), mk('warn'), mk('ok')])).toBe('warn');
    expect(worstStatus([mk('ok'), mk('warn'), mk('fail')])).toBe('fail');
    expect(worstStatus([mk('ok'), mk('ok')])).toBe('ok');
  });
});
