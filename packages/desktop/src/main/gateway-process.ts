import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import type { DesktopPaths } from './paths';

/** Grab a free loopback port by binding to :0 and reading the assigned port. */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * The gateway's own default port (mirrors `gateway.port`'s schema default). Preferred
 * for the desktop so the OAuth callback URL is stable across launches (Phase 77): SSO
 * providers require a **fixed, pre-registered** `redirect_uri`, so a random port each
 * launch would break login. Reusing 7777 lets an existing OAuth app (registered against
 * the dev gateway's `localhost:7777/auth/sso/<provider>/callback`) work unchanged.
 */
export const PREFERRED_GATEWAY_PORT = 7777;

/** Whether `port` can be bound on loopback right now (i.e. it's free). */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.unref();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

/**
 * Resolve the gateway's listen port. `$MIDNITE_GATEWAY_PORT` wins (explicit override),
 * else the stable {@link PREFERRED_GATEWAY_PORT} when it's free, else a random free port.
 * The stable port is what keeps SSO working launch-to-launch; the random fallback keeps
 * the app usable (board/local mode) when 7777 is taken — e.g. a dev gateway is running —
 * at the cost of OAuth for that session (the redirect would target 7777, not us).
 */
export async function resolveGatewayPort(): Promise<number> {
  const envPort = process.env['MIDNITE_GATEWAY_PORT'];
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  if (await isPortFree(PREFERRED_GATEWAY_PORT)) return PREFERRED_GATEWAY_PORT;
  return findFreePort();
}

/**
 * Locate the gateway entry, and pick the runtime it must run under.
 *
 * - **Packaged**: entry ships in extraResources; run it under Electron's own
 *   binary (`process.execPath` + ELECTRON_RUN_AS_NODE) — there's no system Node
 *   in a shipped app, and the staged native deps are electron-rebuilt to match
 *   Electron's ABI (130). See scripts/stage-gateway.mjs.
 * - **Dev**: entry resolves from the workspace `@midnite/gateway`, which loads
 *   the *shared hoisted* better-sqlite3. Run it under plain Node so it uses the
 *   Node ABI (127) that copy is built for — the same ABI `gateway:dev` and the
 *   test suite use. Running it under Electron-as-node here would demand ABI 130
 *   and force a toggle of the shared binary that breaks `gateway:dev`.
 */
function gatewayRuntime(): { exec: string; entry: string; electronAsNode: boolean } {
  const packaged = join(process.resourcesPath, 'gateway', 'dist', 'main.js');
  if (existsSync(packaged)) {
    return { exec: process.execPath, entry: packaged, electronAsNode: true };
  }
  // Dev: prefer the Node that launched us (proto/pnpm shim), else PATH `node`.
  const nodeExec = process.env.npm_node_execpath ?? process.env.NODE ?? 'node';

  return { exec: nodeExec, entry: require.resolve('@midnite/gateway'), electronAsNode: false };
}

/**
 * Parse a `.env` file into key→value pairs. Deliberately minimal (no dep): `KEY=VALUE`
 * per line, `#` comments and blanks skipped, surrounding single/double quotes stripped.
 * The desktop gateway needs the same secrets the dev gateway loads via moon's `envFile`
 * (JWT signing secret, SSO client secrets) for auth to resolve as "on".
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Spawn the gateway as a child process. Writable paths + the chosen port are
 * passed via env (honoured by the gateway's config loader). Config/operator paths
 * and the `.env` secrets from the shared `~/.midnite` home are folded in so the
 * embedded gateway runs against the user's real config + SSO wiring, not schema
 * defaults. `detached` puts it in its own process group so we can reap the whole
 * PTY tree on quit.
 *
 * When `webDir` is set (packaged app) the gateway also serves the web export itself
 * (`MIDNITE_WEB_DIR`), so the UI, API, and the SSO callback page share ONE origin —
 * the gateway's. That single origin is what makes the SSO round-trip land back in the
 * app: the callback redirects to `MIDNITE_SSO_WEB_BASE_URL` (the gateway's own origin),
 * served here, rather than the config's `webBaseUrl` (which points at the dev web on
 * :3000). `originUrl` is that origin (e.g. `http://localhost:7777`).
 */
export function startGatewayProcess(
  paths: DesktopPaths,
  port: number,
  webDir?: string,
  originUrl?: string,
): ChildProcess {
  const { exec, entry, electronAsNode } = gatewayRuntime();

  // Secrets from ~/.midnite/.env are the base layer; the process env wins over them
  // (an explicitly-set var at launch time should never be silently overridden).
  const dotenv = paths.envPath
    ? (() => {
        try {
          return parseEnvFile(readFileSync(paths.envPath, 'utf-8'));
        } catch {
          return {};
        }
      })()
    : {};

  return spawn(exec, [entry], {
    env: {
      ...dotenv,
      ...process.env,
      ...(electronAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      MIDNITE_GATEWAY_PORT: String(port),
      MIDNITE_GATEWAY_DB_PATH: paths.dbPath,
      MIDNITE_GATEWAY_UPLOADS_DIR: paths.uploadsDir,
      // Load the shared user config + operator (SSO/JWT) config when present. Both are
      // fail-closed if set-but-missing, so only set them when the file actually exists
      // (resolvePaths already null-guards absence) — a fresh machine boots on defaults.
      ...(paths.configPath ? { MIDNITE_CONFIG_PATH: paths.configPath } : {}),
      ...(paths.operatorPath ? { MIDNITE_OPERATOR_CONFIG: paths.operatorPath } : {}),
      // Single origin: the gateway serves the web export, and the SSO callback redirects
      // back to that same origin (not the config's dev webBaseUrl) — so login completes
      // in the desktop app.
      ...(webDir ? { MIDNITE_WEB_DIR: webDir } : {}),
      ...(originUrl ? { MIDNITE_SSO_WEB_BASE_URL: originUrl } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
}

/** The shared endpoint file the bundled CLI reads to find the running gateway. */
function endpointFile(home: string): string {
  return join(home, 'gateway.json');
}

/**
 * Advertise the running gateway's URL in `~/.midnite/gateway.json` so the bundled CLI
 * (and any other midnite process) can reach the desktop app's gateway on its dynamic
 * loopback port without a flag. Best-effort — a write failure just means the CLI falls
 * back to its default endpoint.
 */
export function writeGatewayEndpoint(home: string, url: string): void {
  try {
    writeFileSync(endpointFile(home), JSON.stringify({ url, pid: process.pid }, null, 2));
  } catch {
    // Non-fatal — the CLI still works with an explicit --gateway/$MIDNITE_GATEWAY_URL.
  }
}

/** Remove the endpoint file on shutdown so a stale URL doesn't point at a dead port. */
export function clearGatewayEndpoint(home: string): void {
  try {
    rmSync(endpointFile(home), { force: true });
  } catch {
    // Non-fatal.
  }
}

/** Terminate the gateway and its process group (SIGTERM, then the OS reaps PTYs). */
export function stopGatewayProcess(proc: ChildProcess | null): void {
  if (!proc?.pid) return;
  try {
    process.kill(-proc.pid, 'SIGTERM'); // negative pid → the whole group
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
}
