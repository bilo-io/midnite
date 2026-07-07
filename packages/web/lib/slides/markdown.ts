// Deterministic Markdown → slide-deck transform (no AI needed) plus a small
// Markdown → HTML renderer used for the live "pretty print" preview. Both share
// one block tokenizer so they agree on structure.
//
// Slide rules:
//   - The first `#` heading becomes the deck title and a centered cover slide.
//   - Every heading of level >= 2 starts a new slide (title = heading text,
//     with any leading "1." / "3.1" section numbering stripped).
//   - List items, paragraphs, fenced code blocks and tables under a heading
//     each become one reveal step.
//   - Blockquote markers are treated as normal text.
//
// Inline rules (shared): `code`, [label](url), **bold**, *italic* / _italic_.
// Plain text is HTML-escaped and link URLs are sanitized.
//
// Ported from the standalone slides demo; kept dependency-free so the presenter
// and export share one source of truth for structure + escaping.

export type Slide = { title: string; steps: string[]; cover?: boolean };
export type ParsedDeck = { title: string; slides: Slide[] };

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'para'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; header: string[]; rows: string[][] };

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u; // absolute web / mail
  if (/^[/#.]/.test(u)) return u; // relative path or anchor
  if (/^[a-z][a-z0-9.+-]*:/i.test(u)) return null; // other scheme (e.g. javascript:) -> reject
  return u; // bare, treat as relative
}

const TOKEN_ORDER: Record<string, number> = { link: 0, code: 1, bold: 2, italic: 3 };

function codeSpan(text: string): string {
  const cls = text.trim().startsWith('/') ? 'cmd' : 'kw';
  return `<code class="${cls}">${escapeHtml(text)}</code>`;
}

function link(label: string, url: string): string {
  const isCodeLabel = /^`[^`]+`$/.test(label.trim());
  const safe = sanitizeUrl(url);
  const inner = isCodeLabel ? escapeHtml(label.trim().replace(/^`|`$/g, '')) : formatInline(label);
  if (!safe) return inner; // unsafe url -> render the label as plain text
  const cls = isCodeLabel ? 'cmd' : 'link';
  return `<a class="${cls}" href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

/** Convert inline Markdown to safe HTML using the deck's chip/link conventions. */
export function formatInline(src: string): string {
  let out = '';
  let rest = src;

  while (rest.length) {
    const found: { idx: number; kind: string; m: RegExpExecArray }[] = [];
    let m: RegExpExecArray | null;

    if ((m = /\[([^\]]*)\]\(([^)]+)\)/.exec(rest))) found.push({ idx: m.index, kind: 'link', m });
    if ((m = /`([^`]+)`/.exec(rest))) found.push({ idx: m.index, kind: 'code', m });
    if ((m = /\*\*([^*]+)\*\*/.exec(rest))) found.push({ idx: m.index, kind: 'bold', m });
    if ((m = /(?<!\*)\*([^*]+)\*(?!\*)/.exec(rest))) found.push({ idx: m.index, kind: 'italic', m });
    else if ((m = /_([^_]+)_/.exec(rest))) found.push({ idx: m.index, kind: 'italic', m });

    if (!found.length) {
      out += escapeHtml(rest);
      break;
    }

    found.sort((a, b) => a.idx - b.idx || (TOKEN_ORDER[a.kind] ?? 0) - (TOKEN_ORDER[b.kind] ?? 0));
    const t = found[0]!;
    out += escapeHtml(rest.slice(0, t.idx));

    if (t.kind === 'link') out += link(t.m[1] ?? '', t.m[2] ?? '');
    else if (t.kind === 'code') out += codeSpan(t.m[1] ?? '');
    else if (t.kind === 'bold') out += `<strong>${formatInline(t.m[1] ?? '')}</strong>`;
    else out += `<em>${formatInline(t.m[1] ?? '')}</em>`;

    rest = rest.slice(t.idx + t.m[0].length);
  }
  return out;
}

/** Strip inline Markdown down to plain text (used for slide titles). */
function stripInline(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

/** Drop leading section numbering like "1. ", "3.1 ", "2) " from a heading. */
function cleanHeading(text: string): string {
  return text.replace(/^\d+(\.\d+)*[.)]?\s+/, '').trim();
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'deck'
  );
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^([-*+]|\d+\.)\s+(.*)$/;

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  return /\|/.test(t) && /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?$/.test(t);
}

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

// ---- Lightweight, dependency-free syntax highlighting ----
// A single generic tokenizer (comments / strings / numbers / keywords) rather
// than a per-language grammar or a highlighting library — enough to make the
// decks' code fences readable while keeping the app's zero-runtime-deps promise.
// It runs on the RAW source and escapes each token itself, so escaping stays
// centralized here (see the security note above).
const HASH_COMMENT_LANGS = new Set([
  'bash', 'sh', 'shell', 'zsh', 'console', 'py', 'python', 'rb', 'ruby', 'yaml', 'yml', 'toml',
  'ini', 'r', 'perl', 'pl', 'makefile', 'dockerfile',
]);
const SLASH_COMMENT_LANGS = new Set([
  'js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx', 'java', 'c', 'cpp', 'c++', 'cs', 'csharp',
  'go', 'golang', 'rust', 'rs', 'swift', 'kotlin', 'kt', 'php', 'scss', 'less', 'dart',
]);
const KEYWORDS = new Set([
  // JS / TS
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'import', 'export', 'from',
  'default', 'async', 'await', 'yield', 'try', 'catch', 'finally', 'throw', 'typeof',
  'instanceof', 'in', 'of', 'this', 'void', 'delete', 'null', 'undefined', 'true', 'false',
  // Python
  'def', 'elif', 'lambda', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'with', 'as',
  'global', 'nonlocal', 'raise', 'except', 'self', 'del', 'assert',
  // Cross-language
  'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'enum', 'struct',
  'fn', 'func', 'package', 'type', 'impl', 'trait', 'mut', 'use', 'module', 'then', 'echo',
  'exit', 'local', 'require', 'include',
]);

const isWordChar = (c: string) => /[A-Za-z0-9_$]/.test(c);

export function highlightCode(raw: string, lang: string): string {
  const l = (lang || '').toLowerCase();
  const hash = HASH_COMMENT_LANGS.has(l);
  const slash = SLASH_COMMENT_LANGS.has(l);
  const n = raw.length;
  let out = '';
  let i = 0;
  const tok = (cls: string, text: string) => `<span class="tok-${cls}">${escapeHtml(text)}</span>`;

  while (i < n) {
    const ch = raw[i]!;

    // Comments (only for languages we recognize, to avoid false positives).
    if (slash && ch === '/' && raw[i + 1] === '/') {
      let j = i;
      while (j < n && raw[j] !== '\n') j++;
      out += tok('com', raw.slice(i, j));
      i = j;
      continue;
    }
    if (slash && ch === '/' && raw[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(raw[j] === '*' && raw[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      out += tok('com', raw.slice(i, j));
      i = j;
      continue;
    }
    if (hash && ch === '#') {
      let j = i;
      while (j < n && raw[j] !== '\n') j++;
      out += tok('com', raw.slice(i, j));
      i = j;
      continue;
    }

    // Strings (single / double / backtick), honoring backslash escapes.
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (raw[j] === '\\') {
          j += 2;
          continue;
        }
        if (raw[j] === ch) {
          j++;
          break;
        }
        j++;
      }
      out += tok('str', raw.slice(i, j));
      i = j;
      continue;
    }

    // Numbers (int, float, hex) — not when glued to the end of an identifier.
    if (/[0-9]/.test(ch) && !(i > 0 && isWordChar(raw[i - 1]!))) {
      let j;
      if (ch === '0' && (raw[i + 1] === 'x' || raw[i + 1] === 'X')) {
        j = i + 2;
        while (j < n && /[0-9a-fA-F]/.test(raw[j]!)) j++;
      } else {
        j = i + 1;
        while (j < n && /[0-9._]/.test(raw[j]!)) j++;
      }
      out += tok('num', raw.slice(i, j));
      i = j;
      continue;
    }

    // Identifiers -> keyword or plain text.
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && isWordChar(raw[j]!)) j++;
      const word = raw.slice(i, j);
      out += KEYWORDS.has(word) ? tok('kw', word) : escapeHtml(word);
      i = j;
      continue;
    }

    out += escapeHtml(ch);
    i++;
  }
  return out;
}

/** A fenced code block with a language label + copy button. The body is
 *  syntax-highlighted when the language is known, otherwise just escaped. */
function renderCode(code: string, lang = ''): string {
  const body = lang ? highlightCode(code, lang) : escapeHtml(code);
  const label = lang ? `<span class="md-code-lang">${escapeHtml(lang)}</span>` : '';
  return (
    `<div class="md-code-wrap">` +
    `<div class="md-code-head">${label}<button type="button" class="md-copy" aria-label="Copy code to clipboard">Copy</button></div>` +
    `<pre class="md-code"><code>${body}</code></pre>` +
    `</div>`
  );
}

function renderTable(header: string[], rows: string[][]): string {
  const th = header.map((c) => `<th>${formatInline(c)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${header.map((_, i) => `<td>${formatInline(r[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Split Markdown into block-level tokens. */
function tokenizeBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    const t = para.join(' ').trim();
    para = [];
    if (t) blocks.push({ type: 'para', text: t });
  };
  const flushList = () => {
    if (list && list.length) blocks.push({ type: 'list', items: list });
    list = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i]!;

    // Fenced code block — consumed verbatim (not parsed as Markdown).
    const fence = rawLine.match(/^\s*(```+|~~~+)(.*)$/);
    if (fence) {
      flushAll();
      const marker = fence[1]![0];
      const lang = fence[2]!.trim();
      const code: string[] = [];
      i += 1;
      const closeRe = new RegExp('^\\s*' + marker + '{3,}\\s*$');
      while (i < lines.length && !closeRe.test(lines[i]!)) {
        code.push(lines[i]!);
        i += 1;
      }
      i += 1; // consume closing fence (if present)
      blocks.push({ type: 'code', lang, code: code.join('\n') });
      continue;
    }

    const line = rawLine.replace(/^\s*>\s?/, ''); // treat blockquotes as plain content
    const trimmed = line.trim();

    // GFM table: a row followed by a |---|---| separator.
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1]!.replace(/^\s*>\s?/, ''))
    ) {
      flushAll();
      const header = splitRow(trimmed);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length) {
        const r = lines[i]!.replace(/^\s*>\s?/, '').trim();
        if (!r || !r.includes('|')) break;
        rows.push(splitRow(r));
        i += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const h = trimmed.match(HEADING);
    if (h) {
      flushAll();
      blocks.push({ type: 'heading', level: h[1]!.length, text: h[2] ?? '' });
      i += 1;
      continue;
    }

    const li = trimmed.match(LIST_ITEM);
    if (li) {
      flushPara();
      if (!list) list = [];
      list.push(li[2]!.trim());
      i += 1;
      continue;
    }

    if (trimmed === '') {
      flushAll();
      i += 1;
      continue;
    }

    flushList();
    para.push(trimmed);
    i += 1;
  }
  flushAll();
  return blocks;
}

