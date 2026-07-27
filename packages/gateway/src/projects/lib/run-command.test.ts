import { describe, expect, it } from 'vitest';
import { buildRunInitCommand } from './run-command';

describe('buildRunInitCommand', () => {
  it('cds into the quoted work dir, clears, then runs the command and submits it', () => {
    expect(buildRunInitCommand('/Users/bilo/dev/app', 'pnpm dev')).toBe(
      `cd '/Users/bilo/dev/app' && clear && pnpm dev\r`,
    );
  });

  it('escapes an embedded single quote in the work dir', () => {
    expect(buildRunInitCommand("/Users/bilo/dev/bob's app", 'pnpm dev')).toBe(
      `cd '/Users/bilo/dev/bob'\\''s app' && clear && pnpm dev\r`,
    );
  });
});
