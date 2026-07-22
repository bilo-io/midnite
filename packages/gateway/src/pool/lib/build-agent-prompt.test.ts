import { describe, expect, it } from 'vitest';
import { appendDescription, appendRepoConventions } from './build-agent-prompt';

describe('appendDescription', () => {
  it('returns the prompt unchanged when no description is given', () => {
    expect(appendDescription('build the widget', undefined)).toBe('build the widget');
    expect(appendDescription('build the widget', null)).toBe('build the widget');
  });

  it('treats a blank description as unset', () => {
    expect(appendDescription('build the widget', '   \n  ')).toBe('build the widget');
  });

  it('appends the description under a heading, after the seed', () => {
    const out = appendDescription('build the widget', 'It must support dark mode.');
    expect(out.startsWith('build the widget')).toBe(true);
    expect(out).toContain('## Description');
    expect(out).toContain('It must support dark mode.');
  });

  it('trims surrounding whitespace from the description', () => {
    const out = appendDescription('build the widget', '  needs tests  ');
    expect(out).toContain('## Description\n\nneeds tests');
    expect(out).not.toContain('needs tests  ');
  });
});

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
