import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export interface DesktopPaths {
  dbPath: string;
  uploadsDir: string;
  knowledgeDir: string;
  logsDir: string;
}

/**
 * Writable locations for the packaged app, under the OS user-data dir
 * (~/Library/Application Support/midnite on macOS) — never inside the read-only
 * app bundle. Fed to the gateway child via MIDNITE_* env vars.
 */
export function resolvePaths(): DesktopPaths {
  const data = app.getPath('userData');
  const paths: DesktopPaths = {
    dbPath: join(data, 'midnite.db'),
    uploadsDir: join(data, 'uploads'),
    knowledgeDir: join(data, 'knowledge'),
    logsDir: app.getPath('logs'),
  };
  mkdirSync(paths.uploadsDir, { recursive: true });
  mkdirSync(paths.knowledgeDir, { recursive: true });
  return paths;
}
