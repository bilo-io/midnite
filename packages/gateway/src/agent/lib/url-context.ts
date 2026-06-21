// Pure helpers for Phase 15 Theme B (URL + GitHub-context inference): extract URLs
// from a task prompt, strip fetched HTML to readable text, and format fetched
// context into a block appended to the agent's execution prompt. No I/O here —
// the network/shell-out side lives in `url-context.service.ts`.

/** Max distinct URLs we fetch context for from one prompt (bounds latency + cost). */
export const MAX_CONTEXT_URLS = 5;
/** Per-source body truncation, in characters. */
export const MAX_SOURCE_CHARS = 4000;
/** Total injected context-block cap, in characters, so a big issue thread can't
 *  blow the model's context window. */
export const MAX_CONTEXT_BLOCK_CHARS = 12000;

// http(s) URLs, stopping at whitespace or common wrapping characters.
const URL_RE = /https?:\/\/[^\s<>()[\]"'`]+/gi;

/**
 * Extract distinct http(s) URLs from text, in first-seen order, trailing
 * sentence punctuation trimmed, capped at `max`. Pure.
 */
export function extractUrls(text: string, max = MAX_CONTEXT_URLS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(/[.,;:!?)\]}>'"]+$/, '');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

/** Truncate a string to `max` chars, appending an ellipsis when cut. Pure. */
export function truncate(value: string, max = MAX_SOURCE_CHARS): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
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

/**
 * Strip an HTML document to readable plain text: drop script/style/head, remove
 * tags, decode the common entities, collapse whitespace. Best-effort (no DOM),
 * enough to hand a page's gist to the model. Pure.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** A single fetched source's context, ready to fold into the prompt. */
export type FetchedContext = { url: string; title?: string; body: string };

/**
 * Format fetched contexts into a markdown block to append to the execution
 * prompt, capped to `maxChars` overall. Returns '' for an empty list. Pure.
 */
export function buildContextBlock(
  contexts: FetchedContext[],
  maxChars = MAX_CONTEXT_BLOCK_CHARS,
): string {
  if (contexts.length === 0) return '';
  const sections = contexts.map((c) => {
    const heading = c.title?.trim() ? `### ${c.title.trim()}\n${c.url}` : `### ${c.url}`;
    return `${heading}\n\n${c.body.trim()}`;
  });
  const block = `\n\n---\n\n## Linked context\n\nFetched from links in this task — use as background, verify before relying on it.\n\n${sections.join(
    '\n\n',
  )}\n`;
  return block.length > maxChars ? `${block.slice(0, maxChars)}\n…(context truncated)\n` : block;
}
