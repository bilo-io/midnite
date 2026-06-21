import { describe, expect, it } from 'vitest';
import {
  REPORT_PROSE_CSS,
  buildReportHtml,
  escapeHtml,
  reportHtmlFilename,
} from './report-html-export';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('buildReportHtml', () => {
  it('produces a self-contained document with an escaped title and inlined CSS', () => {
    const html = buildReportHtml({ title: 'My <Report>', bodyHtml: '<p>hi</p>' });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    // Title is escaped in both <title> and <h1>; raw markup never leaks.
    expect(html).toContain('<title>My &lt;Report&gt;</title>');
    expect(html).toContain('<h1>My &lt;Report&gt;</h1>');
    expect(html).not.toContain('<Report>');
    // Body HTML is trusted (pre-sanitized) and passed through verbatim.
    expect(html).toContain('<div class="prose"><p>hi</p></div>');
    // Fully offline: prose CSS inlined, no external asset references.
    expect(html).toContain(REPORT_PROSE_CSS.trim().split('\n')[0]!.trim());
    expect(html).not.toMatch(/<link|src=|@import/);
  });

  it('renders an optional meta line and omits it when absent', () => {
    expect(buildReportHtml({ title: 'T', bodyHtml: '', metaLine: 'Exported 2026-06-21' })).toContain(
      '<div class="meta"><span>Exported 2026-06-21</span></div>',
    );
    expect(buildReportHtml({ title: 'T', bodyHtml: '' })).not.toContain('class="meta"');
  });

  it('falls back to a default title when blank', () => {
    expect(buildReportHtml({ title: '   ', bodyHtml: '' })).toContain('<title>Report</title>');
  });
});

describe('reportHtmlFilename', () => {
  it('slugifies the name and appends the date with an .html extension', () => {
    expect(reportHtmlFilename('Fix the Login Bug!', '2026-06-21T10:00:00Z')).toBe(
      'fix-the-login-bug-2026-06-21.html',
    );
  });

  it('falls back to "report" when the name slugifies to empty', () => {
    expect(reportHtmlFilename('!!!', '2026-06-21')).toBe('report-2026-06-21.html');
  });
});
