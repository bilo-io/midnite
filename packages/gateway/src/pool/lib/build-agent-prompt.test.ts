import { describe, expect, it } from 'vitest';
import { appendRepoConventions } from './build-agent-prompt';

describe('appendRepoConventions', () => {
  it('returns the prompt unchanged when no repo is given', () => {
    expect(appendRepoConventions('do the thing', undefined)).toBe('do the thing');
  });

  it('returns the prompt unchanged when the repo has no conventions', () => {
    expect(appendRepoConventions('do the thing', { branchPrefix: undefined, prTemplate: undefined })).toBe(
      'do the thing',
    );
  });

  it('treats blank conventions as unset', () => {
    expect(appendRepoConventions('do the thing', { branchPrefix: '   ', prTemplate: '' })).toBe(
      'do the thing',
    );
  });

  it('appends a branch-naming convention', () => {
    const out = appendRepoConventions('do the thing', { branchPrefix: 'feature/' });
    expect(out).toContain('## Repository conventions');
    expect(out).toContain('**Branch naming:**');
    expect(out).toContain('`feature/`');
    expect(out).toContain('`feature/short-description`');
    expect(out).not.toContain('Pull request body');
    expect(out.startsWith('do the thing')).toBe(true);
  });

  it('appends a PR-body template verbatim', () => {
    const template = '## Summary\n\n## Testing';
    const out = appendRepoConventions('do the thing', { prTemplate: template });
    expect(out).toContain('**Pull request body:**');
    expect(out).toContain(template);
    expect(out).not.toContain('Branch naming');
  });

  it('appends both conventions when set', () => {
    const out = appendRepoConventions('do the thing', {
      branchPrefix: 'fix/',
      prTemplate: '## Why',
    });
    expect(out).toContain('**Branch naming:**');
    expect(out).toContain('`fix/`');
    expect(out).toContain('**Pull request body:**');
    expect(out).toContain('## Why');
  });
});
