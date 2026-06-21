import type { CouncilFormat, CouncilRunMember } from '@midnite/shared';
import { REPORT_PROSE_CSS, escapeHtml } from '@/lib/report-html-export';

/**
 * Client-side analogue of the gateway's `buildCouncilRunReport`
 * (packages/gateway/src/councils/lib/council-report.ts) — but instead of a flat
 * markdown document it builds a self-contained, interactive HTML page that
 * mirrors the in-app council run tabs (one tab per member + a Synthesis tab).
 *
 * It is a pure string builder with no React dependency: synthesis markdown is
 * converted to HTML by the caller (rendered into a detached node and captured)
 * and handed in as `bodyHtml`, so this module stays trivially unit-testable.
 * `escapeHtml` and the markdown prose CSS are shared with the generic report
 * renderer (`report-html-export.ts`).
 *
 * The output is fully offline: all CSS and the tab-switching JS are inlined, no
 * external assets are referenced, and every interpolated value except the
 * pre-sanitized synthesis `bodyHtml` is HTML-escaped — so a literal `</pre>` or
 * `<script>` in a member's terminal output can never break or inject markup.
 */

/** A single member's contribution as shown in its tab. */
export type MemberView = {
  name: string;
  role: string;
  providerLabel: string;
  statusLabel: string;
  statusKey: CouncilRunMember['status'];
  output: string | null;
  error: string | null;
};

/** A de-anonymization legend row: blind label (A/B/C) → the member it maps to. */
export type LegendEntry = { label: string; name: string; providerLabel: string };

/** One synthesis (per format) with its markdown already converted to safe HTML. */
export type SynthesisHtmlEntry = {
  format: CouncilFormat;
  label: string;
  /** Pre-sanitized HTML (react-markdown output) — intentionally NOT escaped. */
  bodyHtml: string;
  isActive: boolean;
  legend: LegendEntry[];
};

export type CouncilHtmlExportInput = {
  councilName: string;
  prompt: string;
  exportedAt: Date;
  formatLabel: string;
  synthProviderLabel: string | null;
  members: MemberView[];
  syntheses: SynthesisHtmlEntry[];
};

/** Status-dot colors, keyed off `data-status` in the embedded CSS. */
const STATUS_COLOR: Record<CouncilRunMember['status'], string> = {
  running: '#3b82f6',
  succeeded: '#10b981',
  failed: '#ef4444',
  timeout: '#f59e0b',
  skipped: '#9ca3af',
};

const STYLE = `
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
  .prompt { margin: 0 0 12px; color: #334155; white-space: pre-wrap; word-break: break-word; }
  .prompt .lbl { color: #64748b; font-weight: 600; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: #64748b; }
  .meta b { color: #475569; font-weight: 600; }
  .tablist { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .tab {
    display: inline-flex; align-items: center; gap: 7px;
    border: 1px solid #cbd5e1; background: #fff; color: #475569;
    border-radius: 999px; padding: 5px 13px; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: inherit;
  }
  .tab:hover { background: #f1f5f9; color: #0f172a; }
  .tab.is-active { border-color: #0f172a; background: #0f172a; color: #fff; }
  .dot { width: 8px; height: 8px; border-radius: 999px; flex: none; }
  .panel[hidden] { display: none; }
  .card { border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 18px; }
  .member-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 12px; }
  .member-head .role { color: #0f172a; font-weight: 600; }
  .err { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; white-space: pre-wrap; word-break: break-word; }
  pre.output {
    margin: 0; background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 14px;
    font: 12.5px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre-wrap; word-break: break-word; overflow: auto; max-height: 560px;
  }
  .muted { color: #94a3b8; font-style: italic; margin: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .chip {
    border: 1px solid #cbd5e1; background: #fff; color: #475569;
    border-radius: 999px; padding: 3px 11px; font-size: 12.5px; font-weight: 500;
    cursor: pointer; font-family: inherit;
  }
  .chip:hover { background: #f1f5f9; color: #0f172a; }
  .chip.is-active { border-color: #0f172a; background: #0f172a; color: #fff; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .legend span {
    display: inline-flex; gap: 6px; border: 1px solid #e2e8f0; background: #f8fafc;
    border-radius: 999px; padding: 3px 10px; font-size: 12.5px; color: #64748b;
  }
  .legend b { color: #0f172a; font-weight: 600; }
  .synth-body[hidden] { display: none; }${REPORT_PROSE_CSS}
`;

const SCRIPT = `
  (function () {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tablist .tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
    function show(id) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === id;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (p) { p.hidden = p.id !== id; });
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(t.getAttribute('data-tab')); });
    });

    // Synthesis sub-tabs (per-format chips), scoped to the synthesis panel.
    var chips = Array.prototype.slice.call(document.querySelectorAll('#synthesis .chip'));
    var bodies = Array.prototype.slice.call(document.querySelectorAll('#synthesis .synth-body'));
    function showSynth(fmt) {
      chips.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-synth') === fmt); });
      bodies.forEach(function (b) { b.hidden = b.getAttribute('data-synth') !== fmt; });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () { showSynth(c.getAttribute('data-synth')); });
    });
  })();
`;

