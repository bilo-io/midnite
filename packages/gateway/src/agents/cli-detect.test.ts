import { describe, expect, it } from 'vitest';
import { parseVersion } from './cli-detect';

describe('parseVersion', () => {
  it('extracts a semver from decorated output', () => {
    expect(parseVersion('1.2.3 (Claude Code)')).toBe('1.2.3');
    expect(parseVersion('codex-cli 0.45.1\n')).toBe('0.45.1');
    expect(parseVersion('v2.0.0-beta.1')).toBe('2.0.0-beta.1');
  });

  it('falls back to the first non-empty line when no semver is present', () => {
    expect(parseVersion('\n  gemini latest  \n')).toBe('gemini latest');
  });

  it('returns undefined for empty output', () => {
    expect(parseVersion('')).toBeUndefined();
    expect(parseVersion('   \n  ')).toBeUndefined();
  });
});
