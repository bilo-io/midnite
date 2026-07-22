import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { app, BrowserWindow, shell } from 'electron';
import {
  clearGatewayEndpoint,
  resolveGatewayPort,
  startGatewayProcess,
  stopGatewayProcess,
  writeGatewayEndpoint,
} from './gateway-process';
import { waitForHealth } from './health-wait';
import { registerNotificationBridge } from './notifications';
import { resolvePaths } from './paths';
import { ensureLoginShellPath } from './shell-path';
import { registerUpdater, startUpdateCheck } from './updater';
import { attachWindowChrome, registerWindowChrome, windowFrameless } from './window-chrome';
import { WINDOW_FRAMELESS_ARG } from '../window-chrome/channels';

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

// Window-chrome bridge (Phase 81): the renderer retints the native window
// backing on theme change so the frameless chrome stays seamless. Reads `win` lazily.
registerWindowChrome(() => win);

/** Locate the web static export: packaged extraResources first, else the dev build. */
function webRoot(): string | null {
  const packaged = join(process.resourcesPath, 'web');
  if (existsSync(packaged)) return packaged;
  // dist/main → packages/desktop → packages/web/out
  const local = join(__dirname, '../../../web/out');
  return existsSync(local) ? local : null;
}

async function boot(): Promise<void> {
  // A Finder/Dock launch inherits launchd's bare PATH (no Homebrew, no
  // ~/.local/bin), so the gateway couldn't spawn `claude`/`tmux` and every
  // agent run crash-looped back to todo. Resolve the login-shell PATH into
  // process.env BEFORE the gateway (which inherits it) is spawned.
  ensureLoginShellPath();
  const paths = resolvePaths();
  midniteHome = paths.home;
  // Prefer the stable port (7777) so the SSO callback URL is constant across launches
  // and an existing OAuth app keeps working; fall back to a free port if it's taken.
  const gatewayPort = await resolveGatewayPort();
  // Use `localhost` (not 127.0.0.1) so it matches the SSO redirectUri OAuth apps
  // register (`http://localhost:7777/...`) and stays one consistent origin.
  const gatewayUrl = `http://localhost:${gatewayPort}`;
  // Packaged: the gateway serves the web export itself (single origin) so the SSO
  // callback lands back in the app. Null in dev → the Next dev server + no web serving.
  const root = webRoot();
  const serveWeb = app.isPackaged && root ? root : undefined;
  gateway = startGatewayProcess(paths, gatewayPort, serveWeb, serveWeb ? gatewayUrl : undefined);
  gateway.stdout?.on('data', (d: Buffer) => process.stdout.write(`[gateway] ${d}`));
  gateway.stderr?.on('data', (d: Buffer) => process.stderr.write(`[gateway] ${d}`));

  const healthy = await waitForHealth(gatewayPort);
  // Advertise the endpoint so the bundled CLI finds this gateway (its port) with no flags.
  writeGatewayEndpoint(paths.home, gatewayUrl);

  // Frameless chrome (Phase 81, macOS-only): drop the native title bar and let
  // the renderer draw its own (`@midnite/shell` <TitleBar>). The traffic lights
  // stay, inset to sit level with the bar's own controls in the 48px bar. The
  // y is tuned against a real window, not the (barH-12)/2 formula — macOS
  // renders the light group ~4px lower than its nominal top (verified via
  // screenshot at 48px/y=18, where the formula sat them visibly low against
  // the history arrows; y=14 puts their observed centre on the bar midline).
  // Non-mac keeps the stock frame.
  const frameless = windowFrameless();
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    // Matches the app's dark `--background` (also the PWA themeColor), so the
    // first paint and resize flashes read as the app, not a white void. The
    // renderer retints it live when the theme changes (registerWindowChrome).
    backgroundColor: '#09090b',
    ...(frameless
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 16, y: 14 } }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      // Read by the preload: the gateway URL is exposed as
      // window.__NEXT_PUBLIC_GATEWAY_URL, the frameless flag feeds the
      // windowChrome bridge (single-sourced from the window options above).
      additionalArguments: [`--gateway-url=${gatewayUrl}`, `${WINDOW_FRAMELESS_ARG}${frameless ? '1' : '0'}`],
    },
  });
  win.once('ready-to-show', () => win?.show());
  attachWindowChrome(win);

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
    // With the native title bar hidden the window is only draggable through an
    // app-drawn drag region, so the failure page carries its own strip.
    const dragStrip = frameless
      ? '<div style="position:fixed;top:0;left:0;right:0;height:48px;-webkit-app-region:drag"></div>'
      : '';
    const html = `${dragStrip}<h1>midnite failed to start</h1><p>The local gateway did not become healthy. Check the logs.</p>`;
    await win.loadURL(`data:text/html,${encodeURIComponent(html)}`);
    return;
  }

  // Renderer: dev → the Next dev server; prod → the gateway itself, which serves the
  // web export at `/` (single origin with the API + the SSO callback page).
  if (!serveWeb) {
    await win.loadURL(process.env['MIDNITE_WEB_URL'] ?? 'http://localhost:3000');
  } else {
    await win.loadURL(`${gatewayUrl}/`);
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
