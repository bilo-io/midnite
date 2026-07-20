import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
 * Spawn the gateway as a child process. Writable paths + the chosen port are
 * passed via env (honoured by the gateway's config loader). `detached` puts it
 * in its own process group so we can reap the whole PTY tree on quit.
 */
export function startGatewayProcess(paths: DesktopPaths, port: number): ChildProcess {
  const { exec, entry, electronAsNode } = gatewayRuntime();
  return spawn(exec, [entry], {
    env: {
      ...process.env,
      ...(electronAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      MIDNITE_GATEWAY_PORT: String(port),
      MIDNITE_GATEWAY_DB_PATH: paths.dbPath,
      MIDNITE_GATEWAY_UPLOADS_DIR: paths.uploadsDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
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
