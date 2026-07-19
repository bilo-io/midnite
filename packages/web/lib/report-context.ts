// Phase 74 Theme C — turn "the page they were on" into a compact, editable
// GitHub issue body. Everything here is read from signals already available in
// the running client (route, build version, env, UA, viewport, theme, live WS
// status); nothing is fetched and nothing is sent — the returned body lands in
// the Theme B textarea where the user reviews/edits it before opening GitHub.
// Keeping the builder pure (inputs → `{ title, body }`) makes it unit-testable
// and keeps the "editable = the privacy control" contract honest.

import type { ChannelStatus } from './connection-store';

/** The live signals the dialog samples and hands to {@link buildReportContext}. */
export type ReportContextInput = {
  /** Route the user was on (`usePathname()`); `null` before hydration. */
  pathname: string | null;
  /** This build's version (`getCurrentVersion()`). */
  version: string;
  /** Running inside the Electron shell vs. a plain browser. */
  isDesktop: boolean;
  /** `navigator.userAgent` — parsed to a short form for the body. */
  userAgent: string;
  /** Inner viewport size, if measurable. */
  viewport: { width: number; height: number } | null;
  /** Theme preference + resolved value (`useTheme()`). */
  theme: { preference: string; resolved: string };
  /** Worst-of live WS connection status (`worstStatus()`). */
  connection: ChannelStatus;
};

export type ReportContext = { title: string; body: string };

/** The markdown heading that opens the auto-captured context block. The dialog's
 * auto-trim (Theme B) drops everything from here down when the URL is oversized,
 * so it must stay an exact, stable sentinel. */
export const ENVIRONMENT_HEADING = '### Environment';

/**
 * Reduce a raw `navigator.userAgent` to a short `"<Browser> <major> on <OS>"`
 * label (e.g. `"Chrome 120 on macOS"`). Order matters: Edge/Opera/Brave carry
 * `Chrome` in their UA, so they're matched first. Falls back to the raw string
 * (trimmed) when nothing matches, so triage never loses information.
 */
export function parseUserAgent(ua: string): string {
  if (!ua) return 'unknown';

  const os = (() => {
    if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
    if (/Windows/.test(ua)) return 'Windows';
    // iOS UAs carry "like Mac OS X" — match the device before desktop macOS.
    if (/(iPhone|iPad|iPod)/.test(ua)) return 'iOS';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/CrOS/.test(ua)) return 'ChromeOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Linux/.test(ua)) return 'Linux';
    return null;
  })();

  const browser = (() => {
    let m: RegExpMatchArray | null;
    if ((m = ua.match(/Edg\/(\d+)/))) return `Edge ${m[1]}`;
    if ((m = ua.match(/OPR\/(\d+)/))) return `Opera ${m[1]}`;
    if ((m = ua.match(/Firefox\/(\d+)/))) return `Firefox ${m[1]}`;
    // Chrome must precede Safari (Chrome's UA also contains "Safari").
    if ((m = ua.match(/Chrome\/(\d+)/))) return `Chrome ${m[1]}`;
    if (/Safari\//.test(ua) && (m = ua.match(/Version\/(\d+)/))) return `Safari ${m[1]}`;
    return null;
  })();

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return os;
  return ua.slice(0, 120);
}

/** Human labels for the worst-of connection status. */
const CONNECTION_LABEL: Record<ChannelStatus, string> = {
  live: 'live',
  reconnecting: 'reconnecting',
  stale: 'stale (data may be behind)',
};

/**
 * Compose the default issue `{ title, body }` from the sampled context. The
 * body opens with a freeform **What happened?** prompt (where the user types)
 * followed by a compact `### Environment` markdown table. Deterministic given
 * fixed inputs; terse to respect the URL-length budget (Theme B).
 */
export function buildReportContext(input: ReportContextInput): ReportContext {
  const route = input.pathname && input.pathname.length > 0 ? input.pathname : '/';
  const title = `[bug] ${route} — `;

  const rows: Array<[string, string]> = [
    ['Page', `\`${route}\``],
    ['Version', input.version],
    ['Environment', input.isDesktop ? 'Desktop app' : 'Web browser'],
    ['Browser / OS', parseUserAgent(input.userAgent)],
  ];
  if (input.viewport) {
    rows.push(['Viewport', `${input.viewport.width}×${input.viewport.height}`]);
  }
  rows.push(
    ['Theme', input.theme.preference === input.theme.resolved
      ? input.theme.resolved
      : `${input.theme.preference} (${input.theme.resolved})`],
    ['Connection', CONNECTION_LABEL[input.connection]],
  );

  const table = [
    '| Field | Value |',
    '| --- | --- |',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n');

  const body = [
    '### What happened?',
    '',
    '<!-- Describe the bug: what you did, what you expected, what happened. -->',
    '',
    ENVIRONMENT_HEADING,
    '',
    '<!-- Auto-filled from the page you were on. Edit or delete any line before submitting — nothing is sent until you open the GitHub issue. -->',
    '',
    table,
    '',
  ].join('\n');

  return { title, body };
}

/**
 * Drop the auto-captured `### Environment` block (heading → end) from a body,
 * leaving a short marker. Used by the dialog's URL-length auto-trim: the user's
 * freeform text is never touched, only the machine-generated context.
 */
export function stripEnvironment(body: string): string {
  const idx = body.indexOf(ENVIRONMENT_HEADING);
  if (idx === -1) return body;
  return `${body.slice(0, idx).trimEnd()}\n\n_(environment details trimmed to fit GitHub's URL limit)_\n`;
}
