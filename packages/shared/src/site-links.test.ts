import { describe, expect, it } from 'vitest';

import {
  MAX_ISSUE_URL_LENGTH,
  REPORT_ISSUE_LABELS,
  REPORT_ISSUE_TEMPLATE,
  githubIssuesNewUrl,
} from './site-links.js';

describe('githubIssuesNewUrl', () => {
  it('targets the public companion repo, not the private source', () => {
    const url = githubIssuesNewUrl({ title: 't', body: 'b' });
    expect(url.startsWith('https://github.com/bilo-io/midnite-app/issues/new?')).toBe(true);
  });

  it('encodes spaces, newlines, # and unicode in title + body', () => {
    const url = githubIssuesNewUrl({
      title: 'crash on #42',
      body: 'line one\nline two — café',
    });
    // Spaces → %20 (not +), newline → %0A, # → %23, em-dash + accent → percent-encoded.
    expect(url).toContain('title=crash%20on%20%2342');
    expect(url).toContain('line%20one%0Aline%20two');
    expect(url).not.toContain('+'); // never the +-for-space form
    expect(url).toContain('%23'); // # survived
    // Round-trips back to the originals.
    const params = new URL(url).searchParams;
    expect(params.get('title')).toBe('crash on #42');
    expect(params.get('body')).toBe('line one\nline two — café');
  });

  it('defaults to the report labels + bug_report template', () => {
    const params = new URL(githubIssuesNewUrl({ title: 't', body: 'b' })).searchParams;
    expect(params.get('labels')).toBe(REPORT_ISSUE_LABELS.join(','));
    expect(params.get('template')).toBe(REPORT_ISSUE_TEMPLATE);
  });

  it('omits the template param when passed null', () => {
    const params = new URL(
      githubIssuesNewUrl({ title: 't', body: 'b', template: null }),
    ).searchParams;
    expect(params.has('template')).toBe(false);
  });

  it('honours custom labels', () => {
    const params = new URL(
      githubIssuesNewUrl({ title: 't', body: 'b', labels: ['bug', 'p0'] }),
    ).searchParams;
    expect(params.get('labels')).toBe('bug,p0');
  });

  it('exposes a sane URL-length budget under GitHub’s ~8KB limit', () => {
    expect(MAX_ISSUE_URL_LENGTH).toBeGreaterThan(2000);
    expect(MAX_ISSUE_URL_LENGTH).toBeLessThanOrEqual(8192);
  });
});
