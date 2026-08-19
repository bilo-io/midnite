import { describe, expect, it } from 'vitest';
import { backgroundRunSpec, buildRunInitCommand } from './run-command';

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

describe('backgroundRunSpec', () => {
  it('runs the command through a login shell with the work dir as cwd', () => {
    expect(backgroundRunSpec('/Users/bilo/dev/app', 'pnpm dev', '/bin/zsh')).toEqual({
      command: '/bin/zsh',
      args: ['-lc', 'pnpm dev'],
      cwd: '/Users/bilo/dev/app',
    });
  });

  it('defaults the shell from $SHELL, falling back to /bin/sh', () => {
    const spec = backgroundRunSpec('/tmp', 'echo hi');
    expect(spec.command).toBe(process.env.SHELL || '/bin/sh');
  });
});
