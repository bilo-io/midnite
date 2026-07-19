/**
 * A tiny, dependency-free Markdown parser (Phase 73 Theme F) — just enough to
 * render the bundled `CHANGELOG.md` as readable structure: headings, paragraphs,
 * and bullet lists, with inline **bold**, `code`, and [links](url). Pure +
 * unit-tested (`markdown.test.ts`); the renderer maps the tokens → JSX. NOT a
 * general-purpose Markdown engine — nested lists, tables, and images are out of
 * scope (the changelog uses none).
 */

/** An inline span within a block. */
export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; text: string; href: string };

/** A top-level block of a document. */
export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'list'; items: InlineToken[][] };

// Matches, in priority order: a [text](href) link, **bold**, or `code`.
const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

/** Split a run of inline Markdown into tokens (bold / code / link / plain text). */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (let m = INLINE_RE.exec(text); m !== null; m = INLINE_RE.exec(text)) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined && m[2] !== undefined) {
      tokens.push({ type: 'link', text: m[1], href: m[2] });
    } else if (m[3] !== undefined) {
      tokens.push({ type: 'bold', value: m[3] });
    } else if (m[4] !== undefined) {
      tokens.push({ type: 'code', value: m[4] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
}

/** The heading level for a `#`-prefixed line, capped at 3; 0 if it isn't a heading. */
function headingLevel(line: string): 0 | 1 | 2 | 3 {
  const m = /^(#{1,6})\s+/.exec(line);
  if (!m?.[1]) return 0;
  return Math.min(3, m[1].length) as 1 | 2 | 3;
}

/** Parse a Markdown document into a flat list of blocks. */
export function parseMarkdown(md: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');

  let paragraph: string[] = [];
  // Raw (still-unparsed) text per list item, so wrapped continuation lines can be
  // appended before a single `parseInline` pass keeps bold/code/link spans intact.
  let listItemsRaw: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', tokens: parseInline(paragraph.join(' ').trim()) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItemsRaw.length > 0) {
      blocks.push({ type: 'list', items: listItemsRaw.map(parseInline) });
      listItemsRaw = [];
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (trimmed === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const level = headingLevel(trimmed);
    if (level > 0) {
      flushParagraph();
      flushList();
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      blocks.push({ type: 'heading', level: level as 1 | 2 | 3, tokens: parseInline(text) });
      continue;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (listMatch) {
      flushParagraph();
      listItemsRaw.push(listMatch[1] ?? '');
      continue;
    }

    // A continuation line of the current list item (an indented wrap) — append it.
    if (listItemsRaw.length > 0 && /^\s+/.test(raw)) {
      const idx = listItemsRaw.length - 1;
      listItemsRaw[idx] = `${listItemsRaw[idx] ?? ''} ${trimmed}`;
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}
