/**
 * Domain-agnostic report renderer (Phase 18 Theme D). Turns a title + a block of
 * pre-rendered markdown HTML into a self-contained, offline printable HTML
 * document — the shared substrate every export (tasks, projects, workflow runs)
 * reuses, lifted out of the councils-specific `council-html-export.ts`.
 *
 * It's a pure string builder with no React dependency, so it stays trivially
 * unit-testable. The caller renders markdown to safe HTML (see
 * `capture-markdown-html.tsx`) and hands it in as `bodyHtml`; everything else
 * interpolated here is HTML-escaped. The output inlines all CSS and references
 * no external assets, so the file opens identically anywhere.
 */

/** Escape the five HTML-significant characters. Applied to every interpolated value. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown prose styling, shared by the generic report shell and the councils
 * interactive export so rendered markdown looks identical across every export.
 * Kept as a string constant (not a stylesheet) so it inlines into the offline
 * document. Lifted verbatim from `council-html-export.ts` — do not drift it
 * without updating both consumers.
 */
export const REPORT_PROSE_CSS = `
  .prose { font-size: 14.5px; }
  .prose > :first-child { margin-top: 0; }
  .prose h1 { font-size: 19px; margin: 22px 0 10px; }
  .prose h2 { font-size: 17px; margin: 20px 0 10px; }
  .prose h3 { font-size: 14px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .prose h4 { font-size: 14px; margin: 14px 0 6px; }
  .prose p, .prose ul, .prose ol, .prose blockquote, .prose table { margin: 0 0 12px; }
  .prose ul, .prose ol { padding-left: 22px; }
  .prose li { margin: 4px 0; }
  .prose blockquote { border-left: 3px solid #cbd5e1; padding-left: 14px; color: #475569; }
  .prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  .prose code { background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font: 12.5px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .prose pre { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 14px; overflow: auto; }
  .prose pre code { background: none; padding: 0; color: inherit; }
  .prose .hljs { background: transparent; color: inherit; }
  .prose .hljs-comment, .prose .hljs-quote { color: #94a3b8; font-style: italic; }
  .prose .hljs-keyword, .prose .hljs-selector-tag, .prose .hljs-subst, .prose .hljs-doctag { color: hsl(280 60% 72%); }
  .prose .hljs-name, .prose .hljs-selector-id, .prose .hljs-selector-class, .prose .hljs-symbol, .prose .hljs-bullet, .prose .hljs-deletion { color: hsl(350 75% 70%); }
  .prose .hljs-string, .prose .hljs-regexp, .prose .hljs-addition, .prose .hljs-selector-attr, .prose .hljs-selector-pseudo, .prose .hljs-meta .hljs-string { color: hsl(140 50% 62%); }
  .prose .hljs-title, .prose .hljs-title.function_, .prose .hljs-title.class_, .prose .hljs-built_in, .prose .hljs-section { color: hsl(210 80% 70%); }
  .prose .hljs-number, .prose .hljs-literal, .prose .hljs-type { color: hsl(30 85% 66%); }
  .prose .hljs-attr, .prose .hljs-attribute, .prose .hljs-variable, .prose .hljs-template-variable, .prose .hljs-property { color: hsl(190 70% 64%); }
  .prose .hljs-meta, .prose .hljs-operator, .prose .hljs-punctuation { color: #94a3b8; }
  .prose .hljs-emphasis { font-style: italic; }
  .prose .hljs-strong { font-weight: 600; }
  .prose table { border-collapse: collapse; width: 100%; }
  .prose th, .prose td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; }
  .prose th { background: #f8fafc; }
  .prose a { color: #2563eb; }`;

/** The generic document chrome (page frame + header) for a flat report. */
const REPORT_BASE_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f8fafc;
    color: #0f172a;
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 64px; }
  header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
  header h1 { margin: 0 0 8px; font-size: 22px; font-weight: 650; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: #64748b; }
  .meta b { color: #475569; font-weight: 600; }`;

export type ReportHtmlInput = {
  /** Document title (header + <title>); HTML-escaped here. */
  title: string;
  /** Pre-sanitized markdown HTML (e.g. from `captureMarkdownHtml`) — NOT escaped. */
  bodyHtml: string;
  /** Optional one-line meta shown under the title (e.g. "Exported 2026-06-21"); escaped. */
  metaLine?: string;
};

/** Serialize a report as a standalone, offline, printable HTML document. */
export function buildReportHtml(input: ReportHtmlInput): string {
  const safeTitle = escapeHtml(input.title.trim() || 'Report');
  const meta = input.metaLine?.trim()
    ? `\n    <div class="meta"><span>${escapeHtml(input.metaLine.trim())}</span></div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>${REPORT_BASE_CSS}${REPORT_PROSE_CSS}</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${safeTitle}</h1>${meta}
  </header>
  <div class="prose">${input.bodyHtml}</div>
</div>
</body>
</html>
`;
}

/** A safe, descriptive download filename for an HTML report export. */
export function reportHtmlFilename(name: string, dateIso: string): string {
  const slug =
    (name.trim() || 'report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'report';
  return `${slug}-${dateIso.slice(0, 10)}.html`;
}
