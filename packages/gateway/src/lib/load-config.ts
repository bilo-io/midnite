import type { MidniteConfig } from '@midnite/shared';
import { findConfigPath, loadConfigFromFile, loadConfig } from '@midnite/shared/config-loader';

export { findConfigPath };

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
  if (port) {
    const parsed = Number.parseInt(port, 10);
    if (Number.isInteger(parsed) && parsed > 0) config.gateway.port = parsed;
  }
  if (dbPath) config.gateway.dbPath = dbPath;
  if (uploadsDir) config.gateway.uploadsDir = uploadsDir;
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
      return applyEnvOverrides(config);
    } catch (err) {
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
  return applyEnvOverrides(loadConfig(configPath));
}
