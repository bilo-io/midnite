import { dirname } from 'node:path';
import { enabledSsoProviders, type MidniteConfig } from '@midnite/shared';
import {
  findConfigPath,
  loadConfigFromFile,
  loadConfig,
  operatorConfigInfo,
  OperatorAuthInUserConfigError,
} from '@midnite/shared/config-loader';
import { mergeAllowedOrigins, parseAdminOrigins } from './admin-origin';

export { findConfigPath };

/**
 * One-line info log when the operator auth config (Phase 72) is present, so an
 * operator can confirm at boot that their `.midnite/operator.json` was picked up
 * — providers + whether JWT resolved. No secrets are logged (only provider names
 * and the on/off state).
 */
function logOperatorConfig(config: MidniteConfig, baseDir: string): void {
  const { path, present } = operatorConfigInfo(baseDir);
  if (!present) return;
  const providers = enabledSsoProviders(config);
  const jwtOn = Boolean(process.env[config.gateway.auth.jwt.secretEnv]);
  // eslint-disable-next-line no-console
  console.log(
    `[midnite gateway] operator auth config loaded from ${path}: providers=[${providers.join(', ')}], jwt=${jwtOn ? 'on' : 'off'}`,
  );
}

/**
 * Apply environment-variable overrides on top of a parsed config. Lets the
 * desktop app (and any deployment) redirect writable paths to a real location
 * and pin the listen port without editing midnite.json. Applied after parse so
 * the file stays the source of truth for everything not overridden.
 */
function applyEnvOverrides(config: MidniteConfig): MidniteConfig {
  const port = process.env['MIDNITE_GATEWAY_PORT'];
  const dbPath = process.env['MIDNITE_GATEWAY_DB_PATH'];
  const uploadsDir = process.env['MIDNITE_GATEWAY_UPLOADS_DIR'];
  const webDir = process.env['MIDNITE_WEB_DIR'];
  const ssoWebBaseUrl = process.env['MIDNITE_SSO_WEB_BASE_URL'];
  if (port) {
    const parsed = Number.parseInt(port, 10);
    if (Number.isInteger(parsed) && parsed > 0) config.gateway.port = parsed;
  }
  if (dbPath) config.gateway.dbPath = dbPath;
  if (uploadsDir) config.gateway.uploadsDir = uploadsDir;
  if (webDir) config.gateway.webDir = webDir;
  // The desktop app serves the web from the gateway (single origin) and sets this to the
  // gateway's own URL, so the SSO callback redirects back to the app instead of the
  // config's `webBaseUrl` (which points at the hosted/dev web). Only meaningful when SSO
  // is configured; harmless otherwise.
  if (ssoWebBaseUrl && config.gateway.auth.sso) {
    config.gateway.auth.sso.webBaseUrl = ssoWebBaseUrl;
  }
  // The admin console (Phase 73 E) is a static export on its own origin that
  // calls the gateway cross-origin with `credentials: 'include'`. Fold any
  // MIDNITE_ADMIN_ORIGIN entries into the CORS/WS allow-list (deduped, additive)
  // so a credentialed request from that origin is honoured (CORS with
  // credentials can't reflect `*`, so the origin must be explicit).
  const adminOrigins = parseAdminOrigins(process.env['MIDNITE_ADMIN_ORIGIN']);
  if (adminOrigins.length > 0) {
    config.gateway.allowedOrigins = mergeAllowedOrigins(
      config.gateway.allowedOrigins,
      adminOrigins,
    );
  }
  return config;
}

/**
 * Load and validate midnite.json, falling back to schema defaults when missing
 * or unparseable, then apply env overrides. This is the single source of the
 * runtime MidniteConfig — both the bootstrap (startGateway) and the DI provider
 * (ConfigModule) go through here so they never disagree.
 *
 * Set MIDNITE_CONFIG_PATH to bypass the upward walk and load an explicit file.
 */
export function loadConfigFromDisk(): MidniteConfig {
  const explicit = process.env['MIDNITE_CONFIG_PATH'];
  if (explicit) {
    try {
      const config = loadConfigFromFile(explicit);
      // eslint-disable-next-line no-console
      console.log(`[midnite gateway] loaded config from ${explicit} (MIDNITE_CONFIG_PATH)`);
      logOperatorConfig(config, dirname(explicit));
      return applyEnvOverrides(config);
    } catch (err) {
      // A committed gateway.auth (Phase 72 B) is a fail-closed error, never a
      // "parse failed, use defaults" — rethrow so the operator sees the remedy
      // rather than the gateway silently booting auth-off.
      if (err instanceof OperatorAuthInUserConfigError) throw err;
      // eslint-disable-next-line no-console
      console.error(`[midnite gateway] failed to parse ${explicit} — using defaults`, err);
      return applyEnvOverrides(loadConfig());
    }
  }

  const configPath = findConfigPath();
  if (!configPath) {
    // eslint-disable-next-line no-console
    console.warn(
      `[midnite gateway] no midnite.json found from ${process.cwd()} upward — using defaults`,
    );
    return applyEnvOverrides(loadConfig());
  }
  // eslint-disable-next-line no-console
  console.log(`[midnite gateway] loaded config from ${configPath}`);
  const config = loadConfig(configPath);
  logOperatorConfig(config, dirname(configPath));
  return applyEnvOverrides(config);
}
