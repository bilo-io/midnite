import { describe, expect, it } from 'vitest';
import { bytesToText, capUtf8, extractUpload, htmlToPlainText } from './ingest';

describe('ingest — pure extraction', () => {
  it('strips HTML to readable prose, dropping script/nav/style', () => {
    const html = `
      <html><head><style>.x{color:red}</style></head>
      <body><nav>Home About</nav><h1>Title</h1>
      <p>Hello <strong>world</strong>.</p>
      <script>evil()</script></body></html>`;
    const text = htmlToPlainText(html);
    expect(text).toMatch(/title/i); // headings are upper-cased by the formatter
    expect(text).toContain('Hello world');
    expect(text).not.toContain('evil()');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('Home About'); // nav dropped
  });

  it('decodes plain-text and markdown uploads as UTF-8', () => {
    expect(bytesToText(Buffer.from('# Heading\ntext'))).toBe('# Heading\ntext');
  });

  it('caps text to a byte budget on a character boundary', () => {
    const emoji = '😀'.repeat(100); // 4 bytes each = 400 bytes
    const capped = capUtf8(emoji, 10);
    // 10 bytes → 2 full emoji (8 bytes), never a split multibyte char.
    expect(Buffer.byteLength(capped, 'utf-8')).toBeLessThanOrEqual(10);
    expect(capped).toBe('😀😀');
  });

  it('returns null for an unsupported upload mime type', async () => {
    expect(await extractUpload(Buffer.from('x'), 'application/zip')).toBeNull();
  });

  it('extracts markdown/plain uploads via extractUpload', async () => {
    expect(await extractUpload(Buffer.from('hi'), 'text/plain')).toBe('hi');
    expect(await extractUpload(Buffer.from('# md'), 'text/markdown')).toBe('# md');
  });
});
