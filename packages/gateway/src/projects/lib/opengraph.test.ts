import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl, parseHtmlMetadata } from './opengraph';

describe('isSafeHttpUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://docs.google.com/document/d/x')).toBe(true);
  });

  it('rejects non-http schemes, internal hosts, and garbage', () => {
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('http://localhost:7777')).toBe(false);
    expect(isSafeHttpUrl('http://service.local')).toBe(false);
    expect(isSafeHttpUrl('http://127.0.0.1')).toBe(false);
    expect(isSafeHttpUrl('http://10.0.0.5')).toBe(false);
    expect(isSafeHttpUrl('http://192.168.1.10')).toBe(false);
    expect(isSafeHttpUrl('http://172.16.0.1')).toBe(false);
    expect(isSafeHttpUrl('http://169.254.1.1')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
  });
});

describe('parseHtmlMetadata', () => {
  it('prefers og:title, decodes entities, resolves a relative favicon', () => {
    const html = `<html><head>
      <title>Fallback</title>
      <meta property="og:title" content="Real &amp; Title" />
      <link rel="icon" href="/fav.png" />
    </head></html>`;
    const meta = parseHtmlMetadata(html, 'https://example.com/page');
    expect(meta.title).toBe('Real & Title');
    expect(meta.faviconUrl).toBe('https://example.com/fav.png');
  });

  it('falls back to <title> and the default favicon path', () => {
    const meta = parseHtmlMetadata('<title>Just Title</title>', 'https://example.com/a/b');
    expect(meta.title).toBe('Just Title');
    expect(meta.faviconUrl).toBe('https://example.com/favicon.ico');
  });
});