function statusDot(status: CouncilRunMember['status']): string {
  return `<span class="dot" style="background:${STATUS_COLOR[status]}"></span>`;
}

function memberPanel(member: MemberView, index: number): string {
  const head = [
    statusDot(member.statusKey),
    member.role.trim() ? `<span class="role">${escapeHtml(member.role.trim())}</span>` : '',
    `<span>${escapeHtml(member.providerLabel)}</span>`,
    `<span>· ${escapeHtml(member.statusLabel)}</span>`,
  ]
    .filter(Boolean)
    .join(' ');

  const errorBlock =
    member.error && member.statusKey !== 'succeeded'
      ? `<p class="err">${escapeHtml(member.error)}</p>`
      : '';
  const body = member.output?.trim()
    ? `<pre class="output">${escapeHtml(member.output)}</pre>`
    : '<p class="muted">No output captured.</p>';

  return `
    <section class="panel" id="member-${index}" hidden>
      <div class="card">
        <div class="member-head">${head}</div>
        ${errorBlock}
        ${body}
      </div>
    </section>`;
}

function memberTab(member: MemberView, index: number): string {
  return `<button type="button" class="tab" role="tab" data-tab="member-${index}" aria-selected="false">${statusDot(
    member.statusKey,
  )}<span>${escapeHtml(member.name)}</span></button>`;
}

function legendBlock(legend: LegendEntry[]): string {
  if (legend.length === 0) return '';
  const rows = legend
    .map(
      (l) =>
        `<span><b>Member ${escapeHtml(l.label)}</b> = ${escapeHtml(l.providerLabel)} ${escapeHtml(
          l.name,
        )}</span>`,
    )
    .join('');
  return `<div class="legend">${rows}</div>`;
}

function synthesisPanel(syntheses: SynthesisHtmlEntry[]): string {
  if (syntheses.length === 0) {
    return `
    <section class="panel" id="synthesis" hidden>
      <div class="card"><p class="muted">No synthesis recorded.</p></div>
    </section>`;
  }
  const chips =
    syntheses.length > 1
      ? `<div class="chips">${syntheses
          .map(
            (s) =>
              `<button type="button" class="chip${
                s.isActive ? ' is-active' : ''
              }" data-synth="${escapeHtml(s.format)}">${escapeHtml(s.label)}</button>`,
          )
          .join('')}</div>`
      : '';
  const bodies = syntheses
    .map(
      (s) =>
        `<div class="synth-body" data-synth="${escapeHtml(s.format)}"${s.isActive ? '' : ' hidden'}>${legendBlock(
          s.legend,
        )}<div class="prose">${s.bodyHtml}</div></div>`,
    )
    .join('');
  return `
    <section class="panel" id="synthesis" hidden>
      <div class="card">${chips}${bodies}</div>
    </section>`;
}

/** Serialize a council run as a standalone interactive HTML document. */
export function buildCouncilRunHtml(input: CouncilHtmlExportInput): string {
  const title = `${input.councilName.trim() || 'Council'} — ${input.formatLabel}`;
  const meta = [
    `<span><b>Exported</b> ${escapeHtml(input.exportedAt.toISOString().slice(0, 10))}</span>`,
    `<span><b>Format</b> ${escapeHtml(input.formatLabel)}</span>`,
    input.synthProviderLabel
      ? `<span><b>Synthesizer</b> ${escapeHtml(input.synthProviderLabel)}</span>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  // First tab/panel is active; the markup ships everything hidden and the
  // inlined script reveals the first member (or synthesis if there are none).
  const firstTab = input.members.length > 0 ? 'member-0' : 'synthesis';

  const memberTabs = input.members.map((m, i) => memberTab(m, i)).join('');
  const synthTab = `<button type="button" class="tab" role="tab" data-tab="synthesis" aria-selected="false">✦ <span>Synthesis</span></button>`;
  const memberPanels = input.members.map((m, i) => memberPanel(m, i)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>${escapeHtml(input.councilName.trim() || 'Council')}</h1>
    <p class="prompt"><span class="lbl">Prompt:</span> ${escapeHtml(input.prompt.trim() || '(no prompt)')}</p>
    <div class="meta">${meta}</div>
  </header>
  <div class="tablist" role="tablist" aria-label="Council run">${memberTabs}${synthTab}</div>
  ${memberPanels}
  ${synthesisPanel(input.syntheses)}
</div>
<script>
  ${SCRIPT}
  (function () { var f = ${JSON.stringify(
    firstTab,
  )}; var b = document.querySelector('.tablist .tab[data-tab="' + f + '"]'); if (b) b.click(); })();
</script>
</body>
</html>
`;
}

/** A safe, descriptive download filename for a council run HTML export. */
export function councilHtmlExportFilename(
  councilName: string,
  format: string,
  dateIso: string,
): string {
  const slug =
    (councilName.trim() || 'council')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'council';
  return `${slug}-${format}-${dateIso.slice(0, 10)}.html`;
}
