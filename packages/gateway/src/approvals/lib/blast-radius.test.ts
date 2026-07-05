import { describe, expect, it } from 'vitest';
import type { BlastRadiusConfig } from '@midnite/shared';
import { evaluateBlastRadius } from './blast-radius';

const cfg: BlastRadiusConfig = {
  enabled: true,
  protectedBranches: ['main', 'master'],
  protectedPathGlobs: ['**/.env', '**/.env.*', '**/*.pem', '**/id_rsa*', '**/*.key', '**/credentials*'],
};

const bash = (command: string) => evaluateBlastRadius('Bash', { command }, cfg);

describe('evaluateBlastRadius — git force-push', () => {
  it('denies --force / -f / --force-with-lease', () => {
    expect(bash('git push --force origin feature')?.ruleId).toBe('blast-radius:force-push');
    expect(bash('git push -f')?.ruleId).toBe('blast-radius:force-push');
    expect(bash('git push --force-with-lease origin x')?.ruleId).toBe('blast-radius:force-push');
    expect(bash('git -C /repo push --force')?.ruleId).toBe('blast-radius:force-push');
  });
  it('allows a normal push to a feature branch', () => {
    expect(bash('git push origin feature/x')).toBeNull();
  });
});

describe('evaluateBlastRadius — protected-branch push', () => {
  it('denies a direct push to main/master (incl. HEAD:main refspec)', () => {
    expect(bash('git push origin main')?.ruleId).toBe('blast-radius:protected-branch');
    expect(bash('git push origin master')?.ruleId).toBe('blast-radius:protected-branch');
    expect(bash('git push origin HEAD:main')?.ruleId).toBe('blast-radius:protected-branch');
  });
  it('does not flag a branch that merely contains the word', () => {
    expect(bash('git push origin maintenance')).toBeNull();
  });
});

describe('evaluateBlastRadius — recursive force delete', () => {
  it('denies rm -rf and flag variants', () => {
    expect(bash('rm -rf /tmp/x')?.ruleId).toBe('blast-radius:mass-delete');
    expect(bash('rm -fr node_modules')?.ruleId).toBe('blast-radius:mass-delete');
    expect(bash('rm -r -f build')?.ruleId).toBe('blast-radius:mass-delete');
    expect(bash('rm --recursive --force dist')?.ruleId).toBe('blast-radius:mass-delete');
  });
  it('allows a plain rm of one file', () => {
    expect(bash('rm foo.txt')).toBeNull();
    expect(bash('rm -f single.log')).toBeNull(); // force but not recursive
  });
});

describe('evaluateBlastRadius — secret files', () => {
  it('denies a file tool targeting a protected path', () => {
    expect(evaluateBlastRadius('Read', { file_path: 'packages/gateway/.env' }, cfg)?.ruleId).toBe(
      'blast-radius:secret-file',
    );
    expect(evaluateBlastRadius('Read', { file_path: '.env.production' }, cfg)?.ruleId).toBe(
      'blast-radius:secret-file',
    );
    expect(evaluateBlastRadius('Read', { file_path: '/home/u/.ssh/id_rsa' }, cfg)?.ruleId).toBe(
      'blast-radius:secret-file',
    );
  });
  it('denies a bash command referencing a protected file', () => {
    expect(bash('cat .env')?.ruleId).toBe('blast-radius:secret-file');
    expect(bash('cp config/credentials.json /tmp')?.ruleId).toBe('blast-radius:secret-file');
  });
  it('allows an ordinary file', () => {
    expect(evaluateBlastRadius('Read', { file_path: 'src/index.ts' }, cfg)).toBeNull();
    expect(bash('cat README.md')).toBeNull();
  });
});

describe('evaluateBlastRadius — disabled + non-matching', () => {
  it('returns null when disabled', () => {
    expect(evaluateBlastRadius('Bash', { command: 'git push --force' }, { ...cfg, enabled: false })).toBeNull();
  });
  it('returns null for a benign command / unknown tool shape', () => {
    expect(bash('ls -la')).toBeNull();
    expect(evaluateBlastRadius('Bash', {}, cfg)).toBeNull();
  });
  it('honours a custom protected branch list', () => {
    const custom = { ...cfg, protectedBranches: ['release'] };
    expect(evaluateBlastRadius('Bash', { command: 'git push origin release' }, custom)?.ruleId).toBe(
      'blast-radius:protected-branch',
    );
    expect(evaluateBlastRadius('Bash', { command: 'git push origin main' }, custom)).toBeNull();
  });
});
