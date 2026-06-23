import { describe, expect, it } from 'vitest';
import {
  detectSourceKind,
  isPrTerminal,
  parseGithubIssueOrPr,
  parseGithubPr,
  parseGithubRepo,
  PrStatusSchema,
} from './source.js';

describe('detectSourceKind', () => {
  it('detects GitHub and Figma', () => {
    expect(detectSourceKind('https://github.com/bilo-io/midnite/pull/42')).toBe('github');
    expect(detectSourceKind('https://www.figma.com/file/abc/Design')).toBe('figma');
  });

  it('detects the Google editors by path and Drive', () => {
    expect(detectSourceKind('https://docs.google.com/document/d/abc/edit')).toBe('google-docs');
    expect(detectSourceKind('https://docs.google.com/spreadsheets/d/abc/edit')).toBe(
      'google-sheets',
    );
    expect(detectSourceKind('https://docs.google.com/presentation/d/abc/edit')).toBe(
      'google-slides',
    );
    expect(detectSourceKind('https://drive.google.com/file/d/abc/view')).toBe('google-drive');
  });

  it('detects social and publishing providers', () => {
    expect(detectSourceKind('https://x.com/midnite/status/1')).toBe('x');
    expect(detectSourceKind('https://twitter.com/midnite')).toBe('x');
    expect(detectSourceKind('https://www.facebook.com/midnite')).toBe('facebook');
    expect(detectSourceKind('https://www.linkedin.com/in/bilo')).toBe('linkedin');
    expect(detectSourceKind('https://www.reddit.com/r/programming')).toBe('reddit');
    expect(detectSourceKind('https://medium.com/@bilo/post')).toBe('medium');
    expect(detectSourceKind('https://bilo.substack.com/p/post')).toBe('substack');
  });

  it('detects Notion', () => {
    expect(detectSourceKind('https://www.notion.so/workspace/Page-123')).toBe('notion');
    expect(detectSourceKind('https://team.notion.site/Page-123')).toBe('notion');
  });

  it('detects YouTube (long and short)', () => {
    expect(detectSourceKind('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectSourceKind('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('falls back to link for everything else', () => {
    expect(detectSourceKind('https://example.com/whatever')).toBe('link');
    expect(detectSourceKind('not a url')).toBe('link');
  });

  it('does not match lookalike hostnames', () => {
    expect(detectSourceKind('https://notion.so.evil.com/x')).toBe('link');
    expect(detectSourceKind('https://fakeyoutube.com/x')).toBe('link');
  });
});

describe('parseGithubPr / parseGithubRepo', () => {
  it('parses a PR url into repo + number', () => {
    expect(parseGithubPr('https://github.com/bilo-io/midnite/pull/42')).toEqual({
      repo: 'bilo-io/midnite',
      prNumber: 42,
    });
  });

  it('returns null for non-PR or non-github urls', () => {
    expect(parseGithubPr('https://github.com/bilo-io/midnite')).toBeNull();
    expect(parseGithubPr('https://example.com/pull/1')).toBeNull();
  });

  it('parses owner/repo for any github url', () => {
    expect(parseGithubRepo('https://github.com/bilo-io/midnite/issues/3')).toBe('bilo-io/midnite');
    expect(parseGithubRepo('https://example.com/x')).toBeNull();
  });
});

describe('parseGithubIssueOrPr', () => {
  it('parses both issue and PR urls into repo + number', () => {
    expect(parseGithubIssueOrPr('https://github.com/bilo-io/midnite/issues/7')).toEqual({
      repo: 'bilo-io/midnite',
      number: 7,
    });
    expect(parseGithubIssueOrPr('https://github.com/bilo-io/midnite/pull/42')).toEqual({
      repo: 'bilo-io/midnite',
      number: 42,
    });
  });

  it('returns null for a repo root, non-numeric number, or non-github url', () => {
    expect(parseGithubIssueOrPr('https://github.com/bilo-io/midnite')).toBeNull();
    expect(parseGithubIssueOrPr('https://github.com/bilo-io/midnite/issues/abc')).toBeNull();
    expect(parseGithubIssueOrPr('https://example.com/bilo-io/midnite/issues/1')).toBeNull();
  });
});

describe('PrStatusSchema', () => {
  it('accepts a full status and one without a review decision', () => {
    const full = {
      state: 'open',
      checks: 'passing',
      reviewDecision: 'approved',
      url: 'https://github.com/bilo-io/midnite/pull/1',
      number: 1,
      fetchedAt: '2026-06-23T00:00:00.000Z',
    };
    expect(PrStatusSchema.parse(full)).toEqual(full);
    const { reviewDecision: _omitted, ...minimal } = full;
    expect(PrStatusSchema.parse({ ...minimal, checks: 'none' }).reviewDecision).toBeUndefined();
  });

  it('rejects an unknown state, check value, or non-positive number', () => {
    const base = { checks: 'none', url: 'https://x/pull/1', number: 1, fetchedAt: 'z' };
    expect(PrStatusSchema.safeParse({ ...base, state: 'reopened' }).success).toBe(false);
    expect(PrStatusSchema.safeParse({ ...base, state: 'open', checks: 'flaky' }).success).toBe(false);
    expect(PrStatusSchema.safeParse({ ...base, state: 'open', number: 0 }).success).toBe(false);
  });
});

describe('isPrTerminal', () => {
  it('is true only for merged/closed', () => {
    expect(isPrTerminal('merged')).toBe(true);
    expect(isPrTerminal('closed')).toBe(true);
    expect(isPrTerminal('open')).toBe(false);
    expect(isPrTerminal('draft')).toBe(false);
  });
});
