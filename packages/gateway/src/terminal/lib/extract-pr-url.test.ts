import { describe, expect, it } from 'vitest';
import { extractPrUrl } from './extract-pr-url';

describe('extractPrUrl', () => {
  it('finds a github PR url in agent output', () => {
    expect(extractPrUrl('Opened https://github.com/acme/web/pull/42 for review')).toBe(
      'https://github.com/acme/web/pull/42',
    );
  });

  it('returns the last PR url when several appear', () => {
    const text = 'old https://github.com/a/b/pull/1 ... then https://github.com/a/b/pull/2';
    expect(extractPrUrl(text)).toBe('https://github.com/a/b/pull/2');
  });

  it('matches gitlab merge requests', () => {
    expect(extractPrUrl('see https://gitlab.com/grp/sub/proj/-/merge_requests/7 now')).toBe(
      'https://gitlab.com/grp/sub/proj/-/merge_requests/7',
    );
  });

  it('returns undefined when no PR url is present', () => {
    expect(extractPrUrl('just some normal output, no links')).toBeUndefined();
    expect(extractPrUrl('https://github.com/acme/web (repo, not a PR)')).toBeUndefined();
  });
});
