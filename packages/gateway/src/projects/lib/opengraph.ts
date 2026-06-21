import { detectSourceKind } from '@midnite/shared';

// Best-effort source-link metadata. Dependency-free: native fetch + small regex
// extractors. Private docs (Google/Notion behind a login) simply yield no title,
// which the caller treats as a graceful fallback.

export interface SourceMetadata {
  title?: string;
  faviconUrl?: string;
}

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (compatible; midnite-link-preview/1.0; +https://github.com/bilo-io/midnite)';

/**
 * Reject non-http(s) URLs and obvious internal/private hosts. This is a
 * best-effort SSRF guard (it does not resolve DNS), enough to stop the common
 * `http://localhost:7777/...` / link-local / RFC1918 footguns.
 *
 * `allowLoopback` opts loopback hosts (localhost / 127.0.0.0/8 / ::1) back in —
 * for callers that legitimately reach a local service (e.g. a workflow hitting
 * the gateway's own health endpoint). It does NOT unblock other private ranges
 * (RFC1918, link-local, *.local), which remain rejected.
 */
export function isSafeHttpUrl(raw: string, opts: { allowLoopback?: boolean } = {}): boolean {
  const allowLoopback = opts.allowLoopback ?? false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return allowLoopback;
  if (host.endsWith('.local')) return false;
  if (host === '[::1]' || host === '::1') return allowLoopback;
  if (host === '::') return false;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const octets = v4.slice(1).map(Number);
    if (octets.some((n) => n > 255)) return false;
    const [a, b] = octets as [number, number, number, number];
    if (a === 127) return allowLoopback; // loopback
    if (a === 0) return false; // unspecified
    if (a === 10) return false; // private
    if (a === 169 && b === 254) return false; // link-local
    if (a === 192 && b === 168) return false; // private
    if (a === 172 && b >= 16 && b <= 31) return false; // private
  }
  return true;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m)
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchMeta(html: string, prop: string): string | undefined {
  const p = escapeRe(prop);
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`,
    'i',
  );
  return re1.exec(html)?.[1] ?? re2.exec(html)?.[1];
}

/** Pure metadata extraction from an HTML string (no network). Exposed for tests. */
export function parseHtmlMetadata(html: string, baseUrl: string): SourceMetadata {
  const meta: SourceMetadata = {};

  const title = matchMeta(html, 'og:title') ?? matchMeta(html, 'twitter:title');
  if (title) {
    meta.title = decodeEntities(title);
  } else {
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (m?.[1]) meta.title = decodeEntities(m[1]);
  }

  const iconHref =
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i.exec(html)?.[1];
  try {
    meta.faviconUrl = new URL(iconHref ?? '/favicon.ico', baseUrl).toString();
  } catch {
    // leave faviconUrl unset on a malformed base/href
  }

  return meta;
}

/** Read a response body as UTF-8, stopping once `maxBytes` is reached (so a huge
 *  page can't exhaust memory). Exported for reuse by other SSRF-guarded fetchers. */
export async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function fetchYouTubeOEmbed(url: string): Promise<SourceMetadata | undefined> {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': USER_AGENT },
  });
  if (!res.ok) return undefined;
  const data = (await res.json()) as { title?: string };
  return { title: data.title, faviconUrl: 'https://www.youtube.com/favicon.ico' };
}

/**
 * Best-effort fetch of a source link's title + favicon. Never throws — returns
 * `{}` when the link is unsafe, private, or unreachable.
 */
export async function fetchSourceMetadata(url: string): Promise<SourceMetadata> {
  if (!isSafeHttpUrl(url)) return {};
  try {
    if (detectSourceKind(url) === 'youtube') {
      const yt = await fetchYouTubeOEmbed(url);
      if (yt?.title) return yt;
    }
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) return {};
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) {
      return { faviconUrl: new URL('/favicon.ico', res.url || url).toString() };
    }
    const html = await readCapped(res, MAX_BYTES);
    return parseHtmlMetadata(html, res.url || url);
  } catch {
    return {};
  }
}
