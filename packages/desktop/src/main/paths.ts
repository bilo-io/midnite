import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';

export interface DesktopPaths {
  /** The shared, machine-wide midnite home (`~/.midnite`) the embedded gateway and
   *  the bundled CLI both use — one midnite per machine. */
  home: string;
  dbPath: string;
  uploadsDir: string;
  logsDir: string;
  /** `~/.midnite/midnite.json` if present — fed to the gateway as MIDNITE_CONFIG_PATH
   *  so the desktop app runs against the user's real config, not schema defaults. */
  configPath: string | null;
  /** `~/.midnite/operator.json` if present — the operator config (SSO/JWT) the gateway
   *  loads via MIDNITE_OPERATOR_CONFIG. Auth lives here, never in midnite.json. */
  operatorPath: string | null;
  /** `~/.midnite/.env` if present — the secrets file (JWT secret, SSO client secrets)
   *  the dev gateway loads via moon `envFile`; the desktop child gets it merged in. */
  envPath: string | null;
}

/**
 * Resolve the shared midnite home and the config/data locations the embedded gateway
 * runs against.
 *
 * A downloaded desktop app must behave like the user's own gateway: same config, same
 * SSO/operator wiring, same board data — so it reads a **shared, machine-wide home**
 * (`~/.midnite`), not an app-private sandbox. This is the "one midnite per machine"
 * model (Phase 77): the bundled CLI, `midnite serve`, and the desktop app all point at
 * `~/.midnite`, so state and auth config are shared rather than siloed.
 *
 * Config discovery is fail-open on absence: a fresh machine with no `~/.midnite/*.json`
 * boots the gateway on schema defaults (auth off, local mode) with its data in
 * `~/.midnite`. Drop a `midnite.json` / `operator.json` / `.env` in there and SSO +
 * settings light up on the next launch — exactly as `gateway:dev` behaves.
 */
export function resolvePaths(): DesktopPaths {
  const home = join(homedir(), '.midnite');
  mkdirSync(home, { recursive: true });

  const dbPath = join(home, 'midnite.db');
  const uploadsDir = join(home, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  // One-time migration: earlier builds kept the DB in the app-private userData dir
  // (~/Library/Application Support/@midnite/desktop). If the shared home has no DB yet
  // but that legacy one exists, carry it over so existing users keep their board.
  if (!existsSync(dbPath)) {
    const legacyDb = join(app.getPath('userData'), 'midnite.db');
    if (existsSync(legacyDb)) {
      try {
        copyFileSync(legacyDb, dbPath);
      } catch {
        // Non-fatal: a failed migration just starts the shared DB fresh.
      }
    }
  }

  const configPath = join(home, 'midnite.json');
  const operatorPath = join(home, 'operator.json');
  const envPath = join(home, '.env');

  return {
    home,
    dbPath,
    uploadsDir,
    logsDir: app.getPath('logs'),
    configPath: existsSync(configPath) ? configPath : null,
    operatorPath: existsSync(operatorPath) ? operatorPath : null,
    envPath: existsSync(envPath) ? envPath : null,
  };
}
