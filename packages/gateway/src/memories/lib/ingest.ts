import { convert } from 'html-to-text';
import { extractText, getDocumentProxy } from 'unpdf';

// Pure text-extraction helpers for source ingestion (Phase 65 B). Network I/O
// and DB writes live in MemoryIngestionService; everything here is pure so it's
// unit-testable without a gateway.

/** Strip an HTML document to readable text — drops nav/script/style, keeps prose. */
export function htmlToPlainText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'nav', format: 'skip' },
      { selector: 'header', format: 'skip' },
      { selector: 'footer', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  }).trim();
}

/** Extract text from a PDF buffer (best-effort; joins page text). */
export async function pdfToText(buf: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join('\n') : text).trim();
}

/** Decode a plain-text / markdown upload buffer as UTF-8. */
export function bytesToText(buf: Buffer): string {
  return buf.toString('utf-8').trim();
}

/**
 * Truncate `text` so its UTF-8 byte length does not exceed `maxBytes`, cutting on
 * a character boundary. Returns the (possibly truncated) string.
 */
export function capUtf8(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf-8');
  if (buf.length <= maxBytes) return text;
  // Slice bytes then drop any trailing partial multibyte sequence.
  let end = maxBytes;
  while (end > 0 && ((buf[end] ?? 0) & 0xc0) === 0x80) end--;
  return buf.toString('utf-8', 0, end);
}

/** Pick the extractor for an uploaded file's mime type. Returns null if unsupported. */
export async function extractUpload(buf: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === 'application/pdf') return pdfToText(buf);
  if (mimeType === 'text/markdown' || mimeType === 'text/plain') return bytesToText(buf);
  return null;
}
