import { describe, expect, it } from 'vitest';
import { detectSourceKind } from './source.js';

describe('detectSourceKind', () => {
  it('detects Google Docs / Drive', () => {
    expect(detectSourceKind('https://docs.google.com/document/d/abc/edit')).toBe('google-docs');
    expect(detectSourceKind('https://drive.google.com/file/d/abc/view')).toBe('google-docs');
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
