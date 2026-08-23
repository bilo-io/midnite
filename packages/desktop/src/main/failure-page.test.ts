import { describe, expect, it } from 'vitest';
import { renderFailurePage } from './failure-page';

const base = { logsDir: '/Users/me/Library/Logs/Midnite', port: 7777, frameless: false };

describe('renderFailurePage', () => {
  it('names the log directory — "check the logs" is useless without a path', () => {
    expect(renderFailurePage(base)).toContain('/Users/me/Library/Logs/Midnite');
  });

  it('names the port, the most common cause when it is taken', () => {
    expect(renderFailurePage({ ...base, port: 7890 })).toContain('7890');
  });

  it('offers restart, logs and report actions', () => {
    const html = renderFailurePage(base);
    expect(html).toContain('id="retry"');
    expect(html).toContain('id="logs"');
    expect(html).toContain('issues/new');
  });

  it('reassures that data is safe — this blocks startup, not their work', () => {
    expect(renderFailurePage(base)).toMatch(/data is safe/i);
  });

  it('adds a drag strip only when the window is frameless', () => {
    // A frameless window has no native title bar, so without an app-drawn drag
    // region the failure page cannot be moved at all.
    expect(renderFailurePage({ ...base, frameless: true })).toContain('-webkit-app-region:drag');
    expect(renderFailurePage({ ...base, frameless: false })).not.toContain('-webkit-app-region:drag');
  });

  it('escapes the log path rather than injecting it raw', () => {
    // The path comes from Electron, but it is still interpolated into HTML —
    // a quote or angle bracket in a user's home directory must not break out.
    const html = renderFailurePage({ ...base, logsDir: '/tmp/<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('reports the wait in seconds, matching the health-wait timeout', () => {
    expect(renderFailurePage({ ...base, timeoutMs: 30000 })).toContain('30 seconds');
  });

  it('survives URI encoding — it is loaded as a data: URL', () => {
    const html = renderFailurePage(base);
    expect(() => encodeURIComponent(html)).not.toThrow();
    expect(decodeURIComponent(encodeURIComponent(html))).toBe(html);
  });
});
