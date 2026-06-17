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

/** Locate the gateway entry: packaged extraResources first, else the workspace. */
function gatewayEntry(): string {
  const packaged = join(process.resourcesPath, 'gateway', 'dist', 'main.js');
  if (existsSync(packaged)) return packaged;
  // Dev: resolved from @midnite/gateway's package main.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require.resolve('@midnite/gateway');
}

/**
 * Spawn the gateway as a child Node process using Electron's own binary
 * (ELECTRON_RUN_AS_NODE), so its native modules share the rebuilt ABI. Writable
 * paths + the chosen port are passed via env (honoured by the gateway's config
 * loader). `detached` puts it in its own process group so we can reap the whole
 * PTY tree on quit.
 */
export function startGatewayProcess(paths: DesktopPaths, port: number): ChildProcess {
  return spawn(process.execPath, [gatewayEntry()], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      MIDNITE_GATEWAY_PORT: String(port),
      MIDNITE_GATEWAY_DB_PATH: paths.dbPath,
      MIDNITE_GATEWAY_UPLOADS_DIR: paths.uploadsDir,
      MIDNITE_KNOWLEDGE_DIR: paths.knowledgeDir,
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
