import { describe, expect, it } from 'vitest';

import {
  ENVIRONMENT_HEADING,
  buildReportContext,
  parseUserAgent,
  stripEnvironment,
  type ReportContextInput,
} from './report-context';

const UA_CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_FIREFOX_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
const UA_SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

describe('parseUserAgent', () => {
  it('extracts Chrome on macOS', () => {
    expect(parseUserAgent(UA_CHROME_MAC)).toBe('Chrome 120 on macOS');
  });

  it('extracts Firefox on Windows', () => {
    expect(parseUserAgent(UA_FIREFOX_WIN)).toBe('Firefox 121 on Windows 10/11');
  });

  it('extracts Safari on iOS (not misread as Chrome)', () => {
    expect(parseUserAgent(UA_SAFARI_IOS)).toBe('Safari 17 on iOS');
  });

  it('extracts Edge before Chrome (Edge UA also contains Chrome)', () => {
    expect(parseUserAgent(UA_EDGE)).toBe('Edge 120 on Windows 10/11');
  });

  it('falls back to a trimmed raw string when nothing matches', () => {
    expect(parseUserAgent('SomeWeirdBot/9')).toBe('SomeWeirdBot/9');
    expect(parseUserAgent('')).toBe('unknown');
  });
});

const baseInput: ReportContextInput = {
  pathname: '/board',
  version: '1.4.2',
  isDesktop: false,
  userAgent: UA_CHROME_MAC,
  viewport: { width: 1440, height: 900 },
  theme: { preference: 'dark', resolved: 'dark' },
  connection: 'live',
};

describe('buildReportContext', () => {
  it('seeds a title with the page and a trailing prompt cursor', () => {
    expect(buildReportContext(baseInput).title).toBe('[bug] /board — ');
  });

  it('includes route, version, environment, browser/OS, theme, and connection', () => {
    const { body } = buildReportContext(baseInput);
    expect(body).toContain('| Page | `/board` |');
    expect(body).toContain('| Version | 1.4.2 |');
    expect(body).toContain('| Environment | Web browser |');
    expect(body).toContain('| Browser / OS | Chrome 120 on macOS |');
    expect(body).toContain('| Viewport | 1440×900 |');
    expect(body).toContain('| Theme | dark |');
    expect(body).toContain('| Connection | live |');
    expect(body).toContain(ENVIRONMENT_HEADING);
    expect(body).toContain('### What happened?');
  });

  it('differs between desktop and web', () => {
    const web = buildReportContext(baseInput).body;
    const desktop = buildReportContext({ ...baseInput, isDesktop: true }).body;
    expect(web).toContain('| Environment | Web browser |');
    expect(desktop).toContain('| Environment | Desktop app |');
  });

  it('shows preference and resolved when they differ', () => {
    const { body } = buildReportContext({
      ...baseInput,
      theme: { preference: 'system', resolved: 'light' },
    });
    expect(body).toContain('| Theme | system (light) |');
  });

  it('is deterministic for fixed inputs', () => {
    expect(buildReportContext(baseInput)).toEqual(buildReportContext(baseInput));
  });

  it('defaults a null/empty pathname to /', () => {
    expect(buildReportContext({ ...baseInput, pathname: null }).title).toBe('[bug] / — ');
  });

  it('stays a reasonable size for a typical page', () => {
    // Well under the URL budget so the freeform text has room.
    expect(buildReportContext(baseInput).body.length).toBeLessThan(1000);
  });
});

describe('stripEnvironment', () => {
  it('removes the environment block but keeps the freeform prompt', () => {
    const { body } = buildReportContext(baseInput);
    const trimmed = stripEnvironment(body);
    expect(trimmed).toContain('### What happened?');
    expect(trimmed).not.toContain(ENVIRONMENT_HEADING);
    expect(trimmed).toContain('trimmed to fit');
  });

  it('is a no-op when there is no environment block', () => {
    expect(stripEnvironment('just text')).toBe('just text');
  });
});
