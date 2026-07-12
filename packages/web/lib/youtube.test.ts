import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from './youtube';

describe('youtubeEmbedUrl', () => {
  it('parses a watch?v= URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses a youtu.be short link', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  it('parses an /embed/ and a /shorts/ URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/embed/abc123def')).toBe(
      'https://www.youtube.com/embed/abc123def',
    );
    expect(youtubeEmbedUrl('https://youtube.com/shorts/abc123def')).toBe(
      'https://www.youtube.com/embed/abc123def',
    );
  });

  it('returns null for non-YouTube or unparseable URLs', () => {
    expect(youtubeEmbedUrl('https://example.com/watch?v=x')).toBeNull();
    expect(youtubeEmbedUrl('not a url')).toBeNull();
    expect(youtubeEmbedUrl(undefined)).toBeNull();
    expect(youtubeEmbedUrl('https://www.youtube.com/')).toBeNull();
  });
});