export function markdownToDeck(md: string): ParsedDeck {
  const blocks = tokenizeBlocks(md);
  const slides: Slide[] = [];
  let deckTitle: string | null = null;
  let cur: Slide | null = null;

  const addStep = (html: string) => {
    if (cur) cur.steps.push(html);
  };

  for (const b of blocks) {
    switch (b.type) {
      case 'heading': {
        const text = stripInline(b.text);
        if (b.level === 1 && deckTitle === null) {
          deckTitle = text;
          cur = { title: text, steps: [], cover: true };
        } else {
          cur = { title: cleanHeading(text), steps: [] };
        }
        slides.push(cur);
        break;
      }
      case 'list':
        b.items.forEach((it) => addStep(formatInline(it)));
        break;
      case 'para':
        addStep(cur?.cover ? `<span class="lede">${formatInline(b.text)}</span>` : formatInline(b.text));
        break;
      case 'code':
        addStep(renderCode(b.code, b.lang));
        break;
      case 'table':
        addStep(renderTable(b.header, b.rows));
        break;
    }
  }

  // Fallback: no headings at all -> one slide from the first block + the rest.
  if (slides.length === 0) {
    let title = 'Untitled';
    const steps: string[] = [];
    for (const b of blocks) {
      if (b.type === 'para' && title === 'Untitled') title = stripInline(b.text);
      else if (b.type === 'para') steps.push(formatInline(b.text));
      else if (b.type === 'list') b.items.forEach((it) => steps.push(formatInline(it)));
      else if (b.type === 'code') steps.push(renderCode(b.code, b.lang));
      else if (b.type === 'table') steps.push(renderTable(b.header, b.rows));
    }
    return { title, slides: [{ title, steps }] };
  }

  if (deckTitle === null) deckTitle = slides[0]!.title;
  return { title: deckTitle, slides };
}

/** Standard-ish Markdown -> HTML for the create-form preview. */
export function markdownToHtml(md: string): string {
  const blocks = tokenizeBlocks(md);
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        out.push(`<h${b.level}>${formatInline(b.text)}</h${b.level}>`);
        break;
      case 'list':
        out.push(`<ul>${b.items.map((it) => `<li>${formatInline(it)}</li>`).join('')}</ul>`);
        break;
      case 'para':
        out.push(`<p>${formatInline(b.text)}</p>`);
        break;
      case 'code':
        out.push(renderCode(b.code, b.lang));
        break;
      case 'table':
        out.push(renderTable(b.header, b.rows));
        break;
    }
  }
  return out.join('\n');
}
