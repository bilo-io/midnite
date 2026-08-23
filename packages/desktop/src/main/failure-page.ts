/**
 * The page shown when the embedded gateway never becomes healthy.
 *
 * This is the worst screen a first-run user can hit, and it's a plausible one —
 * a port conflict, a Dock launch inheriting launchd's bare PATH, or a native
 * module that failed to load all land here. It used to be a bare, unstyled
 * `data:` URL reading *"Midnite failed to start. The local gateway did not
 * become healthy. Check the logs."* — with no log path, no retry, and no way to
 * report it. "Check the logs" is not actionable when nothing says where they are.
 *
 * Kept as a pure string builder (no Electron imports) so it can be unit-tested;
 * the wiring lives in `index.ts` and the actions in `recovery.ts`.
 */

export type FailurePageOptions = {
  /** Absolute path to the app's log directory — shown and openable. */
  logsDir: string;
  /** The port the gateway was expected on, the most common cause when taken. */
  port: number;
  /** Whether the window is frameless (needs its own drag strip). */
  frameless: boolean;
  /** How long we waited, so the copy doesn't imply an instant failure. */
  timeoutMs?: number;
};

/** Escape text destined for HTML text nodes / attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFailurePage(opts: FailurePageOptions): string {
  const { logsDir, port, frameless, timeoutMs = 20000 } = opts;
  const seconds = Math.round(timeoutMs / 1000);

  // With the native title bar hidden the window is only draggable through an
  // app-drawn region, so the failure page carries its own strip.
  const dragStrip = frameless
    ? '<div style="position:fixed;top:0;left:0;right:0;height:48px;-webkit-app-region:drag"></div>'
    : '';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Midnite failed to start</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #09090b; color: #e5e5ea; padding: 3rem 2rem;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card { max-width: 34rem; width: 100%; }
  h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 .5rem; }
  p { font-size: .875rem; line-height: 1.6; color: #a1a1aa; margin: 0 0 1rem; }
  ul { font-size: .875rem; line-height: 1.7; color: #a1a1aa; margin: 0 0 1.25rem; padding-left: 1.1rem; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8125rem;
    background: #18181b; border: 1px solid #27272a; border-radius: .25rem; padding: .1rem .35rem;
    color: #e5e5ea; user-select: all; word-break: break-all;
  }
  .row { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.5rem; }
  button, a.btn {
    font: inherit; font-size: .875rem; padding: .5rem 1rem; border-radius: .375rem;
    cursor: pointer; text-decoration: none; display: inline-flex; align-items: center;
  }
  .primary { background: #e5e5ea; color: #09090b; border: none; }
  .ghost { background: transparent; color: #e5e5ea; border: 1px solid #3f3f46; }
  .hint { font-size: .75rem; color: #71717a; margin-top: 1.25rem; }
</style>
</head>
<body>${dragStrip}
  <div class="card">
    <h1>Midnite couldn't start its local service</h1>
    <p>
      The app runs a small gateway on your machine, and it didn't come up within
      ${seconds} seconds. Your data is safe — this stops the app from opening, it
      doesn't affect anything you've saved.
    </p>
    <p>The usual causes, most likely first:</p>
    <ul>
      <li>Another copy of Midnite is already running — quit it and try again.</li>
      <li>Port <code>${port}</code> is in use by something else on your machine.</li>
      <li>A previous update left a partly-installed file behind — reinstalling fixes it.</li>
    </ul>
    <p>Logs are here:<br><code>${escapeHtml(logsDir)}</code></p>
    <div class="row">
      <button class="primary" id="retry" type="button">Restart Midnite</button>
      <button class="ghost" id="logs" type="button">Open logs folder</button>
      <a class="btn ghost" href="https://github.com/bilo-io/midnite-app/issues/new" target="_blank" rel="noreferrer">Report this</a>
    </div>
    <p class="hint">If it keeps happening, attach the newest file from the logs folder to your report — it names the actual failure.</p>
  </div>
  <script>
    // Exposed by the preload (contextBridge). Guarded so a preload that failed
    // to load leaves a readable page rather than a console error.
    var api = window.midniteRecovery;
    document.getElementById('retry').addEventListener('click', function () { api && api.retry(); });
    document.getElementById('logs').addEventListener('click', function () { api && api.openLogs(); });
    if (!api) {
      document.getElementById('retry').disabled = true;
      document.getElementById('logs').disabled = true;
    }
  </script>
</body>
</html>`;
}
