import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { app, BrowserWindow, shell } from 'electron';
import {
  clearGatewayEndpoint,
  findFreePort,
  startGatewayProcess,
  stopGatewayProcess,
  writeGatewayEndpoint,
} from './gateway-process';
import { waitForHealth } from './health-wait';
import { registerNotificationBridge } from './notifications';
import { resolvePaths } from './paths';
import { serveStatic } from './static-server';
import { registerUpdater, startUpdateCheck } from './updater';

let gateway: ChildProcess | null = null;
let win: BrowserWindow | null = null;
/** The shared home dir (`~/.midnite`) — kept so shutdown can clear the endpoint file. */
let midniteHome: string | null = null;

// One instance only — two launches would fight over the SQLite DB and ports.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// Renderer notifications → native OS notifications (reads `win` lazily, per click).
registerNotificationBridge(() => win);

// electron-updater bridge: the web UpdateBanner drives check → download → restart
// over IPC (user-timed; never auto). No-op when unpackaged. Reads `win` lazily.
registerUpdater(() => win);

/** Locate the web static export: packaged extraResources first, else the dev build. */
function webRoot(): string | null {
  const packaged = join(process.resourcesPath, 'web');
  if (existsSync(packaged)) return packaged;
  // dist/main → packages/desktop → packages/web/out
  const local = join(__dirname, '../../../web/out');
  return existsSync(local) ? local : null;
}

async function boot(): Promise<void> {
  const paths = resolvePaths();
  midniteHome = paths.home;
  const gatewayPort = await findFreePort();
  gateway = startGatewayProcess(paths, gatewayPort);
  gateway.stdout?.on('data', (d: Buffer) => process.stdout.write(`[gateway] ${d}`));
  gateway.stderr?.on('data', (d: Buffer) => process.stderr.write(`[gateway] ${d}`));

  const healthy = await waitForHealth(gatewayPort);
  const gatewayUrl = `http://127.0.0.1:${gatewayPort}`;
  // Advertise the endpoint so the bundled CLI finds this gateway on its dynamic port.
  writeGatewayEndpoint(paths.home, gatewayUrl);

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      // Read by the preload, which exposes it as window.__NEXT_PUBLIC_GATEWAY_URL.
      additionalArguments: [`--gateway-url=${gatewayUrl}`],
    },
  });
  win.once('ready-to-show', () => win?.show());

  // Phase 74 Theme D — external links open in the system browser, not a bare
  // in-app window. The web app only uses `window.open(_blank)` for external
  // hand-offs (assistant Docs + the new Report-issue link); in-app navigation
  // goes through the router (a top-frame load, not window.open), so it never
  // reaches this handler. Guardrail: only http(s) origins are handed to the OS —
  // a malformed URL or a non-web scheme (file:, custom) is denied and dropped.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') {
        void shell.openExternal(url);
      }
    } catch {
      // Unparseable URL — never hand it to the OS.
    }
    return { action: 'deny' };
  });

  if (!healthy) {
    const html = '<h1>midnite failed to start</h1><p>The local gateway did not become healthy. Check the logs.</p>';
    await win.loadURL(`data:text/html,${encodeURIComponent(html)}`);
    return;
  }

  // Renderer: dev → the Next dev server; prod → the static export over loopback http.
  const root = webRoot();
  if (!app.isPackaged || !root) {
    await win.loadURL(process.env['MIDNITE_WEB_URL'] ?? 'http://localhost:3000');
  } else {
    const webPort = await findFreePort();
    await serveStatic(root, webPort);
    await win.loadURL(`http://127.0.0.1:${webPort}/`);
  }

  // First update check once the window is up (no auto-download; user-timed).
  // No-op in dev/unpackaged. The renderer re-checks on focus/navigation.
  startUpdateCheck();
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(boot).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[midnite desktop] boot failed', err);
});

app.on('window-all-closed', () => app.quit());

function shutdown(): void {
  stopGatewayProcess(gateway);
  gateway = null;
  if (midniteHome) clearGatewayEndpoint(midniteHome);
}
app.on('before-quit', shutdown);
process.on('exit', shutdown);
